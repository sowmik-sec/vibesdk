/**
 * Design Mode Toggle
 * Toggle button for enabling/disabling design mode
 */

import { Paintbrush } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface DesignModeToggleProps {
    isEnabled: boolean;
    onToggle: () => void;
    className?: string;
}

export function DesignModeToggle({ isEnabled, onToggle, className }: DesignModeToggleProps) {
    return (
        <Button
            variant={isEnabled ? 'default' : 'ghost'}
            size="sm"
            onClick={onToggle}
            className={cn(
                'gap-1.5 transition-all',
                isEnabled && 'bg-accent hover:bg-accent/90 text-white',
                className
            )}
            title="Toggle Design Mode (Option+D)"
        >
            <Paintbrush className="size-4" />
            <span className="hidden sm:inline">Design</span>
        </Button>
    );
}
