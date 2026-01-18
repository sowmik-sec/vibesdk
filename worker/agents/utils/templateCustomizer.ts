import { modify, applyEdits } from 'jsonc-parser';

export interface TemplateCustomizationOptions {
  projectName: string;
  commandsHistory: string[];
}

export interface CustomizedTemplateFiles {
  'package.json': string;
  'wrangler.jsonc'?: string;
  '.bootstrap.js': string;
  '.gitignore': string;
  'index.html'?: string;
}

/**
 * Customize all template configuration files
 * - Updates package.json with project name and prepare script
 * - Updates wrangler.jsonc with project name (if exists)
 * - Generates .bootstrap.js script
 * - Updates .gitignore to exclude bootstrap marker
 */
export function customizeTemplateFiles(
  templateFiles: Record<string, string>,
  options: TemplateCustomizationOptions
): Partial<CustomizedTemplateFiles> {
  const customized: Partial<CustomizedTemplateFiles> = {};

  // 1. Customize package.json
  if (templateFiles['package.json']) {
    customized['package.json'] = customizePackageJson(
      templateFiles['package.json'],
      options.projectName
    );
  }

  // 2. Customize wrangler.jsonc
  if (templateFiles['wrangler.jsonc']) {
    customized['wrangler.jsonc'] = customizeWranglerJsonc(
      templateFiles['wrangler.jsonc'],
      options.projectName
    );
  }

  // 3. Generate bootstrap script
  customized['.bootstrap.js'] = generateBootstrapScript(
    options.projectName,
    options.commandsHistory
  );

  // 4. Update .gitignore
  customized['.gitignore'] = updateGitignore(
    templateFiles['.gitignore'] || ''
  );

  // 5. Inject design mode script using react-grab for source location detection
  if (templateFiles['index.html']) {
    try {
      customized['index.html'] = injectDesignModeScript(templateFiles['index.html']);
    } catch (error) {
      console.warn('Failed to inject design mode script:', error);
    }
  }

  return customized;
}

/**
 * Update package.json with project name and prepare script
 */
export function customizePackageJson(content: string, projectName: string): string {
  const pkg = JSON.parse(content);
  pkg.name = projectName;
  pkg.scripts = pkg.scripts || {};
  pkg.scripts.prepare = 'bun .bootstrap.js || true';

  // Note: react-grab is already included in the vite-reference template's devDependencies

  return JSON.stringify(pkg, null, 2);
}

/**
 * Update wrangler.jsonc with project name (preserves comments)
 */
function customizeWranglerJsonc(content: string, projectName: string): string {
  const edits = modify(content, ['name'], projectName, {
    formattingOptions: {
      tabSize: 2,
      insertSpaces: true,
      eol: '\n'
    }
  });
  return applyEdits(content, edits);
}

/**
 * Generate bootstrap script with proper command escaping
 */
export function generateBootstrapScript(projectName: string, commands: string[]): string {
  // Escape strings for safe embedding in JavaScript
  const safeProjectName = JSON.stringify(projectName);
  const safeCommands = JSON.stringify(commands, null, 4);

  return `#!/usr/bin/env bun
/**
 * Auto-generated bootstrap script
 * Runs once after git clone to setup project correctly
 * This file will self-delete after successful execution
 */

const fs = require('fs');
const { execSync } = require('child_process');

const PROJECT_NAME = ${safeProjectName};
const BOOTSTRAP_MARKER = '.bootstrap-complete';

// Check if already bootstrapped
if (fs.existsSync(BOOTSTRAP_MARKER)) {
    console.log('✓ Bootstrap already completed');
    process.exit(0);
}

console.log('🚀 Running first-time project setup...\\n');

try {
    // Update package.json
    updatePackageJson();

    // Update wrangler.jsonc if exists
    updateWranglerJsonc();

    // Run setup commands
    runSetupCommands();

    // Mark as complete
    fs.writeFileSync(BOOTSTRAP_MARKER, new Date().toISOString());

    // Self-delete
    fs.unlinkSync(__filename);

    console.log('\\n✅ Bootstrap complete! Project ready.');
} catch (error) {
    console.error('❌ Bootstrap failed:', error.message);
    console.log('You may need to manually update package.json and wrangler.jsonc');
    process.exit(1);
}

function updatePackageJson() {
    try {
        const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
        pkg.name = PROJECT_NAME;

        // Remove prepare script after bootstrap
        if (pkg.scripts && pkg.scripts.prepare) {
            delete pkg.scripts.prepare;
        }

        fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2));
        console.log('✓ Updated package.json with project name: ' + PROJECT_NAME);
    } catch (error) {
        console.error('Failed to update package.json:', error.message);
        throw error;
    }
}

function updateWranglerJsonc() {
    if (!fs.existsSync('wrangler.jsonc')) {
        console.log('⊘ wrangler.jsonc not found, skipping');
        return;
    }

    try {
        let content = fs.readFileSync('wrangler.jsonc', 'utf8');
        content = content.replace(/"name"\\s*:\\s*"[^"]*"/, \`"name": "\${PROJECT_NAME}"\`);
        fs.writeFileSync('wrangler.jsonc', content);
        console.log('✓ Updated wrangler.jsonc with project name: ' + PROJECT_NAME);
    } catch (error) {
        console.warn('⚠️  Failed to update wrangler.jsonc:', error.message);
    }
}

function runSetupCommands() {
    const commands = ${safeCommands};

    if (commands.length === 0) {
        console.log('⊘ No setup commands to run');
        return;
    }

    console.log('\\n📦 Running setup commands...\\n');

    let successCount = 0;
    let failCount = 0;

    for (const cmd of commands) {
        console.log(\`▸ \${cmd}\`);
        try {
            execSync(cmd, { 
                stdio: 'inherit',
                cwd: process.cwd()
            });
            successCount++;
        } catch (error) {
            failCount++;
            console.warn(\`⚠️  Command failed: \${cmd}\`);
            console.warn(\`   Error: \${error.message}\`);
        }
    }

    console.log(\`\\n✓ Commands completed: \${successCount} successful, \${failCount} failed\\n\`);
}
`;
}

/**
 * Update .gitignore to exclude bootstrap marker
 */
function updateGitignore(content: string): string {
  if (content.includes('.bootstrap-complete')) {
    return content;
  }
  return content + '\n# Bootstrap marker\n.bootstrap-complete\n';
}

/**
 * Generate project name from blueprint or query
 */
export function generateProjectName(
  projectName: string,
  uniqueSuffix: string,
  maxPrefixLength: number = 20
): string {
  let prefix = projectName
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '-');

  prefix = prefix.slice(0, maxPrefixLength);
  return `${prefix}-${uniqueSuffix}`.toLowerCase();
}

/**
 * Inject design mode script into index.html for live element selection
 * Uses react-grab library for accurate React fiber source location extraction
 * Note: react-grab is imported in index.html via import.meta.env.DEV check
 */
function injectDesignModeScript(html: string): string {
  const designModeScript = `
<!-- VibeSDK Design Mode Integration -->
<script type="module">
(async function() {
  // Prevent double initialization (request-handler.ts also injects a script)
  if (window.__vibesdk_design_mode_initialized) return;
  window.__vibesdk_design_mode_initialized = true;
  
  const PREFIX = "vibesdk_design_mode";
  let isActive = false;
  let selectedElement = null;
  let highlightOverlay = null;
  let selectionOverlay = null;
  
  // Wait for react-grab to be available (it's imported in index.html)
  let getStack;
  try {
    const grabModule = await import("react-grab/core");
    getStack = grabModule.getStack;
  } catch (e) {
    console.warn("[VibeSDK] react-grab not available:", e.message);
  }
  
  // Helper: Generate CSS selector
  function genSelector(el) {
    if (!el || !el.tagName) return "";
    if (el.id) return "#" + el.id;
    const path = [];
    let cur = el, depth = 0;
    while (cur && cur.nodeType === 1 && depth < 6) {
      let p = cur.tagName.toLowerCase();
      if (cur.id) { path.unshift("#" + cur.id); break; }
      let idx = 1, sib = cur;
      while (sib = sib.previousElementSibling) if (sib.tagName === cur.tagName) idx++;
      if (idx > 1) p += ":nth-of-type(" + idx + ")";
      path.unshift(p);
      cur = cur.parentElement;
      depth++;
    }
    return path.join(" > ");
  }
  
  // Helper: Get computed styles
  function getStyles(el) {
    if (!el) return {};
    const cs = getComputedStyle(el);
    return {
      fontFamily: cs.fontFamily, fontSize: cs.fontSize, fontWeight: cs.fontWeight,
      lineHeight: cs.lineHeight, letterSpacing: cs.letterSpacing, textAlign: cs.textAlign,
      textDecoration: cs.textDecoration, textTransform: cs.textTransform, color: cs.color,
      backgroundColor: cs.backgroundColor, backgroundImage: cs.backgroundImage,
      marginTop: cs.marginTop, marginRight: cs.marginRight, marginBottom: cs.marginBottom, marginLeft: cs.marginLeft,
      paddingTop: cs.paddingTop, paddingRight: cs.paddingRight, paddingBottom: cs.paddingBottom, paddingLeft: cs.paddingLeft,
      borderTopWidth: cs.borderTopWidth, borderRightWidth: cs.borderRightWidth,
      borderBottomWidth: cs.borderBottomWidth, borderLeftWidth: cs.borderLeftWidth,
      display: cs.display, flexDirection: cs.flexDirection, justifyContent: cs.justifyContent,
      alignItems: cs.alignItems, gap: cs.gap, width: cs.width, height: cs.height,
      position: cs.position, opacity: cs.opacity, borderRadius: cs.borderRadius
    };
  }
  
  // Helper: Extract element data with source location using react-grab
  async function extractData(el) {
    if (!el) return null;
    const r = el.getBoundingClientRect();
    const cn = (el.className && typeof el.className === "string") ? el.className : "";
    
    // Use react-grab for source location detection
    let sourceLocation = null;
    if (getStack) {
      try {
        const stack = await getStack(el);
        if (stack && stack.length > 0 && stack[0].source) {
          let filePath = stack[0].source.fileName || "";
          // Normalize path: /workspace/i-xxx/src/... -> src/...
          const match = filePath.match(/\\/(?:workspace\\/[^\\/]+|app)\\/(.+)/);
          if (match) filePath = match[1];
          sourceLocation = { 
            filePath, 
            lineNumber: stack[0].source.lineNumber || 0, 
            columnNumber: stack[0].source.columnNumber || 0 
          };
          console.log("[VibeSDK] react-grab source:", sourceLocation);
        }
      } catch (e) {
        console.warn("[VibeSDK] react-grab getStack failed:", e.message);
      }
    }
    
    if (sourceLocation) {
      console.log("[VibeSDK] Final source location:", sourceLocation);
    } else {
      console.warn("[VibeSDK] Could not determine source location for element");
    }
    
    return {
      selector: genSelector(el),
      tagName: el.tagName.toLowerCase(),
      className: cn,
      tailwindClasses: cn.split(/\\s+/).filter(Boolean),
      otherClasses: [],
      inlineStyles: {},
      computedStyles: getStyles(el),
      boundingRect: { top: r.top, left: r.left, width: r.width, height: r.height, bottom: r.bottom, right: r.right },
      textContent: (el.textContent || "").slice(0, 200),
      isTextEditable: el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.contentEditable === "true",
      sourceLocation: sourceLocation,
      parentSelector: el.parentElement ? genSelector(el.parentElement) : null,
      childCount: el.children ? el.children.length : 0
    };
  }
  
  // Create overlays
  function createOverlays() {
    if (!highlightOverlay) {
      highlightOverlay = document.createElement("div");
      highlightOverlay.id = "__vibesdk_highlight";
      highlightOverlay.style.cssText = "position:fixed;pointer-events:none;border:2px dashed #d75fcb;background:rgba(215,95,203,0.05);z-index:999998;display:none;";
      document.body.appendChild(highlightOverlay);
    }
    if (!selectionOverlay) {
      selectionOverlay = document.createElement("div");
      selectionOverlay.id = "__vibesdk_selection";
      selectionOverlay.style.cssText = "position:fixed;pointer-events:none;border:2px solid #3b82f6;background:rgba(59,130,246,0.1);z-index:999999;display:none;";
      document.body.appendChild(selectionOverlay);
    }
  }
  
  function updateSelectionOverlay() {
    if (!selectionOverlay || !selectedElement) return;
    const r = selectedElement.getBoundingClientRect();
    selectionOverlay.style.cssText = "position:fixed;pointer-events:none;border:2px solid #3b82f6;background:rgba(59,130,246,0.1);z-index:999999;display:block;left:"+r.left+"px;top:"+r.top+"px;width:"+r.width+"px;height:"+r.height+"px;";
  }
  
  function handleMouseMove(e) {
    if (!isActive || !highlightOverlay) return;
    const el = document.elementFromPoint(e.clientX, e.clientY);
    const ignore = ["SCRIPT","STYLE","META","LINK","HEAD","HTML","NOSCRIPT"];
    if (!el || ignore.includes(el.tagName) || el.id?.startsWith("__vibesdk") || el === selectedElement) {
      highlightOverlay.style.display = "none"; return;
    }
    const r = el.getBoundingClientRect();
    highlightOverlay.style.cssText = "position:fixed;pointer-events:none;border:2px dashed #d75fcb;background:rgba(215,95,203,0.05);z-index:999998;display:block;left:"+r.left+"px;top:"+r.top+"px;width:"+r.width+"px;height:"+r.height+"px;";
  }
  
  function handleMouseLeave() {
    if (highlightOverlay) highlightOverlay.style.display = "none";
  }
  
  async function handleClick(e) {
    if (!isActive) return;
    e.preventDefault();
    e.stopPropagation();
    const el = document.elementFromPoint(e.clientX, e.clientY);
    const ignore = ["SCRIPT","STYLE","META","LINK","HEAD","HTML","NOSCRIPT"];
    if (!el || ignore.includes(el.tagName) || el.id?.startsWith("__vibesdk")) return;
    selectedElement = el;
    window.__vibesdk_selected = el;
    updateSelectionOverlay();
    const data = await extractData(el);
    console.log("[VibeSDK] Selected:", data?.tagName, data?.sourceLocation?.filePath);
    window.parent.postMessage({ prefix: PREFIX, type: "design_mode_element_selected", element: data }, "*");
  }
  
  // ========== INLINE TEXT EDITING ==========
  let textEditOverlay = null;
  let isEditingText = false;
  
  // Check if element contains only static text (no JSX expressions)
  function isStaticTextElement(el) {
    if (!el) return false;
    const tag = el.tagName.toLowerCase();
    const textTags = ["h1","h2","h3","h4","h5","h6","p","span","label","a","button","li","td","th"];
    if (!textTags.includes(tag)) return false;
    // Check if it has only text content (no child elements with text)
    const text = el.textContent || "";
    if (!text.trim()) return false;
    // If element has children that contain text, might be complex
    for (let child of el.children) {
      if (child.textContent && child.textContent.trim()) return false;
    }
    return true;
  }
  
  async function handleDblClick(e) {
    if (!isActive || isEditingText) return;
    e.preventDefault();
    e.stopPropagation();
    
    const el = document.elementFromPoint(e.clientX, e.clientY);
    if (!el || !isStaticTextElement(el)) {
      console.log("[VibeSDK] Double-click ignored: not a static text element");
      return;
    }
    
    console.log("[VibeSDK] Double-click on text element:", el.tagName, el.textContent?.substring(0, 30));
    
    // Create text edit overlay
    isEditingText = true;
    const rect = el.getBoundingClientRect();
    const originalText = el.textContent || "";
    
    // Create overlay input
    textEditOverlay = document.createElement("div");
    textEditOverlay.id = "__vibesdk_text_edit";
    textEditOverlay.style.cssText = "position:fixed;left:" + (rect.left - 2) + "px;top:" + (rect.top - 2) + "px;min-width:" + Math.max(rect.width + 4, 100) + "px;min-height:" + (rect.height + 4) + "px;z-index:1000001;background:white;border:2px solid #3b82f6;border-radius:4px;box-shadow:0 4px 12px rgba(0,0,0,0.15);padding:0;margin:0;";
    
    const input = document.createElement("textarea");
    input.value = originalText;
    const cs = getComputedStyle(el);
    input.style.cssText = "width:100%;height:100%;min-height:" + rect.height + "px;border:none;outline:none;resize:both;font-family:" + cs.fontFamily + ";font-size:" + cs.fontSize + ";font-weight:" + cs.fontWeight + ";line-height:" + cs.lineHeight + ";color:black;padding:4px 6px;margin:0;box-sizing:border-box;";
    textEditOverlay.appendChild(input);
    document.body.appendChild(textEditOverlay);
    
    // Focus and select all
    input.focus();
    input.select();
    
    // Store context for commit
    const context = {
      element: el,
      originalText: originalText,
      selector: genSelector(el),
      sourceLocation: null
    };
    
    // Get source location
    if (getStack) {
      try {
        const stack = await getStack(el);
        if (stack && stack.length > 0 && stack[0].source) {
          let filePath = stack[0].source.fileName || "";
          const match = filePath.match(/\\/(?:workspace\\/[^\\/]+|app)\\/(.+)/);
          if (match) filePath = match[1];
          context.sourceLocation = { 
            filePath, 
            lineNumber: stack[0].source.lineNumber || 0 
          };
        }
      } catch (err) { console.warn("[VibeSDK] getStack failed:", err); }
    }
    
    function commitEdit() {
      const newText = input.value;
      cleanup();
      
      if (newText !== context.originalText && newText.trim()) {
        // Update DOM immediately
        context.element.textContent = newText;
        
        // Send to parent for code update
        console.log("[VibeSDK] Committing text edit:", { old: context.originalText, new: newText });
        window.parent.postMessage({
          prefix: PREFIX,
          type: "design_mode_text_edit",
          selector: context.selector,
          oldText: context.originalText,
          newText: newText,
          sourceLocation: context.sourceLocation
        }, "*");
      }
    }
    
    function cancelEdit() {
      cleanup();
      console.log("[VibeSDK] Text edit cancelled");
    }
    
    function cleanup() {
      if (textEditOverlay) {
        textEditOverlay.remove();
        textEditOverlay = null;
      }
      isEditingText = false;
    }
    
    input.addEventListener("keydown", function(ke) {
      if (ke.key === "Enter" && !ke.shiftKey) {
        ke.preventDefault();
        commitEdit();
      } else if (ke.key === "Escape") {
        ke.preventDefault();
        cancelEdit();
      }
    });
    
    input.addEventListener("blur", function() {
      // Small delay to allow Escape to cancel first
      setTimeout(() => { if (isEditingText) commitEdit(); }, 100);
    });
  }
  
  // Helper: Convert camelCase to kebab-case for CSS properties
  function toKebabCase(str) {
    return str.replace(/([A-Z])/g, '-$1').toLowerCase();
  }
  
  function applyPreview(styles) {
    const el = selectedElement || window.__vibesdk_selected;
    console.log("[VibeSDK] applyPreview called", { hasElement: !!el, styles });
    if (!el) {
      console.warn("[VibeSDK] applyPreview: No element to apply styles to!");
      return;
    }
    if (!el.__orig) el.__orig = {};
    for (const p in styles) {
      const kebabProp = toKebabCase(p);
      if (!(p in el.__orig)) el.__orig[p] = el.style.getPropertyValue(kebabProp) || "";
      console.log("[VibeSDK] Setting style:", kebabProp, "=", styles[p]);
      el.style.setProperty(kebabProp, styles[p], "important");
    }
    console.log("[VibeSDK] applyPreview complete, element styles:", el.style.cssText);
  }
  
  function clearPreview() {
    const el = selectedElement || window.__vibesdk_selected;
    console.log("[VibeSDK] clearPreview called", { hasElement: !!el, hasOrig: !!(el && el.__orig) });
    if (el && el.__orig) {
      for (const p in el.__orig) {
        const kebabProp = toKebabCase(p);
        el.style.setProperty(kebabProp, el.__orig[p]);
      }
      delete el.__orig;
    }
  }
  
  function activate() {
    if (isActive) return;
    isActive = true;
    createOverlays();
    document.addEventListener("mousemove", handleMouseMove, true);
    document.addEventListener("click", handleClick, true);
    document.addEventListener("dblclick", handleDblClick, true);
    document.addEventListener("mouseleave", handleMouseLeave);
    window.addEventListener("scroll", updateSelectionOverlay, true);
    console.log("[VibeSDK] Design mode activated with react-grab");
  }
  
  function deactivate() {
    isActive = false;
    if (highlightOverlay) highlightOverlay.style.display = "none";
    if (selectionOverlay) selectionOverlay.style.display = "none";
    document.removeEventListener("mousemove", handleMouseMove, true);
    document.removeEventListener("click", handleClick, true);
    document.removeEventListener("dblclick", handleDblClick, true);
    document.removeEventListener("mouseleave", handleMouseLeave);
    window.removeEventListener("scroll", updateSelectionOverlay, true);
    selectedElement = null;
    console.log("[VibeSDK] Design mode deactivated");
  }
  
  // Listen for messages from parent
  window.addEventListener("message", function(e) {
    const d = e.data;
    if (!d || d.prefix !== PREFIX) return;
    console.log("[VibeSDK] Message received:", d.type, d);
    if (d.type === "design_mode_enable") activate();
    else if (d.type === "design_mode_disable") deactivate();
    else if (d.type === "design_mode_preview_style") {
      console.log("[VibeSDK] Received preview_style:", d.styles);
      applyPreview(d.styles);
    }
    else if (d.type === "design_mode_clear_preview") clearPreview();
  });
  
  // Notify parent we're ready
  window.parent.postMessage({ prefix: PREFIX, type: "design_mode_ready" }, "*");
  console.log("[VibeSDK] Design mode client initialized with react-grab");
})();
</script>`;

  // Inject before </head> or </body>
  if (html.includes('</head>')) {
    return html.replace('</head>', designModeScript + '\n</head>');
  } else if (html.includes('</body>')) {
    return html.replace('</body>', designModeScript + '\n</body>');
  }
  return html + designModeScript;
}
