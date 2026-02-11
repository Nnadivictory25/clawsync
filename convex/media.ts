import { query, mutation } from './_generated/server';
import { v } from 'convex/values';

/**
 * Media / File Storage (Convex Native)
 *
 * Handles file uploads using Convex's built-in storage.
 * R2 uploads are handled separately in r2Storage.ts.
 */

// Generate a Convex upload URL for the client
export const generateUploadUrl = mutation({
  args: {},
  returns: v.string(),
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});

// Save file metadata after upload completes
export const saveFile = mutation({
  args: {
    storageId: v.id('_storage'),
    filename: v.string(),
    contentType: v.string(),
    size: v.number(),
  },
  returns: v.id('mediaFiles'),
  handler: async (ctx, args) => {
    const url = await ctx.storage.getUrl(args.storageId);
    return await ctx.db.insert('mediaFiles', {
      filename: args.filename,
      contentType: args.contentType,
      size: args.size,
      storageBackend: 'convex',
      storageId: args.storageId,
      url: url ?? undefined,
      createdAt: Date.now(),
    });
  },
});

// List media files with optional backend filter
export const list = query({
  args: {
    backend: v.optional(v.union(v.literal('convex'), v.literal('r2'))),
    limit: v.optional(v.number()),
  },
  returns: v.array(
    v.object({
      _id: v.id('mediaFiles'),
      _creationTime: v.number(),
      filename: v.string(),
      contentType: v.string(),
      size: v.number(),
      storageBackend: v.union(v.literal('convex'), v.literal('r2')),
      storageId: v.optional(v.id('_storage')),
      r2Key: v.optional(v.string()),
      url: v.optional(v.string()),
      uploadedBy: v.optional(v.string()),
      createdAt: v.number(),
    })
  ),
  handler: async (ctx, args) => {
    const take = Math.min(args.limit ?? 50, 200); // Cap at 200
    if (args.backend) {
      return await ctx.db
        .query('mediaFiles')
        .withIndex('by_backend', (q) => q.eq('storageBackend', args.backend!))
        .order('desc')
        .take(take);
    }
    return await ctx.db
      .query('mediaFiles')
      .withIndex('by_createdAt')
      .order('desc')
      .take(take);
  },
});

// Delete a media file
export const deleteFile = mutation({
  args: { id: v.id('mediaFiles') },
  returns: v.null(),
  handler: async (ctx, args) => {
    const file = await ctx.db.get(args.id);
    if (!file) return null;

    // Delete from Convex storage if native backend
    if (file.storageBackend === 'convex' && file.storageId) {
      await ctx.storage.delete(file.storageId);
    }

    await ctx.db.delete(args.id);
    return null;
  },
});

// Get total storage stats
export const getStats = query({
  args: {},
  returns: v.object({
    totalFiles: v.number(),
    convexFiles: v.number(),
    r2Files: v.number(),
    totalSize: v.number(),
  }),
  handler: async (ctx) => {
    const all = await ctx.db.query('mediaFiles').collect();
    const convexFiles = all.filter((f) => f.storageBackend === 'convex');
    const r2Files = all.filter((f) => f.storageBackend === 'r2');
    const totalSize = all.reduce((acc, f) => acc + f.size, 0);

    return {
      totalFiles: all.length,
      convexFiles: convexFiles.length,
      r2Files: r2Files.length,
      totalSize,
    };
  },
});
