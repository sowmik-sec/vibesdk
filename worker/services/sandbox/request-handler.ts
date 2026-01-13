/*
This code is borrowed from Cloudflare Sandbox-sdk's npm package
*/

import { createObjectLogger } from "../../logger";
import { getSandbox, type Sandbox } from "@cloudflare/sandbox";
import { switchPort } from '@cloudflare/containers';

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

// Design mode client script - injected into HTML responses
function getDesignModeScript(): string {
  return `
<script>
(function() {
    'use strict';
    if (window.__vibesdk_design_mode_initialized) return;
    window.__vibesdk_design_mode_initialized = true;
    
    const DESIGN_MODE_MESSAGE_PREFIX = 'vibesdk_design_mode';
    const IGNORED_ELEMENTS = ['SCRIPT', 'STYLE', 'META', 'LINK', 'HEAD', 'HTML'];
    const COMPUTED_STYLE_PROPERTIES = [
        'color', 'backgroundColor', 'fontSize', 'fontFamily', 'fontWeight',
        'lineHeight', 'letterSpacing', 'textAlign', 'textDecoration',
        'padding', 'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft',
        'margin', 'marginTop', 'marginRight', 'marginBottom', 'marginLeft',
        'border', 'borderWidth', 'borderColor', 'borderStyle', 'borderRadius',
        'borderTopWidth', 'borderRightWidth', 'borderBottomWidth', 'borderLeftWidth',
        'borderTopColor', 'borderRightColor', 'borderBottomColor', 'borderLeftColor',
        'borderTopLeftRadius', 'borderTopRightRadius', 'borderBottomLeftRadius', 'borderBottomRightRadius',
        'width', 'height', 'display', 'flexDirection', 'justifyContent', 'alignItems', 'gap',
        'boxShadow', 'opacity'
    ];
    
    let isDesignModeActive = false;
    let selectedElement = null;
    let hoveredElement = null;
    let highlightOverlay = null;
    let selectionOverlay = null;
    
    function sendMessage(message) {
        try { window.parent.postMessage({ prefix: DESIGN_MODE_MESSAGE_PREFIX, ...message }, '*'); } catch (e) {}
    }
    
    function shouldIgnoreElement(el) {
        if (!el || !el.tagName) return true;
        if (IGNORED_ELEMENTS.includes(el.tagName)) return true;
        if (el.id && el.id.startsWith('__vibesdk_')) return true;
        return false;
    }
    
    function createOverlay(id, color) {
        let o = document.getElementById(id);
        if (!o) {
            o = document.createElement('div');
            o.id = id;
            o.style.cssText = 'position:fixed;pointer-events:none;z-index:999999;border:2px solid '+color+';background:'+color+'11;transition:all 0.1s;display:none;';
            document.body.appendChild(o);
        }
        return o;
    }
    
    function positionOverlay(o, r) {
        if (!o) return;
        o.style.top = r.top+'px'; o.style.left = r.left+'px'; o.style.width = r.width+'px'; o.style.height = r.height+'px'; o.style.display = 'block';
    }
    
    function hideOverlay(o) { if (o) o.style.display = 'none'; }
    
    function initOverlays() {
        highlightOverlay = createOverlay('__vibesdk_highlight_overlay', '#3b82f6');
        selectionOverlay = createOverlay('__vibesdk_selection_overlay', '#8b5cf6');
        if (selectionOverlay) selectionOverlay.style.borderWidth = '3px';
    }
    
    function cleanupOverlays() {
        if (highlightOverlay) highlightOverlay.remove();
        if (selectionOverlay) selectionOverlay.remove();
        highlightOverlay = null; selectionOverlay = null;
    }
    
    function generateSelector(el) {
        const path = []; let cur = el;
        while (cur && cur !== document.body && cur !== document.documentElement) {
            let sel = cur.tagName.toLowerCase();
            if (cur.id) { path.unshift('#'+CSS.escape(cur.id)); break; }
            if (cur.className && typeof cur.className === 'string') {
                const cls = cur.className.trim().split(/\\s+/).filter(c => c && !c.startsWith('__vibesdk')).slice(0,2);
                if (cls.length) sel += '.'+cls.map(c => CSS.escape(c)).join('.');
            }
            const parent = cur.parentElement;
            if (parent) {
                const sibs = Array.from(parent.children).filter(c => c.tagName === cur.tagName);
                if (sibs.length > 1) sel += ':nth-of-type('+(sibs.indexOf(cur)+1)+')';
            }
            path.unshift(sel); cur = cur.parentElement;
        }
        return path.join(' > ');
    }
    
    function extractStyles(el) {
        const computed = window.getComputedStyle(el), styles = {};
        COMPUTED_STYLE_PROPERTIES.forEach(p => { styles[p] = computed.getPropertyValue(p.replace(/([A-Z])/g, '-$1').toLowerCase()); });
        return styles;
    }
    
    // Extract React Fiber source location for an element
    // This traverses React internals to find _debugSource which contains file/line info
    function getFiberSource(el) {
        if (!el) return null;
        try {
            const keys = Object.keys(el);
            for (let i = 0; i < keys.length; i++) {
                const key = keys[i];
                if (key.startsWith('__reactFiber$') || key.startsWith('__reactInternalInstance$')) {
                    let fiber = el[key];
                    // Traverse up the fiber tree looking for _debugSource
                    while (fiber) {
                        if (fiber._debugSource) {
                            const src = fiber._debugSource;
                            let filePath = src.fileName || '';
                            
                            // Normalize container paths:
                            // /workspace/i-xxx-uuid/src/... -> src/...
                            // /app/src/... -> src/...
                            if (filePath.includes('/workspace/')) {
                                const parts = filePath.split('/');
                                const wsIdx = parts.indexOf('workspace');
                                if (wsIdx >= 0 && wsIdx + 2 < parts.length) {
                                    filePath = parts.slice(wsIdx + 2).join('/');
                                }
                            } else if (filePath.startsWith('/app/')) {
                                filePath = filePath.substring(5);
                            } else if (filePath.startsWith('/src/')) {
                                filePath = filePath.substring(1);
                            }
                            
                            console.log('[VibeSDK] Fiber source found:', { original: src.fileName, normalized: filePath, line: src.lineNumber });
                            return {
                                filePath: filePath,
                                lineNumber: src.lineNumber || 0,
                                columnNumber: src.columnNumber || 0
                            };
                        }
                        // Move up through return (parent) or _debugOwner
                        fiber = fiber.return || fiber._debugOwner;
                    }
                    break;
                }
            }
        } catch (e) {
            console.warn('[VibeSDK] Error extracting fiber source:', e);
        }
        return null;
    }
    

    function extractElementData(el) {
        const r = el.getBoundingClientRect();
        let sourceLocation = null;
        try {
            sourceLocation = getFiberSource(el);
        } catch (err) {
            console.warn('[VibeSDK] getFiberSource error:', err);
        }
        return {
            tagName: el.tagName.toLowerCase(), id: el.id || null, className: el.className || '',
            selector: generateSelector(el), textContent: (el.textContent||'').slice(0,200),
            boundingRect: {top:r.top,left:r.left,width:r.width,height:r.height},
            computedStyles: extractStyles(el),
            tailwindClasses: (el.className && typeof el.className === 'string') ? el.className.trim().split(/\\s+/).filter(c => c) : [],
            dataAttributes: {}, sourceLocation: sourceLocation,
            parentSelector: el.parentElement ? generateSelector(el.parentElement) : null,
            childCount: el.children.length
        };
    }
    

    function handleMouseMove(e) {
        if (!isDesignModeActive) return;
        const t = e.target;
        if (!t || shouldIgnoreElement(t)) { if (hoveredElement) { hoveredElement = null; hideOverlay(highlightOverlay); } return; }
        if (t === selectedElement) { hideOverlay(highlightOverlay); return; }
        if (t !== hoveredElement) {
            hoveredElement = t;
            positionOverlay(highlightOverlay, t.getBoundingClientRect());
            sendMessage({ type: 'design_mode_element_hovered', element: extractElementData(t) });
        }
    }
    
    function handleClick(e) {
        if (!isDesignModeActive) return;
        e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation();
        const t = e.target;
        if (!t || shouldIgnoreElement(t)) return;
        if (t === selectedElement) { selectedElement = null; hideOverlay(selectionOverlay); sendMessage({ type: 'design_mode_element_deselected' }); return; }
        selectedElement = t; hoveredElement = null; hideOverlay(highlightOverlay);
        positionOverlay(selectionOverlay, t.getBoundingClientRect());
        sendMessage({ type: 'design_mode_element_selected', element: extractElementData(t) });
    }
    
    function handleKeyDown(e) { if (e.key === 'Escape' && selectedElement) { selectedElement = null; hideOverlay(selectionOverlay); sendMessage({ type: 'design_mode_element_deselected' }); } }
    function handleScroll() { if (selectedElement && selectionOverlay) positionOverlay(selectionOverlay, selectedElement.getBoundingClientRect()); if (hoveredElement && highlightOverlay) positionOverlay(highlightOverlay, hoveredElement.getBoundingClientRect()); }
    
    // Helper function to convert camelCase to kebab-case
    function toKebabCase(str) {
        return str.replace(/([A-Z])/g, '-$1').toLowerCase();
    }
    
    // Map CSS properties to Tailwind class patterns they conflict with
    const tailwindConflicts = {
        'fontSize': /^text-(xs|sm|base|lg|xl|2xl|3xl|4xl|5xl|6xl|7xl|8xl|9xl)$/,
        'fontWeight': /^font-(thin|extralight|light|normal|medium|semibold|bold|extrabold|black)$/,
        'textAlign': /^text-(left|center|right|justify|start|end)$/,
        'color': /^text-\w+(-\d+)?$/,
        'backgroundColor': /^bg-\w+(-\d+)?$/,
        'padding': /^p(|[tblrxy])?-\d+$/,
        'paddingTop': /^p(|t)-\d+$/,
        'paddingBottom': /^p(|b)-\d+$/,
        'paddingLeft': /^p(|l)-\d+$/,
        'paddingRight': /^p(|r)-\d+$/,
        'margin': /^m(|[tblrxy])?-\d+$/,
        'marginTop': /^m(|t)-\d+$/,
        'marginBottom': /^m(|b)-\d+$/,
        'marginLeft': /^m(|l)-\d+$/,
        'marginRight': /^m(|r)-\d+$/,
    };
    
    // Apply preview styles DIRECTLY to the selected element (instant feedback)
    function applyPreviewStyle(sel, styles) {
        // Try to use the stored selectedElement first (instant)
        // Fall back to querySelector if element not stored
        const el = selectedElement || document.querySelector(sel);
        
        console.log('[VibeSDK] applyPreviewStyle called', { 
            selector: sel, 
            styles: styles,
            hasSelectedElement: !!selectedElement,
            usingQuerySelector: !selectedElement && !!el,
            elementFound: !!el
        });
        
        if (!el) {
            console.warn('[VibeSDK] applyPreviewStyle: No element found for selector:', sel);
            return;
        }
        
        // Store original state for restoration
        if (!el.__vibesdk_orig) {
            el.__vibesdk_orig = {
                styles: {},
                className: el.className
            };
        }
        
        // Get current classes
        const classes = el.className.split(/\s+/).filter(c => c);
        const classesToRemove = [];
        
        // Apply each style directly to the element
        for (const prop in styles) {
            const kebabProp = toKebabCase(prop);
            const value = styles[prop];
            
            // Store original inline style value if not already stored
            if (!(prop in el.__vibesdk_orig.styles)) {
                el.__vibesdk_orig.styles[prop] = el.style.getPropertyValue(kebabProp) || '';
            }
            
            // Remove conflicting Tailwind classes to prevent them from overriding our inline style
            const conflictPattern = tailwindConflicts[prop];
            if (conflictPattern) {
                classes.forEach(cls => {
                    if (conflictPattern.test(cls)) {
                        classesToRemove.push(cls);
                        console.log('[VibeSDK] Removing conflicting Tailwind class:', cls);
                    }
                });
            }
            
            console.log('[VibeSDK] Setting style:', kebabProp, '=', value);
            
            // Get computed style BEFORE applying
            const computedBefore = window.getComputedStyle(el).getPropertyValue(kebabProp);
            console.log('[VibeSDK] Computed style BEFORE:', kebabProp, '=', computedBefore);
            
            el.style.setProperty(kebabProp, value, 'important');
            
            // Get computed style AFTER applying
            const computedAfter = window.getComputedStyle(el).getPropertyValue(kebabProp);
            const inlineAfter = el.style.getPropertyValue(kebabProp);
            console.log('[VibeSDK] Inline style AFTER:', kebabProp, '=', inlineAfter);
            console.log('[VibeSDK] Computed style AFTER:', kebabProp, '=', computedAfter);
            console.log('[VibeSDK] Style applied successfully?', computedAfter === value || computedAfter === inlineAfter);
        }
        
        // Remove conflicting classes
        if (classesToRemove.length > 0) {
            const remainingClasses = classes.filter(c => !classesToRemove.includes(c));
            el.className = remainingClasses.join(' ');
            console.log('[VibeSDK] Updated className:', el.className);
        }
        
        console.log('[VibeSDK] applyPreviewStyle complete');
        console.log('[VibeSDK] Final element.style.cssText:', el.style.cssText);
        console.log('[VibeSDK] Final element.className:', el.className);
    }
    
    // Clear preview styles and restore originals
    function clearPreviewStyle(sel) {
        const el = selectedElement || document.querySelector(sel);
        console.log('[VibeSDK] clearPreviewStyle called', { selector: sel, hasElement: !!el });
        
        if (el && el.__vibesdk_orig) {
            // Restore original inline styles
            for (const prop in el.__vibesdk_orig.styles) {
                const kebabProp = toKebabCase(prop);
                const originalValue = el.__vibesdk_orig.styles[prop];
                if (originalValue) {
                    el.style.setProperty(kebabProp, originalValue);
                } else {
                    el.style.removeProperty(kebabProp);
                }
            }
            
            // Restore original className
            if (el.__vibesdk_orig.className !== undefined) {
                el.className = el.__vibesdk_orig.className;
                console.log('[VibeSDK] Restored className:', el.className);
            }
            
            delete el.__vibesdk_orig;
        }
    }
    
    function clearAllPreviewStyles() {
        // Clear from selected element if exists
        if (selectedElement && selectedElement.__vibesdk_orig) {
            clearPreviewStyle(null);
        }
    }
    
    function enableDesignMode() {
        if (isDesignModeActive) return;
        isDesignModeActive = true; initOverlays();
        document.addEventListener('mousemove', handleMouseMove, true);
        document.addEventListener('click', handleClick, true);
        document.addEventListener('mousedown', e => { if (isDesignModeActive) { e.preventDefault(); e.stopPropagation(); } }, true);
        document.addEventListener('mouseup', e => { if (isDesignModeActive) { e.preventDefault(); e.stopPropagation(); } }, true);
        document.addEventListener('keydown', handleKeyDown, true);
        window.addEventListener('scroll', handleScroll, true);
        document.body.style.cursor = 'crosshair';
        console.log('[VibeSDK] Design mode enabled');
    }
    
    function disableDesignMode() {
        if (!isDesignModeActive) return;
        isDesignModeActive = false; selectedElement = null; hoveredElement = null;
        document.removeEventListener('mousemove', handleMouseMove, true);
        document.removeEventListener('click', handleClick, true);
        document.removeEventListener('keydown', handleKeyDown, true);
        window.removeEventListener('scroll', handleScroll, true);
        cleanupOverlays(); clearAllPreviewStyles();
        document.body.style.cursor = '';
        console.log('[VibeSDK] Design mode disabled');
    }
    
    // Log script initialization immediately
    console.log('%c[VibeSDK] Design mode script loaded!', 'background: #00ff00; color: #000; font-weight: bold; padding: 2px 5px;');
    console.log('[VibeSDK] Script loaded at:', new Date().toISOString());
    console.log('[VibeSDK] Window location:', window.location.href);
    console.log('[VibeSDK] Parent origin:', window.parent !== window ? document.referrer : 'no parent');
    console.log('[VibeSDK] Message prefix to listen for:', DESIGN_MODE_MESSAGE_PREFIX);
    
    // Log ALL messages to debug
    window.addEventListener('message', function(e) {
        console.log('[VibeSDK] Raw message event received:', {
            origin: e.origin,
            hasData: !!e.data,
            dataType: typeof e.data,
            data: e.data,
            hasPrefix: e.data && e.data.prefix,
            prefix: e.data && e.data.prefix,
            matchesPrefix: e.data && e.data.prefix === DESIGN_MODE_MESSAGE_PREFIX
        });
    }, true); // Capture phase to see it first
    
    window.addEventListener('message', function(e) {
        const d = e.data; if (!d || d.prefix !== DESIGN_MODE_MESSAGE_PREFIX) return;
        console.log('[VibeSDK] Message received:', d.type, d);
        if (d.type === 'design_mode_enable') enableDesignMode();
        else if (d.type === 'design_mode_disable') disableDesignMode();
        else if (d.type === 'design_mode_preview_style') {
            console.log('[VibeSDK] Received preview_style:', { selector: d.selector, styles: d.styles });
            if (d.selector && d.styles) applyPreviewStyle(d.selector, d.styles);
            else console.warn('[VibeSDK] preview_style missing selector or styles!', d);
        }
        else if (d.type === 'design_mode_clear_preview') { if (d.selector) clearPreviewStyle(d.selector); else clearAllPreviewStyles(); }
        else if (d.type === 'design_mode_clear_selection') { selectedElement = null; hideOverlay(selectionOverlay); }
    });
    
    sendMessage({ type: 'design_mode_ready' });
    console.log('%c[VibeSDK] Design mode client initialized and ready!', 'background: #0066ff; color: #fff; font-weight: bold; padding: 2px 5px;');
})();
</script>`;
}

function injectDesignModeScript(html: string): string {
  const script = getDesignModeScript();

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
