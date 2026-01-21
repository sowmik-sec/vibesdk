/**
 * Background Control - v0 Style
 * Background color dropdown with color swatches
 */

import { useCallback, useMemo } from 'react';
import type { DesignModeComputedStyles } from '@vibesdk/design-mode-client';
import { DropdownControl, type DropdownOption } from './dropdown-control';

interface BackgroundControlProps {
    styles: DesignModeComputedStyles;
    tailwindClasses: string[];
    onChange: (property: string, value: string, commit: boolean) => void;
    onPreview: (property: string, value: string) => void;
    onClearPreview: () => void;
}

// Common background colors matching Tailwind palette
const BG_COLORS: DropdownOption[] = [
    { label: 'Default', value: 'transparent', color: 'transparent' },
    { label: 'white', value: '#ffffff', color: '#ffffff' },
    { label: 'black', value: '#000000', color: '#000000' },
    { label: 'slate-50', value: '#f8fafc', color: '#f8fafc' },
    { label: 'slate-100', value: '#f1f5f9', color: '#f1f5f9' },
    { label: 'slate-200', value: '#e2e8f0', color: '#e2e8f0' },
    { label: 'slate-800', value: '#1e293b', color: '#1e293b' },
    { label: 'slate-900', value: '#0f172a', color: '#0f172a' },
    { label: 'gray-100', value: '#f3f4f6', color: '#f3f4f6' },
    { label: 'gray-200', value: '#e5e7eb', color: '#e5e7eb' },
    { label: 'gray-800', value: '#1f2937', color: '#1f2937' },
    { label: 'gray-900', value: '#111827', color: '#111827' },
    { label: 'red-50', value: '#fef2f2', color: '#fef2f2' },
    { label: 'red-500', value: '#ef4444', color: '#ef4444' },
    { label: 'orange-50', value: '#fff7ed', color: '#fff7ed' },
    { label: 'orange-500', value: '#f97316', color: '#f97316' },
    { label: 'yellow-50', value: '#fefce8', color: '#fefce8' },
    { label: 'yellow-500', value: '#eab308', color: '#eab308' },
    { label: 'green-50', value: '#f0fdf4', color: '#f0fdf4' },
    { label: 'green-500', value: '#22c55e', color: '#22c55e' },
    { label: 'blue-50', value: '#eff6ff', color: '#eff6ff' },
    { label: 'blue-500', value: '#3b82f6', color: '#3b82f6' },
    { label: 'indigo-50', value: '#eef2ff', color: '#eef2ff' },
    { label: 'indigo-500', value: '#6366f1', color: '#6366f1' },
    { label: 'purple-50', value: '#faf5ff', color: '#faf5ff' },
    { label: 'purple-500', value: '#a855f7', color: '#a855f7' },
    { label: 'pink-50', value: '#fdf2f8', color: '#fdf2f8' },
    { label: 'pink-500', value: '#ec4899', color: '#ec4899' },
];

export function BackgroundControl({
    styles,
    tailwindClasses: _tailwindClasses,
    onChange,
    onPreview,
    onClearPreview,
}: BackgroundControlProps) {
    const currentBg = useMemo(() => {
        // Try to match computed background to our options
        const match = BG_COLORS.find(c => c.value === styles.backgroundColor);
        if (match) return match.value;
        // Handle rgba(0, 0, 0, 0) as transparent
        if (styles.backgroundColor === 'rgba(0, 0, 0, 0)') return 'transparent';
        return styles.backgroundColor || 'transparent';
    }, [styles.backgroundColor]);

    const handleBgChange = useCallback((value: string, commit: boolean) => {
        onChange('backgroundColor', value, commit);
    }, [onChange]);

    return (
        <div>
            <DropdownControl
                options={BG_COLORS}
                value={currentBg}
                onChange={handleBgChange}
                onHoverStart={(val) => onPreview('backgroundColor', val)}
                onHoverEnd={onClearPreview}
                showColorSwatch
            />
        </div>
    );
}
