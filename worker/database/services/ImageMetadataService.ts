/**
 * Image Metadata Service
 * Handles CRUD operations for project images table
 */

import { eq, and, isNull, lt, desc, sql } from 'drizzle-orm';
import * as schema from '../schema';
import { BaseService } from './BaseService';
import type { ProjectImage, NewProjectImage } from '../schema';

export interface ImageUploadMetadata {
	appId: string;
	userId: string;
	filePath: string;
	originalFilename: string;
	mimeType: string;
	sizeBytes: number;
	hash: string;
	width?: number;
	height?: number;
	format: string;
	isOptimized: boolean;
	originalSizeBytes?: number;
	compressionRatio?: number;
	isBackgroundImage: boolean;
}

export interface ImageSearchFilters {
	appId?: string;
	userId?: string;
	includeDeleted?: boolean;
	onlyDeleted?: boolean;
}

/**
 * Service for managing project image metadata
 */
export class ImageMetadataService extends BaseService {
	/**
	 * Create a new image metadata record
	 */
	async createImage(metadata: ImageUploadMetadata): Promise<ProjectImage> {
		const id = crypto.randomUUID();
		const now = new Date();

		const newImage: NewProjectImage = {
			id,
			appId: metadata.appId,
			userId: metadata.userId,
			filePath: metadata.filePath,
			originalFilename: metadata.originalFilename,
			mimeType: metadata.mimeType,
			sizeBytes: metadata.sizeBytes,
			hash: metadata.hash,
			width: metadata.width,
			height: metadata.height,
			format: metadata.format,
			isOptimized: metadata.isOptimized,
			originalSizeBytes: metadata.originalSizeBytes,
			compressionRatio: metadata.compressionRatio,
			isBackgroundImage: metadata.isBackgroundImage,
			usageCount: 0,
			lastReferencedAt: now,
			uploadedAt: now,
			createdAt: now,
			updatedAt: now,
		};

		const result = await this.db.db
			.insert(schema.projectImages)
			.values(newImage)
			.returning()
			.get();

		this.logger.info('Image metadata created', { imageId: id, filePath: metadata.filePath });

		return result;
	}

	/**
	 * Check if an image with the same hash already exists
	 */
	async findByHash(hash: string, appId: string): Promise<ProjectImage | null> {
		const result = await this.db.db
			.select()
			.from(schema.projectImages)
			.where(
				and(
					eq(schema.projectImages.hash, hash),
					eq(schema.projectImages.appId, appId),
					isNull(schema.projectImages.deletedAt),
				),
			)
			.get();

		return result || null;
	}

	/**
	 * Get image by ID
	 */
	async getById(imageId: string): Promise<ProjectImage | null> {
		const result = await this.db.db
			.select()
			.from(schema.projectImages)
			.where(eq(schema.projectImages.id, imageId))
			.get();

		return result || null;
	}

	/**
	 * Get all images for an app
	 */
	async getImagesByApp(
		appId: string,
		filters: ImageSearchFilters = {},
	): Promise<ProjectImage[]> {
		const conditions = [eq(schema.projectImages.appId, appId)];

		if (filters.onlyDeleted) {
			conditions.push(sql`${schema.projectImages.deletedAt} IS NOT NULL`);
		} else if (!filters.includeDeleted) {
			conditions.push(isNull(schema.projectImages.deletedAt));
		}

		const result = await this.db.db
			.select()
			.from(schema.projectImages)
			.where(and(...conditions))
			.orderBy(desc(schema.projectImages.uploadedAt))
			.all();

		return result;
	}

	/**
	 * Update usage tracking when image is referenced
	 */
	async updateUsage(imageId: string): Promise<void> {
		const now = new Date();
		await this.db.db
			.update(schema.projectImages)
			.set({
				usageCount: sql`${schema.projectImages.usageCount} + 1`,
				lastReferencedAt: now,
				updatedAt: now,
			})
			.where(eq(schema.projectImages.id, imageId))
			.run();

		this.logger.info('Image usage updated', { imageId });
	}

	/**
	 * Soft delete an image
	 */
	async softDelete(imageId: string, userId: string): Promise<void> {
		const now = new Date();
		await this.db.db
			.update(schema.projectImages)
			.set({
				deletedAt: now,
				deletedBy: userId,
				updatedAt: now,
			})
			.where(eq(schema.projectImages.id, imageId))
			.run();

		this.logger.info('Image soft deleted', { imageId, userId });
	}

	/**
	 * Restore a soft-deleted image
	 */
	async restore(imageId: string): Promise<void> {
		await this.db.db
			.update(schema.projectImages)
			.set({
				deletedAt: null,
				deletedBy: null,
				updatedAt: new Date(),
			})
			.where(eq(schema.projectImages.id, imageId))
			.run();

		this.logger.info('Image restored', { imageId });
	}

	/**
	 * Permanently delete images past retention period (30 days)
	 */
	async purgeExpired(retentionDays: number = 30): Promise<ProjectImage[]> {
		const cutoffTime = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);

		const expiredImages = await this.db.db
			.select()
			.from(schema.projectImages)
			.where(
				and(
					sql`${schema.projectImages.deletedAt} IS NOT NULL`,
					lt(schema.projectImages.deletedAt, cutoffTime),
				),
			)
			.all();

		if (expiredImages.length > 0) {
			const ids = expiredImages.map((img) => img.id);
			await this.db.db
				.delete(schema.projectImages)
				.where(sql`${schema.projectImages.id} IN ${ids}`)
				.run();

			this.logger.info('Expired images purged', { count: expiredImages.length });
		}

		return expiredImages;
	}

	/**
	 * Batch soft delete images
	 */
	async batchSoftDelete(imageIds: string[], userId: string): Promise<number> {
		if (imageIds.length === 0) return 0;

		const now = new Date();
		await this.db.db
			.update(schema.projectImages)
			.set({
				deletedAt: now,
				deletedBy: userId,
				updatedAt: now,
			})
			.where(sql`${schema.projectImages.id} IN ${imageIds}`)
			.run();

		this.logger.info('Batch soft delete', { count: imageIds.length, userId });

		return imageIds.length;
	}

	/**
	 * Batch restore images
	 */
	async batchRestore(imageIds: string[]): Promise<number> {
		if (imageIds.length === 0) return 0;

		await this.db.db
			.update(schema.projectImages)
			.set({
				deletedAt: null,
				deletedBy: null,
				updatedAt: new Date(),
			})
			.where(sql`${schema.projectImages.id} IN ${imageIds}`)
			.run();

		this.logger.info('Batch restore', { count: imageIds.length });

		return imageIds.length;
	}

	/**
	 * Batch permanently delete
	 */
	async batchPermanentDelete(imageIds: string[]): Promise<ProjectImage[]> {
		if (imageIds.length === 0) return [];

		const images = await this.db.db
			.select()
			.from(schema.projectImages)
			.where(sql`${schema.projectImages.id} IN ${imageIds}`)
			.all();

		if (images.length > 0) {
			await this.db.db
				.delete(schema.projectImages)
				.where(sql`${schema.projectImages.id} IN ${imageIds}`)
				.run();

			this.logger.info('Batch permanent delete', { count: images.length });
		}

		return images;
	}

	/**
	 * Get storage statistics for an app
	 */
	async getStorageStats(appId: string): Promise<{
		totalImages: number;
		activeImages: number;
		deletedImages: number;
		totalSize: number;
		activeSize: number;
		deletedSize: number;
	}> {
		const images = await this.getImagesByApp(appId, { includeDeleted: true });

		const stats = images.reduce(
			(acc, img) => {
				acc.totalImages++;
				acc.totalSize += img.sizeBytes;

				if (img.deletedAt) {
					acc.deletedImages++;
					acc.deletedSize += img.sizeBytes;
				} else {
					acc.activeImages++;
					acc.activeSize += img.sizeBytes;
				}

				return acc;
			},
			{
				totalImages: 0,
				activeImages: 0,
				deletedImages: 0,
				totalSize: 0,
				activeSize: 0,
				deletedSize: 0,
			},
		);

		return stats;
	}
}
