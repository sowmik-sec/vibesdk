/**
 * Typography Control
 * Font family, size, weight, line height, letter spacing, alignment, decoration
 */

import { useCallback, useMemo } from 'react';
import type { DesignModeComputedStyles } from '@/lib/design-mode/design-mode-protocol';

interface TypographyControlProps {
    styles: DesignModeComputedStyles;
    tailwindClasses: string[];
    onChange: (property: string, value: string, commit: boolean) => void;
    onBlur: () => void;
}

const FONT_SIZES = [
    { label: 'xs', value: '0.75rem', tw: 'text-xs' },
    { label: 'sm', value: '0.875rem', tw: 'text-sm' },
    { label: 'base', value: '1rem', tw: 'text-base' },
    { label: 'lg', value: '1.125rem', tw: 'text-lg' },
    { label: 'xl', value: '1.25rem', tw: 'text-xl' },
    { label: '2xl', value: '1.5rem', tw: 'text-2xl' },
    { label: '3xl', value: '1.875rem', tw: 'text-3xl' },
    { label: '4xl', value: '2.25rem', tw: 'text-4xl' },
    { label: '5xl', value: '3rem', tw: 'text-5xl' },
];

const FONT_WEIGHTS = [
    { label: 'Thin', value: '100', tw: 'font-thin' },
    { label: 'Light', value: '300', tw: 'font-light' },
    { label: 'Normal', value: '400', tw: 'font-normal' },
    { label: 'Medium', value: '500', tw: 'font-medium' },
    { label: 'Semibold', value: '600', tw: 'font-semibold' },
    { label: 'Bold', value: '700', tw: 'font-bold' },
    { label: 'Black', value: '900', tw: 'font-black' },
];

const TEXT_ALIGNS = [
    { label: 'Left', value: 'left', tw: 'text-left' },
    { label: 'Center', value: 'center', tw: 'text-center' },
    { label: 'Right', value: 'right', tw: 'text-right' },
    { label: 'Justify', value: 'justify', tw: 'text-justify' },
];

const LINE_HEIGHTS = [
    { label: 'None', value: '1', tw: 'leading-none' },
    { label: 'Tight', value: '1.25', tw: 'leading-tight' },
    { label: 'Snug', value: '1.375', tw: 'leading-snug' },
    { label: 'Normal', value: '1.5', tw: 'leading-normal' },
    { label: 'Relaxed', value: '1.625', tw: 'leading-relaxed' },
    { label: 'Loose', value: '2', tw: 'leading-loose' },
];

export function TypographyControl({ styles, tailwindClasses, onChange, onBlur }: TypographyControlProps) {
    // Find current values from tailwind classes or computed styles
    const currentSize = useMemo(() => {
        const sizeClass = tailwindClasses.find(c => c.match(/^text-(xs|sm|base|lg|xl|[2-5]xl)$/));
        return FONT_SIZES.find(s => s.tw === sizeClass) || FONT_SIZES.find(s => s.value === styles.fontSize);
    }, [tailwindClasses, styles.fontSize]);

    const currentWeight = useMemo(() => {
        const weightClass = tailwindClasses.find(c => c.match(/^font-(thin|light|normal|medium|semibold|bold|black)$/));
        return FONT_WEIGHTS.find(w => w.tw === weightClass) || FONT_WEIGHTS.find(w => w.value === styles.fontWeight);
    }, [tailwindClasses, styles.fontWeight]);

    const currentAlign = useMemo(() => {
        const alignClass = tailwindClasses.find(c => c.match(/^text-(left|center|right|justify)$/));
        return TEXT_ALIGNS.find(a => a.tw === alignClass) || TEXT_ALIGNS.find(a => a.value === styles.textAlign);
    }, [tailwindClasses, styles.textAlign]);

    const handleSizeChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
        onChange('fontSize', e.target.value, true);
    }, [onChange]);

    const handleWeightChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
        onChange('fontWeight', e.target.value, true);
    }, [onChange]);

    const handleAlignChange = useCallback((value: string) => {
        onChange('textAlign', value, true);
    }, [onChange]);

    return (
        <div className="space-y-3">
            {/* Font Size */}
            <div>
                <label className="block text-xs text-text-primary/60 mb-1">Size</label>
                <select
                    value={currentSize?.value || styles.fontSize}
                    onChange={handleSizeChange}
                    onBlur={onBlur}
                    className="w-full px-2 py-1.5 text-sm bg-bg-3 border border-text/10 rounded-md text-text-primary focus:outline-none focus:border-accent"
                >
                    {FONT_SIZES.map(size => (
                        <option key={size.tw} value={size.value}>
                            {size.label} ({size.value})
                        </option>
                    ))}
                </select>
            </div>

            {/* Font Weight */}
            <div>
                <label className="block text-xs text-text-primary/60 mb-1">Weight</label>
                <select
                    value={currentWeight?.value || styles.fontWeight}
                    onChange={handleWeightChange}
                    onBlur={onBlur}
                    className="w-full px-2 py-1.5 text-sm bg-bg-3 border border-text/10 rounded-md text-text-primary focus:outline-none focus:border-accent"
                >
                    {FONT_WEIGHTS.map(weight => (
                        <option key={weight.tw} value={weight.value}>
                            {weight.label}
                        </option>
                    ))}
                </select>
            </div>

            {/* Text Align */}
            <div>
                <label className="block text-xs text-text-primary/60 mb-1">Alignment</label>
                <div className="flex gap-1">
                    {TEXT_ALIGNS.map(align => (
                        <button
                            key={align.value}
                            onClick={() => handleAlignChange(align.value)}
                            className={`flex-1 px-2 py-1.5 text-xs rounded-md transition-colors ${currentAlign?.value === align.value
                                    ? 'bg-accent text-white'
                                    : 'bg-bg-3 text-text-primary hover:bg-bg-2'
                                }`}
                        >
                            {align.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Line Height */}
            <div>
                <label className="block text-xs text-text-primary/60 mb-1">Line Height</label>
                <select
                    value={styles.lineHeight}
                    onChange={(e) => onChange('lineHeight', e.target.value, true)}
                    onBlur={onBlur}
                    className="w-full px-2 py-1.5 text-sm bg-bg-3 border border-text/10 rounded-md text-text-primary focus:outline-none focus:border-accent"
                >
                    {LINE_HEIGHTS.map(lh => (
                        <option key={lh.tw} value={lh.value}>
                            {lh.label}
                        </option>
                    ))}
                </select>
            </div>
        </div>
    );
}
