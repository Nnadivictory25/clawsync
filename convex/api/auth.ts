import { ActionCtx } from '../_generated/server';
import { internal } from '../_generated/api';
import { Doc } from '../_generated/dataModel';

/**
 * API Authentication Helpers
 *
 * Validates API keys and checks permissions for HTTP endpoints.
 */

export interface AuthResult {
  valid: boolean;
  apiKey?: Doc<'apiKeys'>;
  error?: string;
  statusCode: number;
}

// Hash an API key using SHA-256
async function hashApiKey(key: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(key);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Authenticate a request using API key
 */
export async function authenticateRequest(
  ctx: ActionCtx,
  request: Request,
  options?: {
    requiredScopes?: string[];
    allowPublic?: boolean;
  }
): Promise<AuthResult> {
  // Check for API key in headers
  const authHeader = request.headers.get('Authorization');
  const apiKeyHeader = request.headers.get('X-API-Key');

  let apiKeyValue: string | null = null;

  if (authHeader?.startsWith('Bearer ')) {
    apiKeyValue = authHeader.slice(7);
  } else if (apiKeyHeader) {
    apiKeyValue = apiKeyHeader;
  }

  // If no key and public access allowed, return success
  if (!apiKeyValue && options?.allowPublic) {
    return { valid: true, statusCode: 200 };
  }

  // Require API key
  if (!apiKeyValue) {
    return {
      valid: false,
      error: 'Missing API key. Use Authorization: Bearer <key> or X-API-Key header.',
      statusCode: 401,
    };
  }

  // Hash and validate the key
  const keyHash = await hashApiKey(apiKeyValue);
  const apiKey = await ctx.runQuery(internal.apiKeys.validateKey, { keyHash });

  if (!apiKey) {
    return {
      valid: false,
      error: 'Invalid or expired API key',
      statusCode: 401,
    };
  }

  // Check IP allowlist if configured
  if (apiKey.allowedIps && apiKey.allowedIps.length > 0) {
    const clientIp = request.headers.get('CF-Connecting-IP') ||
      request.headers.get('X-Forwarded-For')?.split(',')[0]?.trim() ||
      request.headers.get('X-Real-IP');

    if (clientIp && !apiKey.allowedIps.includes(clientIp)) {
      return {
        valid: false,
        error: 'IP address not allowed',
        statusCode: 403,
      };
    }
  }

  // Check CORS origin if configured
  if (apiKey.allowedOrigins && apiKey.allowedOrigins.length > 0) {
    const origin = request.headers.get('Origin');
    if (origin && !apiKey.allowedOrigins.includes(origin) && !apiKey.allowedOrigins.includes('*')) {
      return {
        valid: false,
        error: 'Origin not allowed',
        statusCode: 403,
      };
    }
  }

  // Check required scopes
  if (options?.requiredScopes && options.requiredScopes.length > 0) {
    const hasAllScopes = options.requiredScopes.every((scope) =>
      apiKey.scopes.includes(scope)
    );

    if (!hasAllScopes) {
      return {
        valid: false,
        error: `Missing required scopes: ${options.requiredScopes.join(', ')}`,
        statusCode: 403,
      };
    }
  }

  // Record usage
  await ctx.runMutation(internal.apiKeys.recordUsage, { id: apiKey._id });

  return { valid: true, apiKey, statusCode: 200 };
}

/**
 * Check if a scope is allowed for MCP access
 */
export function checkMcpScope(apiKey: Doc<'apiKeys'> | undefined, scope: string): boolean {
  if (!apiKey) return false;
  return apiKey.scopes.includes(scope) || apiKey.scopes.includes('mcp:*');
}

/**
 * Get CORS headers for API responses
 */
export function getCorsHeaders(origin?: string | null, allowedOrigins?: string[]): Record<string, string> {
  const headers: Record<string, string> = {
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Key',
    'Access-Control-Max-Age': '86400',
  };

  if (allowedOrigins && allowedOrigins.length > 0) {
    if (allowedOrigins.includes('*')) {
      headers['Access-Control-Allow-Origin'] = '*';
    } else if (origin && allowedOrigins.includes(origin)) {
      headers['Access-Control-Allow-Origin'] = origin;
    }
  } else {
    headers['Access-Control-Allow-Origin'] = '*';
  }

  return headers;
}

/**
 * Create a JSON response with proper headers
 */
export function jsonResponse(
  data: unknown,
  status = 200,
  corsHeaders?: Record<string, string>
): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders,
    },
  });
}

/**
 * Create an error response
 */
export function errorResponse(
  message: string,
  status: number,
  corsHeaders?: Record<string, string>
): Response {
  return jsonResponse({ error: message }, status, corsHeaders);
}
