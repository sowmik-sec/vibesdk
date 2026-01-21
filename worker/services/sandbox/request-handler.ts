/*
This code is borrowed from Cloudflare Sandbox-sdk's npm package
*/

import { createObjectLogger } from "../../logger";
import { getSandbox, type Sandbox } from "@cloudflare/sandbox";
import { switchPort } from '@cloudflare/containers';
import { getClientScript } from '@vibesdk/design-mode-client/embedded';

const logger = createObjectLogger({
    component: 'sandbox-do',
    operation: 'proxy'
});

export interface SandboxEnv {
    Sandbox: DurableObjectNamespace<Sandbox>;
}

export interface RouteInfo {
    port: number;
    sandboxId: string;
    path: string;
    token: string;
}

export async function proxyToSandbox<E extends SandboxEnv>(
    request: Request,
    env: E
): Promise<Response | null> {
    try {
        const url = new URL(request.url);
        const routeInfo = extractSandboxRoute(url);

        if (!routeInfo) {
            return null; // Not a request to an exposed container port
        }

        const { sandboxId, port, path, token } = routeInfo;
        const sandbox = getSandbox(env.Sandbox, sandboxId);

        logger.info("[Proxy] Sandbox", sandbox, "Port", port, "Path", path, "Token", token);

        // Detect WebSocket upgrade request
        const upgradeHeader = request.headers.get('Upgrade');
        if (upgradeHeader?.toLowerCase() === 'websocket') {
            logger.info("[Proxy] WebSocket upgrade request", upgradeHeader, "Port", port, "Path", path, "Token", token);
            // WebSocket path: Must use fetch() not containerFetch()
            // This bypasses JSRPC serialization boundary which cannot handle WebSocket upgrades
            return await sandbox.fetch(switchPort(request, port));
        }

        // Build proxy request with proper headers
        let proxyUrl: string;

        // Route based on the target port
        if (port !== 3000) {
            // Route directly to user's service on the specified port
            proxyUrl = `http://localhost:${port}${path}${url.search}`;
        } else {
            // Port 3000 is our control plane - route normally
            proxyUrl = `http://localhost:3000${path}${url.search}`;
        }

        const proxyRequest = new Request(proxyUrl, {
            method: request.method,
            headers: {
                ...Object.fromEntries(request.headers),
                'X-Original-URL': request.url,
                'X-Forwarded-Host': url.hostname,
                'X-Forwarded-Proto': url.protocol.replace(':', ''),
                'X-Sandbox-Name': sandboxId // Pass the friendly name
            },
            body: request.body,
            // @ts-expect-error - duplex required for body streaming in modern runtimes
            duplex: 'half',
        });

        logger.info('Proxying request to sandbox', {
            sandboxId,
            port,
            path,
            token,
            proxyUrl,
        });

        const response = await sandbox.containerFetch(proxyRequest, port);

        // Inject design mode script into HTML responses
        const contentType = response.headers.get('content-type') || '';
        if (contentType.includes('text/html')) {
            const originalHtml = await response.text();
            logger.debug('Injecting design mode script into HTML response', {
                path,
                htmlLength: originalHtml.length,
                hasHead: originalHtml.includes('<head'),
                hasHtml: originalHtml.includes('<html')
            });
            const injectedHtml = injectDesignModeScript(originalHtml);
            logger.debug('Design mode script injected', {
                originalLength: originalHtml.length,
                injectedLength: injectedHtml.length,
                scriptAdded: injectedHtml.length > originalHtml.length
            });

            const newHeaders = new Headers(response.headers);
            newHeaders.set('content-length', String(new TextEncoder().encode(injectedHtml).length));

            return new Response(injectedHtml, {
                status: response.status,
                statusText: response.statusText,
                headers: newHeaders
            });
        }

        return response;
    } catch (error) {
        logger.error(
            'Proxy routing error',
            error instanceof Error ? error : new Error(String(error))
        );
        return new Response('Proxy routing error', { status: 500 });
    }
}

// Design mode client script - uses unified package
function getDesignModeScript(): string {
    // Add ID so the client-side preview-iframe knows it's already there and doesn't double-inject
    return `<script id="vibesdk-design-mode-script">${getClientScript()}</script>`;
}

function injectDesignModeScript(html: string): string {
    const script = getDesignModeScript();

    // CLEANUP: Remove any existing/zombie Design Mode scripts that might be hardcoded in the HTML.
    // We look for:
    // 1. Script tags containing __vibesdk (standard injection)
    // 2. Script tags containing design-mode-client (legacy imports)
    // 3. Script tags containing "vibesdk_design_mode" (protocol string)
    // 4. Script tags containing "Design mode enabled" (console log in legacy script)
    // This regex matches any <script> content that has one of these keywords
    // [\s\S]*? ensures we match across newlines
    const beforeLength = html.length;
    const zombieRegex = /<script\b[^>]*>[\s\S]*?(?:__vibesdk|design-mode-client|vibesdk_design_mode|Design mode enabled)[\s\S]*?<\/script>/gi;

    // Debug: Log the first 2000 chars to see what we are dealing with
    logger.debug('[VibeSDK] HTML content before cleanup:', {
        snippet: html.substring(0, 2000)
    });

    html = html.replace(zombieRegex, '');
    if (html.length < beforeLength) {
        logger.info('[VibeSDK] Removed zombie design mode script from HTML', {
            removedChars: beforeLength - html.length
        });
    }

    logger.debug('[VibeSDK] Injecting script content:', {
        preview: script.substring(0, 100) + '...',
        length: script.length
    });

    // Try multiple injection points in order of preference

    // 1. After opening <head> tag (most reliable for React apps)
    if (/<head[^>]*>/i.test(html)) {
        return html.replace(/<head[^>]*>/i, (match) => `${match}${script}`);
    }

    // 2. After opening <html> tag
    if (/<html[^>]*>/i.test(html)) {
        return html.replace(/<html[^>]*>/i, (match) => `${match}${script}`);
    }

    // 3. After DOCTYPE
    if (/<!DOCTYPE[^>]*>/i.test(html)) {
        return html.replace(/<!DOCTYPE[^>]*>/i, (match) => `${match}${script}`);
    }

    // 4. Fallback: inject at the very beginning
    return script + html;
}

function extractSandboxRoute(url: URL): RouteInfo | null {
    // Parse subdomain pattern: port-sandboxId-token.domain (tokens mandatory)
    // Token is always exactly 16 chars (generated by generatePortToken)
    const subdomainMatch = url.hostname.match(
        /^(\d{4,5})-([^.-][^.]*?[^.-]|[^.-])-([a-z0-9_-]{16})\.(.+)$/
    );

    if (!subdomainMatch) {
        return null;
    }

    const portStr = subdomainMatch[1];
    const sandboxId = subdomainMatch[2];
    const token = subdomainMatch[3]; // Mandatory token

    const port = parseInt(portStr, 10);

    // DNS subdomain length limit is 63 characters
    if (sandboxId.length > 63) {
        return null;
    }

    return {
        port,
        sandboxId,
        path: url.pathname || "/",
        token,
    };
}

export function isLocalhostPattern(hostname: string): boolean {
    // Handle IPv6 addresses in brackets (with or without port)
    if (hostname.startsWith('[')) {
        if (hostname.includes(']:')) {
            // [::1]:port format
            const ipv6Part = hostname.substring(0, hostname.indexOf(']:') + 1);
            return ipv6Part === '[::1]';
        } else {
            // [::1] format without port
            return hostname === '[::1]';
        }
    }

    // Handle bare IPv6 without brackets
    if (hostname === '::1') {
        return true;
    }

    // For IPv4 and regular hostnames, split on colon to remove port
    const hostPart = hostname.split(':')[0];

    return (
        hostPart === 'localhost' ||
        hostPart === '127.0.0.1' ||
        hostPart === '0.0.0.0'
    );
}
