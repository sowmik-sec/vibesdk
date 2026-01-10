/**
 * Border Control
 * Border width, color, style, and radius
 */

import { useCallback, useMemo, useState } from 'react';
import type { DesignModeComputedStyles } from '@/lib/design-mode/design-mode-protocol';

interface BorderControlProps {
    styles: DesignModeComputedStyles;
    tailwindClasses: string[];
    onChange: (property: string, value: string, commit: boolean) => void;
    onBlur: () => void;
}

const BORDER_WIDTHS = [
    { label: '0', value: '0px', tw: 'border-0' },
    { label: '1', value: '1px', tw: 'border' },
    { label: '2', value: '2px', tw: 'border-2' },
    { label: '4', value: '4px', tw: 'border-4' },
    { label: '8', value: '8px', tw: 'border-8' },
];

const BORDER_STYLES = [
    { label: 'Solid', value: 'solid', tw: 'border-solid' },
    { label: 'Dashed', value: 'dashed', tw: 'border-dashed' },
    { label: 'Dotted', value: 'dotted', tw: 'border-dotted' },
    { label: 'Double', value: 'double', tw: 'border-double' },
    { label: 'None', value: 'none', tw: 'border-none' },
];

const BORDER_RADII = [
    { label: 'None', value: '0px', tw: 'rounded-none' },
    { label: 'sm', value: '0.125rem', tw: 'rounded-sm' },
    { label: 'Default', value: '0.25rem', tw: 'rounded' },
    { label: 'md', value: '0.375rem', tw: 'rounded-md' },
    { label: 'lg', value: '0.5rem', tw: 'rounded-lg' },
    { label: 'xl', value: '0.75rem', tw: 'rounded-xl' },
    { label: '2xl', value: '1rem', tw: 'rounded-2xl' },
    { label: '3xl', value: '1.5rem', tw: 'rounded-3xl' },
    { label: 'Full', value: '9999px', tw: 'rounded-full' },
];

const COMMON_BORDER_COLORS = [
    { name: 'transparent', hex: 'transparent' },
    { name: 'black', hex: '#000000' },
    { name: 'white', hex: '#ffffff' },
    { name: 'gray-200', hex: '#e5e7eb' },
    { name: 'gray-300', hex: '#d1d5db' },
    { name: 'gray-400', hex: '#9ca3af' },
    { name: 'blue-500', hex: '#3b82f6' },
    { name: 'red-500', hex: '#ef4444' },
    { name: 'green-500', hex: '#22c55e' },
];

export function BorderControl({ styles, tailwindClasses, onChange, onBlur }: BorderControlProps) {
    const [showColorPicker, setShowColorPicker] = useState(false);

    // Get current border width (use top as representative)
    const currentWidth = useMemo(() => {
        const widthClass = tailwindClasses.find(c => c.match(/^border(-[0248])?$/));
        return BORDER_WIDTHS.find(w => w.tw === widthClass) ||
            BORDER_WIDTHS.find(w => w.value === styles.borderTopWidth);
    }, [tailwindClasses, styles.borderTopWidth]);

    // Get current border style
    const currentStyle = useMemo(() => {
        const styleClass = tailwindClasses.find(c => c.match(/^border-(solid|dashed|dotted|double|none)$/));
        return BORDER_STYLES.find(s => s.tw === styleClass) ||
            BORDER_STYLES.find(s => s.value === styles.borderStyle);
    }, [tailwindClasses, styles.borderStyle]);

    // Get current border radius (use top-left as representative)
    const currentRadius = useMemo(() => {
        const radiusClass = tailwindClasses.find(c => c.match(/^rounded(-none|-sm|-md|-lg|-xl|-2xl|-3xl|-full)?$/));
        return BORDER_RADII.find(r => r.tw === radiusClass) ||
            BORDER_RADII.find(r => r.value === styles.borderTopLeftRadius);
    }, [tailwindClasses, styles.borderTopLeftRadius]);

    const handleWidthChange = useCallback((value: string) => {
        onChange('borderWidth', value, true);
    }, [onChange]);

    const handleStyleChange = useCallback((value: string) => {
        onChange('borderStyle', value, true);
    }, [onChange]);

    const handleRadiusChange = useCallback((value: string) => {
        onChange('borderRadius', value, true);
    }, [onChange]);

    const handleColorChange = useCallback((color: string) => {
        onChange('borderColor', color, true);
        setShowColorPicker(false);
    }, [onChange]);

    return (
        <div className="space-y-3">
            {/* Border Width */}
            <div>
                <label className="block text-xs text-text-primary/60 mb-1">Width</label>
                <div className="flex gap-1">
                    {BORDER_WIDTHS.map(width => (
                        <button
                            key={width.tw}
                            onClick={() => handleWidthChange(width.value)}
                            className={`flex-1 px-2 py-1.5 text-xs rounded-md transition-colors ${currentWidth?.value === width.value
                                ? 'bg-accent text-white'
                                : 'bg-bg-3 text-text-primary hover:bg-bg-2'
                                }`}
                        >
                            {width.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Border Style */}
            <div>
                <label className="block text-xs text-text-primary/60 mb-1">Style</label>
                <select
                    value={currentStyle?.value || 'solid'}
                    onChange={(e) => handleStyleChange(e.target.value)}
                    onBlur={onBlur}
                    className="w-full px-2 py-1.5 text-sm bg-bg-3 border border-text/10 rounded-md text-text-primary focus:outline-none focus:border-accent"
                >
                    {BORDER_STYLES.map(style => (
                        <option key={style.value} value={style.value}>
                            {style.label}
                        </option>
                    ))}
                </select>
            </div>

            {/* Border Color */}
            <div>
                <label className="block text-xs text-text-primary/60 mb-1">Color</label>
                <div className="relative">
                    <button
                        onClick={() => setShowColorPicker(!showColorPicker)}
                        className="w-full flex items-center gap-2 px-2 py-1.5 bg-bg-3 border border-text/10 rounded-md text-sm text-text-primary hover:bg-bg-2"
                    >
                        <div
                            className="w-5 h-5 rounded border border-text/20"
                            style={{ backgroundColor: styles.borderTopColor }}
                        />
                        <span className="flex-1 text-left truncate text-xs">
                            {styles.borderTopColor}
                        </span>
                    </button>

                    {showColorPicker && (
                        <div className="absolute top-full left-0 right-0 mt-1 p-2 bg-bg-1 border border-text/10 rounded-lg shadow-lg z-50">
                            <div className="flex flex-wrap gap-1">
                                {COMMON_BORDER_COLORS.map(color => (
                                    <button
                                        key={color.name}
                                        onClick={() => handleColorChange(color.hex)}
                                        className="w-6 h-6 rounded border border-text/20 hover:ring-2 ring-accent"
                                        style={{ backgroundColor: color.hex }}
                                        title={color.name}
                                    />
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Border Radius */}
            <div>
                <label className="block text-xs text-text-primary/60 mb-1">Radius</label>
                <select
                    value={currentRadius?.value || '0px'}
                    onChange={(e) => handleRadiusChange(e.target.value)}
                    onBlur={onBlur}
                    className="w-full px-2 py-1.5 text-sm bg-bg-3 border border-text/10 rounded-md text-text-primary focus:outline-none focus:border-accent"
                >
                    {BORDER_RADII.map(radius => (
                        <option key={radius.tw} value={radius.value}>
                            {radius.label}
                        </option>
                    ))}
                </select>

                {/* Visual radius preview */}
                <div className="mt-2 flex justify-center">
                    <div
                        className="w-16 h-16 bg-accent/20 border-2 border-accent transition-all"
                        style={{ borderRadius: currentRadius?.value || '0px' }}
                    />
                </div>
            </div>
        </div>
    );
}
