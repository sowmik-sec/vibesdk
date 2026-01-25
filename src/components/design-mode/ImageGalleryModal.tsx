/**
 * Image Gallery Modal
 * Manages uploaded images with gallery view and trash bin (30-day retention)
 */

import { useState, useCallback, useEffect } from 'react';
import { 
	Trash2, 
	Image as ImageIcon,
	CheckCircle2,
	RefreshCw,
	Upload,
	Archive,
	RotateCcw,
	X,
	Info
} from 'lucide-react';
import { toast } from 'sonner';

import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { formatFileSize } from '@/lib/image-processor';

// Mock types - these should match your actual API types
interface ProjectImage {
	id: string;
	filePath: string;
	originalFilename: string;
	mimeType: string;
	sizeBytes: number;
	width?: number;
	height?: number;
	format: string;
	uploadedAt: number;
	deletedAt?: number;
	usageCount: number;
	isBackgroundImage: boolean;
}

interface ImageGalleryModalProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	appId: string;
	onSelectImage?: (image: ProjectImage) => void;
}

export function ImageGalleryModal({
	open,
	onOpenChange,
	onSelectImage,
}: ImageGalleryModalProps) {
	const [activeTab, setActiveTab] = useState<'gallery' | 'trash'>('gallery');
	const [images, setImages] = useState<ProjectImage[]>([]);
	const [deletedImages, setDeletedImages] = useState<ProjectImage[]>([]);
	const [selectedImages, setSelectedImages] = useState<Set<string>>(new Set());
	const [isLoading, setIsLoading] = useState(false);
	const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
	const [showPermanentDeleteConfirm, setShowPermanentDeleteConfirm] = useState(false);

	// Load images
	const loadImages = useCallback(async () => {
		setIsLoading(true);
		try {
			// TODO: Replace with actual API call
			// const response = await fetch(`/api/apps/${appId}/images`);
			// const data = await response.json();
			// setImages(data.activeImages);
			// setDeletedImages(data.deletedImages);

			// Mock data for now
			setImages([]);
			setDeletedImages([]);
		} catch (error) {
			toast.error('Failed to load images');
			console.error(error);
		} finally {
			setIsLoading(false);
		}
	}, []);

	useEffect(() => {
		if (open) {
			loadImages();
		}
	}, [open, loadImages]);

	// Selection handlers
	const toggleSelection = (imageId: string) => {
		setSelectedImages((prev) => {
			const newSet = new Set(prev);
			if (newSet.has(imageId)) {
				newSet.delete(imageId);
			} else {
				newSet.add(imageId);
			}
			return newSet;
		});
	};

	const selectAll = () => {
		const imagesToSelect = activeTab === 'gallery' ? images : deletedImages;
		setSelectedImages(new Set(imagesToSelect.map((img) => img.id)));
	};

	const clearSelection = () => {
		setSelectedImages(new Set());
	};

	// Batch operations
	const handleBatchDelete = async () => {
		if (selectedImages.size === 0) return;

		try {
			// TODO: Replace with actual API call
			// await fetch(`/api/apps/${appId}/images/batch-delete`, {
			//     method: 'POST',
			//     body: JSON.stringify({ imageIds: Array.from(selectedImages) })
			// });

			toast.success(`Moved ${selectedImages.size} image(s) to trash`);
			clearSelection();
			loadImages();
		} catch (error) {
			toast.error('Failed to delete images');
			console.error(error);
		} finally {
			setShowDeleteConfirm(false);
		}
	};

	const handleBatchRestore = async () => {
		if (selectedImages.size === 0) return;

		try {
			// TODO: Replace with actual API call
			// await fetch(`/api/apps/${appId}/images/batch-restore`, {
			//     method: 'POST',
			//     body: JSON.stringify({ imageIds: Array.from(selectedImages) })
			// });

			toast.success(`Restored ${selectedImages.size} image(s)`);
			clearSelection();
			loadImages();
		} catch (error) {
			toast.error('Failed to restore images');
			console.error(error);
		}
	};

	const handleBatchPermanentDelete = async () => {
		if (selectedImages.size === 0) return;

		try {
			// TODO: Replace with actual API call
			// await fetch(`/api/apps/${appId}/images/batch-permanent-delete`, {
			//     method: 'POST',
			//     body: JSON.stringify({ imageIds: Array.from(selectedImages) })
			// });

			toast.success(`Permanently deleted ${selectedImages.size} image(s)`);
			clearSelection();
			loadImages();
		} catch (error) {
			toast.error('Failed to permanently delete images');
			console.error(error);
		} finally {
			setShowPermanentDeleteConfirm(false);
		}
	};

	// Calculate total size of selected images
	const selectedSize = Array.from(selectedImages).reduce((total, id) => {
		const imagesToSearch = activeTab === 'gallery' ? images : deletedImages;
		const image = imagesToSearch.find((img) => img.id === id);
		return total + (image?.sizeBytes || 0);
	}, 0);

	return (
		<>
			<Dialog open={open} onOpenChange={onOpenChange}>
				<DialogContent className="max-w-5xl max-h-[90vh]">
					<DialogHeader>
						<DialogTitle>Image Gallery</DialogTitle>
						<DialogDescription>
							Manage uploaded images for this project
						</DialogDescription>
					</DialogHeader>

					<Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
						<div className="flex items-center justify-between mb-4">
							<TabsList>
								<TabsTrigger value="gallery" className="gap-2">
									<ImageIcon className="size-4" />
									Gallery ({images.length})
								</TabsTrigger>
								<TabsTrigger value="trash" className="gap-2">
									<Archive className="size-4" />
									Trash ({deletedImages.length})
								</TabsTrigger>
							</TabsList>

							{/* Selection actions */}
							{selectedImages.size > 0 && (
								<div className="flex items-center gap-2">
									<span className="text-sm text-text-primary/60">
										{selectedImages.size} selected ({formatFileSize(selectedSize)})
									</span>
									<Button
										variant="ghost"
										size="sm"
										onClick={clearSelection}
									>
										<X className="size-4" />
									</Button>

									{activeTab === 'gallery' ? (
										<Button
											variant="destructive"
											size="sm"
											onClick={() => setShowDeleteConfirm(true)}
										>
											<Trash2 className="size-4 mr-2" />
											Move to Trash
										</Button>
									) : (
										<>
											<Button
												variant="default"
												size="sm"
												onClick={handleBatchRestore}
											>
												<RotateCcw className="size-4 mr-2" />
												Restore
											</Button>
											<Button
												variant="destructive"
												size="sm"
												onClick={() => setShowPermanentDeleteConfirm(true)}
											>
												<Trash2 className="size-4 mr-2" />
												Delete Forever
											</Button>
										</>
									)}
								</div>
							)}
						</div>

						<TabsContent value="gallery" className="mt-0">
							<ImageGrid
								images={images}
								selectedImages={selectedImages}
								onToggleSelection={toggleSelection}
								onSelectImage={onSelectImage}
								isLoading={isLoading}
							/>
						</TabsContent>

						<TabsContent value="trash" className="mt-0">
							<div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3 mb-4 flex items-start gap-2">
								<Info className="size-4 text-yellow-500 mt-0.5 shrink-0" />
								<p className="text-sm text-text-primary/80">
									Images in trash will be permanently deleted after 30 days. You can restore them before then.
								</p>
							</div>
							<ImageGrid
								images={deletedImages}
								selectedImages={selectedImages}
								onToggleSelection={toggleSelection}
								onSelectImage={undefined}
								isLoading={isLoading}
								isTrash
							/>
						</TabsContent>
					</Tabs>

					{/* Bulk selection footer */}
					{(images.length > 0 || deletedImages.length > 0) && (
						<div className="flex items-center justify-between pt-4 border-t">
							<Button
								variant="outline"
								size="sm"
								onClick={selectAll}
								disabled={selectedImages.size === (activeTab === 'gallery' ? images : deletedImages).length}
							>
								<CheckCircle2 className="size-4 mr-2" />
								Select All
							</Button>
							
							<div className="text-xs text-text-primary/50">
								{activeTab === 'gallery' 
									? `${images.length} active images`
									: `${deletedImages.length} images in trash`
								}
							</div>
						</div>
					)}
				</DialogContent>
			</Dialog>

			{/* Delete confirmation */}
			<AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Move to Trash?</AlertDialogTitle>
						<AlertDialogDescription>
							{selectedImages.size} image(s) will be moved to trash. They can be restored within 30 days.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancel</AlertDialogCancel>
						<AlertDialogAction onClick={handleBatchDelete}>
							Move to Trash
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>

			{/* Permanent delete confirmation */}
			<AlertDialog open={showPermanentDeleteConfirm} onOpenChange={setShowPermanentDeleteConfirm}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Permanently Delete?</AlertDialogTitle>
						<AlertDialogDescription className="space-y-2">
							<p>
								{selectedImages.size} image(s) will be <strong>permanently deleted</strong>. 
								This action cannot be undone.
							</p>
							<p className="text-sm">
								Total size: {formatFileSize(selectedSize)}
							</p>
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancel</AlertDialogCancel>
						<AlertDialogAction 
							onClick={handleBatchPermanentDelete}
							className="bg-red-600 hover:bg-red-700"
						>
							Delete Forever
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</>
	);
}

// Image Grid Component
interface ImageGridProps {
	images: ProjectImage[];
	selectedImages: Set<string>;
	onToggleSelection: (id: string) => void;
	onSelectImage?: (image: ProjectImage) => void;
	isLoading: boolean;
	isTrash?: boolean;
}

function ImageGrid({
	images,
	selectedImages,
	onToggleSelection,
	onSelectImage,
	isLoading,
	isTrash = false,
}: ImageGridProps) {
	if (isLoading) {
		return (
			<div className="flex items-center justify-center py-12">
				<RefreshCw className="size-6 animate-spin text-accent" />
			</div>
		);
	}

	if (images.length === 0) {
		return (
			<div className="flex flex-col items-center justify-center py-12 text-text-primary/40">
				{isTrash ? (
					<>
						<Archive className="size-12 mb-4" />
						<p className="text-sm">Trash is empty</p>
					</>
				) : (
					<>
						<ImageIcon className="size-12 mb-4" />
						<p className="text-sm">No images uploaded yet</p>
					</>
				)}
			</div>
		);
	}

	return (
		<ScrollArea className="h-125">
			<div className="grid grid-cols-3 gap-4 p-2">
				{images.map((image) => (
					<ImageCard
						key={image.id}
						image={image}
						isSelected={selectedImages.has(image.id)}
						onToggleSelection={() => onToggleSelection(image.id)}
						onSelectImage={onSelectImage}
						isTrash={isTrash}
					/>
				))}
			</div>
		</ScrollArea>
	);
}

// Image Card Component
interface ImageCardProps {
	image: ProjectImage;
	isSelected: boolean;
	onToggleSelection: () => void;
	onSelectImage?: (image: ProjectImage) => void;
	isTrash: boolean;
}

function ImageCard({
	image,
	isSelected,
	onToggleSelection,
	onSelectImage,
	isTrash,
}: ImageCardProps) {
	const [isHovered, setIsHovered] = useState(false);

	return (
		<div
			className={cn(
				"relative group rounded-lg border overflow-hidden transition-all cursor-pointer",
				isSelected ? "border-accent ring-2 ring-accent" : "border-text/20 hover:border-text/40"
			)}
			onMouseEnter={() => setIsHovered(true)}
			onMouseLeave={() => setIsHovered(false)}
			onClick={() => {
				if (!isTrash && onSelectImage) {
					onSelectImage(image);
				}
			}}
		>
			{/* Checkbox */}
			<div className="absolute top-2 left-2 z-20">
				<Checkbox
					checked={isSelected}
					onCheckedChange={onToggleSelection}
					onClick={(e) => e.stopPropagation()}
					className="bg-bg-1/90 backdrop-blur-sm"
				/>
			</div>

			{/* Image preview */}
			<div className="aspect-square bg-bg-2 relative">
				{/* Transparency grid */}
				<div className="absolute inset-0 opacity-20" style={{
					backgroundImage: `linear-gradient(45deg, #888 25%, transparent 25%), linear-gradient(-45deg, #888 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #888 75%), linear-gradient(-45deg, transparent 75%, #888 75%)`,
					backgroundSize: '20px 20px',
					backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px'
				}} />
				<img
					src={image.filePath}
					alt={image.originalFilename}
					className="w-full h-full object-contain relative z-10"
					loading="lazy"
				/>

				{/* Hover overlay */}
				{isHovered && !isTrash && (
					<div className="absolute inset-0 bg-black/60 flex items-center justify-center z-20 transition-opacity">
						<Upload className="size-8 text-white" />
					</div>
				)}
			</div>

			{/* Info footer */}
			<div className="p-2 bg-bg-1 border-t border-text/10">
				<p className="text-xs font-medium truncate" title={image.originalFilename}>
					{image.originalFilename}
				</p>
				<div className="flex items-center justify-between mt-1">
					<span className="text-[10px] text-text-primary/50">
						{formatFileSize(image.sizeBytes)}
					</span>
					<span className="text-[10px] text-text-primary/50">
						{image.width && image.height ? `${image.width}×${image.height}` : image.format}
					</span>
				</div>
				{image.usageCount > 0 && (
					<div className="flex items-center gap-1 mt-1">
						<CheckCircle2 className="size-3 text-green-500" />
						<span className="text-[10px] text-green-500">
							Used {image.usageCount}x
						</span>
					</div>
				)}
			</div>
		</div>
	);
}
