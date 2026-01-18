/**
 * Design Mode Protocol
 * Shared types for postMessage communication between parent and iframe preview
 */

// ============================================================================
// Element Data Types
// ============================================================================

/**
 * Metadata extracted from a DOM element for design mode operations
 */
export interface DesignModeElementData {
	/** Unique CSS selector path to identify the element */
	selector: string;
	/** HTML tag name (e.g., 'div', 'button', 'h1') */
	tagName: string;
	/** Full class string from the element */
	className: string;
	/** Parsed Tailwind utility classes */
	tailwindClasses: string[];
	/** Non-Tailwind classes */
	otherClasses: string[];
	/** Inline style object */
	inlineStyles: Record<string, string>;
	/** Computed CSS styles (subset of relevant properties) */
	computedStyles: DesignModeComputedStyles;
	/** Element bounding rectangle */
	boundingRect: {
		top: number;
		left: number;
		width: number;
		height: number;
		bottom: number;
		right: number;
	};
	/** Text content if the element contains text */
	textContent?: string;
	/** Whether the element has editable text content */
	isTextEditable: boolean;
	/** Source code location if available */
	sourceLocation?: DesignModeSourceLocation;
	/** Parent element selector for context */
	parentSelector?: string;
	/** Child count for context */
	childCount: number;
	/** Element type for contextual design panels */
	elementType?: 'text' | 'button' | 'input' | 'image' | 'container' | 'list' | 'generic';
	/** Whether element has inline styles that might conflict */
	hasInlineStyles?: boolean;
	/** Whether element is nested inside another styled element */
	isNested?: boolean;
}

/**
 * Computed styles relevant for design mode editing
 */
export interface DesignModeComputedStyles {
	// Typography
	fontFamily: string;
	fontSize: string;
	fontWeight: string;
	lineHeight: string;
	letterSpacing: string;
	textAlign: string;
	textDecoration: string;
	textTransform: string;
	color: string;

	// Background
	backgroundColor: string;
	backgroundImage: string;
	backgroundClip: string;
	WebkitBackgroundClip: string;
	WebkitTextFillColor: string;

	// Spacing
	marginTop: string;
	marginRight: string;
	marginBottom: string;
	marginLeft: string;
	paddingTop: string;
	paddingRight: string;
	paddingBottom: string;
	paddingLeft: string;

	// Border
	borderTopWidth: string;
	borderRightWidth: string;
	borderBottomWidth: string;
	borderLeftWidth: string;
	borderTopColor: string;
	borderRightColor: string;
	borderBottomColor: string;
	borderLeftColor: string;
	borderTopLeftRadius: string;
	borderTopRightRadius: string;
	borderBottomRightRadius: string;
	borderBottomLeftRadius: string;
	borderStyle: string;

	// Layout
	display: string;
	flexDirection: string;
	justifyContent: string;
	alignItems: string;
	gap: string;
	width: string;
	height: string;
	minWidth: string;
	minHeight: string;
	maxWidth: string;
	maxHeight: string;

	// Effects
	opacity: string;
	boxShadow: string;
	transform: string;

	// Position
	position: string;
	top: string;
	right: string;
	bottom: string;
	left: string;
	zIndex: string;
}

/**
 * Source code location for "Go to Code" feature
 */
export interface DesignModeSourceLocation {
	filePath: string;
	lineNumber: number;
	columnNumber?: number;
	componentName?: string;
}

// ============================================================================
// Message Types: Parent → Iframe
// ============================================================================

export interface DesignModeEnableMessage {
	type: 'design_mode_enable';
}

export interface DesignModeDisableMessage {
	type: 'design_mode_disable';
}

export interface DesignModePreviewStyleMessage {
	type: 'design_mode_preview_style';
	selector: string;
	styles: Record<string, string>;
}

export interface DesignModeClearPreviewMessage {
	type: 'design_mode_clear_preview';
	selector: string;
}

export interface DesignModeSelectElementMessage {
	type: 'design_mode_select_element';
	selector: string;
}

export interface DesignModeUpdateTextMessage {
	type: 'design_mode_update_text';
	selector: string;
	text: string;
}

/** Messages sent from parent window to iframe */
export type DesignModeParentMessage =
	| DesignModeEnableMessage
	| DesignModeDisableMessage
	| DesignModePreviewStyleMessage
	| DesignModeClearPreviewMessage
	| DesignModeSelectElementMessage
	| DesignModeUpdateTextMessage;

// ============================================================================
// Message Types: Iframe → Parent
// ============================================================================

export interface DesignModeReadyMessage {
	type: 'design_mode_ready';
}

export interface DesignModeElementHoveredMessage {
	type: 'design_mode_element_hovered';
	element: DesignModeElementData | null;
}

export interface DesignModeElementSelectedMessage {
	type: 'design_mode_element_selected';
	element: DesignModeElementData;
}

export interface DesignModeElementDeselectedMessage {
	type: 'design_mode_element_deselected';
}

export interface DesignModeTextEditedMessage {
	type: 'design_mode_text_edited';
	selector: string;
	oldText: string;
	newText: string;
}

export interface DesignModeErrorMessage {
	type: 'design_mode_error';
	error: string;
	context?: string;
}

/** Inline text edit message from double-click editing */
export interface DesignModeInlineTextEditMessage {
	type: 'design_mode_text_edit';
	selector: string;
	oldText: string;
	newText: string;
	sourceLocation?: {
		filePath: string;
		lineNumber: number;
	};
}

/** Messages sent from iframe to parent window */
export type DesignModeIframeMessage =
	| DesignModeReadyMessage
	| DesignModeElementHoveredMessage
	| DesignModeElementSelectedMessage
	| DesignModeElementDeselectedMessage
	| DesignModeTextEditedMessage
	| DesignModeInlineTextEditMessage
	| DesignModeErrorMessage;

// ============================================================================
// Style Change Types (for backend sync)
// ============================================================================

export interface DesignModeStyleChange {
	property: string;
	oldValue: string;
	newValue: string;
	/** Tailwind class that corresponds to this change */
	tailwindClass?: string;
	/** Whether this should modify inline styles instead of classes */
	useInlineStyle?: boolean;
}

export interface DesignModeChangeRequest {
	selector: string;
	filePath?: string;
	changes: DesignModeStyleChange[];
}

// ============================================================================
// Constants
// ============================================================================

/** Prefix for design mode postMessage to avoid conflicts */
export const DESIGN_MODE_MESSAGE_PREFIX = 'vibesdk_design_mode';

/** CSS properties we extract for computed styles */
export const COMPUTED_STYLE_PROPERTIES: (keyof DesignModeComputedStyles)[] = [
	'fontFamily',
	'fontSize',
	'fontWeight',
	'lineHeight',
	'letterSpacing',
	'textAlign',
	'textDecoration',
	'textTransform',
	'color',
	'backgroundColor',
	'backgroundImage',
	'marginTop',
	'marginRight',
	'marginBottom',
	'marginLeft',
	'paddingTop',
	'paddingRight',
	'paddingBottom',
	'paddingLeft',
	'borderTopWidth',
	'borderRightWidth',
	'borderBottomWidth',
	'borderLeftWidth',
	'borderTopColor',
	'borderRightColor',
	'borderBottomColor',
	'borderLeftColor',
	'borderTopLeftRadius',
	'borderTopRightRadius',
	'borderBottomRightRadius',
	'borderBottomLeftRadius',
	'borderStyle',
	'display',
	'flexDirection',
	'justifyContent',
	'alignItems',
	'gap',
	'width',
	'height',
	'minWidth',
	'minHeight',
	'maxWidth',
	'maxHeight',
	'opacity',
	'boxShadow',
	'transform',
	'position',
	'top',
	'right',
	'bottom',
	'left',
	'zIndex',
];

/** Elements that should be ignored during design mode selection */
export const IGNORED_ELEMENTS = [
	'script',
	'style',
	'link',
	'meta',
	'head',
	'html',
	'noscript',
];

/** Elements that typically contain editable text */
export const TEXT_EDITABLE_ELEMENTS = [
	'p',
	'h1',
	'h2',
	'h3',
	'h4',
	'h5',
	'h6',
	'span',
	'a',
	'button',
	'label',
	'li',
	'td',
	'th',
	'caption',
	'figcaption',
	'blockquote',
	'cite',
	'q',
	'strong',
	'em',
	'b',
	'i',
	'u',
	'small',
	'mark',
	'del',
	'ins',
	'sub',
	'sup',
];
