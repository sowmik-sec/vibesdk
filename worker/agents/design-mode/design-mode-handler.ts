/**
 * Design Mode Handler
 * Backend handler for design mode operations including style updates,
 * AI prompts, and code location mapping.
 */

import * as path from 'path';
import type { Connection } from 'agents';
import type { ICodingAgent } from '../services/interfaces/ICodingAgent';
import type {
    DesignModeStyleUpdateRequest,
    DesignModeStyleChange,
    DesignModeAIPromptRequest,
    DesignModeTextUpdateRequest,
    DesignModeGoToCodeRequest,
    DesignModeImageUploadRequest,
} from '../../api/websocketTypes';
import { StructuredLogger } from '../../logger';

// ============================================================================
// Types
// ============================================================================

interface StyleUpdateResult {
    success: boolean;
    filePath?: string;
    error?: string;
}

interface CodeLocation {
    filePath: string;
    lineNumber: number;
    columnNumber?: number;
}

// ============================================================================
// Path Normalization Helper
// ============================================================================

/**
 * Normalize file paths from React Fiber debug sources to sandbox-compatible paths.
 * React Fiber paths look like: /workspace/i-xxx-uuid/src/components/Button.tsx
 * Sandbox expects relative paths like: src/components/Button.tsx
 */
function normalizeFilePath(filePath: string): string {
    if (!filePath) return filePath;

    // Remove container workspace prefix: /workspace/i-xxx/src/... → src/...
    // The instance ID pattern is: i-[uuid]
    const workspaceMatch = filePath.match(/\/workspace\/i-[a-f0-9-]+\/(.+)/);
    if (workspaceMatch) {
        return workspaceMatch[1];
    }

    // Try more general workspace pattern
    const generalWorkspaceMatch = filePath.match(/\/workspace\/[^\/]+\/(.+)/);
    if (generalWorkspaceMatch) {
        return generalWorkspaceMatch[1];
    }

    // Also handle paths like /app/src/... or just /src/...
    if (filePath.match(/^\/app\//)) {
        return filePath.substring(5); // Remove /app/
    }

    // Remove leading slash if it's already a src path
    if (filePath.startsWith('/src/')) {
        return filePath.substring(1);
    }

    // Already relative or unrecognized format
    return filePath;
}

// ============================================================================
// Style Update Handler
// ============================================================================

/**
 * Handle style update requests from design mode.
 * This modifies the source file to apply the visual changes.
 */
export async function handleDesignModeStyleUpdate(
    agent: ICodingAgent,
    connection: Connection,
    request: DesignModeStyleUpdateRequest,
    logger: StructuredLogger
): Promise<void> {
    const { selector, filePath, changes, textContent, sourceLocation, skipDeploy, className } = request;

    // console.log('[DESIGN_MODE] === STYLE UPDATE REQUEST RECEIVED ===');
    // console.log('[DESIGN_MODE] Selector:', selector);
    // console.log('[DESIGN_MODE] FilePath:', filePath || '(empty)');
    // console.log('[DESIGN_MODE] SourceLocation:', JSON.stringify(sourceLocation) || '(none)');
    // console.log('[DESIGN_MODE] TextContent:', textContent?.slice(0, 50) || '(none)');
    // console.log('[DESIGN_MODE] Changes:', JSON.stringify(changes, null, 2));

    logger.info('Design mode style update', {
        selector,
        filePath,
        sourceLocation: sourceLocation ? { filePath: sourceLocation.filePath, lineNumber: sourceLocation.lineNumber } : null,
        changesCount: changes.length,
        hasText: !!textContent,
        changes: changes.map(c => ({ property: c.property, oldValue: c.oldValue, newValue: c.newValue }))
    });


    try {
        // If we don't have a file path, we need to find it
        // Normalize the path to convert container paths (/workspace/i-xxx/...) to relative paths (src/...)


        let rawFilePath: string | null | undefined = filePath;
        if (!filePath) {
            // console.log('[DESIGN_MODE] No file path provided, searching...');
            // console.log('[DESIGN_MODE] className:', className);
            // console.log('[DESIGN_MODE] tailwindClasses:', tailwindClasses);
            rawFilePath = await findFileForSelector(agent, selector, logger, textContent, className);
            // console.log('[DESIGN_MODE] Search result:', rawFilePath);
        }
        const targetFilePath = rawFilePath ? normalizeFilePath(rawFilePath) : null;



        if (!targetFilePath) {
            sendStyleUpdateResponse(connection, {
                success: false,
                selector,
                error: 'Could not determine file path for element',
            });
            return;
        }

        // Apply style changes deterministically (no AI involved)
        const result = await applyStyleChanges(
            agent,
            targetFilePath,
            selector,
            changes,
            textContent,
            sourceLocation,
            className,
            logger,
            skipDeploy
        );

        sendStyleUpdateResponse(connection, {
            success: result.success,
            selector,
            filePath: targetFilePath,
            error: result.error,
        });
    } catch (error) {
        logger.error('Failed to handle style update', {
            error: error instanceof Error ? error.message : 'Unknown error',
            selector,
        });

        sendStyleUpdateResponse(connection, {
            success: false,
            selector,
            error: error instanceof Error ? error.message : 'Failed to apply style changes',
        });
    }
}

/**
 * Send style update response to the client
 */
function sendStyleUpdateResponse(
    connection: Connection,
    response: {
        success: boolean;
        selector: string;
        filePath?: string;
        error?: string;
    }
): void {
    connection.send(JSON.stringify({
        type: 'design_mode_style_updated',
        ...response,
    }));
}

/**
 * Find the source file that contains the element with the given selector.
 * Uses direct file content search through FileManager instead of grep in sandbox.
 */
async function findFileForSelector(
    agent: ICodingAgent,
    selector: string,
    _logger: StructuredLogger,
    textContent?: string,
    className?: string
): Promise<string | null> {
    // Use console.log with distinct prefix for easy filtering


    // Get all files from FileManager (in memory, fast)
    const allFiles = agent.listFiles();
    // console.log('[DESIGN_MODE] Total files in FileManager:', allFiles.length);

    // Filter to only React component files
    const componentFiles = allFiles.filter(f =>
        (f.filePath.endsWith('.tsx') || f.filePath.endsWith('.jsx')) &&
        !f.filePath.includes('node_modules')
    );
    // console.log('[DESIGN_MODE] Component files to search:', componentFiles.length);

    if (componentFiles.length === 0) {
        // console.log('[DESIGN_MODE] No component files found!');
        return null;
    }

    // 1. Try to find by Text Content (High Confidence for Labels/Buttons)
    if (textContent && textContent.length > 3 && textContent.length < 100) {
        const cleanText = textContent.trim();
        // console.log('[DESIGN_MODE] Searching by text content:', cleanText);

        for (const file of componentFiles) {
            // Check if file content contains the text
            if (file.fileContents && file.fileContents.includes(cleanText)) {
                // console.log('[DESIGN_MODE] Found file by text content:', file.filePath);
                return file.filePath;
            }
        }
        // console.log('[DESIGN_MODE] Text content not found in any file');
    }

    // 2. Try to find by className (from element's actual classes)
    // This is crucial for dynamically rendered content where text isn't in source
    if (className && className.length > 0) {
        const classNames = className.split(/\s+/).filter(c => c.length > 0);

        // First, look for highly specific/unique classes
        const highPriorityClasses = classNames.filter(c =>
            c.includes('gradient') ||
            c.includes('display') ||
            c.includes('hero') ||
            c.includes('heading') ||
            c.includes('title') ||
            c.includes('tabular') || // e.g., tabular-nums
            c.includes('balance') || // e.g., text-balance
            (c.startsWith('font-') && !['font-normal', 'font-medium', 'font-bold'].includes(c))
        );

        // Then, filter out very common/generic layout classes
        const genericPrefixes = ['flex', 'grid', 'block', 'hidden', 'relative', 'absolute', 'w-', 'h-', 'p-', 'm-', 'items-', 'justify-', 'gap-', 'space-'];
        const genericExact = ['flex', 'grid', 'block', 'hidden', 'relative', 'absolute', 'inline', 'inline-block', 'inline-flex', 'container', 'wrapper'];

        const otherUniqueClasses = classNames.filter(c => {
            // Skip exact matches to generic classes
            if (genericExact.includes(c)) return false;
            // Skip if it's a common utility prefix
            for (const generic of genericPrefixes) {
                if (c.startsWith(generic)) return false;
            }
            // Already in high priority list
            if (highPriorityClasses.includes(c)) return false;
            // Prefer classes with specific names (not just numbers/sizes)
            return c.length > 3;
        });

        // Combine: high priority first, then other unique
        const uniqueClasses = [...highPriorityClasses, ...otherUniqueClasses];
        // console.log('[DESIGN_MODE] Searching by element className:', uniqueClasses.slice(0, 5));

        // Search for unique classes in files
        for (const cls of uniqueClasses) {
            for (const file of componentFiles) {
                if (file.fileContents && file.fileContents.includes(cls)) {
                    // console.log('[DESIGN_MODE] Found file by className:', file.filePath, 'class:', cls);
                    return file.filePath;
                }
            }
        }
        // console.log('[DESIGN_MODE] No unique class found in any file');
    }

    // 3. Try to find by unique ID if present
    const idMatch = selector.match(/#([a-zA-Z0-9_-]+)/);
    if (idMatch && idMatch[1] !== 'root') {
        const id = idMatch[1];
        // console.log('[DESIGN_MODE] Searching by ID:', id);

        // Search for id="value" or id='value' or id={...}
        const idPatterns = [
            `id="${id}"`,
            `id='${id}'`,
            `id={"${id}"}`,
        ];

        for (const file of componentFiles) {
            if (file.fileContents) {
                for (const pattern of idPatterns) {
                    if (file.fileContents.includes(pattern)) {
                        // console.log('[DESIGN_MODE] Found file by ID:', file.filePath);
                        return file.filePath;
                    }
                }
            }
        }
        // console.log('[DESIGN_MODE] ID not found in any file');
    }

    // 4. Try to find by class name from selector (legacy - less useful without classes in selector)
    const classMatches = selector.match(/\.([a-zA-Z0-9_-]+)/g);
    if (classMatches && classMatches.length > 0) {
        // Use the last specific class (often the most unique)
        const selectorClassName = classMatches[classMatches.length - 1].substring(1);
        const genericClasses = ['flex', 'grid', 'block', 'hidden', 'container', 'wrapper', 'relative', 'absolute'];

        if (!genericClasses.includes(selectorClassName)) {
            // console.log('[DESIGN_MODE] Searching by selector class name:', selectorClassName);

            for (const file of componentFiles) {
                if (file.fileContents && file.fileContents.includes(selectorClassName)) {
                    // console.log('[DESIGN_MODE] Found file by selector class name:', file.filePath);
                    return file.filePath;
                }
            }
            // console.log('[DESIGN_MODE] Selector class name not found in any file');
        }
    }

    // 5. Fallback: Try to find by tag name from selector
    const tagMatch = selector.match(/^([a-z]+)/i);
    if (tagMatch) {
        const tagName = tagMatch[1].toLowerCase();
        // console.log('[DESIGN_MODE] Searching by tag name:', tagName);

        // Look for JSX tags like <h1>, <button>, <label>, etc.
        const tagPattern = `<${tagName}`;

        for (const file of componentFiles) {
            if (file.fileContents && file.fileContents.toLowerCase().includes(tagPattern)) {
                // console.log('[DESIGN_MODE] Found file by tag name:', file.filePath);
                return file.filePath;
            }
        }
    }

    // 6. Last resort: If only one component file exists, use it
    if (componentFiles.length === 1) {
        // console.log('[DESIGN_MODE] Only one component file, using it:', componentFiles[0].filePath);
        return componentFiles[0].filePath;
    }

    // 7. If we have an App.tsx or main component, use that as default
    const mainFiles = ['src/App.tsx', 'src/App.jsx', 'app/page.tsx', 'app/page.jsx'];
    for (const mainFile of mainFiles) {
        const found = componentFiles.find(f => f.filePath === mainFile);
        if (found) {
            // console.log('[DESIGN_MODE] Using main component file as fallback:', found.filePath);
            return found.filePath;
        }
    }

    // console.log('[DESIGN_MODE] Could not find file for selector');
    return null;
}


/**
 * Apply style changes to the source file DETERMINISTICALLY
 * No AI involved - directly modifies the source code
 */
async function applyStyleChanges(
    agent: ICodingAgent,
    filePath: string,
    selector: string,
    changes: DesignModeStyleChange[],
    textContent: string | undefined,
    sourceLocation: { filePath: string; lineNumber: number; columnNumber?: number } | undefined,
    className: string | undefined,
    logger: StructuredLogger,
    skipDeploy?: boolean
): Promise<StyleUpdateResult> {


    logger.info('Applying style changes deterministically', {
        filePath,
        selector,
        changesCount: changes.length,
        lineNumber: sourceLocation?.lineNumber,
        hasClassName: !!className,
    });

    try {
        // 1. Read the current file content
        const files = agent.listFiles();
        const file = files.find(f => f.filePath === filePath);

        if (!file || !file.fileContents) {
            return {
                success: false,
                filePath,
                error: `File not found: ${filePath}`,
            };
        }

        const originalContent = file.fileContents;

        // 2. Import and use the deterministic style modifier
        const { applyStyleChangesToSource, applyInlineStylesToSource } = await import('./style-modifier');

        // 3. Try Tailwind-based modification first
        const options = {
            textContent,
            selector,
            lineNumber: sourceLocation?.lineNumber,
            className, // For finding elements with dynamic content
        };
        // console.log('[DESIGN_MODE] Element location options:', options);
        let result = applyStyleChangesToSource(originalContent, changes, options);

        // 4. If Tailwind failed, try inline styles
        if (result.applied.length === 0 && result.failed.length > 0) {
            // console.log('[DESIGN_MODE] Tailwind modification failed, trying inline styles');
            result = applyInlineStylesToSource(originalContent, changes, options);
        }

        // 5. Check if any changes were actually applied
        if (result.applied.length === 0) {
            // console.log('[DESIGN_MODE] No changes applied:', result.failed);
            return {
                success: false,
                filePath,
                error: `Failed to apply styles: ${result.failed.join(', ')}`,
            };
        }

        // console.log('[DESIGN_MODE] Style changes applied:', {
        //     applied: result.applied,
        //     failed: result.failed
        // });

        // 6. Save the modified file
        const modifiedFile = {
            filePath,
            fileContents: result.modified,
            filePurpose: file.filePurpose || ''
        };

        // Use the agent's file saving mechanism
        const saveResult = await agent.saveFile(filePath, modifiedFile.fileContents, `style: design mode update to ${path.basename(filePath)}`);

        if (!saveResult.success) {
            console.error('[DESIGN_MODE] Failed to save file:', saveResult.error);
        }

        // 7. Deploy to sandbox to update the preview
        const deployToSandbox = (agent as any).deployToSandbox;
        if (deployToSandbox && !skipDeploy) {
            // console.log('[DESIGN_MODE] Deploying updated file to sandbox (Optimistic)');
            // Pass optimistic: true to skip strict health check for faster updates
            // We cast to any because the interface might not update in runtime immediately or generic type issues
            await (agent as any).deployToSandbox(
                [modifiedFile],
                false,
                `style: design mode update to ${filePath}`,
                false, // clearLogs
                undefined, // callbacks
                true // optimistic
            );
        } else if (skipDeploy) {
            // console.log('[DESIGN_MODE] Skipping deployment as requested (saved only)');
        }

        logger.info('Style changes applied successfully', {
            filePath,
            applied: result.applied,
            failed: result.failed
        });

        return {
            success: true,
            filePath,
        };
    } catch (error) {
        console.error('[DESIGN_MODE] Error applying style changes:', error);
        return {
            success: false,
            filePath,
            error: error instanceof Error ? error.message : 'Unknown error',
        };
    }
}


// ============================================================================
// AI Prompt Handler
// ============================================================================

/**
 * Handle AI-powered element modification requests
 */
export async function handleDesignModeAIPrompt(
    agent: ICodingAgent,
    connection: Connection,
    request: DesignModeAIPromptRequest,
    logger: StructuredLogger
): Promise<void> {
    const { prompt, elementContext } = request;
    const { selector, filePath, currentStyles, className } = elementContext;

    logger.info('Design mode AI prompt', {
        prompt,
        selector,
        filePath,
    });

    try {
        // Normalize the path to convert container paths to relative paths
        const rawFilePath = filePath || await findFileForSelector(agent, selector, logger);
        const targetFilePath = rawFilePath ? normalizeFilePath(rawFilePath) : null;

        if (!targetFilePath) {
            connection.send(JSON.stringify({
                type: 'error',
                message: 'Could not determine file path for element',
            }));
            return;
        }

        // Create a context-rich prompt for the AI
        const issues = [
            `User request for element "${selector}": ${prompt}`,
            '',
            'Element context:',
            `- Selector: ${selector}`,
            `- Current classes: ${className || 'none'}`,
            `- Key computed styles:`,
            `  - color: ${currentStyles.color}`,
            `  - background: ${currentStyles.backgroundColor}`,
            `  - font-size: ${currentStyles.fontSize}`,
            `  - padding: ${currentStyles.paddingTop} ${currentStyles.paddingRight} ${currentStyles.paddingBottom} ${currentStyles.paddingLeft}`,
            '',
            'Instructions:',
            '- Apply the user\'s requested changes to this specific element',
            '- Use Tailwind utility classes when possible',
            '- Maintain the element\'s existing functionality',
            '- Keep changes focused on the specific element',
        ];

        const result = await agent.regenerateFileByPath(targetFilePath, issues);

        if ('error' in result) {
            connection.send(JSON.stringify({
                type: 'error',
                message: result.error,
            }));
            return;
        }

        // File was successfully modified
        connection.send(JSON.stringify({
            type: 'design_mode_style_updated',
            success: true,
            selector,
            filePath: targetFilePath,
        }));
    } catch (error) {
        logger.error('Failed to handle AI prompt', {
            error: error instanceof Error ? error.message : 'Unknown error',
        });

        connection.send(JSON.stringify({
            type: 'error',
            message: error instanceof Error ? error.message : 'Failed to process AI request',
        }));
    }
}

// ============================================================================
// Text Update Handler
// ============================================================================
/**
 * Handle text content update requests
 * Uses DIRECT string replacement - no AI involved for fast, deterministic updates
 */
export async function handleDesignModeTextUpdate(
    agent: ICodingAgent,
    connection: Connection,
    request: DesignModeTextUpdateRequest,
    logger: StructuredLogger
): Promise<void> {
    const { selector, filePath, oldText, newText } = request;
    const sourceLocation = (request as any).sourceLocation;

    logger.info('Design mode text update (direct replacement)', {
        selector,
        filePath,
        sourceLocation,
        oldTextLength: oldText?.length || 0,
        newTextLength: newText?.length || 0,
    });

    // Validate inputs
    if (!oldText || !newText) {
        connection.send(JSON.stringify({
            type: 'design_mode_style_updated',
            success: false,
            selector,
            error: 'Missing oldText or newText',
        }));
        return;
    }

    try {
        // 1. Normalize the file path
        const rawFilePath = filePath || sourceLocation?.filePath || await findFileForSelector(agent, selector, logger, oldText);
        const targetFilePath = rawFilePath ? normalizeFilePath(rawFilePath) : null;

        if (!targetFilePath) {
            logger.error('Could not determine file path for text update', { selector, filePath, sourceLocation });
            connection.send(JSON.stringify({
                type: 'design_mode_style_updated',
                success: false,
                selector,
                error: 'Could not determine file path for element',
            }));
            return;
        }

        logger.info('Text update target file', { targetFilePath });

        // 2. Get the current file content
        const file = (agent as any).fileManager?.getGeneratedFile(targetFilePath);
        if (!file || !file.fileContents) {
            logger.error('File not found in generated files', { targetFilePath });
            connection.send(JSON.stringify({
                type: 'design_mode_style_updated',
                success: false,
                selector,
                error: `File not found: ${targetFilePath}`,
            }));
            return;
        }

        const originalContent = file.fileContents;

        // 3. Check if the old text exists in the file
        if (!originalContent.includes(oldText)) {
            logger.warn('Old text not found in file', {
                targetFilePath,
                oldTextPreview: oldText.slice(0, 50),
                searchingFor: oldText
            });
            connection.send(JSON.stringify({
                type: 'design_mode_style_updated',
                success: false,
                selector,
                error: 'Could not find the original text in the source file. The text may be dynamic.',
            }));
            return;
        }

        // 4. Context-aware string replacement
        // Instead of naive replace(), we try to find the "content" occurrence

        let replacementIndex = -1;
        let matchLength = 0;

        // Dynamic import of style modifier helpers
        const { findElementBySelector, findElementByLineNumber } = await import('./style-modifier');

        // Try to narrow search scope
        let searchStart = 0;

        // Strategy 1: Use Line Number from React-Grab (High Precision)
        if (sourceLocation?.lineNumber) {
            const location = findElementByLineNumber(originalContent, sourceLocation.lineNumber);
            if (location) {
                // Start searching after the opening tag (where content would be)
                searchStart = location.end;
                logger.info('Text update: narrowed search scope using line number', { lineNumber: sourceLocation.lineNumber, searchStart });
            }
        }

        // Strategy 2: Use Selector (Medium Precision) - if line number failed or missing
        if (searchStart === 0 && selector) {
            const location = findElementBySelector(originalContent, selector);
            if (location) {
                searchStart = location.end;
                logger.info('Text update: narrowed search scope using selector', { selector, searchStart });
            }
        }

        // Helper to check if a match is "safe" (looks like content or string literal, not code identifier)
        const isSafeMatch = (index: number): boolean => {
            // Check previous character (ignoring whitespace)
            let i = index - 1;
            while (i >= 0 && /\s/.test(originalContent[i])) i--;
            const prevChar = originalContent[i];

            // Check next character (ignoring whitespace)
            let j = index + oldText.length;
            while (j < originalContent.length && /\s/.test(originalContent[j])) j++;
            const nextChar = originalContent[j];

            // Safety Heuristics:

            // 1. It is a JSX Text Node if preceded by '>'
            if (prevChar === '>') return true;

            // 2. It is a String Literal if surrounded by quotes
            if ((prevChar === '"' || prevChar === "'") && (nextChar === '"' || nextChar === "'")) return true;

            // 3. It is UNSAFE if followed by ':' (Object key / Type definition)
            if (nextChar === ':') return false;

            // 4. It is UNSAFE if preceded by '.' (Property access)
            if (prevChar === '.') return false;

            // 5. It is UNSAFE if part of a longer identifier (preceded/followed by word chars)
            // e.g. "completed" in "task.completed()" or "uncompleted"
            const isWordChar = (char: string) => /[a-zA-Z0-9_]/.test(char);
            if (isWordChar(originalContent[index - 1] || '') || isWordChar(originalContent[index + oldText.length] || '')) {
                return false;
            }

            // Fallback: If strict checks pass (not unsafe), assume acceptable
            return true;
        };

        // Search for occurrences starting from restricted scope
        let pos = originalContent.indexOf(oldText, searchStart);

        // If not found in restricted scope, try global (unless searchStart was 0)
        if (pos === -1 && searchStart > 0) {
            pos = originalContent.indexOf(oldText, 0);
        }

        // Iterate through matches to find a safe one
        while (pos !== -1) {
            if (isSafeMatch(pos)) {
                replacementIndex = pos;
                matchLength = oldText.length;
                break;
            }
            pos = originalContent.indexOf(oldText, pos + 1);
        }

        if (replacementIndex === -1) {
            // If we couldn't find a "safe" match, check if we should force identifying the UNSAFE one for debugging
            // or just fail. Failing is safer than corrupting code.
            logger.warn('No safe text occurrence found to replace', { targetFilePath, oldText, selector });
            connection.send(JSON.stringify({
                type: 'design_mode_style_updated',
                success: false,
                selector,
                error: 'Could not find a safe content match for replacement. The text might be generated dynamically or is an identifier.',
            }));
            return;
        }

        const updatedContent = originalContent.slice(0, replacementIndex) + newText + originalContent.slice(replacementIndex + matchLength);

        if (updatedContent === originalContent) {
            logger.warn('No changes made to file', { targetFilePath });
            connection.send(JSON.stringify({
                type: 'design_mode_style_updated',
                success: true,
                selector,
                filePath: targetFilePath,
            }));
            return;
        }

        logger.info('Text replacement successful', {
            targetFilePath,
            contentLengthBefore: originalContent.length,
            contentLengthAfter: updatedContent.length,
        });

        // 5. Save the modified file
        const modifiedFile = {
            filePath: targetFilePath,
            fileContents: updatedContent,
            filePurpose: file.filePurpose || ''
        };

        const saveFiles = (agent as any).fileManager?.saveGeneratedFile;
        if (saveFiles) {
            await (agent as any).fileManager.saveGeneratedFile(modifiedFile, `text: inline edit in ${targetFilePath}`);
            logger.info('File saved successfully', { targetFilePath });
        } else {
            logger.error('FileManager not accessible');
            connection.send(JSON.stringify({
                type: 'design_mode_style_updated',
                success: false,
                selector,
                error: 'FileManager not accessible',
            }));
            return;
        }

        // 6. Deploy to sandbox: SKIP for text updates
        // The client already updated the DOM optimistically.
        // We just save the file for persistence.
        /*
        const deployToSandbox = (agent as any).deployToSandbox;
        if (deployToSandbox) {
            logger.info('Deploying updated file to sandbox');
            try {
                await deployToSandbox([modifiedFile]);
            } catch (deployError) {
                logger.warn('Deploy to sandbox failed', {
                    error: deployError instanceof Error ? deployError.message : 'Unknown'
                });
                // Continue anyway - the file is saved
            }
        }
        */

        // 7. Send success response
        connection.send(JSON.stringify({
            type: 'design_mode_style_updated',
            success: true,
            selector,
            filePath: targetFilePath,
        }));

    } catch (error) {
        logger.error('Failed to handle text update', {
            error: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : undefined,
        });

        connection.send(JSON.stringify({
            type: 'design_mode_style_updated',
            success: false,
            selector,
            error: error instanceof Error ? error.message : 'Failed to update text',
        }));
    }
}

// ============================================================================
// Go to Code Handler
// ============================================================================

/**
 * Handle "Go to Code" requests - find the source location of an element
 */
export async function handleDesignModeGoToCode(
    agent: ICodingAgent,
    connection: Connection,
    request: DesignModeGoToCodeRequest,
    logger: StructuredLogger
): Promise<void> {
    const { selector, filePath } = request;

    logger.info('Design mode go to code', { selector, filePath });

    try {
        const location = await findCodeLocation(agent, selector, filePath, logger);

        if (location) {
            connection.send(JSON.stringify({
                type: 'design_mode_code_location',
                ...location,
            }));
        } else {
            connection.send(JSON.stringify({
                type: 'error',
                message: 'Could not find code location for element',
            }));
        }
    } catch (error) {
        logger.error('Failed to find code location', {
            error: error instanceof Error ? error.message : 'Unknown error',
        });

        connection.send(JSON.stringify({
            type: 'error',
            message: error instanceof Error ? error.message : 'Failed to find code location',
        }));
    }
}

/**
 * Find the source code location for an element
 */
async function findCodeLocation(
    agent: ICodingAgent,
    selector: string,
    filePath: string | undefined,
    logger: StructuredLogger
): Promise<CodeLocation | null> {
    // If we have a file path hint, use it (after normalization)
    if (filePath) {
        const normalizedPath = normalizeFilePath(filePath);
        // Try to find the element within this file
        // This would need access to the file system to search for the selector
        logger.debug('Would search in file', { filePath: normalizedPath, selector });

        // For now, return a placeholder - actual implementation would parse the file
        return {
            filePath: normalizedPath,
            lineNumber: 1, // Would be calculated from actual search
        };
    }

    // Without a file path, we need to search the project
    const targetFilePath = await findFileForSelector(agent, selector, logger);

    if (targetFilePath) {
        return {
            filePath: targetFilePath,
            lineNumber: 1,
        };
    }

    return null;
}

// ============================================================================
// Image Upload Handler
// ============================================================================

/** In-memory buffer for chunked uploads */
const uploadBuffers = new Map<string, {
    chunks: string[];
    fileName: string;
    mimeType: string;
    totalChunks: number;
    receivedChunks: number;
    selector: string;
    sourceLocation?: { filePath: string; lineNumber: number; columnNumber?: number };
    isBackgroundImage?: boolean;
}>();

/**
 * Handle image upload requests from design mode.
 * Supports chunked uploads for large files.
 */
export async function handleDesignModeImageUpload(
    agent: ICodingAgent,
    connection: Connection,
    request: DesignModeImageUploadRequest,
    logger: StructuredLogger
): Promise<void> {
    const {
        uploadId,
        fileName,
        mimeType,
        chunk,
        chunkIndex,
        totalChunks,
        selector,
        sourceLocation,
        isBackgroundImage,
    } = request;

    logger.info('Design mode image upload chunk received', {
        uploadId,
        fileName,
        mimeType,
        chunkIndex,
        totalChunks,
        selector,
    });

    try {
        // Initialize or get existing buffer
        let buffer = uploadBuffers.get(uploadId);
        if (!buffer) {
            buffer = {
                chunks: new Array(totalChunks).fill(''),
                fileName,
                mimeType,
                totalChunks,
                receivedChunks: 0,
                selector,
                sourceLocation,
                isBackgroundImage,
            };
            uploadBuffers.set(uploadId, buffer);
        }

        // Store chunk at correct index
        if (!buffer.chunks[chunkIndex]) {
            buffer.chunks[chunkIndex] = chunk;
            buffer.receivedChunks++;
        }

        // Check if all chunks received
        if (buffer.receivedChunks < buffer.totalChunks) {
            // Still waiting for more chunks, send progress
            connection.send(JSON.stringify({
                type: 'design_mode_image_uploaded',
                success: false,
                uploadId,
                error: `Receiving chunks: ${buffer.receivedChunks}/${buffer.totalChunks}`,
            }));
            return;
        }

        // All chunks received - reassemble and save
        const fullBase64 = buffer.chunks.join('');
        const imageBuffer = Uint8Array.from(atob(fullBase64), c => c.charCodeAt(0));

        // Generate unique file name to avoid collisions
        const timestamp = Date.now();
        const safeName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
        const uniqueFileName = `${timestamp}-${safeName}`;
        const assetPath = `public/assets/${uniqueFileName}`;

        // Convert Uint8Array to base64 string for file saving
        // The agent's saveFile expects string content
        // For binary files, we'll encode as base64 data URL
        const base64DataUrl = `data:${mimeType};base64,${fullBase64}`;

        // Note: This saves a data URL which works for img src directly
        // For production, you'd want proper binary file handling
        const saveResult = await agent.saveFile(
            assetPath,
            base64DataUrl,
            `feat: upload image ${fileName} via design mode`
        );

        // Clean up buffer
        uploadBuffers.delete(uploadId);

        if (!saveResult.success) {
            logger.error('Failed to save uploaded image', { error: saveResult.error });
            connection.send(JSON.stringify({
                type: 'design_mode_image_uploaded',
                success: false,
                uploadId,
                error: saveResult.error || 'Failed to save image',
            }));
            return;
        }

        // Update source code to use new image path
        const imagePath = `/assets/${uniqueFileName}`;

        if (sourceLocation) {
            const normalizedPath = normalizeFilePath(sourceLocation.filePath);

            // Read the file and update the image src
            const files = agent.listFiles();
            const file = files.find(f => f.filePath === normalizedPath);

            if (file && file.fileContents) {
                let updatedContent = file.fileContents;
                const lines = updatedContent.split('\n');
                const targetLine = lines[sourceLocation.lineNumber - 1];

                if (targetLine) {
                    if (isBackgroundImage) {
                        // Update background-image in style or className
                        // This is more complex and would need CSS class manipulation
                        logger.info('Background image update - would require style modification');
                    } else {
                        // Update img src attribute
                        const srcPattern = /src=["']([^"']*)["']/;
                        if (srcPattern.test(targetLine)) {
                            const newLine = targetLine.replace(srcPattern, `src="${imagePath}"`);
                            lines[sourceLocation.lineNumber - 1] = newLine;
                            updatedContent = lines.join('\n');

                            await agent.saveFile(
                                normalizedPath,
                                updatedContent,
                                `feat: update image src to ${imagePath}`
                            );
                        }
                    }
                }
            }
        }

        logger.info('Image uploaded successfully', {
            uploadId,
            imagePath,
            fileSize: imageBuffer.length,
        });

        connection.send(JSON.stringify({
            type: 'design_mode_image_uploaded',
            success: true,
            uploadId,
            imagePath,
        }));

    } catch (error) {
        logger.error('Failed to handle image upload', {
            error: error instanceof Error ? error.message : 'Unknown error',
            uploadId,
        });

        // Clean up buffer on error
        uploadBuffers.delete(uploadId);

        connection.send(JSON.stringify({
            type: 'design_mode_image_uploaded',
            success: false,
            uploadId,
            error: error instanceof Error ? error.message : 'Failed to upload image',
        }));
    }
}
