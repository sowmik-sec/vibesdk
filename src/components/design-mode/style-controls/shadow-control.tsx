/**
 * Shadow Control - v0 Style
 * Box shadow presets dropdown
 */

import { useCallback, useMemo } from 'react';
import type { DesignModeComputedStyles } from '@/lib/design-mode/design-mode-protocol';
import { DropdownControl, type DropdownOption } from './dropdown-control';

interface ShadowControlProps {
    styles: DesignModeComputedStyles;
    tailwindClasses: string[];
    onChange: (property: string, value: string, commit: boolean) => void;
    onPreview: (property: string, value: string) => void;
    onClearPreview: () => void;
}

// Shadow presets matching Tailwind
const SHADOW_OPTIONS: DropdownOption[] = [
    { label: 'Default', value: 'none' },
    { label: 'sm', value: '0 1px 2px 0 rgb(0 0 0 / 0.05)' },
    { label: 'md', value: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)' },
    { label: 'lg', value: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)' },
    { label: 'xl', value: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)' },
    { label: '2xl', value: '0 25px 50px -12px rgb(0 0 0 / 0.25)' },
    { label: 'inner', value: 'inset 0 2px 4px 0 rgb(0 0 0 / 0.05)' },
];

export function ShadowControl({
    styles,
    tailwindClasses: _tailwindClasses,
    onChange,
    onPreview,
    onClearPreview,
}: ShadowControlProps) {
    // Current value
    const currentShadow = useMemo(() => {
        if (!styles.boxShadow || styles.boxShadow === 'none') return 'none';
        const match = SHADOW_OPTIONS.find(s => s.value === styles.boxShadow);
        return match?.value || styles.boxShadow;
    }, [styles.boxShadow]);

    // Handler
    const handleShadowChange = useCallback((value: string, commit: boolean) => {
        onChange('boxShadow', value, commit);
    }, [onChange]);

    return (
        <div>
            <DropdownControl
                options={SHADOW_OPTIONS}
                value={currentShadow}
                onChange={handleShadowChange}
                onHoverStart={(val) => onPreview('boxShadow', val)}
                onHoverEnd={onClearPreview}
            />
        </div>
    );
}
