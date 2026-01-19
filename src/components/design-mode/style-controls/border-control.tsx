/**
 * Border Control - v0 Style
 * Border color, style, and width with expand functionality
 */

import { useState, useCallback, useMemo } from 'react';
import { Maximize2 } from 'lucide-react';
import type { DesignModeComputedStyles } from '@/lib/design-mode/design-mode-protocol';
import { DropdownControl, type DropdownOption } from './dropdown-control';

interface BorderControlProps {
    styles: DesignModeComputedStyles;
    tailwindClasses: string[];
    onChange: (property: string, value: string, commit: boolean) => void;
    onPreview: (property: string, value: string) => void;
    onClearPreview: () => void;
}

// Border colors
const BORDER_COLORS: DropdownOption[] = [
    { label: 'transparent', value: 'transparent', color: 'transparent' },
    { label: 'black', value: '#000000', color: '#000000' },
    { label: 'white', value: '#ffffff', color: '#ffffff' },
    { label: 'gray-200', value: '#e5e7eb', color: '#e5e7eb' },
    { label: 'gray-300', value: '#d1d5db', color: '#d1d5db' },
    { label: 'gray-400', value: '#9ca3af', color: '#9ca3af' },
    { label: 'slate-200', value: '#e2e8f0', color: '#e2e8f0' },
    { label: 'slate-300', value: '#cbd5e1', color: '#cbd5e1' },
    { label: 'blue-500', value: '#3b82f6', color: '#3b82f6' },
    { label: 'red-500', value: '#ef4444', color: '#ef4444' },
    { label: 'green-500', value: '#22c55e', color: '#22c55e' },
    { label: 'purple-500', value: '#a855f7', color: '#a855f7' },
];

// Border styles
const BORDER_STYLES: DropdownOption[] = [
    { label: 'Default', value: 'solid' },
    { label: 'Dashed', value: 'dashed' },
    { label: 'Dotted', value: 'dotted' },
    { label: 'Double', value: 'double' },
    { label: 'None', value: 'none' },
];

// Border widths
const BORDER_WIDTHS: DropdownOption[] = [
    { label: '0px', value: '0px' },
    { label: '1px', value: '1px' },
    { label: '2px', value: '2px' },
    { label: '4px', value: '4px' },
    { label: '8px', value: '8px' },
];

// Icons for border sides
const TopIcon = () => (
    <svg className="size-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="3" y="2" width="10" height="12" rx="1" />
        <line x1="5" y1="3" x2="11" y2="3" strokeWidth="2" />
    </svg>
);

const RightIcon = () => (
    <svg className="size-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="2" y="3" width="12" height="10" rx="1" />
        <line x1="13" y1="5" x2="13" y2="11" strokeWidth="2" />
    </svg>
);

const BottomIcon = () => (
    <svg className="size-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="3" y="2" width="10" height="12" rx="1" />
        <line x1="5" y1="13" x2="11" y2="13" strokeWidth="2" />
    </svg>
);

const LeftIcon = () => (
    <svg className="size-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="2" y="3" width="12" height="10" rx="1" />
        <line x1="3" y1="5" x2="3" y2="11" strokeWidth="2" />
    </svg>
);

const AllIcon = () => (
    <svg className="size-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="3" width="10" height="10" rx="1" />
    </svg>
);

export function BorderControl({
    styles,
    tailwindClasses: _tailwindClasses,
    onChange,
    onPreview,
    onClearPreview,
}: BorderControlProps) {
    const [isExpanded, setIsExpanded] = useState(false);

    // Current values
    const currentColor = useMemo(() => {
        const match = BORDER_COLORS.find(c => c.value === styles.borderTopColor);
        return match?.value || styles.borderTopColor || 'transparent';
    }, [styles.borderTopColor]);

    const currentStyle = useMemo(() => {
        return styles.borderStyle || 'solid';
    }, [styles.borderStyle]);

    const borderWidths = useMemo(() => ({
        top: styles.borderTopWidth || '0px',
        right: styles.borderRightWidth || '0px',
        bottom: styles.borderBottomWidth || '0px',
        left: styles.borderLeftWidth || '0px',
    }), [styles.borderTopWidth, styles.borderRightWidth, styles.borderBottomWidth, styles.borderLeftWidth]);

    const allSameWidth = borderWidths.top === borderWidths.right &&
        borderWidths.right === borderWidths.bottom &&
        borderWidths.bottom === borderWidths.left;

    // Handlers
    const handleColorChange = useCallback((value: string, commit: boolean) => {
        onChange('borderTopColor', value, commit);
        onChange('borderRightColor', value, commit);
        onChange('borderBottomColor', value, commit);
        onChange('borderLeftColor', value, commit);
    }, [onChange]);

    const handleStyleChange = useCallback((value: string, commit: boolean) => {
        onChange('borderStyle', value, commit);
    }, [onChange]);

    const handleWidthChange = useCallback((side: string, value: string, commit: boolean) => {
        if (side === 'all') {
            onChange('borderTopWidth', value, commit);
            onChange('borderRightWidth', value, commit);
            onChange('borderBottomWidth', value, commit);
            onChange('borderLeftWidth', value, commit);
        } else {
            onChange(`border${side.charAt(0).toUpperCase() + side.slice(1)}Width`, value, commit);
        }
    }, [onChange]);

    const handleWidthPreview = useCallback((side: string, value: string) => {
        if (side === 'all') {
            onPreview('borderTopWidth', value);
            onPreview('borderRightWidth', value);
            onPreview('borderBottomWidth', value);
            onPreview('borderLeftWidth', value);
        } else {
            onPreview(`border${side.charAt(0).toUpperCase() + side.slice(1)}Width`, value);
        }
    }, [onPreview]);

    return (
        <div className="space-y-3">
            {/* Border Color & Style */}
            <div className="grid grid-cols-2 gap-2">
                <DropdownControl
                    options={BORDER_COLORS}
                    value={currentColor}
                    onChange={handleColorChange}
                    onHoverStart={(val) => {
                        onPreview('borderTopColor', val);
                        onPreview('borderRightColor', val);
                        onPreview('borderBottomColor', val);
                        onPreview('borderLeftColor', val);
                    }}
                    onHoverEnd={onClearPreview}
                    showColorSwatch
                />
                <DropdownControl
                    options={BORDER_STYLES}
                    value={currentStyle}
                    onChange={handleStyleChange}
                    onHoverStart={(val) => onPreview('borderStyle', val)}
                    onHoverEnd={onClearPreview}
                />
            </div>

            {/* Border Width */}
            {isExpanded ? (
                // Expanded: 4 inputs
                <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                        <div className="flex items-center gap-1">
                            <TopIcon />
                            <DropdownControl
                                options={BORDER_WIDTHS}
                                value={borderWidths.top}
                                onChange={(val, commit) => handleWidthChange('top', val, commit)}
                                onHoverStart={(val) => handleWidthPreview('top', val)}
                                onHoverEnd={onClearPreview}
                                className="flex-1"
                            />
                        </div>
                        <div className="flex items-center gap-1">
                            <RightIcon />
                            <DropdownControl
                                options={BORDER_WIDTHS}
                                value={borderWidths.right}
                                onChange={(val, commit) => handleWidthChange('right', val, commit)}
                                onHoverStart={(val) => handleWidthPreview('right', val)}
                                onHoverEnd={onClearPreview}
                                className="flex-1"
                            />
                        </div>
                        <div className="flex items-center gap-1">
                            <BottomIcon />
                            <DropdownControl
                                options={BORDER_WIDTHS}
                                value={borderWidths.bottom}
                                onChange={(val, commit) => handleWidthChange('bottom', val, commit)}
                                onHoverStart={(val) => handleWidthPreview('bottom', val)}
                                onHoverEnd={onClearPreview}
                                className="flex-1"
                            />
                        </div>
                        <div className="flex items-center gap-1">
                            <LeftIcon />
                            <DropdownControl
                                options={BORDER_WIDTHS}
                                value={borderWidths.left}
                                onChange={(val, commit) => handleWidthChange('left', val, commit)}
                                onHoverStart={(val) => handleWidthPreview('left', val)}
                                onHoverEnd={onClearPreview}
                                className="flex-1"
                            />
                        </div>
                    </div>
                    <div className="flex justify-end">
                        <button
                            type="button"
                            onClick={() => setIsExpanded(false)}
                            className="p-1.5 bg-bg-3 text-text-primary/70 rounded hover:bg-bg-2"
                            title="Collapse"
                        >
                            <Maximize2 className="size-4" />
                        </button>
                    </div>
                </div>
            ) : (
                // Collapsed: single input
                <div className="flex items-center gap-2">
                    <AllIcon />
                    <DropdownControl
                        options={BORDER_WIDTHS}
                        value={allSameWidth ? borderWidths.top : borderWidths.top}
                        onChange={(val, commit) => handleWidthChange('all', val, commit)}
                        onHoverStart={(val) => handleWidthPreview('all', val)}
                        onHoverEnd={onClearPreview}
                        className="flex-1"
                    />
                    <button
                        type="button"
                        onClick={() => setIsExpanded(true)}
                        className="p-1.5 bg-bg-3 text-text-primary/70 rounded hover:bg-bg-2"
                        title="Expand to show all sides"
                    >
                        <Maximize2 className="size-4" />
                    </button>
                </div>
            )}
        </div>
    );
}
