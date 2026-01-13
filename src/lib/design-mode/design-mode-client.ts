/**
 * Design Mode Client Script
 * This script is injected into the preview iframe to enable element selection
 * and communication with the parent design mode panel.
 */

import {
    type DesignModeElementData,
    type DesignModeComputedStyles,
    type DesignModeParentMessage,
    type DesignModeIframeMessage,
    DESIGN_MODE_MESSAGE_PREFIX,
    COMPUTED_STYLE_PROPERTIES,
    IGNORED_ELEMENTS,
    TEXT_EDITABLE_ELEMENTS,
} from './design-mode-protocol';
import { parseTailwindClasses } from './tailwind-utils';

// ============================================================================
// State
// ============================================================================

console.log('[VibeSDK] Design mode client loaded - VERSION: 3.0 (CLIENT)');

let isDesignModeActive = false;
let selectedElement: HTMLElement | null = null;
let hoveredElement: HTMLElement | null = null;
let highlightOverlay: HTMLElement | null = null;
let selectionOverlay: HTMLElement | null = null;

// ============================================================================
// Overlay Management
// ============================================================================

function createOverlay(id: string, color: string): HTMLElement {
    let overlay = document.getElementById(id);
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = id;
        overlay.style.cssText = `
			position: fixed;
			pointer-events: none;
			z-index: 999999;
			border: 2px solid ${color};
			background: ${color}11;
			transition: all 0.1s ease-out;
			display: none;
		`;
        document.body.appendChild(overlay);
    }
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
    if (overlay) {
        overlay.style.display = 'none';
    }
}

function initializeOverlays(): void {
    highlightOverlay = createOverlay('__vibesdk_highlight_overlay', '#3b82f6');
    selectionOverlay = createOverlay('__vibesdk_selection_overlay', '#8b5cf6');
    // Selection overlay has a thicker border
    if (selectionOverlay) {
        selectionOverlay.style.borderWidth = '3px';
    }
}

function cleanupOverlays(): void {
    highlightOverlay?.remove();
    selectionOverlay?.remove();
    highlightOverlay = null;
    selectionOverlay = null;
}

// ============================================================================
// Element Data Extraction
// ============================================================================

// Global element map for direct lookup
declare global {
    interface Window {
        __vibesdkElementMap?: Map<string, HTMLElement>;
    }
}

/**
 * Generate a stable selector using data-vibesdk-id attribute
 */
function generateSelector(element: HTMLElement): string {
    console.log('[VibeSDK] ===== generateSelector called (CLIENT) =====');
    console.log('[VibeSDK] Element:', element.tagName, 'className:', element.className);
    
    // ALWAYS assign a unique tracking ID
    if (!element.dataset.vibesdkId) {
        const trackingId = `el-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        element.dataset.vibesdkId = trackingId;
        
        // Store direct element reference in a global map for instant lookup
        if (!window.__vibesdkElementMap) {
            window.__vibesdkElementMap = new Map();
            console.log('[VibeSDK] Created new element map');
        }
        window.__vibesdkElementMap.set(trackingId, element);
        
        console.log('[VibeSDK] Assigned NEW tracking ID:', trackingId, 'to', element.tagName, element.className);
    } else {
        console.log('[VibeSDK] Element already has tracking ID:', element.dataset.vibesdkId);
    }
    
    const selector = `[data-vibesdk-id="${element.dataset.vibesdkId}"]`;
    console.log('[VibeSDK] Generated selector:', selector);
    return selector;
}

/**
 * Extract computed styles from an element
 */
function extractComputedStyles(element: HTMLElement): DesignModeComputedStyles {
    const computed = window.getComputedStyle(element);
    const styles: Partial<DesignModeComputedStyles> = {};

    for (const prop of COMPUTED_STYLE_PROPERTIES) {
        // Convert camelCase to kebab-case for getPropertyValue
        const kebabProp = prop.replace(/([A-Z])/g, '-$1').toLowerCase();
        styles[prop] = computed.getPropertyValue(kebabProp) || computed[prop as keyof CSSStyleDeclaration] as string || '';
    }

    return styles as DesignModeComputedStyles;
}

/**
 * Extract inline styles from an element
 */
function extractInlineStyles(element: HTMLElement): Record<string, string> {
    const styles: Record<string, string> = {};
    const styleAttr = element.getAttribute('style');

    if (styleAttr) {
        const declarations = styleAttr.split(';');
        for (const decl of declarations) {
            const [prop, value] = decl.split(':').map(s => s.trim());
            if (prop && value) {
                // Convert to camelCase
                const camelProp = prop.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
                styles[camelProp] = value;
            }
        }
    }

    return styles;
}

/**
 * Check if element has direct text content (not in child elements)
 */
function hasDirectTextContent(element: HTMLElement): boolean {
    for (const node of element.childNodes) {
        if (node.nodeType === Node.TEXT_NODE && node.textContent?.trim()) {
            return true;
        }
    }
    return false;
}

/**
 * Get direct text content of an element
 */
function getDirectTextContent(element: HTMLElement): string {
    let text = '';
    for (const node of element.childNodes) {
        if (node.nodeType === Node.TEXT_NODE) {
            text += node.textContent || '';
        }
    }
    return text.trim();
}

/**
 * Check if an element should be considered text-editable
 */
function isTextEditable(element: HTMLElement): boolean {
    const tagName = element.tagName.toLowerCase();
    if (!TEXT_EDITABLE_ELEMENTS.includes(tagName)) {
        return false;
    }
    // Must have direct text content and no complex children
    return hasDirectTextContent(element);
}

/**
 * Extract comprehensive data from an element
 */
function extractElementData(element: HTMLElement): DesignModeElementData {
    const rect = element.getBoundingClientRect();
    const className = typeof element.className === 'string' ? element.className : '';
    const { tailwind: tailwindClasses, other: otherClasses } = parseTailwindClasses(className);

    return {
        selector: generateSelector(element),
        tagName: element.tagName.toLowerCase(),
        className,
        tailwindClasses,
        otherClasses,
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
        parentSelector: element.parentElement ? generateSelector(element.parentElement) : undefined,
        childCount: element.children.length,
    };
}

// ============================================================================
// Event Handlers
// ============================================================================

function shouldIgnoreElement(element: HTMLElement): boolean {
    const tagName = element.tagName.toLowerCase();
    return (
        IGNORED_ELEMENTS.includes(tagName) ||
        element.id.startsWith('__vibesdk') ||
        element.closest('[id^="__vibesdk"]') !== null
    );
}

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

    // Don't update if hovering over the selected element
    if (target === selectedElement) {
        hideOverlay(highlightOverlay);
        return;
    }

    if (target !== hoveredElement) {
        hoveredElement = target;
        const rect = target.getBoundingClientRect();
        if (highlightOverlay) {
            positionOverlay(highlightOverlay, rect);
        }
        sendMessage({ type: 'design_mode_element_hovered', element: extractElementData(target) });
    }
}

function handleClick(event: MouseEvent): void {
    if (!isDesignModeActive) return;

    event.preventDefault();
    event.stopPropagation();

    const target = event.target as HTMLElement;
    if (!target || shouldIgnoreElement(target)) {
        return;
    }

    // Deselect if clicking the same element
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
    if (selectionOverlay) {
        positionOverlay(selectionOverlay, rect);
    }

    sendMessage({ type: 'design_mode_element_selected', element: extractElementData(target) });
}

function handleKeyDown(event: KeyboardEvent): void {
    // Escape to deselect
    if (event.key === 'Escape' && selectedElement) {
        selectedElement = null;
        hideOverlay(selectionOverlay);
        sendMessage({ type: 'design_mode_element_deselected' });
    }
}

function handleScroll(): void {
    // Update overlay positions on scroll
    if (selectedElement && selectionOverlay) {
        const rect = selectedElement.getBoundingClientRect();
        positionOverlay(selectionOverlay, rect);
    }
    if (hoveredElement && highlightOverlay) {
        const rect = hoveredElement.getBoundingClientRect();
        positionOverlay(highlightOverlay, rect);
    }
}

// ============================================================================
// Style Preview (temporary styles before commit)
// ============================================================================

const previewStyleElements = new Map<string, HTMLStyleElement>();

function applyPreviewStyle(selector: string, styles: Record<string, string>): void {
    // Remove existing preview for this selector
    clearPreviewStyle(selector);

    // Create CSS text
    const cssProperties = Object.entries(styles)
        .map(([prop, value]) => {
            const kebabProp = prop.replace(/([A-Z])/g, '-$1').toLowerCase();
            return `${kebabProp}: ${value} !important`;
        })
        .join('; ');

    const styleEl = document.createElement('style');
    styleEl.id = `__vibesdk_preview_${selector.replace(/[^a-zA-Z0-9]/g, '_')}`;
    styleEl.textContent = `${selector} { ${cssProperties} }`;
    document.head.appendChild(styleEl);
    previewStyleElements.set(selector, styleEl);
}

function clearPreviewStyle(selector: string): void {
    const styleEl = previewStyleElements.get(selector);
    if (styleEl) {
        styleEl.remove();
        previewStyleElements.delete(selector);
    }
}

function clearAllPreviewStyles(): void {
    for (const styleEl of previewStyleElements.values()) {
        styleEl.remove();
    }
    previewStyleElements.clear();
}

// ============================================================================
// Message Handling
// ============================================================================

function sendMessage(message: DesignModeIframeMessage): void {
    if (window.parent && window.parent !== window) {
        window.parent.postMessage(
            { prefix: DESIGN_MODE_MESSAGE_PREFIX, ...message },
            '*'
        );
    }
}

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
                    const rect = element.getBoundingClientRect();
                    if (selectionOverlay) {
                        positionOverlay(selectionOverlay, rect);
                    }
                }
            }
            break;

        case 'design_mode_update_text':
            if ('selector' in message && 'text' in message) {
                const element = document.querySelector(message.selector) as HTMLElement;
                if (element && isTextEditable(element)) {
                    const oldText = getDirectTextContent(element);
                    // Find and update text nodes
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

    document.addEventListener('mousemove', handleMouseMove, true);
    document.addEventListener('click', handleClick, true);
    document.addEventListener('keydown', handleKeyDown, true);
    window.addEventListener('scroll', handleScroll, true);

    // Add cursor style
    document.body.style.cursor = 'crosshair';
}

function disableDesignMode(): void {
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

    // Reset cursor
    document.body.style.cursor = '';
}

/**
 * Initialize design mode client
 * This should be called when the script is injected
 */
export function initDesignModeClient(): void {
    window.addEventListener('message', handleParentMessage);
    sendMessage({ type: 'design_mode_ready' });
}

/**
 * Cleanup design mode client
 */
export function cleanupDesignModeClient(): void {
    disableDesignMode();
    window.removeEventListener('message', handleParentMessage);
}

// ============================================================================
// Script Injection Helper
// ============================================================================

/**
 * Generate the script content to be injected into the iframe
 * This bundles the client script for injection
 */
export function getDesignModeClientScript(): string {
    // In production, this would return a minified/bundled version
    // For now, we return the initialization call
    return `
		(function() {
			// Design mode client will be initialized by the preview
			window.__vibesdk_design_mode_enabled = false;
		})();
	`;
}
