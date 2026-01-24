/**
 * Size Control - v0 Style
 * Width and Height dropdown controls using shadcn DropdownMenu
 */

import { useCallback, useMemo } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import type { DesignModeComputedStyles } from '@vibesdk/design-mode-client';
import { cn } from '@/lib/utils';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface SizeControlProps {
    styles: DesignModeComputedStyles;
    onChange: (property: string, value: string, commit: boolean) => void;
    onPreview: (property: string, value: string) => void;
    onClearPreview: () => void;
}

// Full set of Tailwind size options
const SIZE_OPTIONS = [
    // Special
    { label: 'Auto', value: 'auto' },
    { label: 'Full (100%)', value: '100%' },
    { label: 'Screen', value: 'screen' },
    { label: 'Min Content', value: 'min-content' },
    { label: 'Max Content', value: 'max-content' },
    { label: 'Fit Content', value: 'fit-content' },

    // Pixels
    { label: '0px', value: '0px' },
    { label: '1px', value: '1px' },
    { label: '2px', value: '2px' },
    { label: '4px', value: '4px' },
    { label: '6px', value: '6px' },
    { label: '8px', value: '8px' },
    { label: '10px', value: '10px' },
    { label: '12px', value: '12px' },
    { label: '14px', value: '14px' },
    { label: '16px', value: '16px' },
    { label: '20px', value: '20px' },
    { label: '24px', value: '24px' },
    { label: '28px', value: '28px' },
    { label: '32px', value: '32px' },
    { label: '36px', value: '36px' },
    { label: '40px', value: '40px' },
    { label: '44px', value: '44px' },
    { label: '48px', value: '48px' },
    { label: '56px', value: '56px' },
    { label: '64px', value: '64px' }, // Assuming 65px was a typo for 64px (standard tailwind)
    { label: '80px', value: '80px' },
    { label: '96px', value: '96px' },
    { label: '112px', value: '112px' },
    { label: '128px', value: '128px' },
    { label: '144px', value: '144px' },
    { label: '160px', value: '160px' },
    { label: '176px', value: '176px' },
    { label: '192px', value: '192px' },
    { label: '208px', value: '208px' },
    { label: '224px', value: '224px' },
    { label: '240px', value: '240px' },
    { label: '256px', value: '256px' },
    { label: '288px', value: '288px' },
    { label: '320px', value: '320px' },
    { label: '384px', value: '384px' },

    // Fractions
    { label: '1/2 (50%)', value: '50%' },
    { label: '1/3 (33.3%)', value: '33.333333%' },
    { label: '2/3 (66.6%)', value: '66.666667%' },
    { label: '1/4 (25%)', value: '25%' },
    { label: '3/4 (75%)', value: '75%' }, // 2/4 is same as 1/2
    { label: '1/5 (20%)', value: '20%' },
    { label: '2/5 (40%)', value: '40%' },
    { label: '3/5 (60%)', value: '60%' },
    { label: '4/5 (80%)', value: '80%' },
    { label: '1/6 (16.6%)', value: '16.666667%' },
    { label: '5/6 (83.3%)', value: '83.333333%' }, // added for completeness (2/6 is 1/3)
];

function normalizeValue(value: string): string {
    if (!value || value === 'none') return 'auto';
    if (value === '100vh' || value === '100vw') return 'screen';

    // Normalize percentages to match fraction values if close enough
    if (value.endsWith('%')) {
        const num = parseFloat(value);
        if (Math.abs(num - 33.333333) < 0.1) return '33.333333%';
        if (Math.abs(num - 66.666667) < 0.1) return '66.666667%';
        if (Math.abs(num - 16.666667) < 0.1) return '16.666667%';
        if (Math.abs(num - 83.333333) < 0.1) return '83.333333%';
    }

    return value;
}

function getDisplayLabel(value: string): string {
    const normalized = normalizeValue(value);
    const option = SIZE_OPTIONS.find(opt => opt.value === normalized);
    if (option) return option.label;
    return value;
}

interface SizeDropdownProps {
    label: string;
    value: string;
    property: 'width' | 'height';
    onChange: (value: string) => void;
    onPreview: (value: string) => void;
    onClearPreview: () => void;
}

function SizeDropdown({
    label,
    value,
    property,
    onChange,
    onPreview,
    onClearPreview,
}: SizeDropdownProps) {
    const normalizedValue = normalizeValue(value);

    const handleOptionHover = useCallback((optionValue: string) => {
        let previewValue = optionValue;
        if (optionValue === 'screen') {
            previewValue = property === 'width' ? '100vw' : '100vh';
        }
        onPreview(previewValue);
    }, [onPreview, property]);

    const handleSelect = useCallback((optionValue: string) => {
        let finalValue = optionValue;
        if (optionValue === 'screen') {
            finalValue = property === 'width' ? '100vw' : '100vh';
        }
        onChange(finalValue);
    }, [onChange, property]);

    return (
        <div className="flex-1">
            <label className="block text-xs text-text-primary/60 mb-1">{label}</label>
            <DropdownMenu onOpenChange={(open) => { if (!open) onClearPreview(); }}>
                <DropdownMenuTrigger asChild>
                    <button
                        type="button"
                        className="w-full px-2 py-1.5 text-sm bg-bg-3 border border-text/10 hover:border-text/20 rounded-md text-left flex items-center justify-between transition-colors focus:outline-none focus:border-accent"
                    >
                        <span className="text-text-primary truncate">
                            {getDisplayLabel(value)}
                        </span>
                        <ChevronDown className="size-4 text-text-primary/50" />
                    </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                    align="start"
                    className="w-[200px] max-h-64 overflow-y-auto"
                >
                    {SIZE_OPTIONS.map((option) => (
                        <DropdownMenuItem
                            key={option.value}
                            onSelect={() => handleSelect(option.value)}
                            onMouseEnter={() => handleOptionHover(option.value)}
                            onMouseLeave={onClearPreview}
                            className={cn(
                                "flex items-center justify-between cursor-pointer text-xs",
                                normalizedValue === option.value && "bg-accent/10"
                            )}
                        >
                            <span>{option.label}</span>
                            {normalizedValue === option.value && (
                                <Check className="size-3 text-accent" />
                            )}
                        </DropdownMenuItem>
                    ))}
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
    );
}

export function SizeControl({
    styles,
    onChange,
    onPreview,
    onClearPreview,
}: SizeControlProps) {
    const width = useMemo(() => styles.width || 'auto', [styles.width]);
    const height = useMemo(() => styles.height || 'auto', [styles.height]);

    const handleWidthChange = useCallback((value: string) => {
        onChange('width', value, true);
    }, [onChange]);

    const handleHeightChange = useCallback((value: string) => {
        onChange('height', value, true);
    }, [onChange]);

    const handleWidthPreview = useCallback((value: string) => {
        onPreview('width', value);
    }, [onPreview]);

    const handleHeightPreview = useCallback((value: string) => {
        onPreview('height', value);
    }, [onPreview]);

    return (
        <div className="flex gap-3">
            <SizeDropdown
                label="Width"
                value={width}
                property="width"
                onChange={handleWidthChange}
                onPreview={handleWidthPreview}
                onClearPreview={onClearPreview}
            />
            <SizeDropdown
                label="Height"
                value={height}
                property="height"
                onChange={handleHeightChange}
                onPreview={handleHeightPreview}
                onClearPreview={onClearPreview}
            />
        </div>
    );
}
