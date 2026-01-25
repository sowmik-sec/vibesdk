/**
 * Image Control - v0 Style
 * Image source display and upload functionality with WebP optimization
 */

import { useCallback, useRef, useState, useEffect } from 'react';
import { Upload, Image as ImageIcon, RefreshCw, Loader2, CheckCircle2 } from 'lucide-react';
import type { DesignModeComputedStyles } from '@vibesdk/design-mode-client';
import { toast } from 'sonner';

import { cn } from '@/lib/utils';
import { 
    processImage, 
    validateFileSize, 
    validateMimeType,
    formatFileSize,
    formatCompressionRatio,
    type ProcessedImage 
} from '@/lib/image-processor';

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
    const [isProcessing, setIsProcessing] = useState(false);
    const [processingProgress, setProcessingProgress] = useState(0);
    const [processingStatus, setProcessingStatus] = useState('');
    const [optimizationInfo, setOptimizationInfo] = useState<{
        originalSize: number;
        finalSize: number;
        ratio: number;
    } | null>(null);

    // Determine the current image URL
    const currentImageUrl = imageSrc || (
        isBackgroundImage ? extractBackgroundImageUrl(styles.backgroundImage) : null
    );

    // Clean up preview URL on unmount
    useEffect(() => {
        return () => {
            if (previewUrl) {
                URL.revokeObjectURL(previewUrl);
            }
        };
    }, [previewUrl]);

    const handleFileSelect = useCallback(async (file: File) => {
        // Validate file type
        const mimeValidation = validateMimeType(file.type);
        if (!mimeValidation.valid) {
            toast.error(mimeValidation.error);
            return;
        }

        // Validate file size
        const sizeValidation = validateFileSize(file);
        if (!sizeValidation.valid) {
            toast.error(sizeValidation.error);
            return;
        }

        // Start processing
        setIsProcessing(true);
        setProcessingProgress(0);
        setProcessingStatus('Starting...');

        try {
            // Process the image (compress, convert to WebP if supported)
            const processed: ProcessedImage = await processImage(
                file,
                {},
                (progress, status) => {
                    setProcessingProgress(progress);
                    setProcessingStatus(status);
                }
            );

            // Create preview URL from processed file
            const objectUrl = URL.createObjectURL(processed.file);
            setPreviewUrl(objectUrl);

            // Store optimization info
            setOptimizationInfo({
                originalSize: processed.originalSize,
                finalSize: processed.finalSize,
                ratio: processed.compressionRatio,
            });

            // Show success message with optimization details
            if (processed.wasOptimized) {
                toast.success(
                    `Image optimized: ${formatFileSize(processed.originalSize)} → ${formatFileSize(processed.finalSize)} (${formatCompressionRatio(processed.compressionRatio)})`
                );
            }

            // Trigger upload with processed file
            onImageUpload(processed.file, isBackgroundImage);
        } catch (error) {
            console.error('[ImageControl] Processing error:', error);
            toast.error(error instanceof Error ? error.message : 'Failed to process image');
        } finally {
            setIsProcessing(false);
            setProcessingProgress(0);
            setProcessingStatus('');
        }
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
        if (!isUploading && !isProcessing) {
            fileInputRef.current?.click();
        }
    }, [isUploading, isProcessing]);

    // Show loading state during processing or uploading
    const isLoading = isProcessing || isUploading;
    const loadingProgress = isProcessing ? processingProgress : uploadProgress;
    const loadingStatus = isProcessing ? processingStatus : `Uploading... ${uploadProgress}%`;

    return (
        <div className="space-y-3">
            {/* Image Preview / Upload Area */}
            <div
                className={cn(
                    "group relative w-full aspect-video rounded-lg border-2 border-dashed transition-all overflow-hidden cursor-pointer",
                    dragOver
                        ? "border-accent bg-accent/10"
                        : "border-text/20 bg-bg-3 hover:border-text/40",
                    isLoading && "opacity-50 cursor-not-allowed"
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
                        {!isLoading && (
                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center z-20 text-white">
                                <Upload className="size-6 mb-2" />
                                <span className="text-xs font-medium">Click to upload new image</span>
                            </div>
                        )}
                    </>
                ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-text-primary/40">
                        <ImageIcon className="size-8 mb-2" />
                        <span className="text-xs">Drop image here or click to upload</span>
                        <span className="text-[10px] mt-1 text-text-primary/30">Auto-converts to WebP • Max 10MB</span>
                    </div>
                )}

                {/* Processing/Upload progress overlay */}
                {isLoading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-bg-1/90 z-30">
                        <div className="text-center max-w-xs px-4">
                            {isProcessing ? (
                                <Loader2 className="size-6 animate-spin mx-auto mb-2 text-accent" />
                            ) : (
                                <RefreshCw className="size-6 animate-spin mx-auto mb-2 text-accent" />
                            )}
                            <div className="w-full bg-bg-2 rounded-full h-1.5 mb-2">
                                <div 
                                    className="bg-accent h-1.5 rounded-full transition-all duration-300"
                                    style={{ width: `${loadingProgress}%` }}
                                />
                            </div>
                            <span className="text-xs text-text-primary/70 block">
                                {loadingStatus}
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

            {/* Optimization info */}
            {optimizationInfo && !isLoading && (
                <div className="flex items-center justify-center gap-1.5 text-[10px] text-text-primary/50">
                    <CheckCircle2 className="size-3 text-green-500" />
                    <span>
                        Optimized: {formatFileSize(optimizationInfo.originalSize)} → {formatFileSize(optimizationInfo.finalSize)}
                    </span>
                </div>
            )}
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
