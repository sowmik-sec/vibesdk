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
 * - Injects design mode script into index.html
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

    // 5. Inject design mode script into index.html
    if (templateFiles['index.html']) {
        try {
            customized['index.html'] = injectDesignModeScript(templateFiles['index.html']);
        } catch (error) {
            console.warn('Failed to inject design mode script:', error);
            // Don't fail the entire customization if injection fails
        }
    }

    return customized;
}

/**
 * Inject design mode script into index.html for live element selection
 */
function injectDesignModeScript(html: string): string {
    const designModeScript = `
    <!-- VibeSDK Design Mode Client -->
    <script>
    (function() {
        'use strict';
        if (window.__vibesdk_design_mode_initialized) return;
        window.__vibesdk_design_mode_initialized = true;
        
        const DESIGN_MODE_MESSAGE_PREFIX = 'vibesdk_design_mode';
        const IGNORED_ELEMENTS = ['SCRIPT', 'STYLE', 'META', 'LINK', 'HEAD', 'HTML'];
        const COMPUTED_STYLE_PROPERTIES = [
            'color', 'backgroundColor', 'fontSize', 'fontFamily', 'fontWeight',
            'lineHeight', 'letterSpacing', 'textAlign', 'textDecoration',
            'padding', 'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft',
            'margin', 'marginTop', 'marginRight', 'marginBottom', 'marginLeft',
            'border', 'borderWidth', 'borderColor', 'borderStyle', 'borderRadius',
            'width', 'height', 'display', 'flexDirection', 'justifyContent', 'alignItems', 'gap',
            'boxShadow', 'opacity'
        ];
        
        let isDesignModeActive = false;
        let selectedElement = null;
        let hoveredElement = null;
        let highlightOverlay = null;
        let selectionOverlay = null;
        
        function sendMessage(message) {
            try { window.parent.postMessage({ prefix: DESIGN_MODE_MESSAGE_PREFIX, ...message }, '*'); } catch (e) {}
        }
        
        function shouldIgnoreElement(el) {
            if (!el || !el.tagName) return true;
            if (IGNORED_ELEMENTS.includes(el.tagName)) return true;
            if (el.id && el.id.startsWith('__vibesdk_')) return true;
            return false;
        }
        
        function createOverlay(id, color) {
            let o = document.getElementById(id);
            if (!o) {
                o = document.createElement('div');
                o.id = id;
                o.style.cssText = 'position:fixed;pointer-events:none;z-index:999999;border:2px solid '+color+';background:'+color+'11;transition:all 0.1s;display:none;';
                document.body.appendChild(o);
            }
            return o;
        }
        
        function positionOverlay(o, r) {
            if (!o) return;
            o.style.top = r.top+'px'; o.style.left = r.left+'px'; o.style.width = r.width+'px'; o.style.height = r.height+'px'; o.style.display = 'block';
        }
        
        function hideOverlay(o) { if (o) o.style.display = 'none'; }
        
        function initOverlays() {
            highlightOverlay = createOverlay('__vibesdk_highlight_overlay', '#3b82f6');
            selectionOverlay = createOverlay('__vibesdk_selection_overlay', '#8b5cf6');
            if (selectionOverlay) selectionOverlay.style.borderWidth = '3px';
        }
        
        function cleanupOverlays() {
            if (highlightOverlay) highlightOverlay.remove();
            if (selectionOverlay) selectionOverlay.remove();
            highlightOverlay = null; selectionOverlay = null;
        }
        
        function generateSelector(el) {
            const path = []; let cur = el;
            while (cur && cur !== document.body && cur !== document.documentElement) {
                let sel = cur.tagName.toLowerCase();
                if (cur.id) { path.unshift('#'+CSS.escape(cur.id)); break; }
                if (cur.className && typeof cur.className === 'string') {
                    const cls = cur.className.trim().split(/\\s+/).filter(c => c && !c.startsWith('__vibesdk')).slice(0,2);
                    if (cls.length) sel += '.'+cls.map(c => CSS.escape(c)).join('.');
                }
                const parent = cur.parentElement;
                if (parent) {
                    const sibs = Array.from(parent.children).filter(c => c.tagName === cur.tagName);
                    if (sibs.length > 1) sel += ':nth-of-type('+(sibs.indexOf(cur)+1)+')';
                }
                path.unshift(sel); cur = cur.parentElement;
            }
            return path.join(' > ');
        }
        
        function extractStyles(el) {
            const computed = window.getComputedStyle(el), styles = {};
            COMPUTED_STYLE_PROPERTIES.forEach(p => { styles[p] = computed.getPropertyValue(p.replace(/([A-Z])/g, '-$1').toLowerCase()); });
            return styles;
        }
        
        function extractElementData(el) {
            const r = el.getBoundingClientRect();
            return {
                tagName: el.tagName.toLowerCase(), id: el.id || null, className: el.className || '',
                selector: generateSelector(el), textContent: (el.textContent||'').slice(0,200),
                boundingRect: {top:r.top,left:r.left,width:r.width,height:r.height},
                computedStyles: extractStyles(el),
                tailwindClasses: (el.className && typeof el.className === 'string') ? el.className.trim().split(/\\s+/).filter(c => c) : [],
                dataAttributes: {}, sourceLocation: null,
                parentSelector: el.parentElement ? generateSelector(el.parentElement) : null,
                childCount: el.children.length
            };
        }
        
        function handleMouseMove(e) {
            if (!isDesignModeActive) return;
            const t = e.target;
            if (!t || shouldIgnoreElement(t)) { if (hoveredElement) { hoveredElement = null; hideOverlay(highlightOverlay); } return; }
            if (t === selectedElement) { hideOverlay(highlightOverlay); return; }
            if (t !== hoveredElement) {
                hoveredElement = t;
                positionOverlay(highlightOverlay, t.getBoundingClientRect());
                sendMessage({ type: 'design_mode_element_hovered', element: extractElementData(t) });
            }
        }
        
        function handleClick(e) {
            if (!isDesignModeActive) return;
            e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation();
            const t = e.target;
            if (!t || shouldIgnoreElement(t)) return;
            if (t === selectedElement) { selectedElement = null; hideOverlay(selectionOverlay); sendMessage({ type: 'design_mode_element_deselected' }); return; }
            selectedElement = t; hoveredElement = null; hideOverlay(highlightOverlay);
            positionOverlay(selectionOverlay, t.getBoundingClientRect());
            sendMessage({ type: 'design_mode_element_selected', element: extractElementData(t) });
        }
        
        function handleKeyDown(e) { if (e.key === 'Escape' && selectedElement) { selectedElement = null; hideOverlay(selectionOverlay); sendMessage({ type: 'design_mode_element_deselected' }); } }
        function handleScroll() { if (selectedElement && selectionOverlay) positionOverlay(selectionOverlay, selectedElement.getBoundingClientRect()); if (hoveredElement && highlightOverlay) positionOverlay(highlightOverlay, hoveredElement.getBoundingClientRect()); }
        
        const previewStyles = new Map();
        function applyPreviewStyle(sel, styles) {
            console.log('[VibeSDK] applyPreviewStyle called', { selector: sel, styles });
            clearPreviewStyle(sel);
            const css = Object.entries(styles).map(([p,v]) => p.replace(/([A-Z])/g,'-$1').toLowerCase()+':'+v+' !important').join(';');
            const s = document.createElement('style'); s.id = '__vibesdk_preview_'+sel.replace(/[^a-zA-Z0-9]/g,'_'); s.textContent = sel+'{'+css+'}';
            console.log('[VibeSDK] Created style element:', s.textContent);
            document.head.appendChild(s); previewStyles.set(sel, s);
        }
        function clearPreviewStyle(sel) { const e = previewStyles.get(sel); if (e) { e.remove(); previewStyles.delete(sel); } }
        function clearAllPreviewStyles() { previewStyles.forEach(e => e.remove()); previewStyles.clear(); }
        
        function enableDesignMode() {
            if (isDesignModeActive) return;
            isDesignModeActive = true; initOverlays();
            document.addEventListener('mousemove', handleMouseMove, true);
            document.addEventListener('click', handleClick, true);
            document.addEventListener('mousedown', e => { if (isDesignModeActive) { e.preventDefault(); e.stopPropagation(); } }, true);
            document.addEventListener('mouseup', e => { if (isDesignModeActive) { e.preventDefault(); e.stopPropagation(); } }, true);
            document.addEventListener('keydown', handleKeyDown, true);
            window.addEventListener('scroll', handleScroll, true);
            document.body.style.cursor = 'crosshair';
            console.log('[VibeSDK] Design mode enabled');
        }
        
        function disableDesignMode() {
            if (!isDesignModeActive) return;
            isDesignModeActive = false; selectedElement = null; hoveredElement = null;
            document.removeEventListener('mousemove', handleMouseMove, true);
            document.removeEventListener('click', handleClick, true);
            document.removeEventListener('keydown', handleKeyDown, true);
            window.removeEventListener('scroll', handleScroll, true);
            cleanupOverlays(); clearAllPreviewStyles();
            document.body.style.cursor = '';
            console.log('[VibeSDK] Design mode disabled');
        }
        
        window.addEventListener('message', function(e) {
            const d = e.data; if (!d || d.prefix !== DESIGN_MODE_MESSAGE_PREFIX) return;
            console.log('[VibeSDK] Received message:', d.type, d);
            if (d.type === 'design_mode_enable') enableDesignMode();
            else if (d.type === 'design_mode_disable') disableDesignMode();
            else if (d.type === 'design_mode_preview_style' && d.selector && d.styles) { 
                console.log('[VibeSDK] Applying preview style for selector:', d.selector);
                applyPreviewStyle(d.selector, d.styles); 
            }
            else if (d.type === 'design_mode_clear_preview') { if (d.selector) clearPreviewStyle(d.selector); else clearAllPreviewStyles(); }
            else if (d.type === 'design_mode_clear_selection') { selectedElement = null; hideOverlay(selectionOverlay); }
        });
        
        sendMessage({ type: 'design_mode_ready' });
        console.log('[VibeSDK] Design mode client initialized');
    })();
    </script>`;

    // Inject after <head> tag
    if (html.includes('<head>')) {
        return html.replace(/<head>/i, `<head>${designModeScript}`);
    } else if (html.includes('<HEAD>')) {
        return html.replace(/<HEAD>/i, `<HEAD>${designModeScript}`);
    }

    // Fallback: inject at beginning
    return designModeScript + html;
}

/**
 * Update package.json with project name and prepare script
 */
export function customizePackageJson(content: string, projectName: string): string {
    const pkg = JSON.parse(content);
    pkg.name = projectName;
    pkg.scripts = pkg.scripts || {};
    pkg.scripts.prepare = 'bun .bootstrap.js || true';
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
