/**
 * Shadow Control
 * Box shadow presets and opacity
 */

import { useCallback, useMemo } from 'react';
import type { DesignModeComputedStyles } from '@/lib/design-mode/design-mode-protocol';

interface ShadowControlProps {
    styles: DesignModeComputedStyles;
    tailwindClasses: string[];
    onChange: (property: string, value: string, commit: boolean) => void;
    onBlur: () => void;
}

const SHADOW_PRESETS = [
    { label: 'None', value: 'none', tw: 'shadow-none' },
    { label: 'sm', value: '0 1px 2px 0 rgb(0 0 0 / 0.05)', tw: 'shadow-sm' },
    { label: 'Default', value: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)', tw: 'shadow' },
    { label: 'md', value: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)', tw: 'shadow-md' },
    { label: 'lg', value: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)', tw: 'shadow-lg' },
    { label: 'xl', value: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)', tw: 'shadow-xl' },
    { label: '2xl', value: '0 25px 50px -12px rgb(0 0 0 / 0.25)', tw: 'shadow-2xl' },
    { label: 'Inner', value: 'inset 0 2px 4px 0 rgb(0 0 0 / 0.05)', tw: 'shadow-inner' },
];

export function ShadowControl({ styles, tailwindClasses, onChange, onBlur }: ShadowControlProps) {
    // Get current shadow
    const currentShadow = useMemo(() => {
        const shadowClass = tailwindClasses.find(c => c.match(/^shadow(-sm|-md|-lg|-xl|-2xl|-inner|-none)?$/));
        return SHADOW_PRESETS.find(preset => preset.tw === shadowClass) ||
            SHADOW_PRESETS.find(_preset => styles.boxShadow !== 'none');
    }, [tailwindClasses, styles.boxShadow]);

    // Current opacity value is used directly in the display below

    const handleShadowChange = useCallback((value: string) => {
        onChange('boxShadow', value, true);
    }, [onChange]);

    const handleOpacityChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        onChange('opacity', e.target.value, true);
    }, [onChange]);

    return (
        <div className="space-y-4">
            {/* Box Shadow */}
            <div>
                <label className="block text-xs text-text-primary/60 mb-2">Box Shadow</label>
                <div className="grid grid-cols-4 gap-1">
                    {SHADOW_PRESETS.map(shadow => (
                        <button
                            key={shadow.tw}
                            onClick={() => handleShadowChange(shadow.value)}
                            className={`p-2 text-xs rounded-md transition-colors ${currentShadow?.tw === shadow.tw
                                ? 'bg-accent text-white'
                                : 'bg-bg-3 text-text-primary hover:bg-bg-2'
                                }`}
                        >
                            {shadow.label}
                        </button>
                    ))}
                </div>

                {/* Shadow preview */}
                <div className="mt-3 flex justify-center p-4 bg-bg-2 rounded-lg">
                    <div
                        className="w-16 h-16 bg-white rounded-lg transition-shadow"
                        style={{ boxShadow: currentShadow?.value || 'none' }}
                    />
                </div>
            </div>

            {/* Opacity */}
            <div>
                <div className="flex items-center justify-between mb-2">
                    <label className="text-xs text-text-primary/60">Opacity</label>
                    <span className="text-xs text-text-primary/80">
                        {Math.round(parseFloat(styles.opacity) * 100)}%
                    </span>
                </div>
                <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={styles.opacity}
                    onChange={handleOpacityChange}
                    onMouseUp={onBlur}
                    className="w-full h-1.5 bg-bg-3 rounded-lg appearance-none cursor-pointer accent-accent"
                />
                <div className="flex justify-between mt-1">
                    <span className="text-xs text-text-primary/40">0%</span>
                    <span className="text-xs text-text-primary/40">100%</span>
                </div>
            </div>
        </div>
    );
}
