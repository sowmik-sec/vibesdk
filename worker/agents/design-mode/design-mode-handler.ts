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
    const { selector, filePath, changes } = request;

    logger.info('Design mode style update', {
        selector,
        filePath,
        changesCount: changes.length,
    });

    try {
        // If we don't have a file path, we need to find it
        const targetFilePath = filePath || await findFileForSelector(agent, selector, logger);

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
async function findFileForSelector(
    _agent: ICodingAgent,
    selector: string,
    logger: StructuredLogger
): Promise<string | null> {
    // This is a simplified implementation
    // In a real implementation, we would:
    // 1. Look for data-* attributes that indicate source location
    // 2. Search through project files for matching JSX patterns
    // 3. Use React DevTools protocol if available

    logger.debug('Searching for file containing selector', { selector });

    // For now, we'll search common component directories
    // This would need to be expanded based on project structure
    const searchPaths = [
        'src/components',
        'src/app',
        'src/pages',
        'src/routes',
        'app',
        'components',
    ];

    // Extract tag name or class from selector for searching
    const tagMatch = selector.match(/^(\w+)/);
    const classMatch = selector.match(/\.([a-zA-Z][\w-]*)/);
    const searchTerm = classMatch?.[1] || tagMatch?.[1] || null;

    if (!searchTerm) {
        return null;
    }

    // Search for files containing the search term
    // This is a placeholder - actual implementation would use project file system
    logger.debug('Would search for', { searchTerm, searchPaths });

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
                `Prefer Tailwind classes if applicable, otherwise use inline styles.`
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
        '- Maintain existing classes and styles that are not being modified',
        '- Use Tailwind utility classes when possible',
        '- If the exact element cannot be found, look for the closest matching element',
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
        const targetFilePath = filePath || await findFileForSelector(agent, selector, logger);

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
        const targetFilePath = filePath || await findFileForSelector(agent, selector, logger);

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
    // If we have a file path hint, use it
    if (filePath) {
        // Try to find the element within this file
        // This would need access to the file system to search for the selector
        logger.debug('Would search in file', { filePath, selector });

        // For now, return a placeholder - actual implementation would parse the file
        return {
            filePath,
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
