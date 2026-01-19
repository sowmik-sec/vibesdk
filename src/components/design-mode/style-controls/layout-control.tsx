/**
 * Layout Control - v0 Style
 * Margin and Padding with expand/lock functionality
 */

import { useCallback, useMemo } from 'react';
import type { DesignModeComputedStyles } from '@/lib/design-mode/design-mode-protocol';
import { ExpandableSpacing } from './expandable-spacing';

interface LayoutControlProps {
    styles: DesignModeComputedStyles;
    tailwindClasses: string[];
    onChange: (property: string, value: string, commit: boolean) => void;
    onPreview: (property: string, value: string) => void;
    onClearPreview: () => void;
}

export function LayoutControl({
    styles,
    tailwindClasses: _tailwindClasses,
    onChange,
    onPreview,
    onClearPreview,
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
                    onHoverStart={handlePaddingHoverStart}
                    onHoverEnd={onClearPreview}
                />
            </div>
        </div>
    );
}
