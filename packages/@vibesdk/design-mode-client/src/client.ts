/**
 * Design Mode Client Script
 * Unified client-side script for design mode functionality.
 * This runs inside the preview iframe to enable element selection,
 * style preview, and inline text editing.
 * 
 * Features:
 * - Element selection with overlay
 * - Real-time style preview
 * - Inline text editing (double-click)
 * - React Fiber source location detection
 * - Element type detection for contextual panels
 */

import {
    DESIGN_MODE_MESSAGE_PREFIX,
    SCRIPT_VERSION,
    COMPUTED_STYLE_PROPERTIES,
    IGNORED_ELEMENTS,
    TEXT_EDITABLE_ELEMENTS,
    type DesignModeElementData,
    type DesignModeComputedStyles,
    type DesignModeSourceLocation,
    type DesignModeIframeMessage,
    type DesignModeParentMessage,
} from './protocol';

// ============================================================================
// Global State
// ============================================================================

declare global {
    interface Window {
        __vibesdk_design_mode_version?: string;
        __vibesdk_design_mode_initialized?: boolean;
        __vibesdkElementMap?: Map<string, HTMLElement>;
    }
}

let isDesignModeActive = false;
let selectedElement: HTMLElement | null = null;
let hoveredElement: HTMLElement | null = null;
let highlightOverlay: HTMLElement | null = null;
let selectionOverlay: HTMLElement | null = null;
let textEditOverlay: HTMLElement | null = null;
let designModeStyleElement: HTMLStyleElement | null = null;

// ============================================================================
// Version Check & Initialization Guard
// ============================================================================

function shouldInitialize(): boolean {
    if (window.__vibesdk_design_mode_version) {
        const existingVersion = parseFloat(window.__vibesdk_design_mode_version);
        const newVersion = parseFloat(SCRIPT_VERSION);
        if (existingVersion >= newVersion) {
            // console.log(`[VibeSDK] Version ${existingVersion} already loaded, skipping ${SCRIPT_VERSION}`);
            return false;
        }
        // console.log(`[VibeSDK] Upgrading from version ${existingVersion} to ${SCRIPT_VERSION}`);
    }
    window.__vibesdk_design_mode_version = SCRIPT_VERSION;

    if (window.__vibesdk_design_mode_initialized) {
        return false;
    }
    window.__vibesdk_design_mode_initialized = true;
    return true;
}

// ============================================================================
// Messaging
// ============================================================================

function sendMessage(message: DesignModeIframeMessage): void {
    try {
        if (window.parent && window.parent !== window) {
            window.parent.postMessage({ prefix: DESIGN_MODE_MESSAGE_PREFIX, ...message }, '*');
        }
    } catch (e) {
        console.error('[VibeSDK] Failed to send message', e);
    }
}

// ============================================================================
// Overlay Management
// ============================================================================

function createOverlay(id: string, color: string, borderStyle: string = 'solid'): HTMLElement {
    let overlay = document.getElementById(id);
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = id;
        document.body.appendChild(overlay);
    }

    // Always update styles to catch changes (e.g. solid -> dashed)
    const newStyle = `
        position: fixed;
        pointer-events: none;
        z-index: 999999;
        border: 2px ${borderStyle} ${color};
        background: ${color}11;
        transition: all 0.1s ease-out;
        display: none;
    `;

    // Debug log to confirm style application
    // console.log(`[VibeSDK] Updating overlay ${id} with style: border: 2px ${borderStyle} ${color}`);

    overlay.style.cssText = newStyle;

    return overlay;
}

function positionOverlay(overlay: HTMLElement, rect: DOMRect): void {
    overlay.style.top = `${rect.top}px`;
    overlay.style.left = `${rect.left}px`;
    overlay.style.width = `${rect.width}px`;
    overlay.style.height = `${rect.height}px`;
    overlay.style.display = 'block';
}

function hideOverlay(overlay: HTMLElement | null): void {
    if (overlay) overlay.style.display = 'none';
}

function initializeOverlays(): void {
    // Purple dashed for hover (#8b5cf6)
    // console.log('[VibeSDK] Initializing hover overlay (purple dashed)...');
    highlightOverlay = createOverlay('__vibesdk_highlight_overlay', '#8b5cf6', 'dashed');

    // Blue solid for selection (#3b82f6)
    selectionOverlay = createOverlay('__vibesdk_selection_overlay', '#3b82f6', 'solid');
    if (selectionOverlay) selectionOverlay.style.borderWidth = '2px';
}

function cleanupOverlays(): void {
    highlightOverlay?.remove();
    selectionOverlay?.remove();
    textEditOverlay?.remove();
    highlightOverlay = null;
    selectionOverlay = null;
    textEditOverlay = null;
}

// ============================================================================
// Element Tracking
// ============================================================================

function generateSelector(element: HTMLElement): string {
    // Assign unique tracking ID if not present
    if (!element.dataset.vibesdkId) {
        const trackingId = `el-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        element.dataset.vibesdkId = trackingId;

        if (!window.__vibesdkElementMap) {
            window.__vibesdkElementMap = new Map();
        }
        window.__vibesdkElementMap.set(trackingId, element);
    }

    return `[data-vibesdk-id="${element.dataset.vibesdkId}"]`;
}

function shouldIgnoreElement(element: HTMLElement): boolean {
    const tagName = element.tagName.toLowerCase();
    return (
        IGNORED_ELEMENTS.includes(tagName) ||
        element.id.startsWith('__vibesdk') ||
        element.closest('[id^="__vibesdk"]') !== null
    );
}

// ============================================================================
// Source Location Detection (react-grab + React Fiber fallback)
// ============================================================================

// react-grab getStack function - loaded dynamically
// Using 'any' type to avoid conflicts with react-grab's StackFrame type
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let reactGrabGetStack: ((element: Element) => Promise<any>) | null = null;
let reactGrabLoadAttempted = false;

async function loadReactGrab(): Promise<void> {
    if (reactGrabLoadAttempted) return;
    reactGrabLoadAttempted = true;

    try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const grabModule = await import('react-grab/core') as any;
        reactGrabGetStack = grabModule.getStack;
        // console.log('[VibeSDK] react-grab loaded successfully');
    } catch (e) {
        console.warn('[VibeSDK] react-grab not available, using fallback:', (e as Error).message);
    }
}

// Try to load react-grab on init
loadReactGrab();

async function getSourceLocationWithReactGrab(element: HTMLElement): Promise<DesignModeSourceLocation | null> {
    if (!reactGrabGetStack) return null;

    try {
        const stack = await reactGrabGetStack(element);
        if (stack && stack.length > 0 && stack[0].source) {
            let filePath = stack[0].source.fileName || '';

            // Normalize container paths: /workspace/i-xxx/src/... -> src/...
            const match = filePath.match(/\/(?:workspace\/[^\/]+|app)\/(.+)/);
            if (match) {
                filePath = match[1];
            }

            const location = {
                filePath,
                lineNumber: stack[0].source.lineNumber || 0,
                columnNumber: stack[0].source.columnNumber || 0,
            };

            // console.log('[VibeSDK] react-grab source:', location);
            return location;
        }
    } catch (e) {
        console.warn('[VibeSDK] react-grab getStack failed:', (e as Error).message);
    }

    return null;
}

function getFiberSourceFallback(element: HTMLElement): DesignModeSourceLocation | null {
    if (!element) return null;

    try {
        const keys = Object.keys(element);
        for (const key of keys) {
            if (key.startsWith('__reactFiber$') || key.startsWith('__reactInternalInstance$')) {
                let fiber = (element as any)[key];
                while (fiber) {
                    if (fiber._debugSource) {
                        const src = fiber._debugSource;
                        let filePath = src.fileName || '';

                        // Normalize container paths
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

                        return {
                            filePath,
                            lineNumber: src.lineNumber || 0,
                            columnNumber: src.columnNumber || 0,
                        };
                    }
                    fiber = fiber.return || fiber._debugOwner;
                }
                break;
            }
        }
    } catch (e) {
        console.warn('[VibeSDK] Error extracting fiber source:', e);
    }
    return null;
}

async function getSourceLocation(element: HTMLElement): Promise<DesignModeSourceLocation | null> {
    // Try react-grab first (more accurate)
    const reactGrabSource = await getSourceLocationWithReactGrab(element);
    if (reactGrabSource) return reactGrabSource;

    // Fallback to _debugSource
    return getFiberSourceFallback(element);
}

// ============================================================================
// Element Data Extraction
// ============================================================================

function extractComputedStyles(element: HTMLElement): DesignModeComputedStyles {
    const computed = window.getComputedStyle(element);
    const styles: Partial<DesignModeComputedStyles> = {};

    for (const prop of COMPUTED_STYLE_PROPERTIES) {
        const kebabProp = prop.replace(/([A-Z])/g, '-$1').toLowerCase();
        styles[prop] = computed.getPropertyValue(kebabProp) || '';
    }

    return styles as DesignModeComputedStyles;
}

function extractInlineStyles(element: HTMLElement): Record<string, string> {
    const styles: Record<string, string> = {};
    const styleAttr = element.getAttribute('style');

    if (styleAttr) {
        const declarations = styleAttr.split(';');
        for (const decl of declarations) {
            const [prop, value] = decl.split(':').map(s => s.trim());
            if (prop && value) {
                const camelProp = prop.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
                styles[camelProp] = value;
            }
        }
    }

    return styles;
}

function extractTailwindClasses(element: HTMLElement): string[] {
    // Use getAttribute to handle both HTML and SVG elements
    // SVG elements have SVGAnimatedString for className which can't be serialized
    const classAttr = element.getAttribute('class');
    if (!classAttr) return [];
    return classAttr.trim().split(/\s+/).filter(c => c && !c.startsWith('__vibesdk'));
}

function hasDirectTextContent(element: HTMLElement): boolean {
    for (const node of element.childNodes) {
        if (node.nodeType === Node.TEXT_NODE && node.textContent?.trim()) {
            return true;
        }
    }
    return false;
}

function getDirectTextContent(element: HTMLElement): string {
    let text = '';
    for (const node of element.childNodes) {
        if (node.nodeType === Node.TEXT_NODE) {
            text += node.textContent || '';
        }
    }
    return text.trim();
}

function isTextEditable(element: HTMLElement): boolean {
    const tagName = element.tagName.toLowerCase();
    if (!TEXT_EDITABLE_ELEMENTS.includes(tagName)) return false;
    return hasDirectTextContent(element);
}

function detectElementType(element: HTMLElement): DesignModeElementData['elementType'] {
    const tagName = element.tagName.toLowerCase();

    if (tagName === 'button' || element.getAttribute('role') === 'button') return 'button';
    if (tagName === 'input' || tagName === 'textarea' || tagName === 'select') return 'input';
    if (['span', 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'label', 'a'].includes(tagName)) return 'text';
    if (tagName === 'img' || tagName === 'svg') return 'image';
    if (['div', 'section', 'article', 'header', 'footer', 'nav', 'main', 'aside'].includes(tagName)) return 'container';
    if (['ul', 'ol', 'li'].includes(tagName)) return 'list';

    return 'generic';
}

function extractElementData(element: HTMLElement): DesignModeElementData {
    const rect = element.getBoundingClientRect();
    // Use synchronous fallback for extractElementData (async version used for text edit)
    const sourceLocation = getFiberSourceFallback(element) ?? undefined;

    return {
        selector: generateSelector(element),
        tagName: element.tagName.toLowerCase(),
        // Use getAttribute for className to handle SVG elements (SVGAnimatedString can't be cloned)
        className: element.getAttribute('class') || '',
        tailwindClasses: extractTailwindClasses(element),
        inlineStyles: extractInlineStyles(element),
        computedStyles: extractComputedStyles(element),
        boundingRect: {
            top: rect.top,
            left: rect.left,
            width: rect.width,
            height: rect.height,
            bottom: rect.bottom,
            right: rect.right,
        },
        textContent: isTextEditable(element) ? getDirectTextContent(element) : undefined,
        isTextEditable: isTextEditable(element),
        sourceLocation,
        parentSelector: element.parentElement ? generateSelector(element.parentElement) : undefined,
        childCount: element.children.length,
        elementType: detectElementType(element),
        hasInlineStyles: !!(element.style && element.style.cssText),
        isNested: !!element.parentElement && element.parentElement.tagName !== 'BODY',
    };
}

// ============================================================================
// Event Handlers
// ============================================================================

function handleMouseMove(event: MouseEvent): void {
    if (!isDesignModeActive) return;

    const target = event.target as HTMLElement;
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
        if (highlightOverlay) {
            positionOverlay(highlightOverlay, target.getBoundingClientRect());
        }
        sendMessage({ type: 'design_mode_element_hovered', element: extractElementData(target) });
    }
}

async function handleClick(event: MouseEvent): Promise<void> {
    if (!isDesignModeActive) return;

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();

    const target = event.target as HTMLElement;
    if (!target || shouldIgnoreElement(target)) return;

    // Deselect if clicking same element
    if (target === selectedElement) {
        selectedElement = null;
        hideOverlay(selectionOverlay);
        sendMessage({ type: 'design_mode_element_deselected' });
        return;
    }

    selectedElement = target;
    hoveredElement = null;
    hideOverlay(highlightOverlay);

    if (selectionOverlay) {
        positionOverlay(selectionOverlay, target.getBoundingClientRect());
    }

    // Get base data synchronously
    const elementData = extractElementData(target);

    // Try to get more accurate source location asynchronously
    const accurateSource = await getSourceLocation(target);
    if (accurateSource) {
        elementData.sourceLocation = accurateSource;
    }

    sendMessage({ type: 'design_mode_element_selected', element: elementData });
}

function handleDoubleClick(event: MouseEvent): void {
    if (!isDesignModeActive) return;

    const target = event.target as HTMLElement;
    if (!target || shouldIgnoreElement(target)) return;

    // Only allow text editing on text-editable elements
    if (!isTextEditable(target)) return;

    event.preventDefault();
    event.stopPropagation();

    startInlineTextEdit(target);
}

function handleKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
        if (textEditOverlay) {
            cancelInlineTextEdit();
        } else if (selectedElement) {
            selectedElement = null;
            hideOverlay(selectionOverlay);
            sendMessage({ type: 'design_mode_element_deselected' });
        }
    }
}

function handleScroll(): void {
    if (selectedElement && selectionOverlay) {
        positionOverlay(selectionOverlay, selectedElement.getBoundingClientRect());
    }
    if (hoveredElement && highlightOverlay) {
        positionOverlay(highlightOverlay, hoveredElement.getBoundingClientRect());
    }
}

function handleMouseLeave(): void {
    if (!isDesignModeActive) return;

    // Clear hover state when mouse leaves the document/iframe
    if (hoveredElement) {
        hoveredElement = null;
        hideOverlay(highlightOverlay);
        sendMessage({ type: 'design_mode_element_hovered', element: null });
    }
}

// ============================================================================
// Inline Text Editing
// ============================================================================

let editingElement: HTMLElement | null = null;
let originalText: string = '';

function startInlineTextEdit(element: HTMLElement): void {
    if (textEditOverlay) return; // Already editing

    editingElement = element;
    originalText = getDirectTextContent(element);

    const rect = element.getBoundingClientRect();
    const computed = window.getComputedStyle(element);

    // Create container overlay
    textEditOverlay = document.createElement('div');
    textEditOverlay.id = '__vibesdk_text_edit_overlay';
    textEditOverlay.style.cssText = `
        position: fixed;
        top: ${rect.top}px;
        left: ${rect.left}px;
        min-width: ${Math.max(rect.width, 50)}px;
        min-height: ${rect.height}px;
        z-index: 1000000;
        background: white;
        border: 2px solid #8b5cf6;
        border-radius: 4px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        display: flex;
        flex-direction: column;
    `;

    // Create contenteditable div
    // We use a div instead of textarea to support auto-expansion and better text rendering
    const input = document.createElement('div');
    input.id = '__vibesdk_text_input';
    input.contentEditable = 'true';
    input.innerText = originalText;

    // Force high contrast styles (Black text on White background)
    // accessible regardless of original element color
    input.style.cssText = `
        width: 100%;
        height: 100%;
        min-height: ${rect.height}px;
        border: none;
        outline: none;
        padding: 8px;
        font-family: ${computed.fontFamily};
        font-size: ${computed.fontSize};
        font-weight: ${computed.fontWeight};
        line-height: ${computed.lineHeight};
        color: #000000 !important;
        background: #ffffff !important;
        white-space: pre-wrap;
        overflow-wrap: break-word;
    `;

    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault(); // Prevent newline
            commitInlineTextEdit();
        } else if (e.key === 'Escape') {
            cancelInlineTextEdit();
        }
    });

    // Blur = Commit
    input.addEventListener('blur', () => {
        // Delay to allow standard click events to register
        setTimeout(() => {
            if (textEditOverlay) {
                commitInlineTextEdit();
            }
        }, 100);
    });

    textEditOverlay.appendChild(input);
    document.body.appendChild(textEditOverlay);

    // Focus and select all content
    input.focus();

    // Select all text
    const range = document.createRange();
    range.selectNodeContents(input);
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
}

async function commitInlineTextEdit(): Promise<void> {
    if (!textEditOverlay || !editingElement) return;

    const input = document.getElementById('__vibesdk_text_input');
    // For contentEditable, use innerText to get the value
    const newText = input?.innerText.trim() || '';

    if (newText !== originalText) {
        // Update DOM immediately for instant feedback
        for (const node of editingElement.childNodes) {
            if (node.nodeType === Node.TEXT_NODE && node.textContent?.trim()) {
                node.textContent = newText;
                break;
            }
        }

        // Send update to parent
        // Use async source location for accurate commit
        const sourceLocation = await getSourceLocation(editingElement);

        sendMessage({
            type: 'design_mode_text_edit',
            selector: generateSelector(editingElement),
            oldText: originalText,
            newText,
            sourceLocation: sourceLocation ? {
                filePath: sourceLocation.filePath,
                lineNumber: sourceLocation.lineNumber,
            } : undefined,
        });
    }

    cleanupTextEdit();
}

function cancelInlineTextEdit(): void {
    cleanupTextEdit();
}

function cleanupTextEdit(): void {
    textEditOverlay?.remove();
    textEditOverlay = null;
    editingElement = null;
    originalText = '';
}

// ============================================================================
// Style Preview
// ============================================================================

function toKebabCase(str: string): string {
    return str.replace(/([A-Z])/g, '-$1').toLowerCase();
}

const tailwindConflicts: Record<string, RegExp> = {
    'fontSize': /^text-(xs|sm|base|lg|xl|2xl|3xl|4xl|5xl|6xl|7xl|8xl|9xl)$/,
    'fontWeight': /^font-(thin|extralight|light|normal|medium|semibold|bold|extrabold|black)$/,
    'textAlign': /^text-(left|center|right|justify|start|end)$/,
    'color': /^text-\w+(-\d+)?$/,
    'backgroundColor': /^bg-\w+(-\d+)?$/,
    'padding': /^p([tblrxy])?-\d+$/,
    'paddingTop': /^p(t)?-\d+$/,
    'paddingBottom': /^p(b)?-\d+$/,
    'paddingLeft': /^p(l)?-\d+$/,
    'paddingRight': /^p(r)?-\d+$/,
    'margin': /^m([tblrxy])?-\d+$/,
    'marginTop': /^m(t)?-\d+$/,
    'marginBottom': /^m(b)?-\d+$/,
    'marginLeft': /^m(l)?-\d+$/,
    'marginRight': /^m(r)?-\d+$/,
};

interface OriginalState {
    styles: Record<string, string>;
    className: string;
}

function applyPreviewStyle(selector: string, styles: Record<string, string>): void {
    // Find element
    let el = selectedElement;

    if (!el) {
        const idMatch = selector.match(/\[data-vibesdk-id="([^"]+)"\]/);
        if (idMatch && window.__vibesdkElementMap) {
            el = window.__vibesdkElementMap.get(idMatch[1]) || null;
        }
    }

    if (!el) {
        el = document.querySelector(selector) as HTMLElement;
    }

    if (!el) {
        console.warn('[VibeSDK] applyPreviewStyle: Element not found:', selector);
        return;
    }

    // Store original state
    if (!(el as any).__vibesdk_orig) {
        (el as any).__vibesdk_orig = {
            styles: {},
            className: el.className,
        } as OriginalState;
    }

    const orig = (el as any).__vibesdk_orig as OriginalState;
    const classes = el.className.split(/\s+/).filter(c => c);
    const classesToRemove: string[] = [];

    // Apply styles
    for (const prop in styles) {
        const kebabProp = toKebabCase(prop);
        const value = styles[prop];

        // Store original
        if (!(prop in orig.styles)) {
            orig.styles[prop] = el.style.getPropertyValue(kebabProp) || '';
        }

        // Remove conflicting Tailwind classes
        const conflictPattern = tailwindConflicts[prop];
        if (conflictPattern) {
            classes.forEach(cls => {
                if (conflictPattern.test(cls)) {
                    classesToRemove.push(cls);
                }
            });
        }

        el.style.setProperty(kebabProp, value, 'important');
    }

    // Update classes
    if (classesToRemove.length > 0) {
        el.className = classes.filter(c => !classesToRemove.includes(c)).join(' ');
    }

    // Update overlay position
    if (el === selectedElement && selectionOverlay) {
        positionOverlay(selectionOverlay, el.getBoundingClientRect());
    }
}

function clearPreviewStyle(selector: string): void {
    const el = selectedElement || document.querySelector(selector) as HTMLElement;
    if (!el) return;

    const orig = (el as any).__vibesdk_orig as OriginalState | undefined;
    if (orig) {
        // Restore styles
        for (const prop in orig.styles) {
            const kebabProp = toKebabCase(prop);
            if (orig.styles[prop]) {
                el.style.setProperty(kebabProp, orig.styles[prop]);
            } else {
                el.style.removeProperty(kebabProp);
            }
        }

        // Restore className
        if (orig.className !== undefined) {
            el.className = orig.className;
        }

        delete (el as any).__vibesdk_orig;
    }

    // Update overlay
    if (el === selectedElement && selectionOverlay) {
        positionOverlay(selectionOverlay, el.getBoundingClientRect());
    }
}

function clearAllPreviewStyles(): void {
    if (selectedElement && (selectedElement as any).__vibesdk_orig) {
        clearPreviewStyle('');
    }
}

// ============================================================================
// Design Mode Styles (Animation/Transition Freeze + Input Blocking)
// ============================================================================

const DESIGN_MODE_CSS = `
/* Disable all animations and transitions */
*:not([id^="__vibesdk"]) {
    transition: none !important;
    animation: none !important;
}

/* Disable hover effects that might interfere with selection */
*:not([id^="__vibesdk"]):hover {
    transform: none !important;
}

/* Block input interactions */
input:not([id^="__vibesdk"]),
textarea:not([id^="__vibesdk"]),
select:not([id^="__vibesdk"]) {
    pointer-events: none !important;
    user-select: none !important;
    cursor: crosshair !important;
}

/* Prevent contenteditable elements from being editable */
[contenteditable]:not([id^="__vibesdk"]) {
    -webkit-user-modify: read-only !important;
    cursor: crosshair !important;
}
`;

function injectDesignModeStyles(): void {
    if (designModeStyleElement) return;

    designModeStyleElement = document.createElement('style');
    designModeStyleElement.id = '__vibesdk_design_mode_styles';
    designModeStyleElement.textContent = DESIGN_MODE_CSS;
    document.head.appendChild(designModeStyleElement);
}

function removeDesignModeStyles(): void {
    if (designModeStyleElement) {
        designModeStyleElement.remove();
        designModeStyleElement = null;
    }
}

function isFormElement(element: HTMLElement): boolean {
    const tagName = element.tagName.toLowerCase();
    return tagName === 'input' || tagName === 'textarea' || tagName === 'select';
}

function blockFormInputKeydown(event: KeyboardEvent): void {
    if (!isDesignModeActive) return;
    const target = event.target as HTMLElement;
    if (target && isFormElement(target)) {
        // Allow Escape key to pass through for deselection
        if (event.key !== 'Escape') {
            event.preventDefault();
            event.stopPropagation();
        }
    }
}

function blockFormInputFocus(event: FocusEvent): void {
    if (!isDesignModeActive) return;
    const target = event.target as HTMLElement;
    if (target && isFormElement(target)) {
        event.preventDefault();
        target.blur();
    }
}

// ============================================================================
// Message Handler
// ============================================================================

function handleParentMessage(event: MessageEvent): void {
    const data = event.data;
    if (!data || data.prefix !== DESIGN_MODE_MESSAGE_PREFIX) return;

    const message = data as DesignModeParentMessage & { prefix: string };

    switch (message.type) {
        case 'design_mode_enable':
            enableDesignMode();
            break;

        case 'design_mode_disable':
            disableDesignMode();
            break;

        case 'design_mode_preview_style':
            if ('selector' in message && 'styles' in message) {
                applyPreviewStyle(message.selector, message.styles);
            }
            break;

        case 'design_mode_clear_preview':
            if ('selector' in message) {
                clearPreviewStyle(message.selector);
            }
            break;

        case 'design_mode_select_element':
            if ('selector' in message) {
                const element = document.querySelector(message.selector) as HTMLElement;
                if (element) {
                    selectedElement = element;
                    if (selectionOverlay) {
                        positionOverlay(selectionOverlay, element.getBoundingClientRect());
                    }
                }
            }
            break;

        case 'design_mode_update_text':
            if ('selector' in message && 'text' in message) {
                const element = document.querySelector(message.selector) as HTMLElement;
                if (element && isTextEditable(element)) {
                    const oldText = getDirectTextContent(element);
                    for (const node of element.childNodes) {
                        if (node.nodeType === Node.TEXT_NODE && node.textContent?.trim()) {
                            node.textContent = message.text;
                            break;
                        }
                    }
                    sendMessage({
                        type: 'design_mode_text_edited',
                        selector: message.selector,
                        oldText,
                        newText: message.text,
                    });
                }
            }
            break;
    }
}

// ============================================================================
// Lifecycle
// ============================================================================

function enableDesignMode(): void {
    if (isDesignModeActive) return;

    isDesignModeActive = true;
    initializeOverlays();
    injectDesignModeStyles();

    document.addEventListener('mousemove', handleMouseMove, { capture: true });
    document.addEventListener('mouseleave', handleMouseLeave);
    document.addEventListener('click', handleClick, { capture: true });
    document.addEventListener('dblclick', handleDoubleClick, true);
    // REMOVED: mousedown/mouseup listeners that prevented focus change
    // This allows the text editor to lose focus (blur) when clicking outside
    document.addEventListener('keydown', handleKeyDown, true);
    document.addEventListener('keydown', blockFormInputKeydown, true);
    document.addEventListener('focus', blockFormInputFocus, true);
    window.addEventListener('scroll', handleScroll, { capture: true });
    document.body.style.cursor = 'crosshair';

    // console.log(`[VibeSDK v${SCRIPT_VERSION}] Design mode enabled`);
}

function disableDesignMode(): void {
    if (!isDesignModeActive) return;

    isDesignModeActive = false;
    selectedElement = null;
    hoveredElement = null;

    document.removeEventListener('mousemove', handleMouseMove, true);
    document.removeEventListener('mouseleave', handleMouseLeave, true);
    document.removeEventListener('click', handleClick, true);
    document.removeEventListener('dblclick', handleDoubleClick, true);
    document.removeEventListener('keydown', handleKeyDown, true);
    document.removeEventListener('keydown', blockFormInputKeydown, true);
    document.removeEventListener('focus', blockFormInputFocus, true);
    window.removeEventListener('scroll', handleScroll, true);

    cleanupOverlays();
    cleanupTextEdit();
    clearAllPreviewStyles();
    removeDesignModeStyles();

    document.body.style.cursor = '';

    // console.log('[VibeSDK] Design mode disabled');
}

// ============================================================================
// Auto-Initialize
// ============================================================================

function init(): void {
    if (!shouldInitialize()) return;

    // console.log(`[VibeSDK] Design mode client initialized - VERSION: ${SCRIPT_VERSION}`);

    window.addEventListener('message', handleParentMessage);
    sendMessage({ type: 'design_mode_ready' });
}

// Run on load
init();
