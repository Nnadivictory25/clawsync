import { createTool } from '@convex-dev/agent';
import { jsonSchema } from 'ai';
import { ActionCtx } from '../../_generated/server';
import { api } from '../../_generated/api';

/**
 * Post Tweet Tool
 * 
 * Posts a tweet to X (Twitter) using the configured account.
 */

export function createPostTweetTool(ctx: ActionCtx) {
  return createTool({
    description: `Post a tweet to X (Twitter). 
Use this when:
- The user asks you to tweet something
- You want to share updates or findings on X
- The user says "post this on X" or "tweet this"

IMPORTANT: First generate the tweet content yourself (write it), then call this tool with the text.

Requirements:
- Tweet text must be 280 characters or less
- Be mindful of posting frequency (rate limits apply)

The tweet will be posted from the configured X account.`,
    args: jsonSchema<{
      text: string;
    }>({
      type: 'object',
      properties: {
        text: {
          type: 'string',
          description: 'The tweet text (max 280 characters)',
        },
      },
      required: ['text'],
    }),
    handler: async (_toolCtx, args: any) => {
      const { text } = args as { text: string };

      try {
        // Check tweet length
        if (text.length > 280) {
          return {
            success: false,
            error: 'Tweet too long',
            message: `Tweet is ${text.length} characters. Maximum is 280 characters.`,
          };
        }

        // Get X config
        const config = await ctx.runQuery(api.xTwitter.getConfig);
        
        if (!config?.enabled) {
          return {
            success: false,
            error: 'X integration not enabled',
            message: 'X integration is not enabled. Please enable it in the SyncBoard first.',
          };
        }

        // Post the tweet
        const result = await ctx.runAction(api.xTwitter.postTweet, {
          text: text,
        });

        return {
          success: true,
          message: 'Tweet posted successfully!',
          tweetId: result.tweetId,
          url: `https://x.com/${config.username}/status/${result.tweetId}`,
        };
      } catch (error) {
        console.error('Post tweet error:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to post tweet',
          message: 'Could not post tweet. Please check X API credentials and rate limits.',
        };
      }
    },
  });
}
