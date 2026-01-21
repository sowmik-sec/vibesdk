import { defineConfig } from 'tsup';

export default defineConfig([
    // Main ESM entry with types
    {
        entry: ['src/index.ts'],
        format: ['esm'],
        dts: true,
        clean: true,
        outDir: 'dist',
        sourcemap: true,
    },
    // Client script as IIFE for injection
    {
        entry: ['src/client.ts'],
        format: ['iife'],
        outDir: 'dist',
        outExtension: () => ({ js: '.iife.js' }),
        globalName: 'VibeSDKDesignMode',
        minify: true,
        sourcemap: false,
        // react-grab is loaded dynamically at runtime from user's project
        external: ['react-grab', 'react-grab/core'],
    },
]);
