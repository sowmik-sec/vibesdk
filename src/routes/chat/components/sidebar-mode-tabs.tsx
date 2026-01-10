/**
 * Sidebar Mode Tabs
 * Vertical tab bar for switching between Chat and Design modes
 * Matches v0's sidebar navigation pattern
 */

import { MessageCircle, Paintbrush } from 'lucide-react';
import { cn } from '@/lib/utils';

export type SidebarMode = 'chat' | 'design';

interface SidebarModeTabsProps {
    mode: SidebarMode;
    onModeChange: (mode: SidebarMode) => void;
    disabled?: boolean;
}

interface TabButtonProps {
    icon: React.ReactNode;
    label: string;
    isActive: boolean;
    onClick: () => void;
    disabled?: boolean;
}

function TabButton({ icon, label, isActive, onClick, disabled }: TabButtonProps) {
    return (
        <button
            onClick={onClick}
            disabled={disabled}
            className={cn(
                "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all",
                "hover:bg-bg-2/80",
                isActive
                    ? "bg-bg-2 text-text-primary"
                    : "text-text-primary/60 hover:text-text-primary",
                disabled && "opacity-50 cursor-not-allowed"
            )}
        >
            {icon}
            <span>{label}</span>
        </button>
    );
}

export function SidebarModeTabs({ mode, onModeChange, disabled }: SidebarModeTabsProps) {
    return (
        <div className="flex items-center gap-1 p-2 border-b border-text/10">
            <TabButton
                icon={<MessageCircle className="size-4" />}
                label="Chat"
                isActive={mode === 'chat'}
                onClick={() => onModeChange('chat')}
                disabled={disabled}
            />
            <TabButton
                icon={<Paintbrush className="size-4" />}
                label="Design"
                isActive={mode === 'design'}
                onClick={() => onModeChange('design')}
                disabled={disabled}
            />
        </div>
    );
}
