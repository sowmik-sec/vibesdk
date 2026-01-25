/**
 * Image Processing Utility
 * Handles WebP conversion, compression, and browser support detection
 */

import imageCompression from 'browser-image-compression';

// Configuration constants
export const IMAGE_PROCESSING_CONFIG = {
	// Format preference
	preferredFormat: 'image/webp' as const,
	fallbackFormat: 'image/jpeg' as const,

	// Quality settings (0.0 - 1.0)
	webpQuality: 0.85,
	jpegQuality: 0.9,
	pngQuality: 0.9,

	// Size limits
	maxSizeMB: 2, // Compress if larger
	maxDimension: 2048, // Max width or height

	// Performance
	// Web workers disabled to avoid CSP violations (would load from CDN)
	useWebWorker: false,

	// File size validation
	maxUploadSizeMB: 10,
};

export interface ImageProcessingOptions {
	maxSizeMB?: number;
	maxDimension?: number;
	quality?: number;
	outputFormat?: 'image/webp' | 'image/jpeg' | 'image/png';
}

export interface ProcessedImage {
	file: File;
	originalSize: number;
	finalSize: number;
	compressionRatio: number;
	format: string;
	width: number;
	height: number;
	wasOptimized: boolean;
}

export interface ImageDimensions {
	width: number;
	height: number;
}

/**
 * Check if the browser supports WebP format
 * Uses cached result after first check
 */
let webpSupportCache: boolean | null = null;

export async function checkWebPSupport(): Promise<boolean> {
	if (webpSupportCache !== null) {
		return webpSupportCache;
	}

	// Test using minimal WebP data URI
	const webpData =
		'data:image/webp;base64,UklGRiIAAABXRUJQVlA4IBYAAAAwAQCdASoBAAEADsD+JaQAA3AAAAAA';

	return new Promise((resolve) => {
		const img = new Image();
		img.onload = img.onerror = () => {
			const isSupported = img.height === 1;
			webpSupportCache = isSupported;
			resolve(isSupported);
		};
		img.src = webpData;
	});
}

/**
 * Get image dimensions without loading the full file
 */
export async function getImageDimensions(file: File): Promise<ImageDimensions> {
	return new Promise((resolve, reject) => {
		const img = new Image();
		const url = URL.createObjectURL(file);

		img.onload = () => {
			URL.revokeObjectURL(url);
			resolve({
				width: img.naturalWidth,
				height: img.naturalHeight,
			});
		};

		img.onerror = () => {
			URL.revokeObjectURL(url);
			reject(new Error('Failed to load image for dimension detection'));
		};

		img.src = url;
	});
}

/**
 * Calculate SHA-256 hash of a file
 */
export async function calculateImageHash(file: File): Promise<string> {
	const arrayBuffer = await file.arrayBuffer();
	const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
	const hashArray = Array.from(new Uint8Array(hashBuffer));
	const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
	return hashHex;
}

/**
 * Validate file size before processing
 */
export function validateFileSize(file: File): { valid: boolean; error?: string } {
	const maxBytes = IMAGE_PROCESSING_CONFIG.maxUploadSizeMB * 1024 * 1024;
	if (file.size > maxBytes) {
		const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2);
		const maxSizeMB = IMAGE_PROCESSING_CONFIG.maxUploadSizeMB;
		return {
			valid: false,
			error: `Image too large: ${fileSizeMB}MB. Maximum allowed: ${maxSizeMB}MB`,
		};
	}
	return { valid: true };
}

/**
 * Validate MIME type
 */
const SUPPORTED_MIME_TYPES = [
	'image/png',
	'image/jpeg',
	'image/jpg',
	'image/gif',
	'image/webp',
	'image/svg+xml',
] as const;

export function validateMimeType(mimeType: string): { valid: boolean; error?: string } {
	if (!SUPPORTED_MIME_TYPES.includes(mimeType as any)) {
		const supportedTypes = SUPPORTED_MIME_TYPES.map((t) =>
			t.replace('image/', '').toUpperCase(),
		).join(', ');
		return {
			valid: false,
			error: `Unsupported image type: ${mimeType}. Supported formats: ${supportedTypes}`,
		};
	}
	return { valid: true };
}

/**
 * Main image processing function
 * Handles compression, format conversion, and optimization
 */
export async function processImage(
	file: File,
	options: ImageProcessingOptions = {},
	onProgress?: (progress: number, status: string) => void,
): Promise<ProcessedImage> {
	const originalSize = file.size;

	// Validate file size
	const sizeValidation = validateFileSize(file);
	if (!sizeValidation.valid) {
		throw new Error(sizeValidation.error);
	}

	// Validate MIME type
	const mimeValidation = validateMimeType(file.type);
	if (!mimeValidation.valid) {
		throw new Error(mimeValidation.error);
	}

	onProgress?.(10, 'Validating image...');

	// Check WebP support
	onProgress?.(20, 'Detecting browser capabilities...');
	const supportsWebP = await checkWebPSupport();

	// Get original dimensions
	onProgress?.(30, 'Analyzing image...');
	const dimensions = await getImageDimensions(file);

	// Determine output format
	const outputFormat =
		options.outputFormat ||
		(supportsWebP ? IMAGE_PROCESSING_CONFIG.preferredFormat : IMAGE_PROCESSING_CONFIG.fallbackFormat);

	// Determine quality based on format
	let quality = options.quality;
	if (!quality) {
		if (outputFormat === 'image/webp') {
			quality = IMAGE_PROCESSING_CONFIG.webpQuality;
		} else if (outputFormat === 'image/jpeg') {
			quality = IMAGE_PROCESSING_CONFIG.jpegQuality;
		} else {
			quality = IMAGE_PROCESSING_CONFIG.pngQuality;
		}
	}

	// Skip compression for SVG
	if (file.type === 'image/svg+xml') {
		onProgress?.(100, 'Complete');
		return {
			file,
			originalSize,
			finalSize: file.size,
			compressionRatio: 1,
			format: 'svg',
			width: dimensions.width,
			height: dimensions.height,
			wasOptimized: false,
		};
	}

	// Compression options
	const compressionOptions = {
		maxSizeMB: options.maxSizeMB || IMAGE_PROCESSING_CONFIG.maxSizeMB,
		maxWidthOrHeight: options.maxDimension || IMAGE_PROCESSING_CONFIG.maxDimension,
		useWebWorker: IMAGE_PROCESSING_CONFIG.useWebWorker,
		fileType: outputFormat,
		initialQuality: quality,
		onProgress: (progress: number) => {
			// Progress from compression is 0-100
			// Map to 40-90 range (leaving 10% for final steps)
			const mappedProgress = 40 + (progress * 0.5);
			onProgress?.(mappedProgress, 'Optimizing image...');
		},
	};

	onProgress?.(40, 'Compressing image...');

	// Compress the image
	const compressedBlob = await imageCompression(file, compressionOptions);

	onProgress?.(90, 'Finalizing...');

	// Create new File object
	const extension = outputFormat.split('/')[1];
	const originalName = file.name.replace(/\.[^.]+$/, '');
	const compressedFile = new File([compressedBlob], `${originalName}.${extension}`, {
		type: outputFormat,
	});

	const finalSize = compressedFile.size;
	const compressionRatio = originalSize / finalSize;
	const wasOptimized = finalSize < originalSize;

	onProgress?.(100, 'Complete');

	return {
		file: compressedFile,
		originalSize,
		finalSize,
		compressionRatio,
		format: extension,
		width: dimensions.width,
		height: dimensions.height,
		wasOptimized,
	};
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
	if (bytes === 0) return '0 B';
	const k = 1024;
	const sizes = ['B', 'KB', 'MB', 'GB'];
	const i = Math.floor(Math.log(bytes) / Math.log(k));
	return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
}

/**
 * Format compression ratio for display
 */
export function formatCompressionRatio(ratio: number): string {
	const percentage = ((ratio - 1) / ratio) * 100;
	return `${percentage.toFixed(0)}% reduction`;
}
