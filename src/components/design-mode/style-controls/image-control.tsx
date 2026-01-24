/**
 * Image Control - v0 Style
 * Image source display and upload functionality
 */

import { useCallback, useRef, useState } from 'react';
import { Upload, Image as ImageIcon, RefreshCw } from 'lucide-react';
import type { DesignModeComputedStyles } from '@vibesdk/design-mode-client';

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
        if (!isUploading) {
            fileInputRef.current?.click();
        }
    }, [isUploading]);

    return (
        <div className="space-y-3">
            {/* Image Preview / Upload Area */}
            <div
                className={cn(
                    "group relative w-full aspect-video rounded-lg border-2 border-dashed transition-all overflow-hidden cursor-pointer",
                    dragOver
                        ? "border-accent bg-accent/10"
                        : "border-text/20 bg-bg-3 hover:border-text/40",
                    isUploading && "opacity-50 cursor-not-allowed"
                )}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={handleUploadClick}
            >
                {/* Transparency Grid Background */}
                <div className="absolute inset-0 opacity-20" style={{
                    backgroundImage: `linear-gradient(45deg, #888 25%, transparent 25%), linear-gradient(-45deg, #888 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #888 75%), linear-gradient(-45deg, transparent 75%, #888 75%)`,
                    backgroundSize: '20px 20px',
                    backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px'
                }} />

                {(previewUrl || currentImageUrl) ? (
                    <>
                        <img
                            src={previewUrl || currentImageUrl || ''}
                            alt="Current"
                            className="w-full h-full object-contain relative z-10"
                            onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                            }}
                        />
                        {/* Hover Overlay */}
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center z-20 text-white">
                            <Upload className="size-6 mb-2" />
                            <span className="text-xs font-medium">Click to upload image</span>
                        </div>
                    </>
                ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-text-primary/40">
                        <ImageIcon className="size-8 mb-2" />
                        <span className="text-xs">Drop image here or click to upload</span>
                    </div>
                )}

                {/* Upload progress overlay */}
                {isUploading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-bg-1/80 z-30">
                        <div className="text-center">
                            <RefreshCw className="size-6 animate-spin mx-auto mb-2 text-accent" />
                            <span className="text-xs text-text-primary/70">
                                {uploadProgress}%
                            </span>
                        </div>
                    </div>
                )}
            </div>

            {/* Hidden file input */}
            <input
                ref={fileInputRef}
                type="file"
                accept={SUPPORTED_MIME_TYPES.join(',')}
                onChange={handleInputChange}
                className="hidden"
            />



            {/* <p className="text-[10px] text-text-primary/30 text-center pt-1">
                Supported: PNG, JPG, GIF, WebP, SVG
            </p> */}
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
