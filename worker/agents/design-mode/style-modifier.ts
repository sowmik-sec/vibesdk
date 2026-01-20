/**
 * Deterministic Style Modifier
 * Directly modifies React/JSX source code to apply style changes
 * without requiring AI regeneration.
 */

import type { DesignModeStyleChange } from '../../api/websocketTypes';

// ============================================================================
// CSS Value to Tailwind Mappings
// ============================================================================

// Color mappings (hex to Tailwind color classes)
const TAILWIND_COLORS: Record<string, string> = {
    '#000000': 'black',
    '#ffffff': 'white',
    '#f8fafc': 'slate-50',
    '#f1f5f9': 'slate-100',
    '#e2e8f0': 'slate-200',
    '#cbd5e1': 'slate-300',
    '#94a3b8': 'slate-400',
    '#64748b': 'slate-500',
    '#475569': 'slate-600',
    '#334155': 'slate-700',
    '#1e293b': 'slate-800',
    '#0f172a': 'slate-900',
    '#fef2f2': 'red-50',
    '#fee2e2': 'red-100',
    '#fecaca': 'red-200',
    '#fca5a5': 'red-300',
    '#f87171': 'red-400',
    '#ef4444': 'red-500',
    '#dc2626': 'red-600',
    '#b91c1c': 'red-700',
    '#991b1b': 'red-800',
    '#7f1d1d': 'red-900',
    '#eff6ff': 'blue-50',
    '#dbeafe': 'blue-100',
    '#bfdbfe': 'blue-200',
    '#93c5fd': 'blue-300',
    '#60a5fa': 'blue-400',
    '#3b82f6': 'blue-500',
    '#2563eb': 'blue-600',
    '#1d4ed8': 'blue-700',
    '#1e40af': 'blue-800',
    '#1e3a8a': 'blue-900',
    '#f0fdf4': 'green-50',
    '#dcfce7': 'green-100',
    '#bbf7d0': 'green-200',
    '#86efac': 'green-300',
    '#4ade80': 'green-400',
    '#22c55e': 'green-500',
    '#16a34a': 'green-600',
    '#15803d': 'green-700',
    '#166534': 'green-800',
    '#14532d': 'green-900',
};

// Font size mappings (rem/px to Tailwind)
const TAILWIND_FONT_SIZES: Record<string, string> = {
    '0.75rem': 'text-xs',
    '12px': 'text-xs',
    '0.875rem': 'text-sm',
    '14px': 'text-sm',
    '1rem': 'text-base',
    '16px': 'text-base',
    '1.125rem': 'text-lg',
    '18px': 'text-lg',
    '1.25rem': 'text-xl',
    '20px': 'text-xl',
    '1.5rem': 'text-2xl',
    '24px': 'text-2xl',
    '1.875rem': 'text-3xl',
    '30px': 'text-3xl',
    '2.25rem': 'text-4xl',
    '36px': 'text-4xl',
    '3rem': 'text-5xl',
    '48px': 'text-5xl',
};

// Font weight mappings
const TAILWIND_FONT_WEIGHTS: Record<string, string> = {
    '100': 'font-thin',
    '200': 'font-extralight',
    '300': 'font-light',
    '400': 'font-normal',
    '500': 'font-medium',
    '600': 'font-semibold',
    '700': 'font-bold',
    '800': 'font-extrabold',
    '900': 'font-black',
};

// Spacing mappings (for padding/margin)
const TAILWIND_SPACING: Record<string, string> = {
    '0': '0',
    '0px': '0',
    '0.125rem': '0.5',
    '2px': '0.5',
    '0.25rem': '1',
    '4px': '1',
    '0.375rem': '1.5',
    '6px': '1.5',
    '0.5rem': '2',
    '8px': '2',
    '0.625rem': '2.5',
    '10px': '2.5',
    '0.75rem': '3',
    '12px': '3',
    '0.875rem': '3.5',
    '14px': '3.5',
    '1rem': '4',
    '16px': '4',
    '1.25rem': '5',
    '20px': '5',
    '1.5rem': '6',
    '24px': '6',
    '1.75rem': '7',
    '28px': '7',
    '2rem': '8',
    '32px': '8',
    '2.5rem': '10',
    '40px': '10',
    '3rem': '12',
    '48px': '12',
    '4rem': '16',
    '64px': '16',
};

// Text align mappings
const TAILWIND_TEXT_ALIGN: Record<string, string> = {
    'left': 'text-left',
    'center': 'text-center',
    'right': 'text-right',
    'justify': 'text-justify',
};

// ============================================================================
// Conversion Functions
// ============================================================================

/**
 * Convert a CSS property/value pair to a Tailwind class or arbitrary value
 */
function cssToTailwind(property: string, value: string): { class: string; prefix: string } | null {
    const normalizedValue = value.toLowerCase().trim();

    switch (property) {
        case 'color': {
            const colorName = TAILWIND_COLORS[normalizedValue];
            if (colorName) {
                return { class: `text-${colorName}`, prefix: 'text' };
            }
            // Use arbitrary value for unknown colors
            return { class: `text-[${value}]`, prefix: 'text' };
        }

        case 'backgroundColor': {
            const colorName = TAILWIND_COLORS[normalizedValue];
            if (colorName) {
                return { class: `bg-${colorName}`, prefix: 'bg' };
            }
            return { class: `bg-[${value}]`, prefix: 'bg' };
        }

        case 'fontSize': {
            const sizeClass = TAILWIND_FONT_SIZES[normalizedValue];
            if (sizeClass) {
                return { class: sizeClass, prefix: 'text' };
            }
            return { class: `text-[${value}]`, prefix: 'text' };
        }

        case 'fontWeight': {
            const weightClass = TAILWIND_FONT_WEIGHTS[normalizedValue];
            if (weightClass) {
                return { class: weightClass, prefix: 'font' };
            }
            return { class: `font-[${value}]`, prefix: 'font' };
        }

        case 'fontStyle': {
            // italic or normal -> italic or remove italic class
            if (normalizedValue === 'italic') {
                return { class: 'italic', prefix: 'italic' };
            }
            // Remove italic (set to normal) - return empty class to trigger removal
            return { class: '', prefix: 'italic' };
        }

        case 'textAlign': {
            const alignClass = TAILWIND_TEXT_ALIGN[normalizedValue];
            if (alignClass) {
                return { class: alignClass, prefix: 'text' };
            }
            return null;
        }

        case 'padding':
        case 'paddingTop':
        case 'paddingRight':
        case 'paddingBottom':
        case 'paddingLeft': {
            const prefix = property === 'padding' ? 'p' :
                property === 'paddingTop' ? 'pt' :
                    property === 'paddingRight' ? 'pr' :
                        property === 'paddingBottom' ? 'pb' : 'pl';
            const spacing = TAILWIND_SPACING[normalizedValue];
            if (spacing) {
                return { class: `${prefix}-${spacing}`, prefix };
            }
            return { class: `${prefix}-[${value}]`, prefix };
        }

        case 'margin':
        case 'marginTop':
        case 'marginRight':
        case 'marginBottom':
        case 'marginLeft': {
            const prefix = property === 'margin' ? 'm' :
                property === 'marginTop' ? 'mt' :
                    property === 'marginRight' ? 'mr' :
                        property === 'marginBottom' ? 'mb' : 'ml';
            const spacing = TAILWIND_SPACING[normalizedValue];
            if (spacing) {
                return { class: `${prefix}-${spacing}`, prefix };
            }
            return { class: `${prefix}-[${value}]`, prefix };
        }

        // Border width
        case 'borderWidth':
        case 'borderTopWidth':
        case 'borderRightWidth':
        case 'borderBottomWidth':
        case 'borderLeftWidth': {
            const prefix = property === 'borderWidth' ? 'border' :
                property === 'borderTopWidth' ? 'border-t' :
                    property === 'borderRightWidth' ? 'border-r' :
                        property === 'borderBottomWidth' ? 'border-b' : 'border-l';
            // Common border widths
            if (normalizedValue === '0' || normalizedValue === '0px') {
                return { class: `${prefix}-0`, prefix: prefix };
            }
            if (normalizedValue === '1px') {
                return { class: prefix, prefix: prefix }; // border = 1px by default
            }
            if (normalizedValue === '2px') {
                return { class: `${prefix}-2`, prefix: prefix };
            }
            if (normalizedValue === '4px') {
                return { class: `${prefix}-4`, prefix: prefix };
            }
            if (normalizedValue === '8px') {
                return { class: `${prefix}-8`, prefix: prefix };
            }
            return { class: `${prefix}-[${value}]`, prefix: prefix };
        }

        // Border color
        case 'borderColor':
        case 'borderTopColor':
        case 'borderRightColor':
        case 'borderBottomColor':
        case 'borderLeftColor': {
            // Use distinct prefixes that include the side AND indicate color
            // This avoids conflicts with border-width classes
            const classPrefix = property === 'borderColor' ? 'border' :
                property === 'borderTopColor' ? 'border-t' :
                    property === 'borderRightColor' ? 'border-r' :
                        property === 'borderBottomColor' ? 'border-b' : 'border-l';
            // Use a distinct internal prefix for pattern matching
            const patternPrefix = property === 'borderColor' ? 'border-color' :
                property === 'borderTopColor' ? 'border-t-color' :
                    property === 'borderRightColor' ? 'border-r-color' :
                        property === 'borderBottomColor' ? 'border-b-color' : 'border-l-color';
            const colorName = TAILWIND_COLORS[normalizedValue];
            if (colorName) {
                return { class: `${classPrefix}-${colorName}`, prefix: patternPrefix };
            }
            return { class: `${classPrefix}-[${value}]`, prefix: patternPrefix };
        }

        // Border radius
        case 'borderRadius':
        case 'borderTopLeftRadius':
        case 'borderTopRightRadius':
        case 'borderBottomLeftRadius':
        case 'borderBottomRightRadius': {
            const prefix = property === 'borderRadius' ? 'rounded' :
                property === 'borderTopLeftRadius' ? 'rounded-tl' :
                    property === 'borderTopRightRadius' ? 'rounded-tr' :
                        property === 'borderBottomLeftRadius' ? 'rounded-bl' : 'rounded-br';
            // Common radius values
            if (normalizedValue === '0' || normalizedValue === '0px') {
                return { class: `${prefix}-none`, prefix: prefix };
            }
            if (normalizedValue === '0.125rem' || normalizedValue === '2px') {
                return { class: `${prefix}-sm`, prefix: prefix };
            }
            if (normalizedValue === '0.25rem' || normalizedValue === '4px') {
                return { class: prefix, prefix: prefix };
            }
            if (normalizedValue === '0.375rem' || normalizedValue === '6px') {
                return { class: `${prefix}-md`, prefix: prefix };
            }
            if (normalizedValue === '0.5rem' || normalizedValue === '8px') {
                return { class: `${prefix}-lg`, prefix: prefix };
            }
            if (normalizedValue === '0.75rem' || normalizedValue === '12px') {
                return { class: `${prefix}-xl`, prefix: prefix };
            }
            if (normalizedValue === '1rem' || normalizedValue === '16px') {
                return { class: `${prefix}-2xl`, prefix: prefix };
            }
            if (normalizedValue === '1.5rem' || normalizedValue === '24px') {
                return { class: `${prefix}-3xl`, prefix: prefix };
            }
            if (normalizedValue === '9999px' || normalizedValue === '50%') {
                return { class: `${prefix}-full`, prefix: prefix };
            }
            return { class: `${prefix}-[${value}]`, prefix: prefix };
        }

        // Border style
        case 'borderStyle': {
            const styles: Record<string, string> = {
                'solid': 'border-solid',
                'dashed': 'border-dashed',
                'dotted': 'border-dotted',
                'double': 'border-double',
                'none': 'border-none',
            };
            const styleClass = styles[normalizedValue];
            if (styleClass) {
                // Use distinct prefix to avoid conflict with border-width classes
                return { class: styleClass, prefix: 'border-style' };
            }
            return null;
        }

        // Text decoration (underline, line-through) - supports multiple decorations
        case 'textDecoration': {
            const classes: string[] = [];
            if (normalizedValue.includes('underline')) {
                classes.push('underline');
            }
            if (normalizedValue.includes('line-through')) {
                classes.push('line-through');
            }

            if (classes.length === 0 && normalizedValue === 'none') {
                return { class: '', prefix: 'text-decoration' };
            }
            if (classes.length === 0) {
                return null;
            }

            // CSS Conflict Fix: "underline" and "line-through" classes are non-additive in CSS.
            // If both are present, we must use an arbitrary value to apply them simultaneously.
            if (classes.length > 1) {
                // Tailwind arbitrary value format: [text-decoration-line:underline_line-through]
                return {
                    class: `[text-decoration-line:${classes.join('_')}]`,
                    prefix: 'text-decoration'
                };
            }

            // Single decoration can use standard class
            return { class: classes[0], prefix: 'text-decoration' };
        }

        // Line height
        case 'lineHeight': {
            const lineHeightMap: Record<string, string> = {
                '1': 'leading-none',
                '1.25': 'leading-tight',
                '1.375': 'leading-snug',
                '1.5': 'leading-normal',
                '1.625': 'leading-relaxed',
                '2': 'leading-loose',
                '0.75rem': 'leading-3',
                '1rem': 'leading-4',
                '1.25rem': 'leading-5',
                '1.5rem': 'leading-6',
                '1.75rem': 'leading-7',
                '2rem': 'leading-8',
                '2.25rem': 'leading-9',
                '2.5rem': 'leading-10',
            };
            const leadingClass = lineHeightMap[normalizedValue];
            if (leadingClass) {
                return { class: leadingClass, prefix: 'leading' };
            }
            return { class: `leading-[${value}]`, prefix: 'leading' };
        }

        // Letter spacing
        case 'letterSpacing': {
            const letterSpacingMap: Record<string, string> = {
                '-0.05em': 'tracking-tighter',
                '-0.025em': 'tracking-tight',
                '0': 'tracking-normal',
                '0em': 'tracking-normal',
                '0.025em': 'tracking-wide',
                '0.05em': 'tracking-wider',
                '0.1em': 'tracking-widest',
            };
            const trackingClass = letterSpacingMap[normalizedValue];
            if (trackingClass) {
                return { class: trackingClass, prefix: 'tracking' };
            }
            return { class: `tracking-[${value}]`, prefix: 'tracking' };
        }

        // Opacity
        case 'opacity': {
            const opacityMap: Record<string, string> = {
                '0': 'opacity-0',
                '0.05': 'opacity-5',
                '0.1': 'opacity-10',
                '0.2': 'opacity-20',
                '0.25': 'opacity-25',
                '0.3': 'opacity-30',
                '0.4': 'opacity-40',
                '0.5': 'opacity-50',
                '0.6': 'opacity-60',
                '0.7': 'opacity-70',
                '0.75': 'opacity-75',
                '0.8': 'opacity-80',
                '0.9': 'opacity-90',
                '0.95': 'opacity-95',
                '1': 'opacity-100',
            };
            const opacityClass = opacityMap[normalizedValue];
            if (opacityClass) {
                return { class: opacityClass, prefix: 'opacity' };
            }
            // Convert percentage to opacity class
            const percent = parseFloat(normalizedValue);
            if (!isNaN(percent) && percent >= 0 && percent <= 100) {
                return { class: `opacity-[${percent / 100}]`, prefix: 'opacity' };
            }
            return { class: `opacity-[${value}]`, prefix: 'opacity' };
        }

        // Box shadow
        case 'boxShadow': {
            if (normalizedValue === 'none') {
                return { class: 'shadow-none', prefix: 'shadow' };
            }
            // Match common Tailwind shadow values
            if (normalizedValue.includes('0 1px 2px 0')) {
                return { class: 'shadow-sm', prefix: 'shadow' };
            }
            if (normalizedValue.includes('0 4px 6px -1px')) {
                return { class: 'shadow-md', prefix: 'shadow' };
            }
            if (normalizedValue.includes('0 10px 15px -3px')) {
                return { class: 'shadow-lg', prefix: 'shadow' };
            }
            if (normalizedValue.includes('0 20px 25px -5px')) {
                return { class: 'shadow-xl', prefix: 'shadow' };
            }
            if (normalizedValue.includes('0 25px 50px -12px')) {
                return { class: 'shadow-2xl', prefix: 'shadow' };
            }
            if (normalizedValue.includes('inset')) {
                return { class: 'shadow-inner', prefix: 'shadow' };
            }
            return { class: 'shadow', prefix: 'shadow' };
        }

        // Font family
        case 'fontFamily': {
            if (normalizedValue.includes('sans-serif') || normalizedValue.includes('ui-sans-serif')) {
                return { class: 'font-sans', prefix: 'font' };
            }
            if (normalizedValue.includes('serif')) {
                return { class: 'font-serif', prefix: 'font' };
            }
            if (normalizedValue.includes('monospace') || normalizedValue.includes('ui-monospace')) {
                return { class: 'font-mono', prefix: 'font' };
            }
            // For specific fonts, use arbitrary value
            return { class: `font-[${value.split(',')[0].trim().replace(/['"]/g, '')}]`, prefix: 'font' };
        }

        default:
            return null;
    }
}

/**
 * Get the regex pattern to match existing Tailwind classes for a property
 */
/**
 * Get the regex pattern to match existing Tailwind classes for a property
 */
function getExistingClassPattern(prefix: string): RegExp {
    // Helper to create safe regex that matches whole class but ignores variants (e.g. matches 'underline' but not 'hover:underline')
    // Matches: start-of-string OR whitespace, followed by class, followed by whitespace OR end-of-string
    const safeMatch = (pattern: string) => new RegExp(`(?:^|\\s)(${pattern})(?=\\s|$)`, 'g');

    switch (prefix) {
        case 'text':
            return safeMatch('text-(?:inherit|current|transparent|black|white|[\\w]+-\\d+|xs|sm|base|lg|xl|2xl|3xl|4xl|5xl|6xl|7xl|8xl|9xl|left|center|right|justify|\\[.+?\\])');
        case 'bg':
            return safeMatch('bg-(?:inherit|current|transparent|black|white|[\\w]+-\\d+|\\[.+?\\])');
        case 'font':
            return safeMatch('font-(?:thin|extralight|light|normal|medium|semibold|bold|extrabold|black|\\[.+?\\])');
        case 'p':
            return safeMatch('p-(?:\\d+\\.?\\d*|\\[.+?\\])');
        case 'pt':
            return safeMatch('pt-(?:\\d+\\.?\\d*|\\[.+?\\])');
        case 'pr':
            return safeMatch('pr-(?:\\d+\\.?\\d*|\\[.+?\\])');
        case 'pb':
            return safeMatch('pb-(?:\\d+\\.?\\d*|\\[.+?\\])');
        case 'pl':
            return safeMatch('pl-(?:\\d+\\.?\\d*|\\[.+?\\])');
        case 'px':
            return safeMatch('px-(?:\\d+\\.?\\d*|\\[.+?\\])');
        case 'py':
            return safeMatch('py-(?:\\d+\\.?\\d*|\\[.+?\\])');
        case 'm':
            return safeMatch('-?m-(?:\\d+\\.?\\d*|auto|\\[.+?\\])');
        case 'mt':
            return safeMatch('-?mt-(?:\\d+\\.?\\d*|auto|\\[.+?\\])');
        case 'mr':
            return safeMatch('-?mr-(?:\\d+\\.?\\d*|auto|\\[.+?\\])');
        case 'mb':
            return safeMatch('-?mb-(?:\\d+\\.?\\d*|auto|\\[.+?\\])');
        case 'ml':
            return safeMatch('-?ml-(?:\\d+\\.?\\d*|auto|\\[.+?\\])');
        case 'mx':
            return safeMatch('-?mx-(?:\\d+\\.?\\d*|auto|\\[.+?\\])');
        case 'my':
            return safeMatch('-?my-(?:\\d+\\.?\\d*|auto|\\[.+?\\])');

        // Border width - matches border, border-2, border-[3px], etc. but NOT style keywords or colors
        case 'border':
            return safeMatch('border(?:-[trblxy])?(?:-(?:\\d+|DEFAULT|\\[\\d+[^\\]]*\\]))?');
        case 'border-t':
        case 'border-r':
        case 'border-b':
        case 'border-l':
            return safeMatch(`${prefix}(?:-(?:\\d+|DEFAULT|\\[\\d+[^\\]]*\\]))?`);
        // Border style - matches border-solid, border-dashed, etc.
        case 'border-style':
            return safeMatch('border-(?:solid|dashed|dotted|double|none|hidden)');
        // Border color - matches border-red-500, border-[#fff], etc. but NOT width numbers
        case 'border-color':
            return safeMatch('border(?:-[trbl])?-(?:inherit|current|transparent|black|white|[a-zA-Z]+-\\d+|\\[[^\\]]+\\])');

        // Side-specific border colors
        case 'border-t-color':
        case 'border-r-color':
        case 'border-b-color':
        case 'border-l-color': {
            const side = prefix.split('-')[1]; // 't', 'r', 'b', or 'l'
            return safeMatch(`border-${side}-(?:inherit|current|transparent|black|white|[a-zA-Z]+-\\d+|\\[[^\\]]+\\])`);
        }
        // Border radius
        case 'rounded':
            return safeMatch('rounded(?:-[trbl]?[trbl]?)?(?:-(?:none|sm|md|lg|xl|2xl|3xl|full|\\[.+?\\]))?');

        case 'italic':
            return safeMatch('italic|not-italic');

        case 'text-decoration':
            // Matches underline, line-through, no-underline AND arbitrary values like [text-decoration-line:...]
            return safeMatch('underline|no-underline|line-through|\\[text-decoration-line:[^\\]]+\\]');
        case 'underline':
            return safeMatch('underline|no-underline');
        case 'line-through':
            return safeMatch('line-through');

        // Line height
        case 'leading':
            return safeMatch('leading-(?:none|tight|snug|normal|relaxed|loose|\\d+|\\[.+?\\])');
        // Letter spacing
        case 'tracking':
            return safeMatch('tracking-(?:tighter|tight|normal|wide|wider|widest|\\[.+?\\])');
        // Opacity
        case 'opacity':
            return safeMatch('opacity-(?:\\d+|\\[.+?\\])');
        // Box shadow
        case 'shadow':
            return safeMatch('shadow(?:-none|-sm|-md|-lg|-xl|-2xl|-inner)?');

        default:
            return safeMatch(`${prefix}-[\\w\\[\\].]+`);
    }
}

// ============================================================================
// Source Code Modification
// ============================================================================

export interface ElementLocationResult {
    start: number;
    end: number;
    className: string;
    type: 'attribute' | 'insert';
}

/**
 * Find JSX elements in source code that match the selector
 * Returns the className attribute location(s)
 */
export function findElementByTextContent(source: string, textContent: string): ElementLocationResult | null {
    if (!textContent || textContent.length < 3) return null;

    const cleanText = textContent.trim().slice(0, 50);

    // Search for JSX elements containing this text
    // Look for patterns like: >text content< or >{text}< or className="...">{text}

    // Create a flexible regex that allows for arbitrary whitespace (newlines) between words
    // Escape special regex characters
    const escapedText = cleanText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const flexiblePattern = escapedText.replace(/\s+/g, '\\s+');
    const textRegex = new RegExp(flexiblePattern);

    console.log(`[StyleModifier] Searching for text pattern: ${flexiblePattern.slice(0, 100)}...`);

    const match = source.match(textRegex);
    if (!match) {
        console.log('[StyleModifier] Text regex match failed.');
        return null;
    }

    console.log(`[StyleModifier] Text match found at index ${match.index}`);
    // const textRegexResult = match; // Unused
    const textIndex = match.index!;

    // Find the opening tag before this text
    let searchStart = textIndex;
    let depth = 0;

    while (searchStart > 0) {
        searchStart--;
        if (source[searchStart] === '>') depth++;
        if (source[searchStart] === '<') {
            if (depth === 1) break;
            depth--;
        }
    }

    if (searchStart <= 0) return null;

    // Extract the tag content
    const tagEnd = source.indexOf('>', searchStart);
    if (tagEnd === -1) return null;

    const tagContent = source.slice(searchStart, tagEnd + 1);

    // Find className in the tag
    const classNameMatch = tagContent.match(/className\s*=\s*([\"'`])/);
    if (classNameMatch) {
        // Found existing className. We match the opening quote.
        // classNameMatch[0] is `className="` (or ' or `)
        // classNameMatch[1] is the quote char

        const relativeStart = tagContent.indexOf(classNameMatch[0]);
        const openQuotePos = relativeStart + classNameMatch[0].length - 1; // Position of the quote in tagContent
        const quoteChar = classNameMatch[1];

        // Find closing quote starting after opening quote
        const relativeValueStart = openQuotePos + 1;
        const relativeValueEnd = tagContent.indexOf(quoteChar, relativeValueStart);

        if (relativeValueEnd !== -1) {
            const className = tagContent.slice(relativeValueStart, relativeValueEnd);
            const absValueStart = searchStart + relativeValueStart;
            const absValueEnd = searchStart + relativeValueEnd;

            return {
                start: absValueStart,
                end: absValueEnd,
                className: className,
                type: 'attribute'
            };
        }
    }

    // If no className exists, find where to insert it (after the tag name)
    const tagNameMatch = tagContent.match(/<(\w+)/);
    if (tagNameMatch) {
        const tagName = tagNameMatch[1];

        // VALIDATION 1: Check tag name boundary
        // Tag name must be followed by whitespace, '>', or '/'
        // Rejects: <string[] (next char is [)
        const matchEndIndex = tagNameMatch.index! + tagNameMatch[0].length;
        const nextChar = tagContent[matchEndIndex];
        if (nextChar && !/[\s>\/]/.test(nextChar)) {
            return null;
        }

        // VALIDATION 2: HTML Tag allowlist
        // If tag starts with lowercase, it MUST be a valid HTML tag.
        // Rejects: <string>, <number>, <any>, <customVar>
        if (/^[a-z]/.test(tagName)) {
            const validHtmlTags = new Set([
                'a', 'abbr', 'address', 'area', 'article', 'aside', 'audio', 'b', 'base', 'bdi', 'bdo', 'blockquote', 'body', 'br', 'button', 'canvas', 'caption', 'cite', 'code', 'col', 'colgroup', 'data', 'datalist', 'dd', 'del', 'details', 'dfn', 'dialog', 'div', 'dl', 'dt', 'em', 'embed', 'fieldset', 'figcaption', 'figure', 'footer', 'form', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'head', 'header', 'hgroup', 'hr', 'html', 'i', 'iframe', 'img', 'input', 'ins', 'kbd', 'label', 'legend', 'li', 'link', 'main', 'map', 'mark', 'menu', 'meta', 'meter', 'nav', 'noscript', 'object', 'ol', 'optgroup', 'option', 'output', 'p', 'param', 'picture', 'pre', 'progress', 'q', 'rp', 'rt', 'ruby', 's', 'samp', 'script', 'section', 'select', 'small', 'source', 'span', 'strong', 'style', 'sub', 'summary', 'sup', 'svg', 'table', 'tbody', 'td', 'template', 'textarea', 'tfoot', 'th', 'thead', 'time', 'title', 'tr', 'track', 'u', 'ul', 'var', 'video', 'wbr'
            ]);
            if (!validHtmlTags.has(tagName)) {
                return null;
            }
        }

        const insertPos = searchStart + tagNameMatch[0].length;
        return {
            start: insertPos,
            end: insertPos,
            className: '', // Empty means we need to add className attribute
            type: 'insert'
        };
    }

    return null;
}

/**
 * Find element by source line number (1-indexed)
 */
export function findElementByLineNumber(source: string, lineNumber: number): ElementLocationResult | null {
    if (!lineNumber || lineNumber < 1) return null;

    const lines = source.split('\n');
    if (lineNumber > lines.length) return null;

    // Line index (0-based)
    const lineIdx = lineNumber - 1;

    // Calculate character offset for the start of the line
    let offset = 0;
    for (let i = 0; i < lineIdx; i++) {
        offset += lines[i].length + 1; // +1 for newline
    }

    // The element tag likely starts on this line or slightly before/after
    // We search backwards from the end of this line to find the opening <tag
    const lineEndOffset = offset + lines[lineIdx].length;

    // Search backwards for the opening tag start '<'
    let searchPos = lineEndOffset;
    let foundStart = -1;

    // Limit search distance to avoid going too far up (e.g., 20 lines back)
    const minPos = Math.max(0, offset - 1000);

    while (searchPos >= minPos) {
        if (source[searchPos] === '<' && source[searchPos + 1] !== '/') {
            // Potential opening tag
            foundStart = searchPos;
            break;
        }
        searchPos--;
    }

    if (foundStart === -1) return null;

    // Find the end of the opening tag '>'
    // It must be at or after the start position
    const tagEnd = source.indexOf('>', foundStart);
    if (tagEnd === -1) return null;

    const tagContent = source.slice(foundStart, tagEnd + 1);

    // Check if this looks like a valid tag (simple check)
    // if (!tagContent.match(/^<[a-zA-Z]/)) return null;

    const tagNameMatch = tagContent.match(/^<(\w+)/);
    if (!tagNameMatch) return null;
    const tagName = tagNameMatch[1];

    // VALIDATION 1: Check tag name boundary
    // Tag name must be followed by whitespace, '>', or '/'
    if (tagContent.length > tagName.length + 1) {
        const nextChar = tagContent[tagName.length + 1];
        if (!/[\s>\/]/.test(nextChar)) return null;
    }

    // VALIDATION 2: HTML Tag allowlist
    // If tag starts with lowercase, it MUST be valid HTML
    if (/^[a-z]/.test(tagName)) {
        const validHtmlTags = new Set([
            'a', 'abbr', 'address', 'area', 'article', 'aside', 'audio', 'b', 'base', 'bdi', 'bdo', 'blockquote', 'body', 'br', 'button', 'canvas', 'caption', 'cite', 'code', 'col', 'colgroup', 'data', 'datalist', 'dd', 'del', 'details', 'dfn', 'dialog', 'div', 'dl', 'dt', 'em', 'embed', 'fieldset', 'figcaption', 'figure', 'footer', 'form', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'head', 'header', 'hgroup', 'hr', 'html', 'i', 'iframe', 'img', 'input', 'ins', 'kbd', 'label', 'legend', 'li', 'link', 'main', 'map', 'mark', 'menu', 'meta', 'meter', 'nav', 'noscript', 'object', 'ol', 'optgroup', 'option', 'output', 'p', 'param', 'picture', 'pre', 'progress', 'q', 'rp', 'rt', 'ruby', 's', 'samp', 'script', 'section', 'select', 'small', 'source', 'span', 'strong', 'style', 'sub', 'summary', 'sup', 'svg', 'table', 'tbody', 'td', 'template', 'textarea', 'tfoot', 'th', 'thead', 'time', 'title', 'tr', 'track', 'u', 'ul', 'var', 'video', 'wbr'
        ]);
        if (!validHtmlTags.has(tagName)) return null;
    }

    // Find className in the tag
    const classNameMatch = tagContent.match(/className\s*=\s*([\"'`])/);
    if (classNameMatch) {
        // Found existing className. We match the opening quote.
        const relativeStart = tagContent.indexOf(classNameMatch[0]);
        const openQuotePos = relativeStart + classNameMatch[0].length - 1;
        const quoteChar = classNameMatch[1];

        const relativeValueStart = openQuotePos + 1;
        const relativeValueEnd = tagContent.indexOf(quoteChar, relativeValueStart);

        if (relativeValueEnd !== -1) {
            return {
                start: foundStart + relativeValueStart,
                end: foundStart + relativeValueEnd,
                className: tagContent.slice(relativeValueStart, relativeValueEnd),
                type: 'attribute'
            };
        }
    }

    // If no className exists, return insertion point
    // const tagNameMatch = tagContent.match(/<(\w+)/); // ALREADY DEFINED ABOVE
    if (tagNameMatch) {
        const insertPos = foundStart + tagNameMatch[0].length;
        return {
            start: insertPos,
            end: insertPos,
            className: '',
            type: 'insert'
        };
    }

    return null;
}

/**
 * Find element by CSS selector (ID or class)
 */
export function findElementBySelector(source: string, selector: string): ElementLocationResult | null {
    if (!selector) return null;

    // Extract ID
    const idMatch = selector.match(/#([a-zA-Z0-9_-]+)/);
    if (idMatch) {
        const id = idMatch[1];
        // Search for id="..."
        const idRegex = new RegExp(`id=["'\`]${id}["'\`]`);
        const match = source.match(idRegex);
        if (match && match.index !== undefined) {
            // We found the ID, now find the tag boundaries
            // Search backwards for <tag
            let start = match.index;
            while (start > 0 && source[start] !== '<') start--;

            const end = source.indexOf('>', match.index);
            if (end === -1) return null;

            const tagContent = source.slice(start, end + 1);

            // Now look for className in this tag
            const classNameMatch = tagContent.match(/className\s*=\s*([\"'`])/);
            if (classNameMatch) {
                const relativeStart = tagContent.indexOf(classNameMatch[0]);
                const openQuotePos = relativeStart + classNameMatch[0].length - 1;
                const quoteChar = classNameMatch[1];

                const relativeValueStart = openQuotePos + 1;
                const relativeValueEnd = tagContent.indexOf(quoteChar, relativeValueStart);

                if (relativeValueEnd !== -1) {
                    return {
                        start: start + relativeValueStart,
                        end: start + relativeValueEnd,
                        className: tagContent.slice(relativeValueStart, relativeValueEnd),
                        type: 'attribute'
                    };
                }
            }

            // No className, insert one
            const tagNameMatch = tagContent.match(/<(\w+)/);
            if (tagNameMatch) {
                const insertPos = start + tagNameMatch[0].length;
                return { start: insertPos, end: insertPos, className: '', type: 'insert' };
            }
        }
    }

    // If no ID or ID not found, try unique class combination (simplified)
    // This is risky as classes are reused. We rely on text content or line number mostly.
    return null;
}

/**
 * Find element by its className (from DOM) in source code.
 * Searches for elements that contain the same Tailwind classes.
 */
function findElementByClassName(source: string, className: string): ElementLocationResult | null {
    if (!className || className.length === 0) return null;

    // Split className into individual classes
    const classes = className.split(/\s+/).filter(c => c.length > 0);

    // First, look for highly specific/unique classes (highest priority)
    const highPriorityClasses = classes.filter(c =>
        c.includes('gradient') ||
        c.includes('display') ||
        c.includes('hero') ||
        c.includes('heading') ||
        c.includes('title') ||
        c.includes('tabular') || // e.g., tabular-nums
        c.includes('balance') || // e.g., text-balance
        (c.startsWith('font-') && !['font-normal', 'font-medium', 'font-bold', 'font-semibold'].includes(c))
    );

    // Filter to get unique/specific classes (not common utilities)
    const genericPrefixes = ['flex', 'grid', 'block', 'hidden', 'relative', 'absolute', 'w-', 'h-', 'p-', 'm-', 'items-', 'justify-', 'gap-', 'space-'];
    const genericExact = ['flex', 'grid', 'block', 'hidden', 'relative', 'absolute', 'inline', 'inline-block', 'inline-flex', 'container', 'wrapper'];

    const otherUniqueClasses = classes.filter(c => {
        // Skip exact matches to generic classes
        if (genericExact.includes(c)) return false;
        // Skip if it starts with a generic prefix
        for (const generic of genericPrefixes) {
            if (c.startsWith(generic)) return false;
        }
        // Already in high priority list
        if (highPriorityClasses.includes(c)) return false;
        // Prefer classes with specific names (length > 3)
        return c.length > 3;
    });

    // Combine: high priority first, then other unique classes
    const uniqueClasses = [...highPriorityClasses, ...otherUniqueClasses];
    console.log('[StyleModifier] Searching for unique classes:', uniqueClasses.slice(0, 5));

    // Escape special regex characters in class names (like text-[#d4d4d8])
    function escapeRegex(str: string): string {
        return str.replace(/[.*+?^${}()|[\]\\#]/g, '\\$&');
    }

    // Look for elements with these classes in order of uniqueness
    for (const cls of uniqueClasses) {
        const escapedCls = escapeRegex(cls);

        // Search for className="...cls..." - match the entire className attribute
        // Pattern: className="value" where value contains our class
        const patterns = [
            new RegExp(`className="([^"]*)"`, 'g'),
            new RegExp(`className='([^']*)'`, 'g'),
        ];

        for (const pattern of patterns) {
            let match;
            // Reset regex lastIndex for each search
            pattern.lastIndex = 0;

            while ((match = pattern.exec(source)) !== null) {
                const classNameValue = match[1]; // The captured group (content between quotes)

                // Check if this className contains our target class
                const classRegex = new RegExp(`(?:^|\\s)${escapedCls}(?:\\s|$)`);
                if (!classRegex.test(classNameValue)) continue;

                // Found the right element
                // The start position is right after className=" (match.index + 11 for className=")
                const classNameKeywordLength = 'className='.length + 1; // +1 for the opening quote
                const absValueStart = match.index + classNameKeywordLength;
                const absValueEnd = absValueStart + classNameValue.length;

                console.log('[StyleModifier] Found element by className:', cls, 'positions:', absValueStart, absValueEnd);
                return {
                    start: absValueStart,
                    end: absValueEnd,
                    className: classNameValue,
                    type: 'attribute' as const
                };
            }
        }
    }

    console.log('[StyleModifier] Could not find element by className');
    return null;
}

export interface ElementLocationOptions {
    textContent?: string;
    selector?: string;
    lineNumber?: number;
    /** Element's actual className string (from DOM) */
    className?: string;
}

/**
 * Apply style changes to a source file deterministically
 */
export function applyStyleChangesToSource(
    sourceCode: string,
    changes: DesignModeStyleChange[],
    options: ElementLocationOptions | string // Allow string for backward compatibility (textContent)
): { modified: string; applied: string[]; failed: string[] } {
    const applied: string[] = [];
    const failed: string[] = [];
    let modified = sourceCode;

    // Normalize options
    const locOptions: ElementLocationOptions = typeof options === 'string'
        ? { textContent: options }
        : options;

    // Strategy 1: Find by Line Number (Most Accurate)
    let elementInfo: ElementLocationResult | null = null;

    if (locOptions.lineNumber) {
        console.log(`[StyleModifier] Attempting lookup by line number: ${locOptions.lineNumber}`);
        elementInfo = findElementByLineNumber(modified, locOptions.lineNumber);

        // VALIDATION: If we found an element by line number, verify it matches the expected className (if provided)
        // This prevents updating the wrong element if the line number is stale/incorrect (e.g. pointing to parent)
        if (elementInfo && locOptions.className && elementInfo.className) {
            const sourceClass = elementInfo.className.trim();
            // Only validate if source class is a string literal (not an expression or empty)
            if (!sourceClass.startsWith('{') && sourceClass.length > 0) {
                const domClass = locOptions.className;

                // Heuristic: Source classes should generally be present in DOM classes
                // We check for overlap. If the source has classes, at least SOME should assume to be in DOM.
                const sourceTokens = sourceClass.split(/\s+/).filter(t => t.length > 0);
                const domTokens = new Set(domClass.split(/\s+/));

                // If source has classes, check how many are in DOM
                if (sourceTokens.length > 0) {
                    const matchCount = sourceTokens.filter(t => domTokens.has(t)).length;
                    const matchRatio = matchCount / sourceTokens.length;

                    // If match ratio is too low (< 30%), assume mismatch
                    // Exception: short class lists (1-2 items) might be conditional, be careful.
                    // But if source has "wrapper flex" and DOM has "text-red mt-4", overlap is 0.
                    if (matchRatio < 0.3 && matchCount < 2) {
                        console.log(`[StyleModifier] Validation Failed: Line ${locOptions.lineNumber} element classes ("${sourceClass}") do not match DOM classes ("${domClass.slice(0, 30)}..."). Match ratio: ${matchRatio}`);
                        console.log('[StyleModifier] Falling back to other strategies.');
                        elementInfo = null;
                    } else {
                        console.log(`[StyleModifier] Validation Passed: Match ratio ${matchRatio.toFixed(2)}`);
                    }
                }
            }
        }

        if (elementInfo) console.log('[StyleModifier] Found element by line number:', locOptions.lineNumber);
        else console.log('[StyleModifier] Line number lookup failed or rejected by validation');
    }

    // Strategy 2: Find by Selector (ID)
    if (!elementInfo && locOptions.selector) {
        console.log(`[StyleModifier] Attempting lookup by selector: ${locOptions.selector}`);
        elementInfo = findElementBySelector(modified, locOptions.selector);
        if (elementInfo) console.log('[StyleModifier] Found element by selector:', locOptions.selector);
    }

    // Strategy 3: Find by Text Content
    if (!elementInfo && locOptions.textContent) {
        console.log(`[StyleModifier] Attempting lookup by text content: "${locOptions.textContent.slice(0, 30)}..."`);
        elementInfo = findElementByTextContent(modified, locOptions.textContent);

        // VALIDATION: Verify found element's classes match expected (avoid targeting child instead of parent)
        if (elementInfo && locOptions.className) {
            const sourceClass = (elementInfo.className || '').trim();
            const domClass = locOptions.className;
            const domTokens = domClass.split(/\s+/).filter(t => t.length > 0);

            // Case 1: Expected element has classes, but found element has none - likely wrong element
            if (domTokens.length > 2 && sourceClass.length === 0) {
                console.log(`[StyleModifier] Text Content Validation Failed: Found element has NO classes, but expected "${domClass.slice(0, 30)}..."`);
                console.log('[StyleModifier] Falling back to className lookup.');
                elementInfo = null;
            }
            // Case 2: Both have classes, check overlap
            else if (sourceClass.length > 0 && !sourceClass.startsWith('{')) {
                const sourceTokens = sourceClass.split(/\s+/).filter(t => t.length > 0);
                const domTokenSet = new Set(domTokens);

                if (sourceTokens.length > 0) {
                    const matchCount = sourceTokens.filter(t => domTokenSet.has(t)).length;
                    const matchRatio = matchCount / sourceTokens.length;

                    if (matchRatio < 0.3 && matchCount < 2) {
                        console.log(`[StyleModifier] Text Content Validation Failed: Found element classes ("${sourceClass}") do not match DOM classes ("${domClass.slice(0, 30)}..."). Match ratio: ${matchRatio}`);
                        console.log('[StyleModifier] Falling back to className lookup.');
                        elementInfo = null;
                    } else {
                        console.log(`[StyleModifier] Text Content Validation Passed: Match ratio ${matchRatio.toFixed(2)}`);
                    }
                }
            }
        }

        if (elementInfo) console.log('[StyleModifier] Found element by text content');
        else if (locOptions.textContent) console.log('[StyleModifier] Text content lookup failed or rejected by validation');
    }

    // Strategy 4: Find by className (for dynamic content where text isn't in source)
    if (!elementInfo && locOptions.className) {
        elementInfo = findElementByClassName(modified, locOptions.className);
        if (elementInfo) console.log('[StyleModifier] Found element by className');
    }

    if (!elementInfo) {
        for (const change of changes) {
            failed.push(`${change.property}: Could not locate element (tried line: ${locOptions.lineNumber}, sel: ${locOptions.selector}, className: ${locOptions.className?.slice(0, 50)})`);
        }
        return { modified, applied, failed };
    }

    // --- SHORTHAND EXPLOSION LOGIC ---
    // If we are modifying a specific side (e.g. marginTop), but the element has a shorthand (e.g. my-4),
    // we must first "explode" the shorthand into explicit classes (mt-4 mb-4) to avoid conflicts
    // and ensure we don't accidentally remove the other side (marginBottom) if we were to just overwrite.

    let currentClassName = elementInfo.className;

    // Check what we are changing
    const changingProps = new Set(changes.map(c => c.property));
    const changingTop = changingProps.has('marginTop');
    const changingBottom = changingProps.has('marginBottom');
    const changingLeft = changingProps.has('marginLeft');
    const changingRight = changingProps.has('marginRight');

    const explodedClasses: string[] = [];
    const classesToRemove: string[] = [];

    // Helper to add classes if check(cls) is true
    const scanClasses = (regex: RegExp, handler: (match: RegExpMatchArray) => void) => {
        let match;
        const clsList = currentClassName.split(/\s+/);
        for (const cls of clsList) {
            if (match = cls.match(regex)) {
                handler(match);
            }
        }
    };

    // 1. Handle 'my-' conflicts (Vertical Margin)
    if (changingTop || changingBottom) {
        // Look for my-{val}
        scanClasses(/^-?my-(.+)$/, (match) => {
            const val = match[1];
            explodedClasses.push(`mt-${val}`);
            explodedClasses.push(`mb-${val}`);
            classesToRemove.push(match[0]);
        });
    }

    // 2. Handle 'mx-' conflicts (Horizontal Margin)
    if (changingLeft || changingRight) {
        // Look for mx-{val}
        scanClasses(/^-?mx-(.+)$/, (match) => {
            const val = match[1];
            explodedClasses.push(`ml-${val}`);
            explodedClasses.push(`mr-${val}`);
            classesToRemove.push(match[0]);
        });
    }

    // 3. Handle 'm-' conflicts (All Margin)
    if (changingTop || changingBottom || changingLeft || changingRight) {
        // Look for m-{val}
        scanClasses(/^-?m-(.+)$/, (match) => {
            const val = match[1];
            explodedClasses.push(`mt-${val}`);
            explodedClasses.push(`mb-${val}`);
            explodedClasses.push(`ml-${val}`);
            explodedClasses.push(`mr-${val}`);
            classesToRemove.push(match[0]);
        });
    }

    if (classesToRemove.length > 0) {
        // Apply explosion to currentClassName string
        let newClassList = currentClassName.split(/\s+/).filter(c => !classesToRemove.includes(c));
        newClassList.push(...explodedClasses);

        // Update the source code with new class list BEFORE applying specific changes
        // This effectively "migrates" the code to long-hand format
        const newClassAttr = newClassList.join(' ');

        // We need to replace the specific instance of the class string in the file
        // elementInfo.start/end point to the className value inside quotes

        // RE-READ source because we might modify it multiple times?
        // Actually we are in a single pass here.

        const before = modified.slice(0, elementInfo.start);
        const after = modified.slice(elementInfo.end);
        modified = before + newClassAttr + after;

        // Update elementInfo to reflect the change for subsequent steps
        elementInfo = {
            ...elementInfo,
            className: newClassAttr,
            end: elementInfo.start + newClassAttr.length
        };

        console.log('[StyleModifier] Exploded shorthands:', classesToRemove, '->', explodedClasses);
    }
    // ---------------------------------

    // Process each change
    for (const change of changes) {
        const tailwind = cssToTailwind(change.property, change.newValue);

        if (!tailwind) {
            failed.push(`${change.property}: No Tailwind mapping available`);
            continue;
        }

        // Remove existing classes for this property
        const existingPattern = getExistingClassPattern(tailwind.prefix);
        let currentClasses = elementInfo.className;

        // Special handling for text- prefix which can be color, size, or align
        if (tailwind.prefix === 'text') {
            if (change.property === 'color') {
                // Remove text-color classes (not size or align)
                currentClasses = currentClasses.replace(/text-(inherit|current|transparent|black|white|[\w]+-\d+|\[#[^\]]+\])/g, '').trim();
            } else if (change.property === 'fontSize') {
                // Remove text-size classes (not color or align)
                currentClasses = currentClasses.replace(/text-(xs|sm|base|lg|xl|2xl|3xl|4xl|5xl|6xl|7xl|8xl|9xl|\[\d+[^[\]]+\])/g, '').trim();
            } else if (change.property === 'textAlign') {
                // Remove text-align classes
                currentClasses = currentClasses.replace(/text-(left|center|right|justify)/g, '').trim();
            }
        } else {
            currentClasses = currentClasses.replace(existingPattern, '').trim();
        }

        // Add the new class (unless it's empty, which means removal only)
        let newClasses: string;
        if (tailwind.class === '') {
            // Empty class means removal only - existing classes were already removed above
            newClasses = currentClasses;
            applied.push(`${change.property}: removed existing class`);
        } else {
            newClasses = currentClasses ? `${currentClasses} ${tailwind.class}` : tailwind.class;
            applied.push(`${change.property}: ${tailwind.class}`);
        }

        // Clean up multiple spaces
        const cleanedClasses = newClasses.replace(/\s+/g, ' ').trim();

        // Update the element info for the next iteration
        elementInfo.className = cleanedClasses;
    }

    // Apply the changes to the source
    if (elementInfo.className !== '' || applied.length > 0) {
        // Construct the new content
        if (elementInfo.type === 'insert') {
            // Inserting new className attribute
            const before = modified.slice(0, elementInfo.start);
            const after = modified.slice(elementInfo.end);
            modified = `${before} className="${elementInfo.className}"${after}`;
        } else {
            // Replacing existing
            const before = modified.slice(0, elementInfo.start);
            const after = modified.slice(elementInfo.end);
            modified = `${before}${elementInfo.className}${after}`;
        }
    }

    return { modified, applied, failed };
}


/**
 * Apply style changes using inline styles (fallback when Tailwind doesn't work)
 */
export function applyInlineStylesToSource(
    sourceCode: string,
    changes: DesignModeStyleChange[],
    options: ElementLocationOptions | string
): { modified: string; applied: string[]; failed: string[] } {
    const applied: string[] = [];
    const failed: string[] = [];
    let modified = sourceCode;

    // Normalize options
    const locOptions: ElementLocationOptions = typeof options === 'string'
        ? { textContent: options }
        : options;

    // Use the same waterfall strategy as applyStyleChangesToSource
    let elementInfo: ElementLocationResult | null = null;

    // Strategy 1: Find by Line Number (Most Accurate)
    if (locOptions.lineNumber) {
        elementInfo = findElementByLineNumber(modified, locOptions.lineNumber);
        if (elementInfo) console.log('[StyleModifier:Inline] Found element by line number:', locOptions.lineNumber);
    }

    // Strategy 2: Find by Selector (ID)
    if (!elementInfo && locOptions.selector) {
        elementInfo = findElementBySelector(modified, locOptions.selector);
        if (elementInfo) console.log('[StyleModifier:Inline] Found element by selector:', locOptions.selector);
    }

    // Strategy 3: Find by Text Content
    if (!elementInfo && locOptions.textContent) {
        elementInfo = findElementByTextContent(modified, locOptions.textContent);
        if (elementInfo) console.log('[StyleModifier:Inline] Found element by text content');
    }

    // Strategy 4: Find by className
    if (!elementInfo && locOptions.className) {
        elementInfo = findElementByClassName(modified, locOptions.className);
        if (elementInfo) console.log('[StyleModifier:Inline] Found element by className');
    }

    if (!elementInfo) {
        for (const change of changes) {
            failed.push(`${change.property}: Could not locate element for inline style`);
        }
        return { modified, applied, failed };
    }

    // We have the element location/content. Now we need to parse it to insert styles.
    // The elementInfo gives us start/end of the className or insertion point.
    // We need to find the whole tag content to parse existing styles.

    // Find the start of the tag (<) by searching backwards from elementInfo.start
    let tagStart = elementInfo.start;
    while (tagStart > 0 && modified[tagStart] !== '<') {
        tagStart--;
    }

    // Find the end of the tag (>)
    const tagEnd = modified.indexOf('>', elementInfo.end);

    if (modified[tagStart] !== '<' || tagEnd === -1) {
        for (const change of changes) {
            failed.push(`${change.property}: Could not parse element tag boundaries`);
        }
        return { modified, applied, failed };
    }

    const tagContent = modified.slice(tagStart, tagEnd + 1);

    // Check for existing style attribute
    const styleMatch = tagContent.match(/style\s*=\s*{{\s*([^}]*)\s*}}/);

    // Build the style object
    const styleProps: Record<string, string> = {};

    // Parse existing styles if any
    if (styleMatch) {
        const existingStyles = styleMatch[1];
        const stylePairs = existingStyles.split(',').map(s => s.trim());
        for (const pair of stylePairs) {
            const colonIndex = pair.indexOf(':');
            if (colonIndex > 0) {
                const key = pair.slice(0, colonIndex).trim().replace(/['"]/g, '');
                const value = pair.slice(colonIndex + 1).trim().replace(/['"]/g, '');
                styleProps[key] = value;
            }
        }
    }

    // Apply new styles
    for (const change of changes) {
        styleProps[change.property] = change.newValue;
        applied.push(`${change.property}: ${change.newValue} (inline)`);
    }

    // Build the style string
    const styleEntries = Object.entries(styleProps)
        .map(([key, value]) => `${key}: '${value}'`)
        .join(', ');
    const newStyleAttr = `style={{ ${styleEntries} }}`;

    // Replace or insert the style attribute
    if (styleMatch) {
        const styleAttrStart = tagStart + tagContent.indexOf(styleMatch[0]);
        const styleAttrEnd = styleAttrStart + styleMatch[0].length;
        modified = modified.slice(0, styleAttrStart) + newStyleAttr + modified.slice(styleAttrEnd);
    } else {
        // Insert after tag name
        const tagNameMatch = tagContent.match(/<(\w+)/);
        if (tagNameMatch && tagNameMatch.index !== undefined) {
            const insertPos = tagStart + tagNameMatch.index + tagNameMatch[0].length;
            modified = modified.slice(0, insertPos) + ` ${newStyleAttr}` + modified.slice(insertPos);
        }
    }

    return { modified, applied, failed };
}
