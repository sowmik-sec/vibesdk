/**
 * Design Mode Panel
 * Main visual property editor panel for design mode
 */

import { useState, useCallback, type FC } from 'react';
import {
    ChevronDown,
    ChevronRight,
    Type,
    Palette,
    Square,
    Box,
    Layers,
    Sparkles,
    MousePointer2,
    Code,
    Undo2,
    Redo2,
    X,
} from 'lucide-react';
import type { DesignModeElementData } from '@/lib/design-mode/design-mode-protocol';
import { ColorControl } from './style-controls/color-control';
import { SpacingControl } from './style-controls/spacing-control';
import { TypographyControl } from './style-controls/typography-control';
import { BorderControl } from './style-controls/border-control';
import { ShadowControl } from './style-controls/shadow-control';
import { LayoutControl } from './style-controls/layout-control';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// ============================================================================
// Types
// ============================================================================

export interface DesignModePanelProps {
    selectedElement: DesignModeElementData | null;
    onStyleChange: (property: string, value: string) => void;
    onStylePreview: (property: string, value: string) => void;
    onClearPreview: () => void;
    onAIPrompt: (prompt: string) => void;
    onGoToCode: () => void;
    onUndo: () => void;
    onRedo: () => void;
    canUndo: boolean;
    canRedo: boolean;
    onClose: () => void;
    isSyncing?: boolean;
}

interface SectionProps {
    title: string;
    icon: FC<{ className?: string }>;
    defaultOpen?: boolean;
    children: React.ReactNode;
}

// ============================================================================
// Collapsible Section Component
// ============================================================================

function Section({ title, icon: Icon, defaultOpen = true, children }: SectionProps) {
    const [isOpen, setIsOpen] = useState(defaultOpen);

    return (
        <div className="border-b border-text/10">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 w-full px-3 py-2.5 text-sm font-medium text-text-primary hover:bg-bg-2 transition-colors"
            >
                {isOpen ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
                <Icon className="size-4 text-text-primary/70" />
                <span>{title}</span>
            </button>
            {isOpen && (
                <div className="px-3 pb-3 space-y-3">
                    {children}
                </div>
            )}
        </div>
    );
}

// ============================================================================
// Element Info Display
// ============================================================================

function ElementInfo({ element }: { element: DesignModeElementData }) {
    return (
        <div className="px-3 py-2 bg-bg-2 border-b border-text/10">
            <div className="flex items-center gap-2 text-sm">
                <MousePointer2 className="size-4 text-accent" />
                <code className="font-mono text-xs text-text-primary/80">
                    &lt;{element.tagName}&gt;
                </code>
            </div>
            {element.className && (
                <div className="mt-1.5">
                    <div className="flex flex-wrap gap-1">
                        {element.tailwindClasses.slice(0, 5).map((cls, i) => (
                            <span
                                key={i}
                                className="px-1.5 py-0.5 text-xs font-mono bg-accent/10 text-accent rounded"
                            >
                                {cls}
                            </span>
                        ))}
                        {element.tailwindClasses.length > 5 && (
                            <span className="px-1.5 py-0.5 text-xs text-text-primary/50 rounded">
                                +{element.tailwindClasses.length - 5} more
                            </span>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

// ============================================================================
// AI Prompt Input
// ============================================================================

function AIPromptInput({ onSubmit, disabled }: { onSubmit: (prompt: string) => void; disabled?: boolean }) {
    const [prompt, setPrompt] = useState('');

    const handleSubmit = useCallback((e: React.FormEvent) => {
        e.preventDefault();
        if (prompt.trim() && !disabled) {
            onSubmit(prompt.trim());
            setPrompt('');
        }
    }, [prompt, disabled, onSubmit]);

    return (
        <form onSubmit={handleSubmit} className="px-3 py-2 border-b border-text/10">
            <div className="flex items-center gap-2 mb-2">
                <Sparkles className="size-4 text-accent" />
                <span className="text-sm font-medium text-text-primary">AI Edit</span>
            </div>
            <div className="flex gap-2">
                <input
                    type="text"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="e.g., make this larger with a gradient"
                    className="flex-1 px-2.5 py-1.5 text-sm bg-bg-3 border border-text/10 rounded-md text-text-primary placeholder:text-text-primary/40 focus:outline-none focus:border-accent transition-colors"
                    disabled={disabled}
                />
                <Button
                    type="submit"
                    size="sm"
                    disabled={!prompt.trim() || disabled}
                    className="px-3"
                >
                    Apply
                </Button>
            </div>
        </form>
    );
}

// ============================================================================
// Main Panel Component
// ============================================================================

export function DesignModePanel({
    selectedElement,
    onStyleChange,
    onStylePreview,
    onClearPreview,
    onAIPrompt,
    onGoToCode,
    onUndo,
    onRedo,
    canUndo,
    canRedo,
    onClose,
    isSyncing,
}: DesignModePanelProps) {
    // Handle style changes with preview
    const handleStyleChange = useCallback((property: string, value: string, commit: boolean) => {
        console.log('[DesignModePanel] handleStyleChange called', { property, value, commit });
        if (commit) {
            console.log('[DesignModePanel] Calling onStyleChange (commit)');
            onStyleChange(property, value);
        } else {
            console.log('[DesignModePanel] Calling onStylePreview (preview)');
            onStylePreview(property, value);
        }
    }, [onStyleChange, onStylePreview]);

    // No element selected state
    if (!selectedElement) {
        return (
            <div className="h-full bg-bg-1 flex flex-col">
                <div className="flex items-center justify-between px-3 py-2 border-b border-text/10">
                    <span className="text-sm font-medium text-text-primary">Design Mode</span>
                    <button
                        onClick={onClose}
                        className="p-1 hover:bg-bg-2 rounded transition-colors"
                    >
                        <X className="size-4 text-text-primary/70" />
                    </button>
                </div>
                <div className="flex-1 flex items-center justify-center p-6">
                    <div className="text-center">
                        <MousePointer2 className="size-8 text-text-primary/30 mx-auto mb-3" />
                        <p className="text-sm text-text-primary/50">
                            Click on an element in the preview to select it
                        </p>
                        <p className="text-xs text-text-primary/40 mt-2">
                            Use <kbd className="px-1.5 py-0.5 bg-bg-2 rounded text-xs">Option+D</kbd> to toggle
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="h-full bg-bg-1 flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-3 py-2 border-b border-text/10 shrink-0">
                <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-text-primary">Design Mode</span>
                    {isSyncing && (
                        <span className="text-xs text-accent animate-pulse">Syncing...</span>
                    )}
                </div>
                <div className="flex items-center gap-1">
                    <button
                        onClick={onUndo}
                        disabled={!canUndo}
                        className={cn(
                            "p-1.5 rounded transition-colors",
                            canUndo ? "hover:bg-bg-2 text-text-primary/70" : "text-text-primary/30 cursor-not-allowed"
                        )}
                        title="Undo (Cmd+Z)"
                    >
                        <Undo2 className="size-4" />
                    </button>
                    <button
                        onClick={onRedo}
                        disabled={!canRedo}
                        className={cn(
                            "p-1.5 rounded transition-colors",
                            canRedo ? "hover:bg-bg-2 text-text-primary/70" : "text-text-primary/30 cursor-not-allowed"
                        )}
                        title="Redo (Cmd+Shift+Z)"
                    >
                        <Redo2 className="size-4" />
                    </button>
                    <button
                        onClick={onGoToCode}
                        className="p-1.5 hover:bg-bg-2 rounded transition-colors text-text-primary/70"
                        title="Go to Code"
                    >
                        <Code className="size-4" />
                    </button>
                    <button
                        onClick={onClose}
                        className="p-1.5 hover:bg-bg-2 rounded transition-colors text-text-primary/70"
                    >
                        <X className="size-4" />
                    </button>
                </div>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto">
                {/* Element Info */}
                <ElementInfo element={selectedElement} />

                {/* AI Prompt */}
                <AIPromptInput onSubmit={onAIPrompt} disabled={isSyncing} />

                {/* Typography */}
                <Section title="Typography" icon={Type}>
                    <TypographyControl
                        styles={selectedElement.computedStyles}
                        tailwindClasses={selectedElement.tailwindClasses}
                        onChange={handleStyleChange}
                        onBlur={onClearPreview}
                    />
                </Section>

                {/* Colors */}
                <Section title="Colors" icon={Palette}>
                    <ColorControl
                        styles={selectedElement.computedStyles}
                        tailwindClasses={selectedElement.tailwindClasses}
                        onChange={handleStyleChange}
                        onBlur={onClearPreview}
                    />
                </Section>

                {/* Spacing */}
                <Section title="Spacing" icon={Box}>
                    <SpacingControl
                        styles={selectedElement.computedStyles}
                        tailwindClasses={selectedElement.tailwindClasses}
                        onChange={handleStyleChange}
                        onBlur={onClearPreview}
                    />
                </Section>

                {/* Border */}
                <Section title="Border" icon={Square}>
                    <BorderControl
                        styles={selectedElement.computedStyles}
                        tailwindClasses={selectedElement.tailwindClasses}
                        onChange={handleStyleChange}
                        onBlur={onClearPreview}
                    />
                </Section>

                {/* Effects */}
                <Section title="Effects" icon={Sparkles} defaultOpen={false}>
                    <ShadowControl
                        styles={selectedElement.computedStyles}
                        tailwindClasses={selectedElement.tailwindClasses}
                        onChange={handleStyleChange}
                        onBlur={onClearPreview}
                    />
                </Section>

                {/* Layout */}
                <Section title="Layout" icon={Layers} defaultOpen={false}>
                    <LayoutControl
                        styles={selectedElement.computedStyles}
                        tailwindClasses={selectedElement.tailwindClasses}
                        onChange={handleStyleChange}
                        onBlur={onClearPreview}
                    />
                </Section>
            </div>
        </div>
    );
}
