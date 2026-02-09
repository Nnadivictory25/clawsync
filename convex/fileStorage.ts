import { v } from 'convex/values';
import { internalMutation, internalQuery, internalAction } from './_generated/server';
import { internal } from './_generated/api';

/**
 * File Storage for Generated Files
 * 
 * Stores AI-generated files (PDFs, images, etc.) and provides download URLs.
 */

// Save a generated file to storage (using action for file upload capability)
export const saveGeneratedFile = internalAction({
  args: {
    filename: v.string(),
    contentType: v.string(),
    data: v.array(v.number()), // Uint8Array as array of numbers
  },
  returns: v.id('_storage'),
  handler: async (ctx, args) => {
    // Convert array back to Uint8Array
    const buffer = new Uint8Array(args.data);
    
    // Generate upload URL
    const uploadUrl = await ctx.storage.generateUploadUrl();
    
    // Upload the file data
    const response = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        'Content-Type': args.contentType,
      },
      body: buffer,
    });
    
    if (!response.ok) {
      throw new Error(`Failed to upload file: ${response.status}`);
    }
    
    // Extract storage ID from the response or URL
    // The storage ID is returned in the response
    const responseText = await response.text();
    let storageId: string;
    
    try {
      // Try to parse as JSON
      const jsonResponse = JSON.parse(responseText);
      storageId = jsonResponse.storageId || jsonResponse.id;
    } catch {
      // Extract from URL if needed
      const urlParts = uploadUrl.split('/');
      storageId = urlParts[urlParts.length - 1];
    }
    
    // Store metadata
    await ctx.runMutation(internal.fileStorage.saveMetadata, {
      storageId: storageId as any,
      filename: args.filename,
      contentType: args.contentType,
    });
    
    return storageId as any;
  },
});

// Save metadata (internal mutation)
export const saveMetadata = internalMutation({
  args: {
    storageId: v.id('_storage'),
    filename: v.string(),
    contentType: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert('generatedFiles', {
      storageId: args.storageId,
      filename: args.filename,
      contentType: args.contentType,
      createdAt: Date.now(),
    });
  },
});

// Get file download URL
export const getFileUrl = internalAction({
  args: {
    storageId: v.id('_storage'),
  },
  returns: v.string(),
  handler: async (ctx, args) => {
    const url = await ctx.storage.getUrl(args.storageId);
    if (!url) {
      throw new Error('File not found');
    }
    return url;
  },
});

// Get file metadata
export const getFileMetadata = internalQuery({
  args: {
    storageId: v.id('_storage'),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('generatedFiles')
      .withIndex('by_storage', (q) => q.eq('storageId', args.storageId))
      .first();
  },
});

// Cleanup old generated files (called by cron)
export const cleanupOldFiles = internalMutation({
  args: {
    maxAge: v.number(), // milliseconds
  },
  handler: async (ctx, args) => {
    const cutoff = Date.now() - args.maxAge;
    
    const oldFiles = await ctx.db
      .query('generatedFiles')
      .withIndex('by_createdAt', (q) => q.lt('createdAt', cutoff))
      .take(100);
    
    for (const file of oldFiles) {
      try {
        await ctx.storage.delete(file.storageId);
        await ctx.db.delete(file._id);
      } catch (e) {
        console.error('Failed to delete file:', e);
      }
    }
    
    return { deleted: oldFiles.length };
  },
});
