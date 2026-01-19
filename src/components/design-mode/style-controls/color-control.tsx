/**
 * Color Control - v0 Style
 * Text color dropdown with color swatches
 */

import { useCallback, useMemo } from 'react';
import type { DesignModeComputedStyles } from '@/lib/design-mode/design-mode-protocol';
import { DropdownControl, type DropdownOption } from './dropdown-control';

interface ColorControlProps {
    styles: DesignModeComputedStyles;
    tailwindClasses: string[];
    onChange: (property: string, value: string, commit: boolean) => void;
    onPreview: (property: string, value: string) => void;
    onClearPreview: () => void;
}

// Common text colors matching Tailwind palette
const TEXT_COLORS: DropdownOption[] = [
    { label: 'inherit', value: 'inherit', color: 'transparent' },
    { label: 'black', value: '#000000', color: '#000000' },
    { label: 'white', value: '#ffffff', color: '#ffffff' },
    { label: 'slate-50', value: '#f8fafc', color: '#f8fafc' },
    { label: 'slate-100', value: '#f1f5f9', color: '#f1f5f9' },
    { label: 'slate-200', value: '#e2e8f0', color: '#e2e8f0' },
    { label: 'slate-300', value: '#cbd5e1', color: '#cbd5e1' },
    { label: 'slate-400', value: '#94a3b8', color: '#94a3b8' },
    { label: 'slate-500', value: '#64748b', color: '#64748b' },
    { label: 'slate-600', value: '#475569', color: '#475569' },
    { label: 'slate-700', value: '#334155', color: '#334155' },
    { label: 'slate-800', value: '#1e293b', color: '#1e293b' },
    { label: 'slate-900', value: '#0f172a', color: '#0f172a' },
    { label: 'red-500', value: '#ef4444', color: '#ef4444' },
    { label: 'red-600', value: '#dc2626', color: '#dc2626' },
    { label: 'orange-500', value: '#f97316', color: '#f97316' },
    { label: 'amber-500', value: '#f59e0b', color: '#f59e0b' },
    { label: 'yellow-500', value: '#eab308', color: '#eab308' },
    { label: 'lime-500', value: '#84cc16', color: '#84cc16' },
    { label: 'green-500', value: '#22c55e', color: '#22c55e' },
    { label: 'emerald-500', value: '#10b981', color: '#10b981' },
    { label: 'teal-500', value: '#14b8a6', color: '#14b8a6' },
    { label: 'cyan-500', value: '#06b6d4', color: '#06b6d4' },
    { label: 'sky-500', value: '#0ea5e9', color: '#0ea5e9' },
    { label: 'blue-500', value: '#3b82f6', color: '#3b82f6' },
    { label: 'indigo-500', value: '#6366f1', color: '#6366f1' },
    { label: 'violet-500', value: '#8b5cf6', color: '#8b5cf6' },
    { label: 'purple-500', value: '#a855f7', color: '#a855f7' },
    { label: 'fuchsia-500', value: '#d946ef', color: '#d946ef' },
    { label: 'pink-500', value: '#ec4899', color: '#ec4899' },
    { label: 'rose-500', value: '#f43f5e', color: '#f43f5e' },
];

export function ColorControl({
    styles,
    tailwindClasses: _tailwindClasses,
    onChange,
    onPreview,
    onClearPreview,
}: ColorControlProps) {
    const currentColor = useMemo(() => {
        // Try to match computed color to our options
        const match = TEXT_COLORS.find(c => c.value === styles.color);
        if (match) return match.value;
        // Return the actual color if not in our list
        return styles.color || 'inherit';
    }, [styles.color]);

    const handleColorChange = useCallback((value: string, commit: boolean) => {
        onChange('color', value, commit);
    }, [onChange]);

    return (
        <div>
            <DropdownControl
                options={TEXT_COLORS}
                value={currentColor}
                onChange={handleColorChange}
                onHoverStart={(val) => onPreview('color', val)}
                onHoverEnd={onClearPreview}
                showColorSwatch
            />
        </div>
    );
}
