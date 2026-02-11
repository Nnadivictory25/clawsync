'use node';

import { action, internalAction } from './_generated/server';
import { v } from 'convex/values';
import { internal } from './_generated/api';

/**
 * Supermemory Node.js actions.
 * Requires SUPERMEMORY_API_KEY environment variable.
 */

// Helper to create Supermemory client
async function getClient() {
  const apiKey = process.env.SUPERMEMORY_API_KEY;
  if (!apiKey) {
    throw new Error(
      'SUPERMEMORY_API_KEY not configured. Add it to your Convex environment variables.'
    );
  }
  const { default: Supermemory } = await import('supermemory');
  return new Supermemory({ apiKey });
}

// Add a memory
export const addMemory = action({
  args: {
    content: v.string(),
    containerTag: v.optional(v.string()),
  },
  returns: v.object({
    success: v.boolean(),
    error: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    try {
      const config = await ctx.runQuery(
        internal.supermemory.getConfigInternal
      );
      const prefix = config?.containerPrefix ?? 'clawsync';
      const tag = args.containerTag ?? `${prefix}_global`;

      const client = await getClient();
      await client.memories.add({
        content: args.content,
        containerTag: tag,
      });

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  },
});

// Search memories
export const searchMemories = action({
  args: {
    query: v.string(),
    containerTag: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    try {
      const config = await ctx.runQuery(
        internal.supermemory.getConfigInternal
      );
      const prefix = config?.containerPrefix ?? 'clawsync';
      const tag = args.containerTag ?? `${prefix}_global`;

      const client = await getClient();
      const results = await client.search.execute({
        q: args.query,
        containerTags: [tag],
        limit: args.limit ?? 10,
      });

      return { results: results.results, total: results.total };
    } catch (error) {
      return {
        results: [],
        total: 0,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  },
});

// Get user profile from memory
export const getUserProfile = action({
  args: {
    containerTag: v.optional(v.string()),
    query: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    try {
      const config = await ctx.runQuery(
        internal.supermemory.getConfigInternal
      );
      const prefix = config?.containerPrefix ?? 'clawsync';
      const tag = args.containerTag ?? `${prefix}_global`;

      const client = await getClient();
      const profile = await client.profile({
        containerTag: tag,
        q: args.query ?? 'general context',
      });

      return {
        profile: profile.profile,
        memories: profile.searchResults?.results ?? [],
      };
    } catch (error) {
      return {
        profile: { static: [], dynamic: [] },
        memories: [],
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  },
});

// Store a conversation in memory (internal, called by chat.ts)
export const storeConversation = internalAction({
  args: {
    conversation: v.string(),
    containerTag: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    try {
      const config = await ctx.runQuery(
        internal.supermemory.getConfigInternal
      );

      if (!config?.enabled || !config?.autoStoreConversations) {
        return null;
      }

      const prefix = config.containerPrefix ?? 'clawsync';
      const tag = args.containerTag ?? `${prefix}_conversations`;

      const client = await getClient();
      await client.memories.add({
        content: args.conversation,
        containerTag: tag,
      });
    } catch (error) {
      console.error('Failed to store conversation in Supermemory:', error);
    }

    return null;
  },
});

// Get memory context for chat (internal, called by chat.ts)
export const getMemoryContext = internalAction({
  args: {
    query: v.string(),
    containerTag: v.optional(v.string()),
  },
  returns: v.string(),
  handler: async (ctx, args) => {
    try {
      const config = await ctx.runQuery(
        internal.supermemory.getConfigInternal
      );

      if (!config?.enabled || !config?.autoInjectContext) {
        return '';
      }

      const prefix = config.containerPrefix ?? 'clawsync';
      const tag = args.containerTag ?? `${prefix}_global`;

      const client = await getClient();
      const profile = await client.profile({
        containerTag: tag,
        q: args.query,
      });

      const parts: Array<string> = [];

      if (profile.profile?.static?.length > 0) {
        parts.push(`User Profile:\n${profile.profile.static.join('\n')}`);
      }

      if (profile.profile?.dynamic?.length > 0) {
        parts.push(`Recent Context:\n${profile.profile.dynamic.join('\n')}`);
      }

      const limit = config.maxMemoriesPerQuery ?? 5;
      const memories = (profile.searchResults?.results ?? []).slice(0, limit);
      if (memories.length > 0) {
        parts.push(
          `Relevant Memories:\n${memories.map((m: unknown) => (m as { content: string }).content).join('\n---\n')}`
        );
      }

      return parts.join('\n\n');
    } catch (error) {
      console.error('Failed to get memory context:', error);
      return '';
    }
  },
});
