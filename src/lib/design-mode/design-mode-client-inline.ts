/**
 * Design Mode Client Script - Inline Version
 * This script is injected into the preview iframe to enable element selection
 * and communication with the parent design mode panel.
 * 
 * Note: This is kept as a separate file for readability, but gets bundled
 * into an inline string for injection.
 */

// The prefix for all design mode messages
const DESIGN_MODE_MESSAGE_PREFIX = 'vibesdk_design_mode';

// Elements to ignore when selecting
const IGNORED_ELEMENTS = ['SCRIPT', 'STYLE', 'META', 'LINK', 'HEAD', 'HTML'];

// List of CSS properties to extract
const COMPUTED_STYLE_PROPERTIES = [
    'color', 'backgroundColor', 'fontSize', 'fontFamily', 'fontWeight',
    'lineHeight', 'letterSpacing', 'textAlign', 'textDecoration',
    'padding', 'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft',
    'margin', 'marginTop', 'marginRight', 'marginBottom', 'marginLeft',
    'border', 'borderWidth', 'borderColor', 'borderStyle', 'borderRadius',
    'width', 'height', 'maxWidth', 'maxHeight', 'minWidth', 'minHeight',
    'display', 'flexDirection', 'justifyContent', 'alignItems', 'gap',
    'position', 'top', 'right', 'bottom', 'left', 'zIndex',
    'boxShadow', 'opacity', 'overflow'
];

/**
 * Get the full design mode client script as a string for injection
 */
export function getDesignModeClientScript(): string {
    return `
(function() {
    'use strict';
    
    // Prevent double initialization
    if (window.__vibesdk_design_mode_initialized) return;
    window.__vibesdk_design_mode_initialized = true;
    
    const DESIGN_MODE_MESSAGE_PREFIX = '${DESIGN_MODE_MESSAGE_PREFIX}';
    const IGNORED_ELEMENTS = ${JSON.stringify(IGNORED_ELEMENTS)};
    const COMPUTED_STYLE_PROPERTIES = ${JSON.stringify(COMPUTED_STYLE_PROPERTIES)};
    
    // State
    let isDesignModeActive = false;
    let selectedElement = null;
    let hoveredElement = null;
    let highlightOverlay = null;
    let selectionOverlay = null;
    
    // ========================================================================
    // Utility Functions
    // ========================================================================
    
    function sendMessage(message) {
        try {
            window.parent.postMessage({ prefix: DESIGN_MODE_MESSAGE_PREFIX, ...message }, '*');
        } catch (e) {
            console.error('Design mode: Failed to send message', e);
        }
    }
    
    function shouldIgnoreElement(element) {
        if (!element || !element.tagName) return true;
        if (IGNORED_ELEMENTS.includes(element.tagName)) return true;
        if (element.id && element.id.startsWith('__vibesdk_')) return true;
        return false;
    }
    
    // ========================================================================
    // Overlay Management
    // ========================================================================
    
    function createOverlay(id, color) {
        let overlay = document.getElementById(id);
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = id;
            overlay.style.cssText = 
                'position: fixed;' +
                'pointer-events: none;' +
                'z-index: 999999;' +
                'border: 2px solid ' + color + ';' +
                'background: ' + color + '11;' +
                'transition: all 0.1s ease-out;' +
                'display: none;';
            document.body.appendChild(overlay);
        }
        return overlay;
    }
    
    function positionOverlay(overlay, rect) {
        if (!overlay) return;
        overlay.style.top = rect.top + 'px';
        overlay.style.left = rect.left + 'px';
        overlay.style.width = rect.width + 'px';
        overlay.style.height = rect.height + 'px';
        overlay.style.display = 'block';
    }
    
    function hideOverlay(overlay) {
        if (overlay) overlay.style.display = 'none';
    }
    
    function initializeOverlays() {
        highlightOverlay = createOverlay('__vibesdk_highlight_overlay', '#3b82f6');
        selectionOverlay = createOverlay('__vibesdk_selection_overlay', '#8b5cf6');
        if (selectionOverlay) selectionOverlay.style.borderWidth = '3px';
    }
    
    function cleanupOverlays() {
        if (highlightOverlay) highlightOverlay.remove();
        if (selectionOverlay) selectionOverlay.remove();
        highlightOverlay = null;
        selectionOverlay = null;
    }
    
    // ========================================================================
    // Element Data Extraction
    // ========================================================================
    
    function generateSelector(element) {
        const path = [];
        let current = element;
        
        while (current && current !== document.body && current !== document.documentElement) {
            let selector = current.tagName.toLowerCase();
            
            if (current.id) {
                selector = '#' + CSS.escape(current.id);
                path.unshift(selector);
                break;
            }
            
            if (current.className && typeof current.className === 'string') {
                const classes = current.className.trim().split(/\\s+/).filter(c => c && !c.startsWith('__vibesdk'));
                if (classes.length > 0) {
                    selector += '.' + classes.slice(0, 2).map(c => CSS.escape(c)).join('.');
                }
            }
            
            const parent = current.parentElement;
            if (parent) {
                const siblings = Array.from(parent.children).filter(c => c.tagName === current.tagName);
                if (siblings.length > 1) {
                    const index = siblings.indexOf(current) + 1;
                    selector += ':nth-of-type(' + index + ')';
                }
            }
            
            path.unshift(selector);
            current = current.parentElement;
        }
        
        return path.join(' > ');
    }
    
    function extractComputedStyles(element) {
        const computed = window.getComputedStyle(element);
        const styles = {};
        COMPUTED_STYLE_PROPERTIES.forEach(prop => {
            styles[prop] = computed.getPropertyValue(prop.replace(/([A-Z])/g, '-$1').toLowerCase());
        });
        return styles;
    }
    
    function extractTailwindClasses(element) {
        if (!element.className || typeof element.className !== 'string') return [];
        return element.className.trim().split(/\\s+/).filter(c => c && !c.startsWith('__vibesdk'));
    }
    
    // Extract React Fiber source location for an element
    // This traverses React internals to find _debugSource which contains file/line info
    function getFiberSource(element) {
        if (!element) return null;
        
        function normalizePath(filePath) {
            if (!filePath) return '';
            // Normalize container paths:
            // /workspace/i-xxx-uuid/src/... -> src/...
            // /app/src/... -> src/...
            if (filePath.includes('/workspace/')) {
                const parts = filePath.split('/');
                const wsIdx = parts.indexOf('workspace');
                if (wsIdx >= 0 && wsIdx + 2 < parts.length) {
                    filePath = parts.slice(wsIdx + 2).join('/');
                }
            } else if (filePath.startsWith('/app/')) {
                filePath = filePath.substring(5);
            } else if (filePath.startsWith('/src/')) {
                filePath = filePath.substring(1);
            }
            return filePath;
        }

        try {
            const keys = Object.keys(element);
            for (let i = 0; i < keys.length; i++) {
                const key = keys[i];
                if (key.startsWith('__reactFiber$') || key.startsWith('__reactInternalInstance$')) {
                    let fiber = element[key];
                    
                    // Strategy: Traverse up the fiber tree looking for a user component with source
                    // 1. Check current fiber
                    // 2. Check return (parent) chain
                    // 3. Check _debugOwner (conceptual owner)
                    
                    let curr = fiber;
                    while (curr) {
                        // Check if this fiber has source info
                        if (curr._debugSource) {
                            return {
                                fileName: normalizePath(curr._debugSource.fileName),
                                lineNumber: curr._debugSource.lineNumber,
                                columnNumber: curr._debugSource.columnNumber
                            };
                        }
                        
                        // If not, check its debug owner (often points to the component that created this element)
                        if (curr._debugOwner && curr._debugOwner._debugSource) {
                             return {
                                fileName: normalizePath(curr._debugOwner._debugSource.fileName),
                                lineNumber: curr._debugOwner._debugSource.lineNumber,
                                columnNumber: curr._debugOwner._debugSource.columnNumber
                            };
                        }
                        
                        // Move up the tree
                        curr = curr.return;
                    }
            }
        } catch (e) {
            console.warn('[VibeSDK] Error extracting fiber source:', e);
        }
        return null;
    }
    

    function extractElementData(element) {
        const rect = element.getBoundingClientRect();
        let sourceLocation = null;
        try {
            sourceLocation = getFiberSource(element);
        } catch (err) {
            console.warn('[VibeSDK] getFiberSource error:', err);
        }
        return {
            tagName: element.tagName.toLowerCase(),
            id: element.id || null,
            className: element.className || '',
            selector: generateSelector(element),
            textContent: element.textContent?.slice(0, 200) || '',
            boundingRect: { top: rect.top, left: rect.left, width: rect.width, height: rect.height },
            computedStyles: extractComputedStyles(element),
            tailwindClasses: extractTailwindClasses(element),
            dataAttributes: {},
            sourceLocation: sourceLocation,
            parentSelector: element.parentElement ? generateSelector(element.parentElement) : null,
            childCount: element.children.length
        };
    }


    
    // ========================================================================
    // Event Handlers
    // ========================================================================
    
    function handleMouseMove(event) {
        if (!isDesignModeActive) return;
        
        const target = event.target;
        if (!target || shouldIgnoreElement(target)) {
            if (hoveredElement) {
                hoveredElement = null;
                hideOverlay(highlightOverlay);
                sendMessage({ type: 'design_mode_element_hovered', element: null });
            }
            return;
        }
        
        if (target === selectedElement) {
            hideOverlay(highlightOverlay);
            return;
        }
        
        if (target !== hoveredElement) {
            hoveredElement = target;
            const rect = target.getBoundingClientRect();
            positionOverlay(highlightOverlay, rect);
            sendMessage({ type: 'design_mode_element_hovered', element: extractElementData(target) });
        }
    }
    
    function handleClick(event) {
        if (!isDesignModeActive) return;
        
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        
        const target = event.target;
        if (!target || shouldIgnoreElement(target)) return;
        
        if (target === selectedElement) {
            selectedElement = null;
            hideOverlay(selectionOverlay);
            sendMessage({ type: 'design_mode_element_deselected' });
            return;
        }
        
        selectedElement = target;
        hoveredElement = null;
        hideOverlay(highlightOverlay);
        
        const rect = target.getBoundingClientRect();
        positionOverlay(selectionOverlay, rect);
        
        sendMessage({ type: 'design_mode_element_selected', element: extractElementData(target) });
    }
    
    function handleKeyDown(event) {
        if (event.key === 'Escape' && selectedElement) {
            selectedElement = null;
            hideOverlay(selectionOverlay);
            sendMessage({ type: 'design_mode_element_deselected' });
        }
    }
    
    function handleScroll() {
        if (selectedElement && selectionOverlay) {
            positionOverlay(selectionOverlay, selectedElement.getBoundingClientRect());
        }
        if (hoveredElement && highlightOverlay) {
            positionOverlay(highlightOverlay, hoveredElement.getBoundingClientRect());
        }
    }
    
    // ========================================================================
    // Style Preview (Direct DOM manipulation for instant feedback)
    // ========================================================================
    
    // Helper function to convert camelCase to kebab-case
    function toKebabCase(str) {
        return str.replace(/([A-Z])/g, '-$1').toLowerCase();
    }
    
    // Apply preview styles DIRECTLY to the selected element (instant feedback)
    function applyPreviewStyle(sel, styles) {
        // Use the stored selectedElement for instant application
        // Fall back to querySelector if element not stored
        const el = selectedElement || document.querySelector(sel);
        
        console.log('[VibeSDK] applyPreviewStyle called', { 
            selector: sel, 
            styles: styles,
            hasSelectedElement: !!selectedElement,
            usingQuerySelector: !selectedElement && !!el,
            elementFound: !!el
        });
        
        if (!el) {
            console.warn('[VibeSDK] applyPreviewStyle: No element found for selector:', sel);
            return;
        }
        
        // Store original styles for restoration
        if (!el.__vibesdk_orig) {
            el.__vibesdk_orig = {};
        }
        
        // Apply each style directly to the element
        for (const prop in styles) {
            const kebabProp = toKebabCase(prop);
            const value = styles[prop];
            
            // Store original value if not already stored
            if (!(prop in el.__vibesdk_orig)) {
                el.__vibesdk_orig[prop] = el.style.getPropertyValue(kebabProp) || '';
            }
            
            console.log('[VibeSDK] Setting style:', kebabProp, '=', value);
            el.style.setProperty(kebabProp, value, 'important');
        }
        
        console.log('[VibeSDK] applyPreviewStyle complete, element style:', el.style.cssText);
    }
    
    // Clear preview styles and restore originals
    function clearPreviewStyle(sel) {
        const el = selectedElement || document.querySelector(sel);
        console.log('[VibeSDK] clearPreviewStyle called', { selector: sel, hasElement: !!el });
        
        if (el && el.__vibesdk_orig) {
            for (const prop in el.__vibesdk_orig) {
                const kebabProp = toKebabCase(prop);
                const originalValue = el.__vibesdk_orig[prop];
                if (originalValue) {
                    el.style.setProperty(kebabProp, originalValue);
                } else {
                    el.style.removeProperty(kebabProp);
                }
            }
            delete el.__vibesdk_orig;
        }
    }
    
    function clearAllPreviewStyles() {
        // Clear from selected element if exists
        if (selectedElement && selectedElement.__vibesdk_orig) {
            clearPreviewStyle(null);
        }
    }
    
    // ========================================================================
    // Message Handler from Parent
    // ========================================================================
    
    function handleParentMessage(event) {
        const data = event.data;
        if (!data || data.prefix !== DESIGN_MODE_MESSAGE_PREFIX) return;
        
        console.log('[VibeSDK] handleParentMessage received:', data.type, data);
        
        switch (data.type) {
            case 'design_mode_enable':
                enableDesignMode();
                break;
                
            case 'design_mode_disable':
                disableDesignMode();
                break;
                
            case 'design_mode_preview_style':
                console.log('[VibeSDK] Received preview_style message:', { selector: data.selector, styles: data.styles });
                if (data.selector && data.styles) {
                    applyPreviewStyle(data.selector, data.styles);
                } else {
                    console.warn('[VibeSDK] preview_style missing selector or styles!');
                }
                break;
                
            case 'design_mode_clear_preview':
                if (data.selector) {
                    clearPreviewStyle(data.selector);
                } else {
                    clearAllPreviewStyles();
                }
                break;
                
            case 'design_mode_clear_selection':
                selectedElement = null;
                hideOverlay(selectionOverlay);
                break;
        }
    }
    
    // ========================================================================
    // Enable/Disable
    // ========================================================================
    
    function enableDesignMode() {
        if (isDesignModeActive) return;
        
        isDesignModeActive = true;
        initializeOverlays();
        
        document.addEventListener('mousemove', handleMouseMove, true);
        document.addEventListener('click', handleClick, true);
        document.addEventListener('mousedown', function(e) { if (isDesignModeActive) { e.preventDefault(); e.stopPropagation(); } }, true);
        document.addEventListener('mouseup', function(e) { if (isDesignModeActive) { e.preventDefault(); e.stopPropagation(); } }, true);
        document.addEventListener('keydown', handleKeyDown, true);
        window.addEventListener('scroll', handleScroll, true);
        
        // Prevent all link and button actions
        document.querySelectorAll('a, button, [onclick]').forEach(function(el) {
            el.style.pointerEvents = 'auto';
        });
        
        document.body.style.cursor = 'crosshair';
        
        console.log('[VibeSDK] Design mode enabled');
    }
    
    function disableDesignMode() {
        if (!isDesignModeActive) return;
        
        isDesignModeActive = false;
        selectedElement = null;
        hoveredElement = null;
        
        document.removeEventListener('mousemove', handleMouseMove, true);
        document.removeEventListener('click', handleClick, true);
        document.removeEventListener('keydown', handleKeyDown, true);
        window.removeEventListener('scroll', handleScroll, true);
        
        cleanupOverlays();
        clearAllPreviewStyles();
        
        document.body.style.cursor = '';
        
        console.log('[VibeSDK] Design mode disabled');
    }
    
    // ========================================================================
    // Initialization
    // ========================================================================
    
    window.addEventListener('message', handleParentMessage);
    sendMessage({ type: 'design_mode_ready' });
    
    console.log('[VibeSDK] Design mode client initialized');
})();
`;
}
