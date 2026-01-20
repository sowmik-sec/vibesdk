/**
 * Expandable Spacing Control
 * For margin/padding/border with:
 * - Default: 2 inputs (Vertical/Horizontal)
 * - Expanded: 4 inputs (Top/Right/Bottom/Left)
 * - Lock: Links all values together
 */

import { useState, useCallback } from 'react';
import { Maximize2, Minimize2, Lock, Unlock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DropdownControl, type DropdownOption } from './dropdown-control';
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from '@/components/ui/tooltip';

// Icons for spacing sides
const VerticalIcon = () => (
    <svg className="size-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="4" y="2" width="8" height="12" rx="1" />
        <line x1="8" y1="4" x2="8" y2="6" />
        <line x1="8" y1="10" x2="8" y2="12" />
    </svg>
);

const HorizontalIcon = () => (
    <svg className="size-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="2" y="4" width="12" height="8" rx="1" />
        <line x1="4" y1="8" x2="6" y2="8" />
        <line x1="10" y1="8" x2="12" y2="8" />
    </svg>
);

const TopIcon = () => (
    <svg className="size-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="3" y="2" width="10" height="12" rx="1" />
        <line x1="6" y1="4" x2="10" y2="4" strokeWidth="2" />
    </svg>
);

const RightIcon = () => (
    <svg className="size-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="2" y="3" width="12" height="10" rx="1" />
        <line x1="12" y1="6" x2="12" y2="10" strokeWidth="2" />
    </svg>
);

const BottomIcon = () => (
    <svg className="size-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="3" y="2" width="10" height="12" rx="1" />
        <line x1="6" y1="12" x2="10" y2="12" strokeWidth="2" />
    </svg>
);

const LeftIcon = () => (
    <svg className="size-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="2" y="3" width="12" height="10" rx="1" />
        <line x1="4" y1="6" x2="4" y2="10" strokeWidth="2" />
    </svg>
);

// Spacing options for dropdowns
const SPACING_OPTIONS: DropdownOption[] = [
    { label: '0px', value: '0px' },
    { label: '4px', value: '4px' },
    { label: '8px', value: '8px' },
    { label: '12px', value: '12px' },
    { label: '16px', value: '16px' },
    { label: '20px', value: '20px' },
    { label: '24px', value: '24px' },
    { label: '32px', value: '32px' },
    { label: '40px', value: '40px' },
    { label: '48px', value: '48px' },
    { label: '64px', value: '64px' },
];

export interface ExpandableSpacingProps {
    /** Property prefix: 'margin' or 'padding' or 'border' */
    property: 'margin' | 'padding' | 'border';
    values: {
        top: string;
        right: string;
        bottom: string;
        left: string;
    };
    onChange: (side: string, value: string, commit: boolean) => void;
    onBatchChange?: (changes: Array<{ side: string; value: string }>, commit: boolean) => void;
    onHoverStart?: (side: string, value: string) => void;
    onHoverEnd?: () => void;
    className?: string;
}

export function ExpandableSpacing({
    property,
    values,
    onChange,
    onBatchChange,
    onHoverStart,
    onHoverEnd,
    className,
}: ExpandableSpacingProps) {
    const [isExpanded, setIsExpanded] = useState(false);
    const [isLocked, setIsLocked] = useState(false);

    // Calculate V/H values (average or first value if all same)
    const vValue = values.top === values.bottom ? values.top : values.top;
    const hValue = values.left === values.right ? values.left : values.left;
    const allSame = values.top === values.right && values.right === values.bottom && values.bottom === values.left;

    const handleChange = useCallback((side: string, value: string, commit: boolean) => {
        if (isLocked) {
            // Apply to all sides
            if (onBatchChange) {
                onBatchChange([
                    { side: 'top', value },
                    { side: 'right', value },
                    { side: 'bottom', value },
                    { side: 'left', value },
                ], commit);
            } else {
                onChange(`${property}Top`, value, commit);
                onChange(`${property}Right`, value, commit);
                onChange(`${property}Bottom`, value, commit);
                onChange(`${property}Left`, value, commit);
            }
        } else if (side === 'vertical') {
            if (onBatchChange) {
                onBatchChange([
                    { side: 'top', value },
                    { side: 'bottom', value },
                ], commit);
            } else {
                onChange(`${property}Top`, value, commit);
                onChange(`${property}Bottom`, value, commit);
            }
        } else if (side === 'horizontal') {
            if (onBatchChange) {
                onBatchChange([
                    { side: 'left', value },
                    { side: 'right', value },
                ], commit);
            } else {
                onChange(`${property}Left`, value, commit);
                onChange(`${property}Right`, value, commit);
            }
        } else {
            onChange(`${property}${side.charAt(0).toUpperCase() + side.slice(1)}`, value, commit);
        }
    }, [property, isLocked, onChange, onBatchChange]);

    const handleHoverStart = useCallback((side: string, value: string) => {
        if (isLocked) {
            onHoverStart?.('all', value);
        } else {
            onHoverStart?.(side, value);
        }
    }, [isLocked, onHoverStart]);

    return (
        <div className={cn('space-y-2', className)}>
            {isLocked && allSame ? (
                // Locked mode: single input
                <div className="flex items-center gap-2">
                    <DropdownControl
                        options={SPACING_OPTIONS}
                        value={values.top}
                        onChange={(val, commit) => handleChange('top', val, commit)}
                        onHoverStart={(val) => handleHoverStart('all', val)}
                        onHoverEnd={onHoverEnd}
                        className="flex-1"
                    />
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <button
                                type="button"
                                onClick={() => setIsLocked(false)}
                                className="p-2 bg-accent text-white rounded-md hover:bg-accent/80"
                            >
                                <Lock className="size-4" />
                            </button>
                        </TooltipTrigger>
                        <TooltipContent side="bottom">Unlock sides</TooltipContent>
                    </Tooltip>
                </div>
            ) : isExpanded ? (
                // Expanded mode: 4 inputs
                <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                        <div className="flex items-center gap-1">
                            <TopIcon />
                            <DropdownControl
                                options={SPACING_OPTIONS}
                                value={values.top}
                                onChange={(val, commit) => handleChange('top', val, commit)}
                                onHoverStart={(val) => handleHoverStart('top', val)}
                                onHoverEnd={onHoverEnd}
                                className="flex-1"
                            />
                        </div>
                        <div className="flex items-center gap-1">
                            <RightIcon />
                            <DropdownControl
                                options={SPACING_OPTIONS}
                                value={values.right}
                                onChange={(val, commit) => handleChange('right', val, commit)}
                                onHoverStart={(val) => handleHoverStart('right', val)}
                                onHoverEnd={onHoverEnd}
                                className="flex-1"
                            />
                        </div>
                        <div className="flex items-center gap-1">
                            <BottomIcon />
                            <DropdownControl
                                options={SPACING_OPTIONS}
                                value={values.bottom}
                                onChange={(val, commit) => handleChange('bottom', val, commit)}
                                onHoverStart={(val) => handleHoverStart('bottom', val)}
                                onHoverEnd={onHoverEnd}
                                className="flex-1"
                            />
                        </div>
                        <div className="flex items-center gap-1">
                            <LeftIcon />
                            <DropdownControl
                                options={SPACING_OPTIONS}
                                value={values.left}
                                onChange={(val, commit) => handleChange('left', val, commit)}
                                onHoverStart={(val) => handleHoverStart('left', val)}
                                onHoverEnd={onHoverEnd}
                                className="flex-1"
                            />
                        </div>
                    </div>
                    <div className="flex justify-end gap-1">
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <button
                                    type="button"
                                    onClick={() => setIsExpanded(false)}
                                    className="p-1.5 bg-bg-3 text-text-primary/70 rounded hover:bg-bg-2"
                                >
                                    <Minimize2 className="size-4" />
                                </button>
                            </TooltipTrigger>
                            <TooltipContent side="bottom">Collapse</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <button
                                    type="button"
                                    onClick={() => setIsLocked(!isLocked)}
                                    className={cn(
                                        'p-1.5 rounded',
                                        isLocked ? 'bg-accent text-white' : 'bg-bg-3 text-text-primary/70 hover:bg-bg-2'
                                    )}
                                >
                                    {isLocked ? <Lock className="size-4" /> : <Unlock className="size-4" />}
                                </button>
                            </TooltipTrigger>
                            <TooltipContent side="bottom">{isLocked ? 'Unlock sides' : 'Lock all sides'}</TooltipContent>
                        </Tooltip>
                    </div>
                </div>
            ) : (
                // Default mode: V/H inputs
                <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1 flex-1">
                        <VerticalIcon />
                        <DropdownControl
                            options={SPACING_OPTIONS}
                            value={vValue}
                            onChange={(val, commit) => handleChange('vertical', val, commit)}
                            onHoverStart={(val) => handleHoverStart('vertical', val)}
                            onHoverEnd={onHoverEnd}
                            className="flex-1"
                        />
                    </div>
                    <div className="flex items-center gap-1 flex-1">
                        <HorizontalIcon />
                        <DropdownControl
                            options={SPACING_OPTIONS}
                            value={hValue}
                            onChange={(val, commit) => handleChange('horizontal', val, commit)}
                            onHoverStart={(val) => handleHoverStart('horizontal', val)}
                            onHoverEnd={onHoverEnd}
                            className="flex-1"
                        />
                    </div>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <button
                                type="button"
                                onClick={() => setIsExpanded(true)}
                                className="p-1.5 bg-bg-3 text-text-primary/70 rounded hover:bg-bg-2"
                            >
                                <Maximize2 className="size-4" />
                            </button>
                        </TooltipTrigger>
                        <TooltipContent side="bottom">Expand to all sides</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <button
                                type="button"
                                onClick={() => setIsLocked(!isLocked)}
                                className={cn(
                                    'p-1.5 rounded',
                                    isLocked ? 'bg-accent text-white' : 'bg-bg-3 text-text-primary/70 hover:bg-bg-2'
                                )}
                            >
                                {isLocked ? <Lock className="size-4" /> : <Unlock className="size-4" />}
                            </button>
                        </TooltipTrigger>
                        <TooltipContent side="bottom">{isLocked ? 'Unlock sides' : 'Lock all sides'}</TooltipContent>
                    </Tooltip>
                </div>
            )}
        </div>
    );
}
