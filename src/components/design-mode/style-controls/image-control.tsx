/**
 * Image Control - v0 Style
 * Image source display and upload functionality
 */

import { useCallback, useRef, useState } from 'react';
import { Upload, Image as ImageIcon, RefreshCw, ExternalLink } from 'lucide-react';
import type { DesignModeComputedStyles } from '@vibesdk/design-mode-client';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// Supported image MIME types
const SUPPORTED_MIME_TYPES = [
    'image/png',
    'image/jpeg',
    'image/jpg',
    'image/gif',
    'image/webp',
    'image/svg+xml',
];

const CHUNK_SIZE = 512 * 1024; // 512KB chunks

interface ImageControlProps {
    /** Current image source (from img src or background-image) */
    imageSrc?: string;
    /** Whether this is a background-image (vs img src) */
    isBackgroundImage?: boolean;
    /** Element's computed styles */
    styles: DesignModeComputedStyles;
    /** Callback when an image is uploaded */
    onImageUpload: (file: File, isBackground: boolean) => void;
    /** Whether upload is in progress */
    isUploading?: boolean;
    /** Upload progress (0-100) */
    uploadProgress?: number;
}

function extractBackgroundImageUrl(bgImage: string): string | null {
    // Parse url(...) from background-image
    const match = bgImage.match(/url\(['"]?([^'"]+)['"]?\)/);
    return match ? match[1] : null;
}

export function ImageControl({
    imageSrc,
    isBackgroundImage = false,
    styles,
    onImageUpload,
    isUploading = false,
    uploadProgress = 0,
}: ImageControlProps) {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [dragOver, setDragOver] = useState(false);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);

    // Determine the current image URL
    const currentImageUrl = imageSrc || (
        isBackgroundImage ? extractBackgroundImageUrl(styles.backgroundImage) : null
    );

    const handleFileSelect = useCallback((file: File) => {
        // Validate file type
        if (!SUPPORTED_MIME_TYPES.includes(file.type)) {
            console.error('[ImageControl] Unsupported file type:', file.type);
            return;
        }

        // Create preview URL
        const objectUrl = URL.createObjectURL(file);
        setPreviewUrl(objectUrl);

        // Trigger upload
        onImageUpload(file, isBackgroundImage);
    }, [onImageUpload, isBackgroundImage]);

    const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            handleFileSelect(file);
        }
        // Reset input so the same file can be selected again
        e.target.value = '';
    }, [handleFileSelect]);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setDragOver(false);

        const file = e.dataTransfer.files?.[0];
        if (file && SUPPORTED_MIME_TYPES.includes(file.type)) {
            handleFileSelect(file);
        }
    }, [handleFileSelect]);

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setDragOver(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setDragOver(false);
    }, []);

    const handleUploadClick = useCallback(() => {
        fileInputRef.current?.click();
    }, []);

    // Display URL (truncated for long paths)
    const displayUrl = currentImageUrl
        ? currentImageUrl.length > 40
            ? `...${currentImageUrl.slice(-37)}`
            : currentImageUrl
        : 'No image';

    return (
        <div className="space-y-3">
            {/* Image Preview */}
            <div
                className={cn(
                    "relative w-full aspect-video rounded-lg border-2 border-dashed transition-colors overflow-hidden",
                    dragOver
                        ? "border-accent bg-accent/10"
                        : "border-text/20 bg-bg-3",
                    isUploading && "opacity-50"
                )}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
            >
                {(previewUrl || currentImageUrl) ? (
                    <img
                        src={previewUrl || currentImageUrl || ''}
                        alt="Current"
                        className="w-full h-full object-contain"
                        onError={(e) => {
                            // Fallback for broken images
                            (e.target as HTMLImageElement).style.display = 'none';
                        }}
                    />
                ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-text-primary/40">
                        <ImageIcon className="size-8 mb-2" />
                        <span className="text-xs">Drop image here</span>
                    </div>
                )}

                {/* Upload progress overlay */}
                {isUploading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-bg-1/80">
                        <div className="text-center">
                            <RefreshCw className="size-6 animate-spin mx-auto mb-2 text-accent" />
                            <span className="text-xs text-text-primary/70">
                                {uploadProgress}%
                            </span>
                        </div>
                    </div>
                )}
            </div>

            {/* Current Source Display */}
            <div className="flex items-center gap-2 px-2 py-1.5 bg-bg-3 rounded-md">
                <span className="flex-1 text-xs text-text-primary/60 truncate font-mono">
                    {displayUrl}
                </span>
                {currentImageUrl && (
                    <a
                        href={currentImageUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1 hover:bg-bg-2 rounded transition-colors text-text-primary/50 hover:text-text-primary"
                        title="Open image in new tab"
                    >
                        <ExternalLink className="size-3" />
                    </a>
                )}
            </div>

            {/* Upload Button */}
            <Button
                onClick={handleUploadClick}
                disabled={isUploading}
                variant="outline"
                className="w-full"
            >
                <Upload className="size-4 mr-2" />
                {isUploading ? 'Uploading...' : 'Upload / Replace'}
            </Button>

            {/* Hidden file input */}
            <input
                ref={fileInputRef}
                type="file"
                accept={SUPPORTED_MIME_TYPES.join(',')}
                onChange={handleInputChange}
                className="hidden"
            />

            {/* Supported formats hint */}
            <p className="text-xs text-text-primary/40 text-center">
                PNG, JPG, GIF, WebP, SVG
            </p>
        </div>
    );
}

/**
 * Utility function to chunk a file for upload
 * This is used by the parent component that handles WebSocket communication
 */
export async function* chunkFile(file: File): AsyncGenerator<{
    chunk: string;
    index: number;
    total: number;
}> {
    const totalChunks = Math.ceil(file.size / CHUNK_SIZE);

    for (let i = 0; i < totalChunks; i++) {
        const start = i * CHUNK_SIZE;
        const end = Math.min(start + CHUNK_SIZE, file.size);
        const blob = file.slice(start, end);

        // Convert blob to base64
        const arrayBuffer = await blob.arrayBuffer();
        const bytes = new Uint8Array(arrayBuffer);
        let binary = '';
        bytes.forEach(b => binary += String.fromCharCode(b));
        const base64 = btoa(binary);

        yield {
            chunk: base64,
            index: i,
            total: totalChunks,
        };
    }
}
