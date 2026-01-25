/**
 * Image Processing Queue
 * Manages concurrent image processing with progress tracking and cancellation
 */

import { processImage, type ImageProcessingOptions, type ProcessedImage } from './image-processor';

export interface QueuedImage {
	id: string;
	file: File;
	options?: ImageProcessingOptions;
	status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
	progress: number;
	statusMessage: string;
	result?: ProcessedImage;
	error?: string;
	startTime?: number;
	endTime?: number;
}

export interface QueueCallbacks {
	onProgress?: (image: QueuedImage) => void;
	onComplete?: (image: QueuedImage) => void;
	onError?: (image: QueuedImage) => void;
	onQueueComplete?: () => void;
}

export class ImageProcessingQueue {
	private queue: QueuedImage[] = [];
	private processing = 0;
	private readonly maxConcurrent: number;
	private callbacks: QueueCallbacks = {};
	private abortControllers = new Map<string, AbortController>();

	constructor(maxConcurrent: number = 3) {
		// Adjust for mobile vs desktop
		const isMobile = /Android|webOS|iPhone|iPad|iPod/i.test(navigator.userAgent);
		this.maxConcurrent = isMobile ? Math.min(maxConcurrent, 2) : maxConcurrent;
	}

	/**
	 * Set callbacks for queue events
	 */
	setCallbacks(callbacks: QueueCallbacks): void {
		this.callbacks = callbacks;
	}

	/**
	 * Add image to processing queue
	 */
	add(file: File, options?: ImageProcessingOptions): string {
		const id = crypto.randomUUID();
		const queuedImage: QueuedImage = {
			id,
			file,
			options,
			status: 'pending',
			progress: 0,
			statusMessage: 'Waiting in queue...',
		};

		this.queue.push(queuedImage);
		this.processNext();
		return id;
	}

	/**
	 * Add multiple images to queue
	 */
	addBatch(files: File[], options?: ImageProcessingOptions): string[] {
		return files.map((file) => this.add(file, options));
	}

	/**
	 * Cancel a specific image processing
	 */
	cancel(id: string): void {
		const image = this.queue.find((img) => img.id === id);
		if (!image) return;

		// Abort if processing
		const controller = this.abortControllers.get(id);
		if (controller) {
			controller.abort();
			this.abortControllers.delete(id);
		}

		// Check if pending before updating status
		const wasPending = image.status === 'pending';

		// Update status
		image.status = 'cancelled';
		image.statusMessage = 'Cancelled by user';
		image.endTime = Date.now();

		this.callbacks.onError?.(image);

		// Remove from queue if was pending
		if (wasPending) {
			this.queue = this.queue.filter((img) => img.id !== id);
		}
	}

	/**
	 * Cancel all processing
	 */
	cancelAll(): void {
		const ids = this.queue.map((img) => img.id);
		ids.forEach((id) => this.cancel(id));
		this.queue = [];
	}

	/**
	 * Get current queue status
	 */
	getStatus(): {
		total: number;
		pending: number;
		processing: number;
		completed: number;
		failed: number;
		cancelled: number;
	} {
		return {
			total: this.queue.length,
			pending: this.queue.filter((img) => img.status === 'pending').length,
			processing: this.queue.filter((img) => img.status === 'processing').length,
			completed: this.queue.filter((img) => img.status === 'completed').length,
			failed: this.queue.filter((img) => img.status === 'failed').length,
			cancelled: this.queue.filter((img) => img.status === 'cancelled').length,
		};
	}

	/**
	 * Get specific image from queue
	 */
	getImage(id: string): QueuedImage | undefined {
		return this.queue.find((img) => img.id === id);
	}

	/**
	 * Get all images in queue
	 */
	getAllImages(): QueuedImage[] {
		return [...this.queue];
	}

	/**
	 * Clear completed/failed images from queue
	 */
	clearCompleted(): void {
		this.queue = this.queue.filter(
			(img) => img.status === 'pending' || img.status === 'processing',
		);
	}

	/**
	 * Process next image in queue
	 */
	private async processNext(): Promise<void> {
		// Check if we can process more
		if (this.processing >= this.maxConcurrent) {
			return;
		}

		// Find next pending image
		const image = this.queue.find((img) => img.status === 'pending');
		if (!image) {
			// No more pending images, check if queue is complete
			if (this.processing === 0 && this.queue.length > 0) {
				this.callbacks.onQueueComplete?.();
			}
			return;
		}

		// Start processing
		this.processing++;
		image.status = 'processing';
		image.progress = 0;
		image.startTime = Date.now();
		image.statusMessage = 'Starting...';

		// Create abort controller
		const controller = new AbortController();
		this.abortControllers.set(image.id, controller);

		try {
			// Process the image
			const result = await processImage(
				image.file,
				image.options,
				(progress, status) => {
					// Check if cancelled
					if (controller.signal.aborted) {
						throw new Error('Processing cancelled');
					}

					// Update progress
					image.progress = progress;
					image.statusMessage = status;
					this.callbacks.onProgress?.(image);
				},
			);

			// Check if cancelled before completing
			if (controller.signal.aborted) {
				throw new Error('Processing cancelled');
			}

			// Mark as completed
			image.status = 'completed';
			image.progress = 100;
			image.statusMessage = 'Complete';
			image.result = result;
			image.endTime = Date.now();

			this.callbacks.onComplete?.(image);
		} catch (error) {
			// Handle error
			image.status = controller.signal.aborted ? 'cancelled' : 'failed';
			image.statusMessage = controller.signal.aborted
				? 'Cancelled'
				: error instanceof Error
					? error.message
					: 'Processing failed';
			image.error = error instanceof Error ? error.message : 'Unknown error';
			image.endTime = Date.now();

			this.callbacks.onError?.(image);
		} finally {
			// Cleanup
			this.abortControllers.delete(image.id);
			this.processing--;

			// Process next image
			this.processNext();
		}
	}

	/**
	 * Wait for all images to complete
	 */
	async waitForAll(): Promise<void> {
		return new Promise((resolve) => {
			const checkComplete = () => {
				const status = this.getStatus();
				if (status.pending === 0 && status.processing === 0) {
					resolve();
				} else {
					setTimeout(checkComplete, 100);
				}
			};
			checkComplete();
		});
	}
}
