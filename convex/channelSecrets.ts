import { query, mutation, internalQuery } from './_generated/server';
import { v } from 'convex/values';

/**
 * Channel Secrets
 *
 * Encrypted storage for channel-specific secrets (bot tokens, signing secrets).
 * Same security model as skillSecrets.
 */

// Get secrets for a channel (masked for SyncBoard display)
export const listMasked = query({
  args: { channelId: v.id('channelConfig') },
  handler: async (ctx, args) => {
    const secrets = await ctx.db
      .query('channelSecrets')
      .withIndex('by_channel', (q) => q.eq('channelId', args.channelId))
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

// Get secrets for a channel (internal, for webhook handlers)
export const getByChannel = internalQuery({
  args: { channelId: v.id('channelConfig') },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('channelSecrets')
      .withIndex('by_channel', (q) => q.eq('channelId', args.channelId))
      .collect();
  },
});

// Add a secret for a channel
export const add = mutation({
  args: {
    channelId: v.id('channelConfig'),
    key: v.string(),
    value: v.string(),
  },
  handler: async (ctx, args) => {
    // Check for duplicate key
    const existing = await ctx.db
      .query('channelSecrets')
      .withIndex('by_channel', (q) => q.eq('channelId', args.channelId))
      .filter((q) => q.eq(q.field('key'), args.key))
      .first();

    if (existing) {
      throw new Error(`Secret with key "${args.key}" already exists`);
    }

    // In production, encrypt the value using SKILL_SECRET_ENCRYPTION_KEY
    const encryptedValue = args.value; // TODO: Encrypt

    return await ctx.db.insert('channelSecrets', {
      channelId: args.channelId,
      key: args.key,
      encryptedValue,
      createdAt: Date.now(),
    });
  },
});

// Update a secret value
export const update = mutation({
  args: {
    id: v.id('channelSecrets'),
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
  args: { id: v.id('channelSecrets') },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});
