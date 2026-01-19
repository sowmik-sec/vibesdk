/**
 * Typography Control - v0 Style
 * Font Family, Weight, Size, Line Height, Letter Spacing, Alignment, Decoration
 */

import { useCallback, useMemo } from 'react';
import {
    AlignLeft,
    AlignCenter,
    AlignRight,
    AlignJustify,
    Undo2,
    Italic,
    Strikethrough,
    Underline,
} from 'lucide-react';
import type { DesignModeComputedStyles } from '@/lib/design-mode/design-mode-protocol';
import { DropdownControl, type DropdownOption } from './dropdown-control';
import { ToggleButtonGroup, type ToggleOption } from './toggle-button-group';

interface TypographyControlProps {
    styles: DesignModeComputedStyles;
    tailwindClasses: string[];
    onChange: (property: string, value: string, commit: boolean) => void;
    onPreview: (property: string, value: string) => void;
    onClearPreview: () => void;
}

// Font Family options
const FONT_FAMILIES: DropdownOption[] = [
    { label: 'Default', value: 'inherit' },
    { label: 'Sans Serif', value: 'ui-sans-serif, system-ui, sans-serif' },
    { label: 'Serif', value: 'ui-serif, Georgia, serif' },
    { label: 'Mono', value: 'ui-monospace, monospace' },
];

// Font Weight options
const FONT_WEIGHTS: DropdownOption[] = [
    { label: 'Thin', value: '100' },
    { label: 'Light', value: '300' },
    { label: 'Regular', value: '400' },
    { label: 'Medium', value: '500' },
    { label: 'Semibold', value: '600' },
    { label: 'Bold', value: '700' },
    { label: 'Black', value: '900' },
];

// Font Size options (up to 9xl)
const FONT_SIZES: DropdownOption[] = [
    { label: 'xs', value: '0.75rem' },
    { label: 'sm', value: '0.875rem' },
    { label: 'base', value: '1rem' },
    { label: 'lg', value: '1.125rem' },
    { label: 'xl', value: '1.25rem' },
    { label: '2xl', value: '1.5rem' },
    { label: '3xl', value: '1.875rem' },
    { label: '4xl', value: '2.25rem' },
    { label: '5xl', value: '3rem' },
    { label: '6xl', value: '3.75rem' },
    { label: '7xl', value: '4.5rem' },
    { label: '8xl', value: '6rem' },
    { label: '9xl', value: '8rem' },
];

// Line Height options
const LINE_HEIGHTS: DropdownOption[] = [
    { label: '1', value: '1' },
    { label: '1.25', value: '1.25' },
    { label: '1.5', value: '1.5' },
    { label: '1.75', value: '1.75' },
    { label: '2', value: '2' },
];

// Letter Spacing options
const LETTER_SPACINGS: DropdownOption[] = [
    { label: '-0.05em', value: '-0.05em' },
    { label: '0em', value: '0em' },
    { label: '0.025em', value: '0.025em' },
    { label: '0.05em', value: '0.05em' },
    { label: '0.1em', value: '0.1em' },
];

// Alignment options
const ALIGNMENTS: ToggleOption[] = [
    { value: 'reset', icon: <Undo2 className="size-4" />, label: 'Reset' },
    { value: 'left', icon: <AlignLeft className="size-4" />, label: 'Left' },
    { value: 'center', icon: <AlignCenter className="size-4" />, label: 'Center' },
    { value: 'right', icon: <AlignRight className="size-4" />, label: 'Right' },
    { value: 'justify', icon: <AlignJustify className="size-4" />, label: 'Justify' },
];

// Tabular Nums icon
const TabularNumsIcon = () => (
    <svg className="size-4" viewBox="0 0 16 16" fill="currentColor">
        <text x="3" y="12" fontSize="10" fontFamily="monospace">0</text>
    </svg>
);

// Slash Zero icon
const SlashZeroIcon = () => (
    <svg className="size-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
        <circle cx="8" cy="8" r="5" />
        <line x1="5" y1="11" x2="11" y2="5" />
    </svg>
);

// Decoration options (multi-select)
const DECORATIONS: ToggleOption[] = [
    { value: 'italic', icon: <Italic className="size-4" />, label: 'Italic' },
    { value: 'line-through', icon: <Strikethrough className="size-4" />, label: 'Strikethrough' },
    { value: 'underline', icon: <Underline className="size-4" />, label: 'Underline' },
    { value: 'tabular-nums', icon: <TabularNumsIcon />, label: 'Tabular Numbers' },
    { value: 'slashed-zero', icon: <SlashZeroIcon />, label: 'Slashed Zero' },
];

export function TypographyControl({
    styles,
    tailwindClasses,
    onChange,
    onPreview,
    onClearPreview,
}: TypographyControlProps) {
    // Current values
    const currentFontFamily = useMemo(() => {
        return FONT_FAMILIES.find(f => f.value === styles.fontFamily)?.value || 'inherit';
    }, [styles.fontFamily]);

    const currentFontWeight = useMemo(() => {
        return FONT_WEIGHTS.find(w => w.value === styles.fontWeight)?.value || '400';
    }, [styles.fontWeight]);

    const currentFontSize = useMemo(() => {
        // Try to match computed style to our options
        const match = FONT_SIZES.find(s => s.value === styles.fontSize);
        if (match) return match.value;
        // Convert px to rem if needed
        const pxMatch = styles.fontSize?.match(/^([\d.]+)px$/);
        if (pxMatch) {
            const rem = parseFloat(pxMatch[1]) / 16;
            const remValue = `${rem}rem`;
            const remMatch = FONT_SIZES.find(s => s.value === remValue);
            if (remMatch) return remMatch.value;
        }
        return '1rem';
    }, [styles.fontSize]);

    const currentLineHeight = useMemo(() => {
        // Computed line height is typically in pixels (e.g., "24px")
        // We need to convert to unitless by dividing by font size
        const match = LINE_HEIGHTS.find(lh => lh.value === styles.lineHeight);
        if (match) return match.value;

        // Try to calculate unitless line height from px value
        const lineHeightPx = parseFloat(styles.lineHeight || '0');
        const fontSizePx = parseFloat(styles.fontSize || '16');
        if (lineHeightPx > 0 && fontSizePx > 0) {
            const ratio = lineHeightPx / fontSizePx;
            // Find closest match
            const closest = LINE_HEIGHTS.reduce((prev, curr) => {
                const prevDiff = Math.abs(parseFloat(prev.value) - ratio);
                const currDiff = Math.abs(parseFloat(curr.value) - ratio);
                return currDiff < prevDiff ? curr : prev;
            });
            return closest.value;
        }

        // Check for "normal" which is typically 1.2
        if (styles.lineHeight === 'normal') return '1.25';

        return styles.lineHeight || '1.5';
    }, [styles.lineHeight, styles.fontSize]);

    const currentLetterSpacing = useMemo(() => {
        // Computed letter spacing is typically in pixels (e.g., "0.8px")
        // We need to convert to em by dividing by font size
        const match = LETTER_SPACINGS.find(ls => ls.value === styles.letterSpacing);
        if (match) return match.value;

        // Check for normal (0)
        if (styles.letterSpacing === 'normal' || styles.letterSpacing === '0px') {
            return '0em';
        }

        // Try to calculate em from px value
        const letterSpacingPx = parseFloat(styles.letterSpacing || '0');
        const fontSizePx = parseFloat(styles.fontSize || '16');
        if (fontSizePx > 0) {
            const emValue = letterSpacingPx / fontSizePx;
            // Find closest match
            const closest = LETTER_SPACINGS.reduce((prev, curr) => {
                const prevDiff = Math.abs(parseFloat(prev.value) - emValue);
                const currDiff = Math.abs(parseFloat(curr.value) - emValue);
                return currDiff < prevDiff ? curr : prev;
            });
            return closest.value;
        }

        return styles.letterSpacing || '0em';
    }, [styles.letterSpacing, styles.fontSize]);

    const currentAlignment = useMemo(() => {
        return styles.textAlign || 'left';
    }, [styles.textAlign]);

    // Check for active decorations
    const currentDecorations = useMemo(() => {
        const decorations: string[] = [];
        if (styles.fontStyle === 'italic') decorations.push('italic');
        if (styles.textDecoration?.includes('line-through')) decorations.push('line-through');
        if (styles.textDecoration?.includes('underline')) decorations.push('underline');
        if (tailwindClasses.includes('tabular-nums')) decorations.push('tabular-nums');
        if (tailwindClasses.includes('slashed-zero')) decorations.push('slashed-zero');
        return decorations;
    }, [styles.fontStyle, styles.textDecoration, tailwindClasses]);

    // Handlers
    const handleFontFamilyChange = useCallback((value: string, commit: boolean) => {
        onChange('fontFamily', value, commit);
    }, [onChange]);

    const handleFontWeightChange = useCallback((value: string, commit: boolean) => {
        onChange('fontWeight', value, commit);
    }, [onChange]);

    const handleFontSizeChange = useCallback((value: string, commit: boolean) => {
        onChange('fontSize', value, commit);
    }, [onChange]);

    const handleLineHeightChange = useCallback((value: string, commit: boolean) => {
        onChange('lineHeight', value, commit);
    }, [onChange]);

    const handleLetterSpacingChange = useCallback((value: string, commit: boolean) => {
        onChange('letterSpacing', value, commit);
    }, [onChange]);

    const handleAlignmentChange = useCallback((value: string | string[]) => {
        const alignment = Array.isArray(value) ? value[0] : value;
        if (alignment === 'reset') {
            onChange('textAlign', 'inherit', true);
        } else {
            onChange('textAlign', alignment, true);
        }
    }, [onChange]);

    const handleDecorationChange = useCallback((values: string | string[]) => {
        const decorations = Array.isArray(values) ? values : [values];

        // Handle fontStyle (italic)
        const isItalic = decorations.includes('italic');
        onChange('fontStyle', isItalic ? 'italic' : 'normal', true);

        // Handle textDecoration
        const textDecorations = decorations.filter(d => ['underline', 'line-through'].includes(d));
        onChange('textDecoration', textDecorations.length > 0 ? textDecorations.join(' ') : 'none', true);

        // Handle font-variant-numeric (tabular-nums, slashed-zero)
        const numericVariants = decorations.filter(d => ['tabular-nums', 'slashed-zero'].includes(d));
        if (numericVariants.length > 0) {
            onChange('fontVariantNumeric', numericVariants.join(' '), true);
        }
    }, [onChange]);

    return (
        <div className="space-y-4">
            {/* Font Family */}
            <div>
                <DropdownControl
                    options={FONT_FAMILIES}
                    value={currentFontFamily}
                    onChange={handleFontFamilyChange}
                    onHoverStart={(val) => onPreview('fontFamily', val)}
                    onHoverEnd={onClearPreview}
                />
            </div>

            {/* Font Weight & Size */}
            <div className="grid grid-cols-2 gap-2">
                <DropdownControl
                    options={FONT_WEIGHTS}
                    value={currentFontWeight}
                    onChange={handleFontWeightChange}
                    onHoverStart={(val) => onPreview('fontWeight', val)}
                    onHoverEnd={onClearPreview}
                />
                <DropdownControl
                    options={FONT_SIZES}
                    value={currentFontSize}
                    onChange={handleFontSizeChange}
                    onHoverStart={(val) => onPreview('fontSize', val)}
                    onHoverEnd={onClearPreview}
                />
            </div>

            {/* Line Height & Letter Spacing */}
            <div className="grid grid-cols-2 gap-2">
                <div>
                    <label className="block text-xs text-text-primary/60 mb-1">Line Height</label>
                    <DropdownControl
                        options={LINE_HEIGHTS}
                        value={currentLineHeight}
                        onChange={handleLineHeightChange}
                        onHoverStart={(val) => onPreview('lineHeight', val)}
                        onHoverEnd={onClearPreview}
                    />
                </div>
                <div>
                    <label className="block text-xs text-text-primary/60 mb-1">Letter Spacing</label>
                    <DropdownControl
                        options={LETTER_SPACINGS}
                        value={currentLetterSpacing}
                        onChange={handleLetterSpacingChange}
                        onHoverStart={(val) => onPreview('letterSpacing', val)}
                        onHoverEnd={onClearPreview}
                    />
                </div>
            </div>

            {/* Alignment & Decoration */}
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-xs text-text-primary/60 mb-1">Alignment</label>
                    <ToggleButtonGroup
                        options={ALIGNMENTS}
                        value={currentAlignment}
                        onChange={handleAlignmentChange}
                        mode="single"
                        size="sm"
                    />
                </div>
                <div>
                    <label className="block text-xs text-text-primary/60 mb-1">Decoration</label>
                    <ToggleButtonGroup
                        options={DECORATIONS}
                        value={currentDecorations}
                        onChange={handleDecorationChange}
                        mode="multi"
                        size="sm"
                    />
                </div>
            </div>
        </div>
    );
}
