/**
 * Layout Control
 * Display, flex direction, justify content, align items
 */

import { useCallback, useMemo } from 'react';
import type { DesignModeComputedStyles } from '@/lib/design-mode/design-mode-protocol';

interface LayoutControlProps {
    styles: DesignModeComputedStyles;
    tailwindClasses: string[];
    onChange: (property: string, value: string, commit: boolean) => void;
    onBlur: () => void;
}

const DISPLAY_VALUES = [
    { label: 'Block', value: 'block', tw: 'block' },
    { label: 'Flex', value: 'flex', tw: 'flex' },
    { label: 'Grid', value: 'grid', tw: 'grid' },
    { label: 'Inline', value: 'inline', tw: 'inline' },
    { label: 'I-Block', value: 'inline-block', tw: 'inline-block' },
    { label: 'I-Flex', value: 'inline-flex', tw: 'inline-flex' },
    { label: 'Hidden', value: 'none', tw: 'hidden' },
];

const FLEX_DIRECTIONS = [
    { label: 'Row', value: 'row', tw: 'flex-row' },
    { label: 'Row Rev', value: 'row-reverse', tw: 'flex-row-reverse' },
    { label: 'Col', value: 'column', tw: 'flex-col' },
    { label: 'Col Rev', value: 'column-reverse', tw: 'flex-col-reverse' },
];

const JUSTIFY_VALUES = [
    { label: 'Start', value: 'flex-start', tw: 'justify-start' },
    { label: 'Center', value: 'center', tw: 'justify-center' },
    { label: 'End', value: 'flex-end', tw: 'justify-end' },
    { label: 'Between', value: 'space-between', tw: 'justify-between' },
    { label: 'Around', value: 'space-around', tw: 'justify-around' },
    { label: 'Evenly', value: 'space-evenly', tw: 'justify-evenly' },
];

const ALIGN_VALUES = [
    { label: 'Start', value: 'flex-start', tw: 'items-start' },
    { label: 'Center', value: 'center', tw: 'items-center' },
    { label: 'End', value: 'flex-end', tw: 'items-end' },
    { label: 'Stretch', value: 'stretch', tw: 'items-stretch' },
    { label: 'Baseline', value: 'baseline', tw: 'items-baseline' },
];

const GAP_VALUES = [
    { label: '0', value: '0px', tw: 'gap-0' },
    { label: '1', value: '0.25rem', tw: 'gap-1' },
    { label: '2', value: '0.5rem', tw: 'gap-2' },
    { label: '3', value: '0.75rem', tw: 'gap-3' },
    { label: '4', value: '1rem', tw: 'gap-4' },
    { label: '5', value: '1.25rem', tw: 'gap-5' },
    { label: '6', value: '1.5rem', tw: 'gap-6' },
    { label: '8', value: '2rem', tw: 'gap-8' },
];

export function LayoutControl({ styles, tailwindClasses, onChange, onBlur }: LayoutControlProps) {
    const isFlex = styles.display === 'flex' || styles.display === 'inline-flex';
    const isGrid = styles.display === 'grid' || styles.display === 'inline-grid';

    const currentDisplay = useMemo(() => {
        const displayClass = tailwindClasses.find(c =>
            DISPLAY_VALUES.some(d => d.tw === c)
        );
        return DISPLAY_VALUES.find(d => d.tw === displayClass) ||
            DISPLAY_VALUES.find(d => d.value === styles.display);
    }, [tailwindClasses, styles.display]);

    const currentDirection = useMemo(() => {
        const dirClass = tailwindClasses.find(c => c.match(/^flex-(row|col)(-reverse)?$/));
        return FLEX_DIRECTIONS.find(d => d.tw === dirClass) ||
            FLEX_DIRECTIONS.find(d => d.value === styles.flexDirection);
    }, [tailwindClasses, styles.flexDirection]);

    const currentJustify = useMemo(() => {
        const justifyClass = tailwindClasses.find(c => c.match(/^justify-(start|center|end|between|around|evenly)$/));
        return JUSTIFY_VALUES.find(j => j.tw === justifyClass) ||
            JUSTIFY_VALUES.find(j => j.value === styles.justifyContent);
    }, [tailwindClasses, styles.justifyContent]);

    const currentAlign = useMemo(() => {
        const alignClass = tailwindClasses.find(c => c.match(/^items-(start|center|end|stretch|baseline)$/));
        return ALIGN_VALUES.find(a => a.tw === alignClass) ||
            ALIGN_VALUES.find(a => a.value === styles.alignItems);
    }, [tailwindClasses, styles.alignItems]);

    const handleDisplayChange = useCallback((value: string) => {
        onChange('display', value, true);
    }, [onChange]);

    const handleDirectionChange = useCallback((value: string) => {
        onChange('flexDirection', value, true);
    }, [onChange]);

    const handleJustifyChange = useCallback((value: string) => {
        onChange('justifyContent', value, true);
    }, [onChange]);

    const handleAlignChange = useCallback((value: string) => {
        onChange('alignItems', value, true);
    }, [onChange]);

    const handleGapChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
        onChange('gap', e.target.value, true);
    }, [onChange]);

    return (
        <div className="space-y-4">
            {/* Display */}
            <div>
                <label className="block text-xs text-text-primary/60 mb-1">Display</label>
                <div className="grid grid-cols-4 gap-1">
                    {DISPLAY_VALUES.slice(0, 4).map(display => (
                        <button
                            key={display.value}
                            onClick={() => handleDisplayChange(display.value)}
                            className={`px-2 py-1.5 text-xs rounded-md transition-colors ${currentDisplay?.value === display.value
                                    ? 'bg-accent text-white'
                                    : 'bg-bg-3 text-text-primary hover:bg-bg-2'
                                }`}
                        >
                            {display.label}
                        </button>
                    ))}
                </div>
                <div className="grid grid-cols-3 gap-1 mt-1">
                    {DISPLAY_VALUES.slice(4).map(display => (
                        <button
                            key={display.value}
                            onClick={() => handleDisplayChange(display.value)}
                            className={`px-2 py-1.5 text-xs rounded-md transition-colors ${currentDisplay?.value === display.value
                                    ? 'bg-accent text-white'
                                    : 'bg-bg-3 text-text-primary hover:bg-bg-2'
                                }`}
                        >
                            {display.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Flex-specific controls */}
            {isFlex && (
                <>
                    {/* Flex Direction */}
                    <div>
                        <label className="block text-xs text-text-primary/60 mb-1">Direction</label>
                        <div className="grid grid-cols-4 gap-1">
                            {FLEX_DIRECTIONS.map(dir => (
                                <button
                                    key={dir.value}
                                    onClick={() => handleDirectionChange(dir.value)}
                                    className={`px-2 py-1.5 text-xs rounded-md transition-colors ${currentDirection?.value === dir.value
                                            ? 'bg-accent text-white'
                                            : 'bg-bg-3 text-text-primary hover:bg-bg-2'
                                        }`}
                                >
                                    {dir.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Justify Content */}
                    <div>
                        <label className="block text-xs text-text-primary/60 mb-1">Justify</label>
                        <div className="grid grid-cols-3 gap-1">
                            {JUSTIFY_VALUES.map(justify => (
                                <button
                                    key={justify.value}
                                    onClick={() => handleJustifyChange(justify.value)}
                                    className={`px-2 py-1.5 text-xs rounded-md transition-colors ${currentJustify?.value === justify.value
                                            ? 'bg-accent text-white'
                                            : 'bg-bg-3 text-text-primary hover:bg-bg-2'
                                        }`}
                                >
                                    {justify.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Align Items */}
                    <div>
                        <label className="block text-xs text-text-primary/60 mb-1">Align</label>
                        <div className="grid grid-cols-3 gap-1">
                            {ALIGN_VALUES.slice(0, 3).map(align => (
                                <button
                                    key={align.value}
                                    onClick={() => handleAlignChange(align.value)}
                                    className={`px-2 py-1.5 text-xs rounded-md transition-colors ${currentAlign?.value === align.value
                                            ? 'bg-accent text-white'
                                            : 'bg-bg-3 text-text-primary hover:bg-bg-2'
                                        }`}
                                >
                                    {align.label}
                                </button>
                            ))}
                        </div>
                        <div className="grid grid-cols-2 gap-1 mt-1">
                            {ALIGN_VALUES.slice(3).map(align => (
                                <button
                                    key={align.value}
                                    onClick={() => handleAlignChange(align.value)}
                                    className={`px-2 py-1.5 text-xs rounded-md transition-colors ${currentAlign?.value === align.value
                                            ? 'bg-accent text-white'
                                            : 'bg-bg-3 text-text-primary hover:bg-bg-2'
                                        }`}
                                >
                                    {align.label}
                                </button>
                            ))}
                        </div>
                    </div>
                </>
            )}

            {/* Gap (for flex and grid) */}
            {(isFlex || isGrid) && (
                <div>
                    <label className="block text-xs text-text-primary/60 mb-1">Gap</label>
                    <select
                        value={styles.gap}
                        onChange={handleGapChange}
                        onBlur={onBlur}
                        className="w-full px-2 py-1.5 text-sm bg-bg-3 border border-text/10 rounded-md text-text-primary focus:outline-none focus:border-accent"
                    >
                        {GAP_VALUES.map(gap => (
                            <option key={gap.tw} value={gap.value}>
                                {gap.label} ({gap.value})
                            </option>
                        ))}
                    </select>
                </div>
            )}

            {/* Visual Preview */}
            {isFlex && (
                <div>
                    <label className="block text-xs text-text-primary/60 mb-2">Preview</label>
                    <div
                        className="p-2 bg-bg-2 rounded-lg min-h-[60px]"
                        style={{
                            display: 'flex',
                            flexDirection: currentDirection?.value as 'row' | 'column' | undefined,
                            justifyContent: currentJustify?.value,
                            alignItems: currentAlign?.value,
                            gap: styles.gap,
                        }}
                    >
                        {[1, 2, 3].map(i => (
                            <div
                                key={i}
                                className="w-6 h-6 bg-accent/50 rounded flex items-center justify-center text-xs text-white"
                            >
                                {i}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
