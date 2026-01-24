/**
 * Layout Control - v0 Style
 * Margin, Padding, and Size controls
 */

import { useCallback, useMemo } from 'react';
import type { DesignModeComputedStyles } from '@vibesdk/design-mode-client';
import { ExpandableSpacing } from './expandable-spacing';
import { SizeControl } from './size-control';

interface LayoutControlProps {
    styles: DesignModeComputedStyles;
    tailwindClasses: string[];
    onChange: (property: string, value: string, commit: boolean) => void;
    onBatchChange?: (changes: Array<{ property: string; value: string }>) => void;
    onPreview: (property: string, value: string) => void;
    onClearPreview: () => void;
    /** Whether to show size controls (hidden for text elements) */
    showSizeControls?: boolean;
}

export function LayoutControl({
    styles,
    tailwindClasses: _tailwindClasses,
    onChange,
    onBatchChange,
    onPreview,
    onClearPreview,
    showSizeControls = true,
}: LayoutControlProps) {
    // Parse spacing values
    const marginValues = useMemo(() => ({
        top: styles.marginTop || '0px',
        right: styles.marginRight || '0px',
        bottom: styles.marginBottom || '0px',
        left: styles.marginLeft || '0px',
    }), [styles.marginTop, styles.marginRight, styles.marginBottom, styles.marginLeft]);

    const paddingValues = useMemo(() => ({
        top: styles.paddingTop || '0px',
        right: styles.paddingRight || '0px',
        bottom: styles.paddingBottom || '0px',
        left: styles.paddingLeft || '0px',
    }), [styles.paddingTop, styles.paddingRight, styles.paddingBottom, styles.paddingLeft]);

    const handleMarginChange = useCallback((property: string, value: string, commit: boolean) => {
        onChange(property, value, commit);
    }, [onChange]);

    const handlePaddingChange = useCallback((property: string, value: string, commit: boolean) => {
        onChange(property, value, commit);
    }, [onChange]);

    const handleBatchSpacingChange = useCallback((
        type: 'margin' | 'padding',
        changes: Array<{ side: string; value: string }>,
        commit: boolean
    ) => {
        if (!commit || !onBatchChange) {
            // For preview (commit=false), or no batch support, fallback to individual updates (though ExpandableSpacing handles preview via hover)
            // Actually ExpandableSpacing calls handleChange with commit=true for selection
            // We should use individual onChange if no onBatchChange
            changes.forEach(({ side, value }) => {
                const property = `${type}${side.charAt(0).toUpperCase() + side.slice(1)}`;
                onChange(property, value, commit);
            });
            return;
        }

        const mappedChanges = changes.map(({ side, value }) => ({
            property: `${type}${side.charAt(0).toUpperCase() + side.slice(1)}`,
            value
        }));
        onBatchChange(mappedChanges);
    }, [onChange, onBatchChange]);

    const handleMarginHoverStart = useCallback((side: string, value: string) => {
        if (side === 'all') {
            onPreview('marginTop', value);
            onPreview('marginRight', value);
            onPreview('marginBottom', value);
            onPreview('marginLeft', value);
        } else if (side === 'vertical') {
            onPreview('marginTop', value);
            onPreview('marginBottom', value);
        } else if (side === 'horizontal') {
            onPreview('marginLeft', value);
            onPreview('marginRight', value);
        } else {
            onPreview(`margin${side.charAt(0).toUpperCase() + side.slice(1)}`, value);
        }
    }, [onPreview]);

    const handlePaddingHoverStart = useCallback((side: string, value: string) => {
        if (side === 'all') {
            onPreview('paddingTop', value);
            onPreview('paddingRight', value);
            onPreview('paddingBottom', value);
            onPreview('paddingLeft', value);
        } else if (side === 'vertical') {
            onPreview('paddingTop', value);
            onPreview('paddingBottom', value);
        } else if (side === 'horizontal') {
            onPreview('paddingLeft', value);
            onPreview('paddingRight', value);
        } else {
            onPreview(`padding${side.charAt(0).toUpperCase() + side.slice(1)}`, value);
        }
    }, [onPreview]);

    return (
        <div className="space-y-4">
            {/* Margin */}
            <div>
                <label className="block text-xs text-text-primary/60 mb-2">Margin</label>
                <ExpandableSpacing
                    property="margin"
                    values={marginValues}
                    onChange={handleMarginChange}
                    onBatchChange={(changes, commit) => handleBatchSpacingChange('margin', changes, commit)}
                    onHoverStart={handleMarginHoverStart}
                    onHoverEnd={onClearPreview}
                />
            </div>

            {/* Padding */}
            <div>
                <label className="block text-xs text-text-primary/60 mb-2">Padding</label>
                <ExpandableSpacing
                    property="padding"
                    values={paddingValues}
                    onChange={handlePaddingChange}
                    onBatchChange={(changes, commit) => handleBatchSpacingChange('padding', changes, commit)}
                    onHoverStart={handlePaddingHoverStart}
                    onHoverEnd={onClearPreview}
                />
            </div>

            {/* Size - Hidden for text elements */}
            {showSizeControls && (
                <div>
                    <label className="block text-xs text-text-primary/60 mb-2">Size</label>
                    <SizeControl
                        styles={styles}
                        onChange={onChange}
                        onPreview={onPreview}
                        onClearPreview={onClearPreview}
                    />
                </div>
            )}
        </div>
    );
}
