import { mutation, query } from './_generated/server';
import { v } from 'convex/values';

/**
 * SyncBoard Authentication
 *
 * Simple password-based authentication for the SyncBoard admin dashboard.
 * Password hash is stored in the SYNCBOARD_PASSWORD_HASH environment variable.
 *
 * To generate a password hash, use:
 *   node -e "console.log(require('crypto').createHash('sha256').update('your-password').digest('hex'))"
 *
 * Then set SYNCBOARD_PASSWORD_HASH in your Convex environment variables.
 */

// Hash a password using SHA-256
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

// Generate a random session token
function generateSessionToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

// Check if SyncBoard auth is enabled (password is set)
export const isEnabled = query({
  args: {},
  handler: async () => {
    const passwordHash = process.env.SYNCBOARD_PASSWORD_HASH;
    return !!passwordHash && passwordHash.length > 0;
  },
});

// Verify password and create session
export const login = mutation({
  args: {
    password: v.string(),
  },
  handler: async (ctx, args) => {
    const storedHash = process.env.SYNCBOARD_PASSWORD_HASH;

    // If no password is set, auth is disabled
    if (!storedHash) {
      return { success: true, token: 'no-auth-required' };
    }

    // Hash the provided password and compare
    const providedHash = await hashPassword(args.password);

    if (providedHash !== storedHash) {
      // Log failed attempt
      await ctx.db.insert('activityLog', {
        actionType: 'syncboard_login_failed',
        summary: 'Failed SyncBoard login attempt',
        visibility: 'private',
        timestamp: Date.now(),
      });

      return { success: false, error: 'Invalid password' };
    }

    // Generate session token
    const token = generateSessionToken();
    const expiresAt = Date.now() + 24 * 60 * 60 * 1000; // 24 hours

    // Store session
    await ctx.db.insert('syncSessions', {
      sessionToken: token,
      threadId: 'syncboard-auth',
      lastActiveAt: Date.now(),
      createdAt: Date.now(),
    });

    // Log successful login
    await ctx.db.insert('activityLog', {
      actionType: 'syncboard_login',
      summary: 'Successful SyncBoard login',
      visibility: 'private',
      timestamp: Date.now(),
    });

    return { success: true, token, expiresAt };
  },
});

// Verify a session token
export const verifySession = query({
  args: {
    token: v.string(),
  },
  handler: async (ctx, args) => {
    // If no password is set, auth is disabled - always valid
    const storedHash = process.env.SYNCBOARD_PASSWORD_HASH;
    if (!storedHash) {
      return { valid: true };
    }

    // Special case for no-auth token
    if (args.token === 'no-auth-required') {
      return { valid: !storedHash };
    }

    // Look up session
    const session = await ctx.db
      .query('syncSessions')
      .withIndex('by_token', (q) => q.eq('sessionToken', args.token))
      .first();

    if (!session) {
      return { valid: false };
    }

    // Check if session is expired (24 hours)
    const expiresAt = session.createdAt + 24 * 60 * 60 * 1000;
    if (Date.now() > expiresAt) {
      return { valid: false, expired: true };
    }

    return { valid: true };
  },
});

// Logout - invalidate session
export const logout = mutation({
  args: {
    token: v.string(),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query('syncSessions')
      .withIndex('by_token', (q) => q.eq('sessionToken', args.token))
      .first();

    if (session) {
      await ctx.db.delete(session._id);
    }

    return { success: true };
  },
});

// Set initial password (only works if no password is set)
export const setInitialPassword = mutation({
  args: {
    password: v.string(),
  },
  handler: async (ctx, args) => {
    const storedHash = process.env.SYNCBOARD_PASSWORD_HASH;

    // Only allow if no password is currently set
    if (storedHash) {
      throw new Error('Password already set. Change it in Convex environment variables.');
    }

    // Validate password strength
    if (args.password.length < 8) {
      throw new Error('Password must be at least 8 characters');
    }

    // Generate hash for the user to set in env vars
    const hash = await hashPassword(args.password);

    // Log the instruction
    await ctx.db.insert('activityLog', {
      actionType: 'syncboard_password_generated',
      summary: 'SyncBoard password hash generated - set SYNCBOARD_PASSWORD_HASH in Convex',
      visibility: 'private',
      timestamp: Date.now(),
    });

    return {
      success: true,
      hash,
      instructions: `Set this in Convex Dashboard > Settings > Environment Variables:\n\nSYNCBOARD_PASSWORD_HASH=${hash}`,
    };
  },
});
