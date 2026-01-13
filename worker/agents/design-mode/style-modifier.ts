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
            const prefix = property === 'borderColor' ? 'border' :
                property === 'borderTopColor' ? 'border-t' :
                    property === 'borderRightColor' ? 'border-r' :
                        property === 'borderBottomColor' ? 'border-b' : 'border-l';
            const colorName = TAILWIND_COLORS[normalizedValue];
            if (colorName) {
                return { class: `${prefix}-${colorName}`, prefix: prefix };
            }
            return { class: `${prefix}-[${value}]`, prefix: prefix };
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
                return { class: styleClass, prefix: 'border' };
            }
            return null;
        }

        default:
            return null;
    }
}

/**
 * Get the regex pattern to match existing Tailwind classes for a property
 */
function getExistingClassPattern(prefix: string): RegExp {
    switch (prefix) {
        case 'text':
            // Match text-color, text-size, text-align classes
            return /text-(inherit|current|transparent|black|white|[\w]+-\d+|xs|sm|base|lg|xl|2xl|3xl|4xl|5xl|6xl|7xl|8xl|9xl|left|center|right|justify|\[.+?\])/g;
        case 'bg':
            return /bg-(inherit|current|transparent|black|white|[\w]+-\d+|\[.+?\])/g;
        case 'font':
            return /font-(thin|extralight|light|normal|medium|semibold|bold|extrabold|black|\[.+?\])/g;
        case 'p':
            return /p-(\d+\.?\d*|\[.+?\])/g;
        case 'pt':
            return /pt-(\d+\.?\d*|\[.+?\])/g;
        case 'pr':
            return /pr-(\d+\.?\d*|\[.+?\])/g;
        case 'pb':
            return /pb-(\d+\.?\d*|\[.+?\])/g;
        case 'pl':
            return /pl-(\d+\.?\d*|\[.+?\])/g;
        case 'm':
            return /m-(\d+\.?\d*|\[.+?\])/g;
        case 'mt':
            return /mt-(\d+\.?\d*|\[.+?\])/g;
        case 'mr':
            return /mr-(\d+\.?\d*|\[.+?\])/g;
        case 'mb':
            return /mb-(\d+\.?\d*|\[.+?\])/g;
        case 'ml':
            return /ml-(\d+\.?\d*|\[.+?\])/g;
        // Border width
        case 'border':
            return /\bborder(-\d+)?(?!-[trblxy])\b|\bborder-\[.+?\]/g;
        case 'border-t':
            return /border-t(-\d+)?|\border-t-\[.+?\]/g;
        case 'border-r':
            return /border-r(-\d+)?|\border-r-\[.+?\]/g;
        case 'border-b':
            return /border-b(-\d+)?|\border-b-\[.+?\]/g;
        case 'border-l':
            return /border-l(-\d+)?|\border-l-\[.+?\]/g;
        // Border radius
        case 'rounded':
            return /rounded(-none|-sm|-md|-lg|-xl|-2xl|-3xl|-full)?|\rounded-\[.+?\]/g;
        case 'rounded-tl':
            return /rounded-tl(-none|-sm|-md|-lg|-xl|-2xl|-3xl|-full)?|\rounded-tl-\[.+?\]/g;
        case 'rounded-tr':
            return /rounded-tr(-none|-sm|-md|-lg|-xl|-2xl|-3xl|-full)?|\rounded-tr-\[.+?\]/g;
        case 'rounded-bl':
            return /rounded-bl(-none|-sm|-md|-lg|-xl|-2xl|-3xl|-full)?|\rounded-bl-\[.+?\]/g;
        case 'rounded-br':
            return /rounded-br(-none|-sm|-md|-lg|-xl|-2xl|-3xl|-full)?|\rounded-br-\[.+?\]/g;
        default:
            return new RegExp(`${prefix}-[\\w\\[\\].]+`, 'g');
    }
}

// ============================================================================
// Source Code Modification
// ============================================================================

interface ElementLocationResult {
    start: number;
    end: number;
    className: string;
    type: 'attribute' | 'insert';
}

/**
 * Find JSX elements in source code that match the selector
 * Returns the className attribute location(s)
 */
function findElementByTextContent(source: string, textContent: string): ElementLocationResult | null {
    if (!textContent || textContent.length < 3) return null;

    const cleanText = textContent.trim().slice(0, 50);

    // Search for JSX elements containing this text
    // Look for patterns like: >text content< or >{text}< or className="...">{text}
    const textIndex = source.indexOf(cleanText);
    if (textIndex === -1) return null;

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
function findElementByLineNumber(source: string, lineNumber: number): ElementLocationResult | null {
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
    if (!tagContent.match(/^<[a-zA-Z]/)) return null;

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
    const tagNameMatch = tagContent.match(/<(\w+)/);
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
function findElementBySelector(source: string, selector: string): ElementLocationResult | null {
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
        elementInfo = findElementByLineNumber(modified, locOptions.lineNumber);
        if (elementInfo) console.log('[StyleModifier] Found element by line number:', locOptions.lineNumber);
    }

    // Strategy 2: Find by Selector (ID)
    if (!elementInfo && locOptions.selector) {
        elementInfo = findElementBySelector(modified, locOptions.selector);
        if (elementInfo) console.log('[StyleModifier] Found element by selector:', locOptions.selector);
    }

    // Strategy 3: Find by Text Content
    if (!elementInfo && locOptions.textContent) {
        elementInfo = findElementByTextContent(modified, locOptions.textContent);
        if (elementInfo) console.log('[StyleModifier] Found element by text content');
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

        // Add the new class
        const newClasses = currentClasses ? `${currentClasses} ${tailwind.class}` : tailwind.class;

        // Clean up multiple spaces
        const cleanedClasses = newClasses.replace(/\s+/g, ' ').trim();

        // Update the element info for the next iteration
        elementInfo.className = cleanedClasses;

        applied.push(`${change.property}: ${tailwind.class}`);
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
    textContent?: string
): { modified: string; applied: string[]; failed: string[] } {
    const applied: string[] = [];
    const failed: string[] = [];
    let modified = sourceCode;

    if (!textContent) {
        for (const change of changes) {
            failed.push(`${change.property}: No text content to locate element`);
        }
        return { modified, applied, failed };
    }

    // Find the element
    const cleanText = textContent.trim().slice(0, 50);
    const textIndex = modified.indexOf(cleanText);

    if (textIndex === -1) {
        for (const change of changes) {
            failed.push(`${change.property}: Could not find element with text content`);
        }
        return { modified, applied, failed };
    }

    // Find the opening tag
    let searchStart = textIndex;
    let depth = 0;
    while (searchStart > 0) {
        searchStart--;
        if (modified[searchStart] === '>') depth++;
        if (modified[searchStart] === '<') {
            if (depth === 1) break;
            depth--;
        }
    }

    const tagEnd = modified.indexOf('>', searchStart);
    if (tagEnd === -1) {
        for (const change of changes) {
            failed.push(`${change.property}: Could not parse element tag`);
        }
        return { modified, applied, failed };
    }

    const tagContent = modified.slice(searchStart, tagEnd + 1);

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
        const styleAttrStart = searchStart + tagContent.indexOf(styleMatch[0]);
        const styleAttrEnd = styleAttrStart + styleMatch[0].length;
        modified = modified.slice(0, styleAttrStart) + newStyleAttr + modified.slice(styleAttrEnd);
    } else {
        // Insert after tag name
        const tagNameMatch = tagContent.match(/<(\w+)/);
        if (tagNameMatch) {
            const insertPos = searchStart + tagNameMatch[0].length;
            modified = modified.slice(0, insertPos) + ` ${newStyleAttr}` + modified.slice(insertPos);
        }
    }

    return { modified, applied, failed };
}
