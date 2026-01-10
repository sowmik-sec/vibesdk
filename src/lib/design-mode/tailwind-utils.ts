/**
 * Tailwind CSS Utilities for Design Mode
 * Parsing, modification, and conversion utilities for Tailwind classes
 */

// ============================================================================
// Tailwind Class Categories & Patterns
// ============================================================================

/**
 * Regular expressions for identifying Tailwind utility classes by category
 */
export const TAILWIND_PATTERNS = {
    // Typography
    fontSize: /^text-(xs|sm|base|lg|xl|2xl|3xl|4xl|5xl|6xl|7xl|8xl|9xl|\[.+\])$/,
    fontWeight: /^font-(thin|extralight|light|normal|medium|semibold|bold|extrabold|black)$/,
    fontFamily: /^font-(sans|serif|mono)$/,
    textColor: /^text-(inherit|current|transparent|black|white|slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-(\d{2,3})(\/\d+)?$/,
    textAlign: /^text-(left|center|right|justify|start|end)$/,
    textDecoration: /^(underline|overline|line-through|no-underline)$/,
    textTransform: /^(uppercase|lowercase|capitalize|normal-case)$/,
    lineHeight: /^leading-(none|tight|snug|normal|relaxed|loose|\d+|\[.+\])$/,
    letterSpacing: /^tracking-(tighter|tight|normal|wide|wider|widest|\[.+\])$/,

    // Background
    backgroundColor: /^bg-(inherit|current|transparent|black|white|slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-(\d{2,3})(\/\d+)?$/,
    backgroundGradient: /^bg-gradient-(to-[trbl]|to-[trbl]{2})$/,

    // Spacing
    margin: /^-?m[trblxy]?-(\d+|px|auto|\[.+\])$/,
    padding: /^p[trblxy]?-(\d+|px|\[.+\])$/,
    gap: /^gap(-[xy])?-(\d+|px|\[.+\])$/,

    // Border
    borderWidth: /^border(-[trblxy])?(-0|(-2|-4|-8)?)?$/,
    borderColor: /^border-(inherit|current|transparent|black|white|slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-(\d{2,3})(\/\d+)?$/,
    borderRadius: /^rounded(-[trblse]{1,2})?(-none|-sm|-md|-lg|-xl|-2xl|-3xl|-full|\[.+\])?$/,
    borderStyle: /^border-(solid|dashed|dotted|double|hidden|none)$/,

    // Layout
    display: /^(block|inline-block|inline|flex|inline-flex|grid|inline-grid|hidden|contents|flow-root)$/,
    flexDirection: /^flex-(row|row-reverse|col|col-reverse)$/,
    justifyContent: /^justify-(normal|start|end|center|between|around|evenly|stretch)$/,
    alignItems: /^items-(start|end|center|baseline|stretch)$/,
    flexWrap: /^flex-(wrap|wrap-reverse|nowrap)$/,
    flexGrow: /^grow(-0)?$/,
    flexShrink: /^shrink(-0)?$/,

    // Sizing
    width: /^w-(\d+|px|auto|full|screen|svw|lvw|dvw|min|max|fit|\d+\/\d+|\[.+\])$/,
    height: /^h-(\d+|px|auto|full|screen|svh|lvh|dvh|min|max|fit|\d+\/\d+|\[.+\])$/,
    minWidth: /^min-w-(0|full|min|max|fit|\[.+\])$/,
    minHeight: /^min-h-(0|full|screen|svh|lvh|dvh|min|max|fit|\[.+\])$/,
    maxWidth: /^max-w-(0|none|xs|sm|md|lg|xl|2xl|3xl|4xl|5xl|6xl|7xl|full|min|max|fit|prose|screen-sm|screen-md|screen-lg|screen-xl|screen-2xl|\[.+\])$/,
    maxHeight: /^max-h-(\d+|px|none|full|screen|svh|lvh|dvh|min|max|fit|\[.+\])$/,

    // Effects
    opacity: /^opacity-(\d+|\[.+\])$/,
    shadow: /^shadow(-sm|-md|-lg|-xl|-2xl|-inner|-none)?$/,

    // Position
    position: /^(static|fixed|absolute|relative|sticky)$/,
    inset: /^(inset|top|right|bottom|left)-(\d+|px|auto|full|\d+\/\d+|-\d+|\[.+\])$/,
    zIndex: /^z-(\d+|auto|\[.+\])$/,

    // Other
    overflow: /^overflow(-[xy])?-(auto|hidden|clip|visible|scroll)$/,
    cursor: /^cursor-(auto|default|pointer|wait|text|move|help|not-allowed|none|context-menu|progress|cell|crosshair|vertical-text|alias|copy|no-drop|grab|grabbing|all-scroll|col-resize|row-resize|n-resize|e-resize|s-resize|w-resize|ne-resize|nw-resize|se-resize|sw-resize|ew-resize|ns-resize|nesw-resize|nwse-resize|zoom-in|zoom-out)$/,
} as const;

/**
 * Mapping from CSS properties to Tailwind utility prefixes
 */
export const CSS_TO_TAILWIND_PREFIX: Record<string, string> = {
    // Typography
    'font-size': 'text',
    'font-weight': 'font',
    'font-family': 'font',
    'color': 'text',
    'text-align': 'text',
    'text-decoration': '',
    'text-transform': '',
    'line-height': 'leading',
    'letter-spacing': 'tracking',

    // Background
    'background-color': 'bg',

    // Spacing (these are special - need directional handling)
    'margin': 'm',
    'margin-top': 'mt',
    'margin-right': 'mr',
    'margin-bottom': 'mb',
    'margin-left': 'ml',
    'padding': 'p',
    'padding-top': 'pt',
    'padding-right': 'pr',
    'padding-bottom': 'pb',
    'padding-left': 'pl',
    'gap': 'gap',

    // Border
    'border-width': 'border',
    'border-color': 'border',
    'border-radius': 'rounded',
    'border-style': 'border',

    // Layout
    'display': '',
    'flex-direction': 'flex',
    'justify-content': 'justify',
    'align-items': 'items',

    // Sizing
    'width': 'w',
    'height': 'h',
    'min-width': 'min-w',
    'min-height': 'min-h',
    'max-width': 'max-w',
    'max-height': 'max-h',

    // Effects
    'opacity': 'opacity',
    'box-shadow': 'shadow',

    // Position
    'position': '',
    'top': 'top',
    'right': 'right',
    'bottom': 'bottom',
    'left': 'left',
    'z-index': 'z',
};

// ============================================================================
// Tailwind Color Palette
// ============================================================================

export const TAILWIND_COLORS: Record<string, Record<string, string>> = {
    slate: {
        '50': '#f8fafc', '100': '#f1f5f9', '200': '#e2e8f0', '300': '#cbd5e1',
        '400': '#94a3b8', '500': '#64748b', '600': '#475569', '700': '#334155',
        '800': '#1e293b', '900': '#0f172a', '950': '#020617',
    },
    gray: {
        '50': '#f9fafb', '100': '#f3f4f6', '200': '#e5e7eb', '300': '#d1d5db',
        '400': '#9ca3af', '500': '#6b7280', '600': '#4b5563', '700': '#374151',
        '800': '#1f2937', '900': '#111827', '950': '#030712',
    },
    zinc: {
        '50': '#fafafa', '100': '#f4f4f5', '200': '#e4e4e7', '300': '#d4d4d8',
        '400': '#a1a1aa', '500': '#71717a', '600': '#52525b', '700': '#3f3f46',
        '800': '#27272a', '900': '#18181b', '950': '#09090b',
    },
    neutral: {
        '50': '#fafafa', '100': '#f5f5f5', '200': '#e5e5e5', '300': '#d4d4d4',
        '400': '#a3a3a3', '500': '#737373', '600': '#525252', '700': '#404040',
        '800': '#262626', '900': '#171717', '950': '#0a0a0a',
    },
    red: {
        '50': '#fef2f2', '100': '#fee2e2', '200': '#fecaca', '300': '#fca5a5',
        '400': '#f87171', '500': '#ef4444', '600': '#dc2626', '700': '#b91c1c',
        '800': '#991b1b', '900': '#7f1d1d', '950': '#450a0a',
    },
    orange: {
        '50': '#fff7ed', '100': '#ffedd5', '200': '#fed7aa', '300': '#fdba74',
        '400': '#fb923c', '500': '#f97316', '600': '#ea580c', '700': '#c2410c',
        '800': '#9a3412', '900': '#7c2d12', '950': '#431407',
    },
    amber: {
        '50': '#fffbeb', '100': '#fef3c7', '200': '#fde68a', '300': '#fcd34d',
        '400': '#fbbf24', '500': '#f59e0b', '600': '#d97706', '700': '#b45309',
        '800': '#92400e', '900': '#78350f', '950': '#451a03',
    },
    yellow: {
        '50': '#fefce8', '100': '#fef9c3', '200': '#fef08a', '300': '#fde047',
        '400': '#facc15', '500': '#eab308', '600': '#ca8a04', '700': '#a16207',
        '800': '#854d0e', '900': '#713f12', '950': '#422006',
    },
    lime: {
        '50': '#f7fee7', '100': '#ecfccb', '200': '#d9f99d', '300': '#bef264',
        '400': '#a3e635', '500': '#84cc16', '600': '#65a30d', '700': '#4d7c0f',
        '800': '#3f6212', '900': '#365314', '950': '#1a2e05',
    },
    green: {
        '50': '#f0fdf4', '100': '#dcfce7', '200': '#bbf7d0', '300': '#86efac',
        '400': '#4ade80', '500': '#22c55e', '600': '#16a34a', '700': '#15803d',
        '800': '#166534', '900': '#14532d', '950': '#052e16',
    },
    emerald: {
        '50': '#ecfdf5', '100': '#d1fae5', '200': '#a7f3d0', '300': '#6ee7b7',
        '400': '#34d399', '500': '#10b981', '600': '#059669', '700': '#047857',
        '800': '#065f46', '900': '#064e3b', '950': '#022c22',
    },
    teal: {
        '50': '#f0fdfa', '100': '#ccfbf1', '200': '#99f6e4', '300': '#5eead4',
        '400': '#2dd4bf', '500': '#14b8a6', '600': '#0d9488', '700': '#0f766e',
        '800': '#115e59', '900': '#134e4a', '950': '#042f2e',
    },
    cyan: {
        '50': '#ecfeff', '100': '#cffafe', '200': '#a5f3fc', '300': '#67e8f9',
        '400': '#22d3ee', '500': '#06b6d4', '600': '#0891b2', '700': '#0e7490',
        '800': '#155e75', '900': '#164e63', '950': '#083344',
    },
    sky: {
        '50': '#f0f9ff', '100': '#e0f2fe', '200': '#bae6fd', '300': '#7dd3fc',
        '400': '#38bdf8', '500': '#0ea5e9', '600': '#0284c7', '700': '#0369a1',
        '800': '#075985', '900': '#0c4a6e', '950': '#082f49',
    },
    blue: {
        '50': '#eff6ff', '100': '#dbeafe', '200': '#bfdbfe', '300': '#93c5fd',
        '400': '#60a5fa', '500': '#3b82f6', '600': '#2563eb', '700': '#1d4ed8',
        '800': '#1e40af', '900': '#1e3a8a', '950': '#172554',
    },
    indigo: {
        '50': '#eef2ff', '100': '#e0e7ff', '200': '#c7d2fe', '300': '#a5b4fc',
        '400': '#818cf8', '500': '#6366f1', '600': '#4f46e5', '700': '#4338ca',
        '800': '#3730a3', '900': '#312e81', '950': '#1e1b4b',
    },
    violet: {
        '50': '#f5f3ff', '100': '#ede9fe', '200': '#ddd6fe', '300': '#c4b5fd',
        '400': '#a78bfa', '500': '#8b5cf6', '600': '#7c3aed', '700': '#6d28d9',
        '800': '#5b21b6', '900': '#4c1d95', '950': '#2e1065',
    },
    purple: {
        '50': '#faf5ff', '100': '#f3e8ff', '200': '#e9d5ff', '300': '#d8b4fe',
        '400': '#c084fc', '500': '#a855f7', '600': '#9333ea', '700': '#7e22ce',
        '800': '#6b21a8', '900': '#581c87', '950': '#3b0764',
    },
    fuchsia: {
        '50': '#fdf4ff', '100': '#fae8ff', '200': '#f5d0fe', '300': '#f0abfc',
        '400': '#e879f9', '500': '#d946ef', '600': '#c026d3', '700': '#a21caf',
        '800': '#86198f', '900': '#701a75', '950': '#4a044e',
    },
    pink: {
        '50': '#fdf2f8', '100': '#fce7f3', '200': '#fbcfe8', '300': '#f9a8d4',
        '400': '#f472b6', '500': '#ec4899', '600': '#db2777', '700': '#be185d',
        '800': '#9d174d', '900': '#831843', '950': '#500724',
    },
    rose: {
        '50': '#fff1f2', '100': '#ffe4e6', '200': '#fecdd3', '300': '#fda4af',
        '400': '#fb7185', '500': '#f43f5e', '600': '#e11d48', '700': '#be123c',
        '800': '#9f1239', '900': '#881337', '950': '#4c0519',
    },
};

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Parse a class string into Tailwind and non-Tailwind classes
 */
export function parseTailwindClasses(className: string): { tailwind: string[]; other: string[] } {
    const classes = className.split(/\s+/).filter(Boolean);
    const tailwind: string[] = [];
    const other: string[] = [];

    for (const cls of classes) {
        if (isTailwindClass(cls)) {
            tailwind.push(cls);
        } else {
            other.push(cls);
        }
    }

    return { tailwind, other };
}

/**
 * Check if a class is a Tailwind utility class
 */
export function isTailwindClass(className: string): boolean {
    // Check against all patterns
    for (const pattern of Object.values(TAILWIND_PATTERNS)) {
        if (pattern.test(className)) {
            return true;
        }
    }

    // Check for common Tailwind prefixes with arbitrary values
    if (/^\[.+\]$/.test(className)) return false; // arbitrary value without prefix
    if (/^[a-z]+-\[.+\]$/.test(className)) return true; // has prefix with arbitrary value

    // Check for responsive/state variants
    if (/^(sm|md|lg|xl|2xl|hover|focus|active|disabled|group-hover|dark):/.test(className)) {
        const baseClass = className.split(':').pop() || '';
        return isTailwindClass(baseClass);
    }

    return false;
}

/**
 * Get the category of a Tailwind class
 */
export function getTailwindCategory(className: string): keyof typeof TAILWIND_PATTERNS | null {
    for (const [category, pattern] of Object.entries(TAILWIND_PATTERNS)) {
        if (pattern.test(className)) {
            return category as keyof typeof TAILWIND_PATTERNS;
        }
    }
    return null;
}

/**
 * Update or add a Tailwind class for a specific property
 */
export function updateTailwindClass(
    className: string,
    category: keyof typeof TAILWIND_PATTERNS,
    newClass: string
): string {
    const classes = className.split(/\s+/).filter(Boolean);
    const pattern = TAILWIND_PATTERNS[category];

    // Remove existing class of same category
    const filtered = classes.filter(cls => !pattern.test(cls));

    // Add new class if it's not empty
    if (newClass) {
        filtered.push(newClass);
    }

    return filtered.join(' ');
}

/**
 * Remove a Tailwind class by category
 */
export function removeTailwindClass(
    className: string,
    category: keyof typeof TAILWIND_PATTERNS
): string {
    const classes = className.split(/\s+/).filter(Boolean);
    const pattern = TAILWIND_PATTERNS[category];
    return classes.filter(cls => !pattern.test(cls)).join(' ');
}

/**
 * Find the closest Tailwind color for a hex value
 */
export function findClosestTailwindColor(hex: string): { name: string; shade: string } | null {
    hex = hex.toLowerCase();
    if (hex === '#000000' || hex === '#000') return { name: 'black', shade: '' };
    if (hex === '#ffffff' || hex === '#fff') return { name: 'white', shade: '' };

    let closestDistance = Infinity;
    let closestColor: { name: string; shade: string } | null = null;

    for (const [colorName, shades] of Object.entries(TAILWIND_COLORS)) {
        for (const [shade, colorHex] of Object.entries(shades)) {
            const distance = colorDistance(hex, colorHex);
            if (distance < closestDistance) {
                closestDistance = distance;
                closestColor = { name: colorName, shade };
            }
        }
    }

    return closestColor;
}

/**
 * Calculate color distance (simple RGB Euclidean distance)
 */
function colorDistance(hex1: string, hex2: string): number {
    const rgb1 = hexToRgb(hex1);
    const rgb2 = hexToRgb(hex2);
    if (!rgb1 || !rgb2) return Infinity;

    return Math.sqrt(
        Math.pow(rgb1.r - rgb2.r, 2) +
        Math.pow(rgb1.g - rgb2.g, 2) +
        Math.pow(rgb1.b - rgb2.b, 2)
    );
}

/**
 * Convert hex to RGB
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
    hex = hex.replace('#', '');
    if (hex.length === 3) {
        hex = hex.split('').map(c => c + c).join('');
    }
    if (hex.length !== 6) return null;

    const result = /^([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
    } : null;
}

/**
 * Convert a CSS value to a Tailwind class
 */
export function cssValueToTailwind(property: string, value: string): string | null {
    const prefix = CSS_TO_TAILWIND_PREFIX[property];
    if (prefix === undefined) return null;

    // Handle colors
    if (property === 'color' || property === 'background-color' || property === 'border-color') {
        const colorMatch = findClosestTailwindColor(value);
        if (colorMatch) {
            const colorPrefix = property === 'color' ? 'text' : property === 'background-color' ? 'bg' : 'border';
            return colorMatch.shade ? `${colorPrefix}-${colorMatch.name}-${colorMatch.shade}` : `${colorPrefix}-${colorMatch.name}`;
        }
        // Fallback to arbitrary value
        return `${prefix}-[${value}]`;
    }

    // Handle spacing (px values)
    if (/^(margin|padding)/.test(property)) {
        const numValue = parseFloat(value);
        if (!isNaN(numValue)) {
            // Convert px to Tailwind spacing scale (4px = 1)
            const twValue = Math.round(numValue / 4);
            if (twValue === 0) return `${prefix}-0`;
            return `${prefix}-${twValue}`;
        }
    }

    // Handle display
    if (property === 'display') {
        const displayMap: Record<string, string> = {
            'block': 'block',
            'inline-block': 'inline-block',
            'inline': 'inline',
            'flex': 'flex',
            'inline-flex': 'inline-flex',
            'grid': 'grid',
            'inline-grid': 'inline-grid',
            'none': 'hidden',
        };
        return displayMap[value] || null;
    }

    // Handle font-weight
    if (property === 'font-weight') {
        const weightMap: Record<string, string> = {
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
        return weightMap[value] || null;
    }

    // For arbitrary values
    if (prefix) {
        return `${prefix}-[${value}]`;
    }

    return null;
}

/**
 * Merge two class strings, with the second taking precedence for conflicting utilities
 */
export function mergeClasses(base: string, additions: string): string {
    const baseClasses = base.split(/\s+/).filter(Boolean);
    const addClasses = additions.split(/\s+/).filter(Boolean);

    // Track which categories we're adding
    const addCategories = new Set<string>();
    for (const cls of addClasses) {
        const category = getTailwindCategory(cls);
        if (category) {
            addCategories.add(category);
        }
    }

    // Filter out base classes that conflict with additions
    const filtered = baseClasses.filter(cls => {
        const category = getTailwindCategory(cls);
        return !category || !addCategories.has(category);
    });

    return [...filtered, ...addClasses].join(' ');
}
