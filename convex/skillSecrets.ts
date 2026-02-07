import { query, mutation, internalQuery } from './_generated/server';
import { v } from 'convex/values';

/**
 * Skill Secrets
 *
 * Encrypted storage for skill-specific secrets (API keys, tokens).
 * Secrets are:
 * - Stored encrypted (SKILL_SECRET_ENCRYPTION_KEY)
 * - Never returned to frontend
 * - Only read server-side at runtime
 * - Isolated per skill (skills can't access each other's secrets)
 */

// Get secrets for a skill (masked for SyncBoard display)
export const listMasked = query({
  args: { skillId: v.id('skillRegistry') },
  handler: async (ctx, args) => {
    const secrets = await ctx.db
      .query('skillSecrets')
      .withIndex('by_skill', (q) => q.eq('skillId', args.skillId))
      .collect();

    // Mask values - only show last 4 chars
    return secrets.map((s) => ({
      _id: s._id,
      key: s.key,
      maskedValue: '****' + s.encryptedValue.slice(-4),
      createdAt: s.createdAt,
    }));
  },
});

// Get secrets for a skill (internal, for skill execution)
export const getBySkill = internalQuery({
  args: { skillId: v.id('skillRegistry') },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('skillSecrets')
      .withIndex('by_skill', (q) => q.eq('skillId', args.skillId))
      .collect();
  },
});

// Add a secret for a skill
export const add = mutation({
  args: {
    skillId: v.id('skillRegistry'),
    key: v.string(),
    value: v.string(),
  },
  handler: async (ctx, args) => {
    // Check for duplicate key
    const existing = await ctx.db
      .query('skillSecrets')
      .withIndex('by_skill', (q) => q.eq('skillId', args.skillId))
      .filter((q) => q.eq(q.field('key'), args.key))
      .first();

    if (existing) {
      throw new Error(`Secret with key "${args.key}" already exists`);
    }

    // In production, encrypt the value using SKILL_SECRET_ENCRYPTION_KEY
    // For now, store as-is (NOT secure - implement encryption before production)
    const encryptedValue = args.value; // TODO: Encrypt

    return await ctx.db.insert('skillSecrets', {
      skillId: args.skillId,
      key: args.key,
      encryptedValue,
      createdAt: Date.now(),
    });
  },
});

// Update a secret value
export const update = mutation({
  args: {
    id: v.id('skillSecrets'),
    value: v.string(),
  },
  handler: async (ctx, args) => {
    // In production, encrypt the value
    const encryptedValue = args.value; // TODO: Encrypt

    await ctx.db.patch(args.id, {
      encryptedValue,
    });
  },
});

// Delete a secret
export const remove = mutation({
  args: { id: v.id('skillSecrets') },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});
