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

    // Add react-grab for design mode source location mapping
    pkg.devDependencies = pkg.devDependencies || {};
    pkg.devDependencies['react-grab'] = '^0.0.98';

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
 */
function injectDesignModeScript(html: string): string {
    // Using ES module import for react-grab (Vite-compatible)
    // react-grab provides: getStack() for source locations, init() for custom callbacks
    const designModeScript = `
<!-- VibeSDK Design Mode Integration -->
<script type="module">
(async function() {
  const PREFIX = "vibesdk_design_mode";
  let isActive = false;
  let selectedElement = null;
  let highlightOverlay = null;
  let selectionOverlay = null;
  
  // Import react-grab for source location detection
  const { getStack, init } = await import("react-grab/core");
  
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
  
  // Fallback: Manual React Fiber traversal for source location
  function getFiberSource(el) {
    if (!el) return null;
    const keys = Object.keys(el);
    for (let i = 0; i < keys.length; i++) {
      if (keys[i].startsWith("__reactFiber$") || keys[i].startsWith("__reactInternalInstance$")) {
        let fiber = el[keys[i]];
        while (fiber) {
          if (fiber._debugSource) {
            const src = fiber._debugSource;
            let filePath = src.fileName || "";
            // Normalize path: /workspace/i-xxx/src/... -> src/...
            const match = filePath.match(/\\/(?:workspace\\/[^\\/]+|app)\\/(.+)/);
            if (match) filePath = match[1];
            console.log("[VibeSDK] Fiber source found:", { original: src.fileName, normalized: filePath });
            return { filePath, lineNumber: src.lineNumber || 0, columnNumber: src.columnNumber || 0 };
          }
          fiber = fiber.return || fiber._debugOwner;
        }
        break;
      }
    }
    return null;
  }
  
  // Helper: Extract element data with source location (react-grab + fallback)
  async function extractData(el) {
    if (!el) return null;
    const r = el.getBoundingClientRect();
    const cn = (el.className && typeof el.className === "string") ? el.className : "";
    
    // Try react-grab first, then fallback to manual fiber traversal
    let sourceLocation = null;
    try {
      const stack = await getStack(el);
      if (stack && stack.length > 0 && stack[0].source) {
        let filePath = stack[0].source.fileName || "";
        // Normalize path
        const match = filePath.match(/\\/(?:workspace\\/[^\\/]+|app)\\/(.+)/);
        if (match) filePath = match[1];
        sourceLocation = { filePath, lineNumber: stack[0].source.lineNumber || 0, columnNumber: stack[0].source.columnNumber || 0 };
        console.log("[VibeSDK] react-grab source:", sourceLocation);
      }
    } catch (e) {
      console.warn("[VibeSDK] react-grab getStack failed:", e.message);
    }
    
    // Fallback to manual fiber traversal if react-grab didn't work
    if (!sourceLocation || !sourceLocation.filePath) {
      console.log("[VibeSDK] Using fiber fallback...");
      sourceLocation = getFiberSource(el);
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
  
  function applyPreview(styles) {
    const el = selectedElement || window.__vibesdk_selected;
    if (!el) return;
    if (!el.__orig) el.__orig = {};
    for (const p in styles) {
      if (!(p in el.__orig)) el.__orig[p] = el.style[p] || "";
      el.style.setProperty(p, styles[p], "important");
    }
  }
  
  function clearPreview() {
    const el = selectedElement || window.__vibesdk_selected;
    if (el && el.__orig) {
      for (const p in el.__orig) el.style[p] = el.__orig[p];
      delete el.__orig;
    }
  }
  
  function activate() {
    if (isActive) return;
    isActive = true;
    createOverlays();
    document.addEventListener("mousemove", handleMouseMove, true);
    document.addEventListener("click", handleClick, true);
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
    document.removeEventListener("mouseleave", handleMouseLeave);
    window.removeEventListener("scroll", updateSelectionOverlay, true);
    selectedElement = null;
    console.log("[VibeSDK] Design mode deactivated");
  }
  
  // Listen for messages from parent
  window.addEventListener("message", function(e) {
    const d = e.data;
    if (!d || d.prefix !== PREFIX) return;
    if (d.type === "design_mode_enable") activate();
    else if (d.type === "design_mode_disable") deactivate();
    else if (d.type === "design_mode_preview_style") applyPreview(d.styles);
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
