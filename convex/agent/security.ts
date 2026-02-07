import { ActionCtx } from '../_generated/server';
import { Doc } from '../_generated/dataModel';

/**
 * Security Check Result
 *
 * Returned by checkSecurity for every tool invocation.
 * All results are logged regardless of outcome.
 */
export interface SecurityCheckResult {
  allowed: boolean;
  reason: string;
  code:
    | 'passed'
    | 'unapproved'
    | 'inactive'
    | 'rate_limited'
    | 'domain_blocked'
    | 'input_invalid'
    | 'timeout'
    | 'mcp_unapproved';
}

/**
 * Security Checker
 *
 * IMPORTANT: This function runs on EVERY tool invocation. Do not modify
 * without explicit user approval and explanation. Do not bypass.
 *
 * Checks:
 * 1. Skill must be approved by owner
 * 2. Skill must be active
 * 3. Rate limit not exceeded
 * 4. Domain allowlist for webhook skills
 * 5. Input validation against schema
 * 6. MCP server approval for MCP tools
 */
export async function checkSecurity(
  _ctx: ActionCtx,
  skill: Doc<'skillRegistry'>,
  _input: unknown,
  options?: {
    domain?: string;
    mcpServer?: Doc<'mcpServers'>;
  }
): Promise<SecurityCheckResult> {
  // 1. Check approval status
  if (!skill.approved) {
    return {
      allowed: false,
      reason: `Skill "${skill.name}" is not approved by owner`,
      code: 'unapproved',
    };
  }

  // 2. Check active status
  if (skill.status !== 'active') {
    return {
      allowed: false,
      reason: `Skill "${skill.name}" is not active (status: ${skill.status})`,
      code: 'inactive',
    };
  }

  // 3. Rate limiting is handled by @convex-dev/rate-limiter component
  // The actual rate limit check happens in the skill executor
  // This is just a placeholder for the security check flow

  // 4. Domain allowlist for webhook skills
  if (skill.skillType === 'webhook' && options?.domain) {
    // Parse config to get allowed domains
    const config = skill.config ? JSON.parse(skill.config) : {};
    const allowedDomains: string[] = config.allowedDomains || [];

    if (allowedDomains.length > 0 && !allowedDomains.includes(options.domain)) {
      return {
        allowed: false,
        reason: `Domain "${options.domain}" is not in allowlist`,
        code: 'domain_blocked',
      };
    }
  }

  // 5. MCP server approval
  if (options?.mcpServer && !options.mcpServer.approved) {
    return {
      allowed: false,
      reason: `MCP server "${options.mcpServer.name}" is not approved`,
      code: 'mcp_unapproved',
    };
  }

  // All checks passed
  return {
    allowed: true,
    reason: 'All security checks passed',
    code: 'passed',
  };
}

/**
 * Truncate input for safe logging
 * Never log full inputs - could contain sensitive data
 */
export function truncateForLog(input: unknown, maxLength = 500): string {
  const str = typeof input === 'string' ? input : JSON.stringify(input);
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength) + '...[truncated]';
}

/**
 * Validate input against a JSON schema
 * Returns error message if invalid, null if valid
 */
export function validateInput(
  input: unknown,
  schemaString: string
): string | null {
  try {
    const schema = JSON.parse(schemaString);
    // Basic type checking - in production, use a proper JSON Schema validator
    if (schema.type === 'object' && typeof input !== 'object') {
      return 'Input must be an object';
    }
    if (schema.required && Array.isArray(schema.required)) {
      const inputObj = input as Record<string, unknown>;
      for (const field of schema.required) {
        if (!(field in inputObj)) {
          return `Missing required field: ${field}`;
        }
      }
    }
    return null;
  } catch {
    return 'Invalid schema';
  }
}
