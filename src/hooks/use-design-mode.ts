/**
 * useDesignMode Hook
 * Main hook for managing design mode state and interactions
 */

import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import type { WebSocket } from 'partysocket';
import type {
    DesignModeElementData,
    DesignModeIframeMessage,
    DesignModeStyleChange,
} from '@vibesdk/design-mode-client';
import { DESIGN_MODE_MESSAGE_PREFIX } from '@vibesdk/design-mode-client';
import { chunkFile } from '@/components/design-mode/style-controls/image-control';

// ============================================================================
// Types
// ============================================================================

export interface DesignModeHistoryEntry {
    id: string;
    selector: string;
    filePath?: string;
    changes: DesignModeStyleChange[];
    timestamp: number;
}

export interface UseDesignModeOptions {
    /** WebSocket connection for syncing changes to backend */
    websocket?: WebSocket | null;
    /** Ref to the preview iframe */
    iframeRef?: React.RefObject<HTMLIFrameElement | null>;
    /** Callback when a file is modified */
    onFileModified?: (filePath: string) => void;
    /** Callback to switch to editor view */
    onGoToCode?: (filePath: string, lineNumber: number) => void;
}

export interface UseDesignModeReturn {
    /** Whether design mode is currently enabled */
    isEnabled: boolean;
    /** Toggle design mode on/off */
    toggleDesignMode: () => void;
    /** Enable design mode */
    enableDesignMode: () => void;
    /** Disable design mode */
    disableDesignMode: () => void;
    /** Currently selected element data */
    selectedElement: DesignModeElementData | null;
    /** Currently hovered element data */
    hoveredElement: DesignModeElementData | null;
    /** Preview a style change (doesn't persist) */
    previewStyle: (property: string, value: string) => void;
    /** Clear all style previews */
    clearPreview: () => void;
    /** Apply and persist a style change */
    applyStyle: (property: string, value: string) => Promise<void>;
    /** Apply multiple style changes at once */
    applyStyles: (changes: Array<{ property: string; value: string }>) => Promise<void>;
    /** Send a targeted AI prompt for the selected element */
    sendAIPrompt: (prompt: string) => Promise<void>;
    /** Navigate to the code location of the selected element */
    goToCode: () => void;
    /** Undo the last change */
    undo: () => void;
    /** Redo a previously undone change */
    redo: () => void;
    /** Whether undo is available */
    canUndo: boolean;
    /** Whether redo is available */
    canRedo: boolean;
    /** Clear selection */
    clearSelection: () => void;
    /** Update text content of selected element (preview only) */
    updateText: (text: string) => void;
    /** Preview text content change (alias for updateText) */
    previewText: (text: string) => void;
    /** Persist text content change to backend */
    commitText: (text: string) => Promise<void>;
    /** Whether there are pending changes being synced */
    isSyncing: boolean;
    /** Last sync error if any */
    syncError: string | null;
    /** Whether there are changes saved but not yet deployed */
    hasPendingChanges: boolean;
    /** Manually trigger a preview refresh (deploys pending changes) */
    refreshPreview: () => Promise<void>;
    /** Upload an image for the selected element */
    uploadImage: (file: File, isBackground: boolean) => Promise<void>;
    /** Whether an image upload is in progress */
    isUploadingImage: boolean;
    /** Image upload progress (0-100) */
    imageUploadProgress: number;
}

// ============================================================================
// Hook Implementation
// ============================================================================

export function useDesignMode(options: UseDesignModeOptions = {}): UseDesignModeReturn {
    const { websocket, iframeRef, onFileModified, onGoToCode } = options;

    // Core state
    const [isEnabled, setIsEnabled] = useState(false);
    const [selectedElement, setSelectedElement] = useState<DesignModeElementData | null>(null);
    const [hoveredElement, setHoveredElement] = useState<DesignModeElementData | null>(null);
    const [isSyncing, setIsSyncing] = useState(false);
    const [syncError, setSyncError] = useState<string | null>(null);
    const [hasPendingChanges, setHasPendingChanges] = useState(false);
    const [isUploadingImage, setIsUploadingImage] = useState(false);
    const [imageUploadProgress, setImageUploadProgress] = useState(0);

    // History for undo/redo
    const [history, setHistory] = useState<DesignModeHistoryEntry[]>([]);
    const [historyIndex, setHistoryIndex] = useState(-1);

    // Track preview styles for cleanup
    const previewStylesRef = useRef<Map<string, Record<string, string>>>(new Map());
    // Track committed (but not deployed) styles to persist across temporary previews
    const committedStylesRef = useRef<Map<string, Record<string, string>>>(new Map());
    // Track if we need to hard reload after deployment (for image uploads)
    const needsHardReloadRef = useRef(false);

    // Debounce timer for backend persistence (to prevent immediate page reload)
    // const persistenceDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    // Pending changes to be persisted
    // const pendingChangesRef = useRef<Array<{ property: string; value: string }>>([]);

    // ========================================================================
    // Iframe Communication
    // ========================================================================

    const sendToIframe = useCallback((message: Record<string, unknown>) => {
        const iframe = iframeRef?.current;
        console.log('[DesignMode] sendToIframe called', {
            message,
            hasIframe: !!iframe,
            hasContentWindow: !!iframe?.contentWindow,
            iframeSrc: iframe?.src,
        });
        if (iframe?.contentWindow) {
            try {
                iframe.contentWindow.postMessage(
                    { prefix: DESIGN_MODE_MESSAGE_PREFIX, ...message },
                    '*'
                );
                console.log('[DesignMode] Message posted to iframe successfully');
            } catch (error) {
                console.error('[DesignMode] Error posting message to iframe:', error);
            }
        } else {
            console.warn('[DesignMode] Cannot send to iframe - no contentWindow');
        }
    }, [iframeRef]);

    const handleIframeMessage = useCallback((event: MessageEvent) => {
        const data = event.data;
        if (!data || data.prefix !== DESIGN_MODE_MESSAGE_PREFIX) return;

        console.log('[DesignMode] Received message from iframe:', data);

        const message = data as DesignModeIframeMessage & { prefix: string };

        switch (message.type) {
            case 'design_mode_ready':
                console.log('[DesignMode] Iframe ready, isEnabled:', isEnabled);
                // Iframe is ready, enable design mode if it should be enabled
                if (isEnabled) {
                    sendToIframe({ type: 'design_mode_enable' });

                    // Re-apply any pending preview styles after iframe reloads
                    if (selectedElement) {
                        const pendingStyles = previewStylesRef.current.get(selectedElement.selector);
                        if (pendingStyles && Object.keys(pendingStyles).length > 0) {
                            console.log('[DesignMode] Re-applying preview styles after iframe ready:', pendingStyles);
                            sendToIframe({
                                type: 'design_mode_preview_style',
                                selector: selectedElement.selector,
                                styles: pendingStyles,
                            });
                        }
                    }
                }
                break;

            case 'design_mode_element_hovered':
                console.log('[DesignMode] Element hovered:', message.element?.tagName);
                setHoveredElement(message.element);
                break;

            case 'design_mode_element_selected':
                console.log('[DesignMode] Element SELECTED:', {
                    tagName: message.element?.tagName,
                    selector: message.element?.selector,
                    sourceLocation: message.element?.sourceLocation,
                    hasFilePath: !!message.element?.sourceLocation?.filePath,
                    filePath: message.element?.sourceLocation?.filePath || '(empty)',
                    textContent: message.element?.textContent?.slice(0, 50),
                });
                setSelectedElement(message.element);
                setHoveredElement(null);
                break;

            case 'design_mode_element_deselected':
                console.log('[DesignMode] Element deselected');
                setSelectedElement(null);
                break;

            case 'design_mode_text_edited':
                // Handle text edit - this will need to sync with backend
                if (selectedElement && websocket && websocket.readyState === 1) {
                    websocket.send(JSON.stringify({
                        type: 'design_mode_text_update',
                        selector: selectedElement.selector,
                        filePath: selectedElement.sourceLocation?.filePath,
                        oldText: message.oldText,
                        newText: message.newText,
                    }));
                }
                break;

            case 'design_mode_text_edit':
                // Handle inline text edit from double-click (includes sourceLocation)
                console.log('[DesignMode] Inline text edit received:', {
                    selector: message.selector,
                    oldText: message.oldText?.slice(0, 30),
                    newText: message.newText?.slice(0, 30),
                    sourceLocation: message.sourceLocation
                });
                if (websocket && websocket.readyState === 1) {
                    websocket.send(JSON.stringify({
                        type: 'design_mode_text_update',
                        selector: message.selector,
                        filePath: message.sourceLocation?.filePath,
                        sourceLocation: message.sourceLocation,
                        oldText: message.oldText,
                        newText: message.newText,
                    }));
                }
                break;

            case 'design_mode_error':
                console.error('Design mode error:', message.error, message.context);
                setSyncError(message.error);
                break;
        }
    }, [isEnabled, selectedElement, sendToIframe, websocket]);

    // Listen for messages from iframe
    useEffect(() => {
        window.addEventListener('message', handleIframeMessage);
        return () => window.removeEventListener('message', handleIframeMessage);
    }, [handleIframeMessage]);

    // ========================================================================
    // Design Mode Toggle
    // ========================================================================

    const enableDesignMode = useCallback(() => {
        const iframe = iframeRef?.current;
        console.log('[DesignMode] enableDesignMode called', {
            iframeSrc: iframe?.src,
            iframeOrigin: iframe?.src ? new URL(iframe.src).origin : null,
            parentOrigin: window.location.origin,
            sameOrigin: iframe?.src ? new URL(iframe.src).origin === window.location.origin : false
        });
        setIsEnabled(true);
        sendToIframe({ type: 'design_mode_enable' });
    }, [sendToIframe, iframeRef]);

    const disableDesignMode = useCallback(() => {
        console.log('[DesignMode] disableDesignMode called');
        setIsEnabled(false);
        setSelectedElement(null);
        setHoveredElement(null);
        sendToIframe({ type: 'design_mode_disable' });
    }, [sendToIframe]);

    const toggleDesignMode = useCallback(() => {
        if (isEnabled) {
            disableDesignMode();
        } else {
            enableDesignMode();
        }
    }, [isEnabled, enableDesignMode, disableDesignMode]);

    // ========================================================================
    // Style Preview (PostMessage - Required for Cross-Origin Iframe)
    // ========================================================================

    const previewStyle = useCallback((property: string, value: string) => {
        console.log('[useDesignMode] previewStyle called', { property, value, hasElement: !!selectedElement });
        if (!selectedElement) {
            console.warn('[useDesignMode] previewStyle: No selected element!');
            return;
        }

        // Track preview for cleanup
        // Start with current preview styles (to support batch previews like Left+Right),
        // fallback to committed styles (if any)
        const currentPreview = previewStylesRef.current.get(selectedElement.selector);
        const committed = committedStylesRef.current.get(selectedElement.selector) || {};

        const base = currentPreview || committed;

        // Merge with new preview
        const newPreview = { ...base, [property]: value };
        previewStylesRef.current.set(selectedElement.selector, newPreview);

        console.log('[useDesignMode] Sending preview to iframe via postMessage', {
            selector: selectedElement.selector,
            styles: newPreview
        });

        // Send to iframe via postMessage (cross-origin safe)
        sendToIframe({
            type: 'design_mode_preview_style',
            selector: selectedElement.selector,
            styles: newPreview,
        });
    }, [selectedElement, sendToIframe]); // removed unnecessary closing brace handled by tool range

    const clearPreview = useCallback(() => {
        if (!selectedElement) return;

        const committed = committedStylesRef.current.get(selectedElement.selector);

        if (committed && Object.keys(committed).length > 0) {
            // Revert to committed state
            previewStylesRef.current.set(selectedElement.selector, { ...committed });
            sendToIframe({
                type: 'design_mode_preview_style',
                selector: selectedElement.selector,
                styles: committed,
            });
        } else {
            // No committed styles, clear everything
            previewStylesRef.current.delete(selectedElement.selector);
            sendToIframe({
                type: 'design_mode_clear_preview',
                selector: selectedElement.selector,
            });
        }
    }, [selectedElement, sendToIframe]);

    // ========================================================================
    // Style Application (Persistent Changes)
    // ========================================================================

    const applyStyles = useCallback(async (changes: Array<{ property: string; value: string }>) => {
        console.log('[useDesignMode] applyStyles called', {
            changes,
            hasElement: !!selectedElement,
            hasWebsocket: !!websocket,
            websocketReadyState: websocket?.readyState
        });

        if (!selectedElement) {
            console.warn('[useDesignMode] applyStyles: No selected element!');
            return;
        }

        // IMMEDIATELY apply visual preview via postMessage
        // Update committed styles
        const committed = committedStylesRef.current.get(selectedElement.selector) || {};
        changes.forEach(({ property, value }) => {
            committed[property] = value;
        });
        committedStylesRef.current.set(selectedElement.selector, committed);

        // Update preview styles (matches committed since we just applied)
        previewStylesRef.current.set(selectedElement.selector, { ...committed });

        // Send preview to iframe for instant visual feedback
        console.log('[useDesignMode] Sending preview via postMessage:', committed);
        sendToIframe({
            type: 'design_mode_preview_style',
            selector: selectedElement.selector,
            styles: committed,
        });

        // If no websocket, just keep the visual preview (won't persist to code)
        if (!websocket) {
            console.warn('[useDesignMode] applyStyles: No websocket - changes are visual only');
            return;
        }

        setSyncError(null);
        setIsSyncing(true);

        try {
            // Convert to style changes
            const styleChanges: DesignModeStyleChange[] = changes.map(({ property, value }) => ({
                property,
                oldValue: selectedElement.computedStyles[property as keyof typeof selectedElement.computedStyles] || '',
                newValue: value,
            }));

            // Use functional update to avoid race conditions when multiple style changes
            // are applied rapidly (e.g., fontStyle and textDecoration from decorations)
            setSelectedElement(prev => {
                if (!prev) return prev;

                // Merge computedStyles with previous state
                const mergedComputedStyles = { ...prev.computedStyles };
                changes.forEach(({ property, value }) => {
                    (mergedComputedStyles as Record<string, string>)[property] = value;
                });

                // Merge tailwindClasses with previous state
                let mergedTailwindClasses = [...prev.tailwindClasses];
                changes.forEach(({ property, value }) => {
                    if (property === 'fontStyle') {
                        mergedTailwindClasses = mergedTailwindClasses.filter(c => c !== 'italic' && c !== 'not-italic');
                        if (value === 'italic') {
                            mergedTailwindClasses.push('italic');
                        }
                    } else if (property === 'textDecoration') {
                        // Remove existing decoration classes including arbitrary ones
                        mergedTailwindClasses = mergedTailwindClasses.filter(
                            c => c !== 'underline' && c !== 'no-underline' && c !== 'line-through' && !c.startsWith('[text-decoration')
                        );

                        const newDecorations: string[] = [];
                        if (value.includes('underline')) {
                            newDecorations.push('underline');
                        }
                        if (value.includes('line-through')) {
                            newDecorations.push('line-through');
                        }

                        if (newDecorations.length > 1) {
                            // Use arbitrary value for multiple decorations
                            mergedTailwindClasses.push(`[text-decoration-line:${newDecorations.join('_')}]`);
                        } else {
                            // Use standard classes for single/none
                            mergedTailwindClasses.push(...newDecorations);
                        }
                    }
                });

                return {
                    ...prev,
                    computedStyles: mergedComputedStyles,
                    tailwindClasses: mergedTailwindClasses,
                    className: mergedTailwindClasses.join(' '),
                };
            });

            // Add to history
            const historyEntry: DesignModeHistoryEntry = {
                id: crypto.randomUUID(),
                selector: selectedElement.selector,
                filePath: selectedElement.sourceLocation?.filePath,
                changes: styleChanges,
                timestamp: Date.now(),
            };

            // Truncate redo history and add new entry
            setHistory(prev => [...prev.slice(0, historyIndex + 1), historyEntry]);
            setHistoryIndex(prev => prev + 1);

            const messagePayload = {
                type: 'design_mode_style_update',
                selector: selectedElement.selector,
                filePath: selectedElement.sourceLocation?.filePath,
                textContent: selectedElement.textContent,
                changes: styleChanges,
                skipDeploy: true, // Don't reload preview - keep inline styles visible
                // Pass full sourceLocation so backend can use lineNumber for precise element location
                sourceLocation: selectedElement.sourceLocation,
                // Pass class names to help find the element when text is dynamic
                className: selectedElement.className,
                tailwindClasses: selectedElement.tailwindClasses,
            };

            console.log('[useDesignMode] Sending to WebSocket with skipDeploy:', messagePayload);

            // Validate websocket is open (readyState 1 = OPEN)
            if (!websocket || websocket.readyState !== 1) {
                console.error('[useDesignMode] WebSocket not open!', {
                    hasWebsocket: !!websocket,
                    readyState: websocket?.readyState
                });
                setIsSyncing(false);
                return;
            }

            // Send to backend via WebSocket
            websocket.send(JSON.stringify(messagePayload));
            console.log('[useDesignMode] WebSocket message sent successfully');

            // Mark that we have pending changes (saved but not deployed)
            setHasPendingChanges(true);

            // Notify file change
            if (selectedElement.sourceLocation?.filePath && onFileModified) {
                onFileModified(selectedElement.sourceLocation.filePath);
            }

            setIsSyncing(false);

        } catch (error) {
            console.error('[useDesignMode] applyStyles error:', error);
            setSyncError(error instanceof Error ? error.message : 'Failed to apply styles');
            setIsSyncing(false);
        }
    }, [selectedElement, websocket, historyIndex, sendToIframe, onFileModified]);

    const applyStyle = useCallback(async (property: string, value: string) => {
        console.log('[useDesignMode] applyStyle called', { property, value });
        await applyStyles([{ property, value }]);
    }, [applyStyles]);

    // ========================================================================
    // Text Editing
    // ========================================================================

    const updateText = useCallback((text: string) => {
        if (!selectedElement) return;

        sendToIframe({
            type: 'design_mode_update_text',
            selector: selectedElement.selector,
            text,
        });
    }, [selectedElement, sendToIframe]);

    const handleTextChange = useCallback(async (oldText: string, newText: string) => {
        if (!selectedElement || !websocket) return;

        // This will be handled similarly to style changes
        // but updating text content instead
        websocket.send(JSON.stringify({
            type: 'design_mode_text_update',
            selector: selectedElement.selector,
            filePath: selectedElement.sourceLocation?.filePath,
            oldText,
            newText,
        }));
    }, [selectedElement, websocket]);

    // ========================================================================
    // AI Prompt
    // ========================================================================

    const sendAIPrompt = useCallback(async (prompt: string) => {
        if (!selectedElement || !websocket) return;

        setSyncError(null);
        setIsSyncing(true);

        try {
            websocket.send(JSON.stringify({
                type: 'design_mode_ai_prompt',
                prompt,
                elementContext: {
                    selector: selectedElement.selector,
                    filePath: selectedElement.sourceLocation?.filePath,
                    currentStyles: selectedElement.computedStyles,
                    className: selectedElement.className,
                },
            }));
        } catch (error) {
            setSyncError(error instanceof Error ? error.message : 'Failed to send AI prompt');
        } finally {
            setIsSyncing(false);
        }
    }, [selectedElement, websocket]);

    // ========================================================================
    // Go to Code
    // ========================================================================

    const goToCode = useCallback(() => {
        if (!selectedElement?.sourceLocation) return;

        const { filePath, lineNumber } = selectedElement.sourceLocation;
        if (onGoToCode) {
            onGoToCode(filePath, lineNumber);
        }
    }, [selectedElement, onGoToCode]);

    // ========================================================================
    // Undo/Redo
    // ========================================================================

    const canUndo = historyIndex >= 0;
    const canRedo = historyIndex < history.length - 1;

    const undo = useCallback(() => {
        if (!canUndo || !websocket) return;

        const entry = history[historyIndex];

        // Send undo request to backend
        websocket.send(JSON.stringify({
            type: 'design_mode_undo',
            entryId: entry.id,
            selector: entry.selector,
            filePath: entry.filePath,
            changes: entry.changes.map(c => ({
                ...c,
                // Swap old and new values
                oldValue: c.newValue,
                newValue: c.oldValue,
            })),
        }));

        setHistoryIndex(prev => prev - 1);
    }, [canUndo, history, historyIndex, websocket]);

    const redo = useCallback(() => {
        if (!canRedo || !websocket) return;

        const entry = history[historyIndex + 1];

        // Send redo request to backend
        websocket.send(JSON.stringify({
            type: 'design_mode_redo',
            entryId: entry.id,
            selector: entry.selector,
            filePath: entry.filePath,
            changes: entry.changes,
        }));

        setHistoryIndex(prev => prev + 1);
    }, [canRedo, history, historyIndex, websocket]);

    // ========================================================================
    // Selection
    // ========================================================================

    const clearSelection = useCallback(() => {
        setSelectedElement(null);
        clearPreview();
    }, [clearPreview]);

    // ========================================================================
    // Refresh Preview (Manual Deploy)
    // ========================================================================

    const refreshPreview = useCallback(async () => {
        if (!websocket) return;

        console.log('[useDesignMode] Triggering manual preview refresh');
        setIsSyncing(true);
        setSyncError(null);

        try {
            // Send message to backend to trigger a fresh deploy
            websocket.send(JSON.stringify({
                type: 'design_mode_refresh_preview',
            }));

            // Clear pending changes flag
            setHasPendingChanges(false);

            // Clear committed styles as the new page load will have them baked in
            // When design_mode_ready fires, we want to start fresh
            committedStylesRef.current.clear();

            console.log('[useDesignMode] Preview refresh requested');
        } catch (error) {
            console.error('[useDesignMode] Failed to refresh preview:', error);
            setSyncError(error instanceof Error ? error.message : 'Failed to refresh preview');
        } finally {
            setIsSyncing(false);
        }
    }, [websocket]);

    // ========================================================================
    // Image Upload
    // ========================================================================

    const uploadImage = useCallback(async (file: File, isBackground: boolean) => {
        if (!selectedElement || !websocket) return;

        setIsUploadingImage(true);
        setImageUploadProgress(0);
        setSyncError(null);

        try {
            const uploadId = crypto.randomUUID();
            const fileName = file.name;
            const mimeType = file.type;
            const fileSize = file.size;

            for await (const { chunk, index, total } of chunkFile(file)) {
                websocket.send(JSON.stringify({
                    type: 'design_mode_image_upload',
                    uploadId,
                    chunk,
                    chunkIndex: index,
                    totalChunks: total,
                    fileName,
                    mimeType,
                    fileSize,
                    isBackground,
                    elementContext: {
                        selector: selectedElement.selector,
                        filePath: selectedElement.sourceLocation?.filePath,
                        lineNumber: selectedElement.sourceLocation?.lineNumber,
                    }
                }));

                // Update progress
                setImageUploadProgress(Math.round(((index + 1) / total) * 100));
            }

            // Loading state will be reset when we receive the design_mode_image_uploaded response
            console.log('[useDesignMode] All image chunks sent, waiting for server confirmation...');

        } catch (error) {
            console.error('[useDesignMode] Image upload failed:', error);
            setSyncError(error instanceof Error ? error.message : 'Image upload failed');
            setIsUploadingImage(false);
        }
    }, [selectedElement, websocket]);

    // Listen for WebSocket messages (like image upload confirmation)
    useEffect(() => {
        if (!websocket) return;

        const handleWebSocketMessage = (event: MessageEvent) => {
            try {
                const message = JSON.parse(event.data);

                if (message.type === 'design_mode_image_uploaded') {
                    console.log('[useDesignMode] Image upload response received:', message);

                    if (message.success) {
                        if (message.requiresManualUpdate) {
                            console.warn('[useDesignMode] Image uploaded but requires manual code update');
                            setSyncError(
                                `Image uploaded to ${message.imagePath}\n\n` +
                                `Please manually update your code to use the new image:\n` +
                                `${message.sourceHint ? `In ${message.sourceHint}, ` : ''}` +
                                `change the src attribute to "${message.imagePath}"`
                            );
                        } else {
                            console.log('[useDesignMode] Image uploaded and deployed successfully');
                            
                            // Re-select the element to refresh its data with the new src attribute
                            // This ensures the image preview shows the updated image
                            if (selectedElement) {
                                console.log('[useDesignMode] Re-selecting element to refresh image preview');
                                sendToIframe({
                                    type: 'design_mode_select_element',
                                    selector: selectedElement.selector,
                                });
                            }
                        }
                        
                        // The backend has already done an optimistic deployment with the updated files
                        // No need for a second deployment - just clear the pending state
                        setHasPendingChanges(false);
                        committedStylesRef.current.clear();
                    } else {
                        console.error('[useDesignMode] Image upload failed:', message.error);
                        setSyncError(message.error || 'Image upload failed');
                    }

                    setIsUploadingImage(false);
                    setImageUploadProgress(0);
                }

                if (message.type === 'design_mode_refresh_complete') {
                    console.log('[useDesignMode] Deployment refresh complete', message);
                    
                    // Reset the flag - the optimistic deployment should have already updated the sandbox
                    // Vite HMR will handle the refresh automatically
                    if (needsHardReloadRef.current) {
                        console.log('[useDesignMode] Files deployed, relying on Vite HMR');
                        needsHardReloadRef.current = false;
                    }
                }
            } catch {
                // Not JSON or not our message type
            }
        };

        websocket.addEventListener('message', handleWebSocketMessage);

        return () => {
            websocket.removeEventListener('message', handleWebSocketMessage);
        };
    }, [websocket, iframeRef, sendToIframe, selectedElement]);

    // ========================================================================
    // Keyboard Shortcuts
    // ========================================================================

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            // Option/Alt + D to toggle design mode
            if (event.altKey && event.key.toLowerCase() === 'd') {
                event.preventDefault();
                toggleDesignMode();
            }

            // Ctrl/Cmd + Z for undo (when design mode is active)
            if (isEnabled && (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'z') {
                if (event.shiftKey) {
                    // Redo
                    if (canRedo) {
                        event.preventDefault();
                        redo();
                    }
                } else {
                    // Undo
                    if (canUndo) {
                        event.preventDefault();
                        undo();
                    }
                }
            }

            // Escape to clear selection
            if (isEnabled && event.key === 'Escape' && selectedElement) {
                event.preventDefault();
                clearSelection();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isEnabled, toggleDesignMode, canUndo, canRedo, undo, redo, selectedElement, clearSelection]);

    // ========================================================================
    // Return
    // ========================================================================

    return useMemo(() => ({
        isEnabled,
        toggleDesignMode,
        enableDesignMode,
        disableDesignMode,
        selectedElement,
        hoveredElement,
        previewStyle,
        clearPreview,
        applyStyle,
        applyStyles,
        sendAIPrompt,
        goToCode,
        undo,
        redo,
        canUndo,
        canRedo,
        clearSelection,
        updateText,
        previewText: updateText,
        commitText: async (text: string) => {
            if (!selectedElement) return;
            const oldText = selectedElement.textContent || '';
            await handleTextChange(oldText, text);
        },
        isSyncing,
        syncError,
        hasPendingChanges,
        refreshPreview,
        uploadImage,
        isUploadingImage,
        imageUploadProgress,
    }), [
        isEnabled,
        toggleDesignMode,
        enableDesignMode,
        disableDesignMode,
        selectedElement,
        hoveredElement,
        previewStyle,
        clearPreview,
        applyStyle,
        applyStyles,
        sendAIPrompt,
        goToCode,
        undo,
        redo,
        canUndo,
        canRedo,
        clearSelection,
        updateText,
        isSyncing,
        syncError,
        hasPendingChanges,
        refreshPreview,
        handleTextChange,
        uploadImage,
        isUploadingImage,
        imageUploadProgress,
    ]);
}
