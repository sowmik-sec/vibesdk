/**
 * Design Mode Handler
 * Backend handler for design mode operations including style updates,
 * AI prompts, and code location mapping.
 */

import type { Connection } from 'agents';
import type { ICodingAgent } from '../services/interfaces/ICodingAgent';
import type {
    DesignModeStyleUpdateRequest,
    DesignModeStyleChange,
    DesignModeAIPromptRequest,
    DesignModeTextUpdateRequest,
    DesignModeGoToCodeRequest,
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
    const { selector, filePath, changes, textContent } = request;

    logger.info('Design mode style update', {
        selector,
        filePath,
        changesCount: changes.length,
        hasText: !!textContent
    });

    try {
        // If we don't have a file path, we need to find it
        // Normalize the path to convert container paths (/workspace/i-xxx/...) to relative paths (src/...)
        const rawFilePath = filePath || await findFileForSelector(agent, selector, logger, textContent);
        const targetFilePath = rawFilePath ? normalizeFilePath(rawFilePath) : null;

        logger.info('Design mode: normalized file path', {
            rawFilePath,
            targetFilePath,
        });

        if (!targetFilePath) {
            sendStyleUpdateResponse(connection, {
                success: false,
                selector,
                error: 'Could not determine file path for element',
            });
            return;
        }

        // Convert changes to code modification instructions
        const modifications = generateStyleModifications(changes);

        // Use the agent's regenerate capability to apply changes
        const result = await applyStyleChanges(
            agent,
            targetFilePath,
            selector,
            modifications,
            logger
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
 * Find the source file that contains the element with the given selector
 */
/**
 * Find the source file that contains the element with the given selector
 */
async function findFileForSelector(
    agent: ICodingAgent,
    selector: string,
    logger: StructuredLogger,
    textContent?: string
): Promise<string | null> {
    logger.debug('Searching for file containing selector', { selector, hasText: !!textContent });

    // 0. Try to find by Text Content (High Confidence for Labels/Buttons)
    if (textContent && textContent.length > 5 && textContent.length < 50) {
        // Clean text for grep (escape quotes)
        const cleanText = textContent.replace(/['"]/g, '.');
        try {
            // grep for text between tags or in props
            const cmd = `grep -l -r "${cleanText}" src app components`;
            const result = await agent.execCommands([cmd], false);
            if (result.results?.[0]?.exitCode === 0 && result.results?.[0]?.output) {
                const files = result.results[0].output.trim().split('\n');
                const validFile = files.find((f: string) => f.endsWith('.tsx') || f.endsWith('.jsx'));
                if (validFile) {
                    logger.info('Found file by Text Content', { text: textContent, file: validFile });
                    return validFile;
                }
            }
        } catch (e) {
            logger.warn('Failed to search by Text', { error: e });
        }
    }

    // 1. Try to find by unique ID if present
    const idMatch = selector.match(/#([a-zA-Z0-9_-]+)/);
    if (idMatch) {
        const id = idMatch[1];
        try {
            // Search for id="value" or id='value'
            const cmd = `grep -l -r "id=['\\"]${id}['\\"]" src app components`;
            const result = await agent.execCommands([cmd], false);
            if (result.results?.[0]?.exitCode === 0 && result.results?.[0]?.output) {
                const file = result.results[0].output.trim().split('\n')[0];
                logger.info('Found file by ID', { id, file });
                return file;
            }
        } catch (e) {
            logger.warn('Failed to search by ID', { error: e });
        }
    }

    // 2. Try to find by unique class name
    // Selector format: .className or tag.className
    const classMatches = selector.match(/\.([a-zA-Z0-9_-]+)/g);
    if (classMatches && classMatches.length > 0) {
        // Use the last specific class (often the most unique)
        const className = classMatches[classMatches.length - 1].substring(1);
        // Skip common generic classes
        if (!['flex', 'grid', 'bloack', 'block', 'hidden', 'container', 'wrapper'].includes(className)) {
            try {
                // Search for className containing the specific class
                const cmd = `grep -l -r "${className}" src app components`;
                const result = await agent.execCommands([cmd], false);
                if (result.results?.[0]?.exitCode === 0 && result.results?.[0]?.output) {
                    // Filter for tsx/jsx files
                    const files = result.results[0].output.trim().split('\n');
                    const validFile = files.find((f: string) => f.endsWith('.tsx') || f.endsWith('.jsx'));
                    if (validFile) {
                        logger.info('Found file by Class', { className, file: validFile });
                        return validFile;
                    }
                }
            } catch (e) {
                logger.warn('Failed to search by Class', { error: e });
            }
        }
    }

    return null;
}

/**
 * Generate code modification instructions from style changes
 */
function generateStyleModifications(changes: DesignModeStyleChange[]): string[] {
    const modifications: string[] = [];

    for (const change of changes) {
        if (change.tailwindClass) {
            // Tailwind class modification
            modifications.push(
                `Update Tailwind class: remove any existing class for ${change.property}, ` +
                `add "${change.tailwindClass}"`
            );
        } else if (change.useInlineStyle) {
            // Inline style modification
            modifications.push(
                `Update inline style: set ${change.property} to "${change.newValue}"`
            );
        } else {
            // Default to Tailwind class or inline style based on property
            modifications.push(
                `Update styling for ${change.property} from "${change.oldValue}" to "${change.newValue}". ` +
                `Use Tailwind classes (including arbitrary values like text-[${change.newValue}]) if applicable. ` +
                `If Tailwind cannot express this, use inline styles.`
            );
        }
    }

    return modifications;
}

/**
 * Apply style changes to the source file
 */
async function applyStyleChanges(
    agent: ICodingAgent,
    filePath: string,
    selector: string,
    modifications: string[],
    logger: StructuredLogger
): Promise<StyleUpdateResult> {
    logger.info('Applying style changes', {
        filePath,
        selector,
        modificationsCount: modifications.length,
    });

    // Create a detailed issue description for the regenerate tool
    const issues = [
        `Find the element matching selector "${selector}" and apply the following style changes:`,
        ...modifications.map((mod, i) => `${i + 1}. ${mod}`),
        '',
        'Important:',
        '- You MUST apply the requested changes.',
        '- Use Tailwind arbitrary values (e.g. text-[20px], p-[15px]) if standard classes don\'t match.',
        '- Fallback to inline styles (style={{ prop: "value" }}) ONLY if Tailwind cannot express the style.',
        '- Do NOT skip changes if you can\'t find a standard class.',
        '- Maintain existing classes and styles that are not being modified',
        '- If the exact element cannot be found, look for the closest matching element based on tag and context',
        '- Do not modify any functionality, only styling',
    ];

    try {
        const result = await agent.regenerateFileByPath(filePath, issues);

        if ('error' in result) {
            return {
                success: false,
                filePath,
                error: (result as { error: string }).error,
            };
        }

        return {
            success: true,
            filePath,
        };
    } catch (error) {
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
 */
export async function handleDesignModeTextUpdate(
    agent: ICodingAgent,
    connection: Connection,
    request: DesignModeTextUpdateRequest,
    logger: StructuredLogger
): Promise<void> {
    const { selector, filePath, oldText, newText } = request;

    logger.info('Design mode text update', {
        selector,
        filePath,
        oldTextLength: oldText.length,
        newTextLength: newText.length,
    });

    try {
        // Normalize the path to convert container paths to relative paths
        const rawFilePath = filePath || await findFileForSelector(agent, selector, logger);
        const targetFilePath = rawFilePath ? normalizeFilePath(rawFilePath) : null;

        if (!targetFilePath) {
            connection.send(JSON.stringify({
                type: 'design_mode_style_updated',
                success: false,
                selector,
                error: 'Could not determine file path for element',
            }));
            return;
        }

        // Create text update instruction
        const issues = [
            `Update text content in element "${selector}":`,
            `- Find the text "${oldText}"`,
            `- Replace it with "${newText}"`,
            '',
            'Important:',
            '- Only change the text content, not any surrounding code',
            '- Preserve any JSX expressions if present',
            '- Handle text that may span multiple lines',
        ];

        const result = await agent.regenerateFileByPath(targetFilePath, issues);

        if ('error' in result) {
            connection.send(JSON.stringify({
                type: 'design_mode_style_updated',
                success: false,
                selector,
                error: result.error,
            }));
            return;
        }

        connection.send(JSON.stringify({
            type: 'design_mode_style_updated',
            success: true,
            selector,
            filePath: targetFilePath,
        }));
    } catch (error) {
        logger.error('Failed to handle text update', {
            error: error instanceof Error ? error.message : 'Unknown error',
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
