/**
 * Color Control
 * Text color and background color with Tailwind color palette
 */

import { useCallback, useState, useMemo } from 'react';
import type { DesignModeComputedStyles } from '@/lib/design-mode/design-mode-protocol';
import { TAILWIND_COLORS, findClosestTailwindColor } from '@/lib/design-mode/tailwind-utils';

interface ColorControlProps {
    styles: DesignModeComputedStyles;
    tailwindClasses: string[];
    onChange: (property: string, value: string, commit: boolean) => void;
    onBlur: () => void;
}

const COLOR_SHADES = ['50', '100', '200', '300', '400', '500', '600', '700', '800', '900', '950'];

function ColorPicker({
    label,
    currentColor,
    currentClass,
    onChange,
    prefix,
}: {
    label: string;
    currentColor: string;
    currentClass?: string;
    onChange: (color: string, className: string) => void;
    prefix: 'text' | 'bg';
}) {
    const [isOpen, setIsOpen] = useState(false);

    const handleColorSelect = useCallback((colorName: string, shade: string, hex: string) => {
        const className = shade ? `${prefix}-${colorName}-${shade}` : `${prefix}-${colorName}`;
        onChange(hex, className);
        setIsOpen(false);
    }, [onChange, prefix]);

    // Parse current tailwind class to find selected color
    const selectedColor = useMemo(() => {
        if (!currentClass) {
            const closest = findClosestTailwindColor(currentColor);
            return closest ? { name: closest.name, shade: closest.shade } : null;
        }
        const match = currentClass.match(new RegExp(`^${prefix}-(\\w+)-(\\d+)$`));
        if (match) {
            return { name: match[1], shade: match[2] };
        }
        return null;
    }, [currentClass, currentColor, prefix]);

    return (
        <div>
            <label className="block text-xs text-text-primary/60 mb-1">{label}</label>
            <div className="relative">
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className="w-full flex items-center gap-2 px-2 py-1.5 bg-bg-3 border border-text/10 rounded-md text-sm text-text-primary hover:bg-bg-2 transition-colors"
                >
                    <div
                        className="w-5 h-5 rounded border border-text/20"
                        style={{ backgroundColor: currentColor }}
                    />
                    <span className="flex-1 text-left truncate">
                        {currentClass || currentColor}
                    </span>
                </button>

                {isOpen && (
                    <div className="absolute top-full left-0 right-0 mt-1 p-2 bg-bg-1 border border-text/10 rounded-lg shadow-lg z-50 max-h-64 overflow-y-auto">
                        {/* Special colors */}
                        <div className="flex gap-1 mb-2 pb-2 border-b border-text/10">
                            <button
                                onClick={() => handleColorSelect('white', '', '#ffffff')}
                                className="w-6 h-6 rounded border border-text/20 bg-white hover:ring-2 ring-accent"
                                title="white"
                            />
                            <button
                                onClick={() => handleColorSelect('black', '', '#000000')}
                                className="w-6 h-6 rounded border border-text/20 bg-black hover:ring-2 ring-accent"
                                title="black"
                            />
                            <button
                                onClick={() => handleColorSelect('transparent', '', 'transparent')}
                                className="w-6 h-6 rounded border border-text/20 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iOCIgaGVpZ2h0PSI4IiB2aWV3Qm94PSIwIDAgOCA4IiBmaWxsPSJub25lIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxyZWN0IHdpZHRoPSI0IiBoZWlnaHQ9IjQiIGZpbGw9IiNFNUU1RTUiLz48cmVjdCB4PSI0IiB3aWR0aD0iNCIgaGVpZ2h0PSI0IiBmaWxsPSJ3aGl0ZSIvPjxyZWN0IHk9IjQiIHdpZHRoPSI0IiBoZWlnaHQ9IjQiIGZpbGw9IndoaXRlIi8+PHJlY3QgeD0iNCIgeT0iNCIgd2lkdGg9IjQiIGhlaWdodD0iNCIgZmlsbD0iI0U1RTVFNSIvPjwvc3ZnPg==')] hover:ring-2 ring-accent"
                                title="transparent"
                            />
                        </div>

                        {/* Color palette */}
                        {Object.entries(TAILWIND_COLORS).map(([colorName, shades]) => (
                            <div key={colorName} className="flex gap-0.5 mb-0.5">
                                {COLOR_SHADES.filter(s => shades[s]).map(shade => (
                                    <button
                                        key={shade}
                                        onClick={() => handleColorSelect(colorName, shade, shades[shade])}
                                        className={`w-5 h-5 rounded-sm transition-transform hover:scale-110 ${selectedColor?.name === colorName && selectedColor?.shade === shade
                                            ? 'ring-2 ring-accent ring-offset-1'
                                            : ''
                                            }`}
                                        style={{ backgroundColor: shades[shade] }}
                                        title={`${colorName}-${shade}`}
                                    />
                                ))}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

export function ColorControl({ styles, tailwindClasses, onChange, onBlur: _onBlur }: ColorControlProps) {
    // Find current text color class
    const textColorClass = useMemo(() => {
        return tailwindClasses.find(c => c.match(/^text-(inherit|current|transparent|black|white|[\w]+-\d+)/));
    }, [tailwindClasses]);

    // Find current bg color class
    const bgColorClass = useMemo(() => {
        return tailwindClasses.find(c => c.match(/^bg-(inherit|current|transparent|black|white|[\w]+-\d+)/));
    }, [tailwindClasses]);

    const handleTextColorChange = useCallback((hex: string, _className: string) => {
        onChange('color', hex, true);
    }, [onChange]);

    const handleBgColorChange = useCallback((hex: string, _className: string) => {
        onChange('backgroundColor', hex, true);
    }, [onChange]);

    return (
        <div className="space-y-3">
            <ColorPicker
                label="Text Color"
                currentColor={styles.color}
                currentClass={textColorClass}
                onChange={handleTextColorChange}
                prefix="text"
            />
            <ColorPicker
                label="Background"
                currentColor={styles.backgroundColor}
                currentClass={bgColorClass}
                onChange={handleBgColorChange}
                prefix="bg"
            />
        </div>
    );
}
