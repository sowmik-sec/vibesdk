/**
 * @vibesdk/design-mode-client
 * 
 * Unified design mode client package for VibeSDK.
 * Provides both the injectable client script and shared types.
 */

// Re-export all types and constants from protocol
export * from './protocol';

/**
 * Get the client script as a string for injection into HTML.
 * 
 * This function re-exports from the embedded module which contains
 * the built and minified IIFE script.
 * 
 * @example
 * ```typescript
 * import { getClientScript } from '@vibesdk/design-mode-client';
 * 
 * const script = getClientScript();
 * html = html.replace('</head>', `<script>${script}</script></head>`);
 * ```
 */
export function getClientScript(): string {
	// This is a runtime re-export - the actual script is loaded from embedded.js
	// For bundlers that support dynamic imports, this will work at runtime
	// For workers, import directly from '@vibesdk/design-mode-client/embedded'
	throw new Error(
		'getClientScript() should be imported from "@vibesdk/design-mode-client/embedded" ' +
		'which is generated after build. Run "bun run build" in the package first.'
	);
}
