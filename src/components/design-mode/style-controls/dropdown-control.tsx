/**
 * Dropdown Control with Hover-to-Preview
 * Matches v0.dev style dropdown with:
 * - Hover on item → preview style
 * - Mouse leave → revert preview
 * - Click → commit style
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface DropdownOption {
    label: string;
    value: string;
    /** Tailwind class for this option */
    tw?: string;
    /** Color hex for color swatches */
    color?: string;
    /** Icon component */
    icon?: React.ReactNode;
}

export interface DropdownControlProps {
    options: DropdownOption[];
    value: string;
    onChange: (value: string, commit: boolean) => void;
    onHoverStart?: (value: string) => void;
    onHoverEnd?: () => void;
    placeholder?: string;
    showColorSwatch?: boolean;
    className?: string;
    disabled?: boolean;
}

export function DropdownControl({
    options,
    value,
    onChange,
    onHoverStart,
    onHoverEnd,
    placeholder = 'Select...',
    showColorSwatch = false,
    className,
    disabled = false,
}: DropdownControlProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [hoveredValue, setHoveredValue] = useState<string | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // Find current option
    const currentOption = options.find(o => o.value === value);

    // Close on outside click
    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setIsOpen(false);
                if (hoveredValue) {
                    onHoverEnd?.();
                    setHoveredValue(null);
                }
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [hoveredValue, onHoverEnd]);

    const handleToggle = useCallback(() => {
        if (disabled) return;
        setIsOpen(prev => !prev);
    }, [disabled]);

    const handleOptionHover = useCallback((option: DropdownOption) => {
        if (option.value !== hoveredValue) {
            setHoveredValue(option.value);
            onHoverStart?.(option.value);
        }
    }, [hoveredValue, onHoverStart]);

    const handleOptionLeave = useCallback(() => {
        if (hoveredValue) {
            setHoveredValue(null);
            onHoverEnd?.();
        }
    }, [hoveredValue, onHoverEnd]);

    const handleOptionClick = useCallback((option: DropdownOption) => {
        onChange(option.value, true);
        setIsOpen(false);
        setHoveredValue(null);
    }, [onChange]);

    return (
        <div ref={containerRef} className={cn('relative', className)}>
            {/* Trigger Button */}
            <button
                type="button"
                onClick={handleToggle}
                disabled={disabled}
                className={cn(
                    'w-full flex items-center justify-between gap-2 px-3 py-2',
                    'bg-bg-3 border border-text/10 rounded-md',
                    'text-sm text-text-primary',
                    'hover:bg-bg-2 transition-colors',
                    'focus:outline-none focus:border-accent',
                    disabled && 'opacity-50 cursor-not-allowed'
                )}
            >
                <div className="flex items-center gap-2 truncate">
                    {showColorSwatch && currentOption?.color && (
                        <div
                            className="w-4 h-4 rounded border border-text/20 shrink-0"
                            style={{ backgroundColor: currentOption.color }}
                        />
                    )}
                    {currentOption?.icon}
                    <span className="truncate">
                        {currentOption?.label || placeholder}
                    </span>
                </div>
                <ChevronDown className={cn(
                    'size-4 shrink-0 transition-transform',
                    isOpen && 'rotate-180'
                )} />
            </button>

            {/* Dropdown Menu */}
            {isOpen && (
                <div
                    className={cn(
                        'absolute z-50 w-full mt-1',
                        'bg-bg-1 border border-text/10 rounded-md shadow-lg',
                        'max-h-60 overflow-y-auto'
                    )}
                    onMouseLeave={handleOptionLeave}
                >
                    {options.map(option => (
                        <button
                            key={option.value}
                            type="button"
                            onClick={() => handleOptionClick(option)}
                            onMouseEnter={() => handleOptionHover(option)}
                            className={cn(
                                'w-full flex items-center gap-2 px-3 py-2 text-sm text-left',
                                'hover:bg-accent/10 transition-colors',
                                option.value === value && 'bg-accent/20 text-accent',
                                hoveredValue === option.value && option.value !== value && 'bg-bg-2'
                            )}
                        >
                            {showColorSwatch && option.color && (
                                <div
                                    className="w-4 h-4 rounded border border-text/20 shrink-0"
                                    style={{ backgroundColor: option.color }}
                                />
                            )}
                            {option.icon}
                            <span className="truncate">{option.label}</span>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
