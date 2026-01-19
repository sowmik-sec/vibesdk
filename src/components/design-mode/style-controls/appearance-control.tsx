/**
 * Appearance Control - v0 Style
 * Opacity and Border Radius
 */

import { useCallback, useMemo } from 'react';
import type { DesignModeComputedStyles } from '@/lib/design-mode/design-mode-protocol';
import { DropdownControl, type DropdownOption } from './dropdown-control';

interface AppearanceControlProps {
    styles: DesignModeComputedStyles;
    tailwindClasses: string[];
    onChange: (property: string, value: string, commit: boolean) => void;
    onPreview: (property: string, value: string) => void;
    onClearPreview: () => void;
}

// Opacity options (0-100 in steps of 10)
const OPACITY_OPTIONS: DropdownOption[] = [
    { label: '0', value: '0' },
    { label: '10', value: '0.1' },
    { label: '20', value: '0.2' },
    { label: '30', value: '0.3' },
    { label: '40', value: '0.4' },
    { label: '50', value: '0.5' },
    { label: '60', value: '0.6' },
    { label: '70', value: '0.7' },
    { label: '80', value: '0.8' },
    { label: '90', value: '0.9' },
    { label: '100', value: '1' },
];

// Border Radius options
const RADIUS_OPTIONS: DropdownOption[] = [
    { label: 'Default', value: '0px' },
    { label: 'sm', value: '0.125rem' },
    { label: 'md', value: '0.375rem' },
    { label: 'lg', value: '0.5rem' },
    { label: 'xl', value: '0.75rem' },
    { label: '2xl', value: '1rem' },
    { label: '3xl', value: '1.5rem' },
    { label: 'full', value: '9999px' },
];

export function AppearanceControl({
    styles,
    tailwindClasses: _tailwindClasses,
    onChange,
    onPreview,
    onClearPreview,
}: AppearanceControlProps) {
    // Current values
    const currentOpacity = useMemo(() => {
        const opacity = parseFloat(styles.opacity || '1');
        const match = OPACITY_OPTIONS.find(o => parseFloat(o.value) === opacity);
        return match?.value || '1';
    }, [styles.opacity]);

    const currentRadius = useMemo(() => {
        const match = RADIUS_OPTIONS.find(r => r.value === styles.borderTopLeftRadius);
        return match?.value || styles.borderTopLeftRadius || '0px';
    }, [styles.borderTopLeftRadius]);

    // Handlers
    const handleOpacityChange = useCallback((value: string, commit: boolean) => {
        onChange('opacity', value, commit);
    }, [onChange]);

    const handleRadiusChange = useCallback((value: string, commit: boolean) => {
        // Apply to all corners
        onChange('borderTopLeftRadius', value, commit);
        onChange('borderTopRightRadius', value, commit);
        onChange('borderBottomRightRadius', value, commit);
        onChange('borderBottomLeftRadius', value, commit);
    }, [onChange]);

    const handleRadiusPreview = useCallback((value: string) => {
        onPreview('borderTopLeftRadius', value);
        onPreview('borderTopRightRadius', value);
        onPreview('borderBottomRightRadius', value);
        onPreview('borderBottomLeftRadius', value);
    }, [onPreview]);

    return (
        <div className="grid grid-cols-2 gap-4">
            {/* Opacity */}
            <div>
                <label className="block text-xs text-text-primary/60 mb-1">Opacity</label>
                <div className="flex items-center gap-1">
                    <DropdownControl
                        options={OPACITY_OPTIONS}
                        value={currentOpacity}
                        onChange={handleOpacityChange}
                        onHoverStart={(val) => onPreview('opacity', val)}
                        onHoverEnd={onClearPreview}
                        className="flex-1"
                    />
                    <span className="text-xs text-text-primary/60">%</span>
                </div>
            </div>

            {/* Radius */}
            <div>
                <label className="block text-xs text-text-primary/60 mb-1">Radius</label>
                <DropdownControl
                    options={RADIUS_OPTIONS}
                    value={currentRadius}
                    onChange={handleRadiusChange}
                    onHoverStart={handleRadiusPreview}
                    onHoverEnd={onClearPreview}
                />
            </div>
        </div>
    );
}
