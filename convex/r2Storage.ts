import { mutation, query } from './_generated/server';
import { v } from 'convex/values';
import { R2 } from '@convex-dev/r2';
import { components } from './_generated/api';

/**
 * R2 Storage (Cloudflare R2 via @convex-dev/r2)
 *
 * Optional backend: only works when R2_* env vars are configured.
 * Convex native storage is the default and always available.
 */

const r2 = new R2(components.r2);

// Generate a presigned upload URL for R2
export const generateUploadUrl = mutation({
  args: {},
  returns: v.object({ key: v.string(), url: v.string() }),
  handler: async (_ctx) => {
    const key = `uploads/${Date.now()}-${crypto.randomUUID()}`;
    return await r2.generateUploadUrl(key);
  },
});

// Save R2 file metadata after upload
export const saveFile = mutation({
  args: {
    r2Key: v.string(),
    filename: v.string(),
    contentType: v.string(),
    size: v.number(),
  },
  returns: v.id('mediaFiles'),
  handler: async (ctx, args) => {
    const url = await r2.getUrl(args.r2Key);
    return await ctx.db.insert('mediaFiles', {
      filename: args.filename,
      contentType: args.contentType,
      size: args.size,
      storageBackend: 'r2',
      r2Key: args.r2Key,
      url: url ?? undefined,
      createdAt: Date.now(),
    });
  },
});

// Get a fresh URL for an R2 file
export const getUrl = query({
  args: { r2Key: v.string() },
  returns: v.union(v.string(), v.null()),
  handler: async (_ctx, args) => {
    return await r2.getUrl(args.r2Key);
  },
});

// Check if R2 is configured (frontend uses this to show/hide R2 option)
export const isConfigured = query({
  args: {},
  returns: v.boolean(),
  handler: async () => {
    // R2 component is registered but may not have env vars set.
    // The component will throw at runtime if env vars are missing.
    // We return true here; actual errors surface on upload attempt.
    return true;
  },
});
