/**
 * Design Mode Panel - v0 Style
 * Main visual property editor panel for design mode
 */

import { useState, useCallback, type FC } from 'react';
import {
    ChevronDown,
    ChevronRight,
    Type,
    Palette,
    PaintBucket,
    LayoutGrid,
    Square,
    Eye,
    Sparkles,
    MousePointer2,
    Code,
    Undo2,
    Redo2,
    X,
    Cloudy,
    Image as ImageIcon,
} from 'lucide-react';
import type { DesignModeElementData } from '@vibesdk/design-mode-client';

import { TypographyControl } from './style-controls/typography-control';
import { ColorControl } from './style-controls/color-control';
import { BackgroundControl } from './style-controls/background-control';
import { LayoutControl } from './style-controls/layout-control';
import { BorderControl } from './style-controls/border-control';
import { AppearanceControl } from './style-controls/appearance-control';
import { ShadowControl } from './style-controls/shadow-control';
import { ImageControl } from './style-controls/image-control';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// ============================================================================
// Types
// ============================================================================

export interface DesignModePanelProps {
    selectedElement: DesignModeElementData | null;
    onStyleChange: (property: string, value: string) => void;
    onBatchStyleChange?: (changes: Array<{ property: string; value: string }>) => void;
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
    hasPendingChanges?: boolean;
    onRefreshPreview?: () => void;
    /** Callback for image upload */
    onImageUpload?: (file: File, isBackground: boolean) => void;
    /** Whether an image upload is in progress */
    isUploadingImage?: boolean;
    /** Image upload progress (0-100) */
    imageUploadProgress?: number;
    /** Preview URL base for resolving relative image paths */
    previewUrl?: string | null;
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
// Helper: Check if element is text element
// ============================================================================

const TEXT_ELEMENT_TYPES: Array<DesignModeElementData['elementType']> = ['text'];
const TEXT_TAG_NAMES = ['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'span', 'label', 'a', 'strong', 'em', 'b', 'i'];

function isTextElement(element: DesignModeElementData): boolean {
    if (TEXT_ELEMENT_TYPES.includes(element.elementType)) return true;
    return TEXT_TAG_NAMES.includes(element.tagName.toLowerCase());
}

function isImageElement(element: DesignModeElementData): boolean {
    if (element.elementType === 'image') return true;
    const tagName = element.tagName.toLowerCase();
    if (tagName === 'img' || tagName === 'svg') return true;
    // Check for background-image
    const bgImage = element.computedStyles?.backgroundImage;
    if (bgImage && bgImage !== 'none') return true;
    return false;
}

function getImageSrc(element: DesignModeElementData): string | undefined {
    const tagName = element.tagName.toLowerCase();

    // For img tags, get src from attributes
    if (tagName === 'img') {
        return element.attributes?.src || element.attributes?.['data-src'];
    }

    // For background images, extract from inline or computed styles
    const bgImage = element.inlineStyles?.['background-image'] || element.computedStyles?.backgroundImage;
    if (bgImage && bgImage !== 'none') {
        // Extract URL from url(...) format
        const match = bgImage.match(/url\(['"]?([^'"]+)['"]?\)/);
        return match ? match[1] : undefined;
    }

    return undefined;
}

// ============================================================================
// Main Panel Component
// ============================================================================

export function DesignModePanel({
    selectedElement,
    onStyleChange,
    onBatchStyleChange,
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
    hasPendingChanges = false,
    onRefreshPreview,
    onImageUpload,
    isUploadingImage = false,
    imageUploadProgress = 0,
    previewUrl,
}: DesignModePanelProps) {
    // Handle style changes with commit flag
    const handleStyleChange = useCallback((property: string, value: string, commit: boolean) => {
        if (commit) {
            onStyleChange(property, value);
        } else {
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
                    {hasPendingChanges && !isSyncing && (
                        <span className="text-xs text-amber-500" title="Changes saved to code, click Refresh to see final result">
                            ● Saved
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-1">
                    {hasPendingChanges && onRefreshPreview && (
                        <Button
                            onClick={onRefreshPreview}
                            disabled={isSyncing}
                            size="sm"
                            variant="outline"
                            className="h-7 px-2 text-xs"
                            title="Deploy changes and reload preview"
                        >
                            Refresh Preview
                        </Button>
                    )}
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

                {/* Image - Only for image elements */}
                {isImageElement(selectedElement) && onImageUpload && (
                    <Section title="Image" icon={ImageIcon}>
                        <ImageControl
                            imageSrc={getImageSrc(selectedElement)}
                            isBackgroundImage={selectedElement.tagName.toLowerCase() !== 'img'}
                            styles={selectedElement.computedStyles}
                            onImageUpload={onImageUpload}
                            isUploading={isUploadingImage}
                            uploadProgress={imageUploadProgress}
                            previewBaseUrl={previewUrl}
                        />
                    </Section>
                )}



                {/* Typography */}
                <Section title="Typography" icon={Type}>
                    <TypographyControl
                        styles={selectedElement.computedStyles}
                        tailwindClasses={selectedElement.tailwindClasses}
                        onChange={handleStyleChange}
                        onBatchChange={onBatchStyleChange}
                        onPreview={onStylePreview}
                        onClearPreview={onClearPreview}
                    />
                </Section>

                {/* Color */}
                <Section title="Color" icon={Palette}>
                    <ColorControl
                        styles={selectedElement.computedStyles}
                        tailwindClasses={selectedElement.tailwindClasses}
                        onChange={handleStyleChange}
                        onPreview={onStylePreview}
                        onClearPreview={onClearPreview}
                    />
                </Section>

                {/* Background */}
                <Section title="Background" icon={PaintBucket}>
                    <BackgroundControl
                        styles={selectedElement.computedStyles}
                        tailwindClasses={selectedElement.tailwindClasses}
                        onChange={handleStyleChange}
                        onPreview={onStylePreview}
                        onClearPreview={onClearPreview}
                    />
                </Section>

                {/* Layout */}
                <Section title="Layout" icon={LayoutGrid}>
                    <LayoutControl
                        styles={selectedElement.computedStyles}
                        tailwindClasses={selectedElement.tailwindClasses}
                        onChange={handleStyleChange}
                        onBatchChange={onBatchStyleChange}
                        onPreview={onStylePreview}
                        onClearPreview={onClearPreview}
                        showSizeControls={!isTextElement(selectedElement)}
                    />
                </Section>

                {/* Border */}
                <Section title="Border" icon={Square}>
                    <BorderControl
                        styles={selectedElement.computedStyles}
                        tailwindClasses={selectedElement.tailwindClasses}
                        onChange={handleStyleChange}
                        onBatchChange={onBatchStyleChange}
                        onPreview={onStylePreview}
                        onClearPreview={onClearPreview}
                    />
                </Section>

                {/* Appearance */}
                <Section title="Appearance" icon={Eye}>
                    <AppearanceControl
                        styles={selectedElement.computedStyles}
                        tailwindClasses={selectedElement.tailwindClasses}
                        onChange={handleStyleChange}
                        onBatchChange={onBatchStyleChange}
                        onPreview={onStylePreview}
                        onClearPreview={onClearPreview}
                    />
                </Section>

                {/* Shadow */}
                <Section title="Shadow" icon={Cloudy} defaultOpen={false}>
                    <ShadowControl
                        styles={selectedElement.computedStyles}
                        tailwindClasses={selectedElement.tailwindClasses}
                        onChange={handleStyleChange}
                        onPreview={onStylePreview}
                        onClearPreview={onClearPreview}
                    />
                </Section>
            </div>
        </div>
    );
}
