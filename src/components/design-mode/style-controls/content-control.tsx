/**
 * Content Control
 * Editable text content for text elements
 * Real-time preview on input, save on Enter/blur
 */

import { useState, useCallback, useEffect, useRef } from 'react';

export interface ContentControlProps {
    textContent: string;
    onTextChange: (text: string) => void;
    onTextCommit: (text: string) => void;
}

export function ContentControl({
    textContent,
    onTextChange,
    onTextCommit,
}: ContentControlProps) {
    const [localValue, setLocalValue] = useState(textContent);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Sync with external changes
    useEffect(() => {
        setLocalValue(textContent);
    }, [textContent]);

    // Auto-resize textarea
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
        }
    }, [localValue]);

    const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const newValue = e.target.value;
        setLocalValue(newValue);
        // Real-time preview
        onTextChange(newValue);
    }, [onTextChange]);

    const handleCommit = useCallback(() => {
        if (localValue !== textContent) {
            onTextCommit(localValue);
        }
    }, [localValue, textContent, onTextCommit]);

    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleCommit();
        }
    }, [handleCommit]);

    return (
        <div className="space-y-1">
            <label className="block text-xs text-text-primary/60">Content</label>
            <textarea
                ref={textareaRef}
                value={localValue}
                onChange={handleChange}
                onBlur={handleCommit}
                onKeyDown={handleKeyDown}
                placeholder="Enter text content..."
                className="w-full px-3 py-2 text-sm bg-bg-3 border border-text/10 rounded-md text-text-primary placeholder:text-text-primary/40 focus:outline-none focus:border-accent resize-none overflow-hidden min-h-[60px]"
                rows={2}
            />
            <p className="text-xs text-text-primary/40">
                Press Enter or click away to save
            </p>
        </div>
    );
}
