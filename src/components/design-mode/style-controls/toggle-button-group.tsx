/**
 * Toggle Button Group
 * Icon-based button group for alignment, decoration, etc.
 * Supports single-select and multi-select modes with shadcn tooltips
 */

import { cn } from '@/lib/utils';
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from '@/components/ui/tooltip';

export interface ToggleOption {
    value: string;
    icon: React.ReactNode;
    label: string;
}

export interface ToggleButtonGroupProps {
    options: ToggleOption[];
    value: string | string[];
    onChange: (value: string | string[]) => void;
    mode?: 'single' | 'multi';
    className?: string;
    size?: 'sm' | 'md';
}

export function ToggleButtonGroup({
    options,
    value,
    onChange,
    mode = 'single',
    className,
    size = 'md',
}: ToggleButtonGroupProps) {
    const isActive = (optionValue: string) => {
        if (mode === 'single') {
            return value === optionValue;
        }
        return Array.isArray(value) && value.includes(optionValue);
    };

    const handleClick = (optionValue: string) => {
        if (mode === 'single') {
            onChange(optionValue);
        } else {
            const currentValues = Array.isArray(value) ? value : [];
            if (currentValues.includes(optionValue)) {
                onChange(currentValues.filter(v => v !== optionValue));
            } else {
                onChange([...currentValues, optionValue]);
            }
        }
    };

    return (
        <div className={cn('flex gap-1', className)}>
            {options.map(option => (
                <Tooltip key={option.value}>
                    <TooltipTrigger asChild>
                        <button
                            type="button"
                            onClick={() => handleClick(option.value)}
                            className={cn(
                                'flex items-center justify-center rounded-md transition-colors',
                                'border border-text/10',
                                size === 'sm' ? 'p-1.5' : 'p-2',
                                isActive(option.value)
                                    ? 'bg-accent text-white border-accent'
                                    : 'bg-bg-3 text-text-primary/70 hover:bg-bg-2 hover:text-text-primary'
                            )}
                        >
                            {option.icon}
                        </button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" sideOffset={4}>
                        {option.label}
                    </TooltipContent>
                </Tooltip>
            ))}
        </div>
    );
}
