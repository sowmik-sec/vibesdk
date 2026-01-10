/**
 * Design Mode Module
 * Re-exports all design mode functionality
 */

// Protocol & Types
export * from './design-mode-protocol';

// Tailwind utilities
export * from './tailwind-utils';

// Client script (for injection)
export {
    initDesignModeClient,
    cleanupDesignModeClient,
    getDesignModeClientScript,
} from './design-mode-client';
