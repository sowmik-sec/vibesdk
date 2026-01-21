/**
 * Spacing Control
 * Visual box model editor for margin and padding
 */

import { useCallback, useState, useMemo } from 'react';
import type { DesignModeComputedStyles } from '@vibesdk/design-mode-client';

interface SpacingControlProps {
    styles: DesignModeComputedStyles;
    tailwindClasses: string[];
    onChange: (property: string, value: string, commit: boolean) => void;
    onBlur: () => void;
}

function SpacingInput({
    label,
    value,
    onChange,
    property: _property,
}: {
    label: string;
    value: string;
    onChange: (value: string) => void;
    property: string;
}) {
    const [isEditing, setIsEditing] = useState(false);
    const [inputValue, setInputValue] = useState(value);

    const handleBlur = useCallback(() => {
        setIsEditing(false);
        onChange(inputValue);
    }, [inputValue, onChange]);

    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleBlur();
        } else if (e.key === 'Escape') {
            setInputValue(value);
            setIsEditing(false);
        }
    }, [handleBlur, value]);

    // Parse px value to display number
    const displayValue = useMemo(() => {
        const match = value.match(/^(\d+(?:\.\d+)?)(px|rem)?$/);
        if (match) {
            return match[1];
        }
        return value === 'auto' ? 'auto' : value.replace('px', '');
    }, [value]);

    if (isEditing) {
        return (
            <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onBlur={handleBlur}
                onKeyDown={handleKeyDown}
                className="w-10 px-1 py-0.5 text-xs text-center bg-bg-3 border border-accent rounded focus:outline-none text-text-primary"
                autoFocus
            />
        );
    }

    return (
        <button
            onClick={() => {
                setInputValue(value);
                setIsEditing(true);
            }}
            className="w-10 px-1 py-0.5 text-xs text-center bg-bg-3 border border-text/10 rounded hover:border-accent text-text-primary/70 truncate"
            title={`${label}: ${value}`}
        >
            {displayValue}
        </button>
    );
}

export function SpacingControl({ styles, tailwindClasses: _tailwindClasses, onChange, onBlur: _onBlur }: SpacingControlProps) {
    const handleSpacingChange = useCallback((property: string, value: string) => {
        onChange(property, value, true);
    }, [onChange]);

    return (
        <div className="space-y-4">
            {/* Margin */}
            <div>
                <label className="block text-xs text-text-primary/60 mb-2">Margin</label>
                <div className="relative flex items-center justify-center p-2">
                    {/* Visual box representation */}
                    <div className="relative w-full max-w-[180px]">
                        {/* Top margin */}
                        <div className="flex justify-center mb-1">
                            <SpacingInput
                                label="Top"
                                value={styles.marginTop}
                                onChange={(v) => handleSpacingChange('marginTop', v)}
                                property="marginTop"
                            />
                        </div>

                        {/* Left and Right margin with content box */}
                        <div className="flex items-center gap-1">
                            <SpacingInput
                                label="Left"
                                value={styles.marginLeft}
                                onChange={(v) => handleSpacingChange('marginLeft', v)}
                                property="marginLeft"
                            />
                            <div className="flex-1 h-10 bg-bg-2 border-2 border-dashed border-text/20 rounded flex items-center justify-center">
                                <span className="text-xs text-text-primary/40">margin</span>
                            </div>
                            <SpacingInput
                                label="Right"
                                value={styles.marginRight}
                                onChange={(v) => handleSpacingChange('marginRight', v)}
                                property="marginRight"
                            />
                        </div>

                        {/* Bottom margin */}
                        <div className="flex justify-center mt-1">
                            <SpacingInput
                                label="Bottom"
                                value={styles.marginBottom}
                                onChange={(v) => handleSpacingChange('marginBottom', v)}
                                property="marginBottom"
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Padding */}
            <div>
                <label className="block text-xs text-text-primary/60 mb-2">Padding</label>
                <div className="relative flex items-center justify-center p-2">
                    <div className="relative w-full max-w-[180px]">
                        {/* Top padding */}
                        <div className="flex justify-center mb-1">
                            <SpacingInput
                                label="Top"
                                value={styles.paddingTop}
                                onChange={(v) => handleSpacingChange('paddingTop', v)}
                                property="paddingTop"
                            />
                        </div>

                        {/* Left and Right padding with content box */}
                        <div className="flex items-center gap-1">
                            <SpacingInput
                                label="Left"
                                value={styles.paddingLeft}
                                onChange={(v) => handleSpacingChange('paddingLeft', v)}
                                property="paddingLeft"
                            />
                            <div className="flex-1 h-10 bg-accent/10 border-2 border-accent/30 rounded flex items-center justify-center">
                                <span className="text-xs text-accent/60">padding</span>
                            </div>
                            <SpacingInput
                                label="Right"
                                value={styles.paddingRight}
                                onChange={(v) => handleSpacingChange('paddingRight', v)}
                                property="paddingRight"
                            />
                        </div>

                        {/* Bottom padding */}
                        <div className="flex justify-center mt-1">
                            <SpacingInput
                                label="Bottom"
                                value={styles.paddingBottom}
                                onChange={(v) => handleSpacingChange('paddingBottom', v)}
                                property="paddingBottom"
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Quick spacing options */}
            <div>
                <label className="block text-xs text-text-primary/60 mb-1">Quick Set</label>
                <div className="flex flex-wrap gap-1">
                    {['0', '2', '4', '6', '8'].map(val => (
                        <button
                            key={val}
                            onClick={() => {
                                const value = val === '0' ? '0px' : `${parseInt(val) * 0.25}rem`;
                                handleSpacingChange('padding', value);
                            }}
                            className="px-2 py-1 text-xs bg-bg-3 border border-text/10 rounded hover:bg-bg-2 text-text-primary/70"
                        >
                            p-{val}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}
