import { query, mutation, action, internalMutation, internalQuery } from './_generated/server';
import { v } from 'convex/values';
import { internal } from './_generated/api';

/**
 * X/Twitter Integration
 *
 * Enables the agent to interact with X (Twitter) via API v2.
 * Features:
 * - Read tweets and mentions
 * - Reply to tweets
 * - Post new tweets
 * - Display agent tweets on landing page
 *
 * Required Environment Variables:
 * - X_BEARER_TOKEN: For read operations (OAuth 2.0 App-Only)
 * - X_API_KEY: OAuth 1.0a Consumer Key
 * - X_API_SECRET: OAuth 1.0a Consumer Secret
 * - X_ACCESS_TOKEN: OAuth 1.0a Access Token
 * - X_ACCESS_TOKEN_SECRET: OAuth 1.0a Access Token Secret
 *
 * See: https://developer.x.com/en/docs/x-api
 */

// ============================================
// Configuration
// ============================================

// Get X configuration
export const getConfig = query({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    return await ctx.db.query('xConfig').first();
  },
});

// Update X configuration
export const updateConfig = mutation({
  args: {
    enabled: v.boolean(),
    username: v.optional(v.string()),
    showOnLanding: v.boolean(),
    autoReply: v.boolean(),
    postFromAgent: v.boolean(),
    rateLimitPerHour: v.number(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.query('xConfig').first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        ...args,
        updatedAt: Date.now(),
      });
      return existing._id;
    } else {
      return await ctx.db.insert('xConfig', {
        ...args,
        updatedAt: Date.now(),
      });
    }
  },
});

// ============================================
// Tweet Queries
// ============================================

// Get tweets for landing page
export const getLandingTweets = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const config = await ctx.db.query('xConfig').first();

    // Only return tweets if showOnLanding is enabled
    if (!config?.showOnLanding) {
      return [];
    }

    return await ctx.db
      .query('xTweets')
      .withIndex('by_showOnLanding', (q) => q.eq('showOnLanding', true))
      .order('desc')
      .take(args.limit ?? 5);
  },
});

// Get all cached tweets (for SyncBoard)
export const listTweets = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('xTweets')
      .withIndex('by_postedAt')
      .order('desc')
      .take(args.limit ?? 50);
  },
});

// Toggle tweet visibility on landing page
export const toggleTweetLandingVisibility = mutation({
  args: {
    tweetId: v.string(),
    showOnLanding: v.boolean(),
  },
  handler: async (ctx, args) => {
    const tweet = await ctx.db
      .query('xTweets')
      .withIndex('by_tweetId', (q) => q.eq('tweetId', args.tweetId))
      .first();

    if (tweet) {
      await ctx.db.patch(tweet._id, { showOnLanding: args.showOnLanding });
    }
  },
});

// ============================================
// Tweet Actions (require X API credentials)
// ============================================

// Post a tweet
export const postTweet = action({
  args: {
    text: v.string(),
    replyToTweetId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Check if X integration is enabled and posting is allowed
    const config = await ctx.runQuery(internal.xTwitter.getConfigInternal);
    if (!config?.enabled || !config?.postFromAgent) {
      throw new Error('X/Twitter posting is not enabled');
    }

    // Get credentials from environment
    const apiKey = process.env.X_API_KEY;
    const apiSecret = process.env.X_API_SECRET;
    const accessToken = process.env.X_ACCESS_TOKEN;
    const accessTokenSecret = process.env.X_ACCESS_TOKEN_SECRET;

    if (!apiKey || !apiSecret || !accessToken || !accessTokenSecret) {
      throw new Error('X/Twitter credentials not configured. Set X_API_KEY, X_API_SECRET, X_ACCESS_TOKEN, X_ACCESS_TOKEN_SECRET in Convex environment.');
    }

    // Build request body
    const body: Record<string, unknown> = { text: args.text };
    if (args.replyToTweetId) {
      body.reply = { in_reply_to_tweet_id: args.replyToTweetId };
    }

    // Make OAuth 1.0a signed request to X API v2
    // Note: In production, use a proper OAuth library
    const response = await makeOAuthRequest(
      'POST',
      'https://api.twitter.com/2/tweets',
      body,
      { apiKey, apiSecret, accessToken, accessTokenSecret }
    );

    if (!response.ok) {
      const error = await response.text();
      const errorData = JSON.parse(error);
      
      if (errorData.status === 403 && errorData.detail?.includes('oauth1 app permissions')) {
        throw new Error(`X API Error: Your Access Token doesn't have write permissions. 

To fix this:
1. Go to https://developer.x.com/en/portal/dashboard
2. Find your app → Keys and Tokens
3. Regenerate Access Token & Secret
4. CHECK THE BOX for "Read and Write" permissions
5. Update X_ACCESS_TOKEN and X_ACCESS_TOKEN_SECRET in Convex Dashboard

Current error: ${error}`);
      }
      
      throw new Error(`Failed to post tweet: ${error}`);
    }

    const result = await response.json();
    console.log('[X/Twitter] Post tweet response:', JSON.stringify(result, null, 2));

    // X API v2 returns { data: { id: string, text: string } }
    const tweetId = result.data?.id || result.id;
    
    if (!tweetId) {
      console.error('[X/Twitter] No tweet ID in response:', result);
      throw new Error('Tweet posted but no ID returned in response');
    }

    // Cache the tweet
    await ctx.runMutation(internal.xTwitter.cacheTweet, {
      tweetId: tweetId,
      text: args.text,
      authorUsername: config.username || 'agent',
      isAgentTweet: true,
      isReply: !!args.replyToTweetId,
      replyToTweetId: args.replyToTweetId,
      showOnLanding: config.showOnLanding,
    });

    // Log activity
    await ctx.runMutation(internal.xTwitter.logTweetActivity, {
      actionType: args.replyToTweetId ? 'x_reply' : 'x_post',
      summary: args.replyToTweetId
        ? `Replied to tweet: ${args.text.substring(0, 50)}...`
        : `Posted tweet: ${args.text.substring(0, 50)}...`,
      visibility: 'public',
    });

    return { id: tweetId, text: args.text };
  },
});

// Read mentions (for auto-reply feature)
export const fetchMentions = action({
  args: {
    sinceId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const bearerToken = process.env.X_BEARER_TOKEN;
    if (!bearerToken) {
      throw new Error('X_BEARER_TOKEN not configured');
    }

    const config = await ctx.runQuery(internal.xTwitter.getConfigInternal);
    if (!config?.enabled || !config?.username) {
      throw new Error('X/Twitter integration not configured');
    }

    // Get user ID from username
    const userResponse = await fetch(
      `https://api.twitter.com/2/users/by/username/${config.username}`,
      {
        headers: { Authorization: `Bearer ${bearerToken}` },
      }
    );

    if (!userResponse.ok) {
      throw new Error('Failed to get user info');
    }

    const userData = await userResponse.json();
    const userId = userData.data.id;

    // Fetch mentions
    let url = `https://api.twitter.com/2/users/${userId}/mentions?tweet.fields=author_id,created_at,public_metrics&expansions=author_id&user.fields=username,name,profile_image_url`;
    if (args.sinceId) {
      url += `&since_id=${args.sinceId}`;
    }

    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${bearerToken}` },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch mentions');
    }

    return await response.json();
  },
});

// Read a specific tweet
export const readTweet = action({
  args: {
    tweetId: v.string(),
  },
  handler: async (ctx, args) => {
    const bearerToken = process.env.X_BEARER_TOKEN;
    if (!bearerToken) {
      throw new Error('X_BEARER_TOKEN not configured');
    }

    const response = await fetch(
      `https://api.twitter.com/2/tweets/${args.tweetId}?tweet.fields=author_id,created_at,public_metrics,conversation_id&expansions=author_id&user.fields=username,name,profile_image_url`,
      {
        headers: { Authorization: `Bearer ${bearerToken}` },
      }
    );

    if (!response.ok) {
      throw new Error('Failed to read tweet');
    }

    return await response.json();
  },
});

// ============================================
// Internal Functions
// ============================================

// Internal query for actions to read X config
export const getConfigInternal = internalQuery({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query('xConfig').first();
  },
});

export const cacheTweet = internalMutation({
  args: {
    tweetId: v.string(),
    text: v.string(),
    authorUsername: v.string(),
    authorDisplayName: v.optional(v.string()),
    authorProfileImageUrl: v.optional(v.string()),
    isAgentTweet: v.boolean(),
    isReply: v.boolean(),
    replyToTweetId: v.optional(v.string()),
    likeCount: v.optional(v.number()),
    retweetCount: v.optional(v.number()),
    replyCount: v.optional(v.number()),
    showOnLanding: v.boolean(),
    postedAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Check if tweet already exists
    const existing = await ctx.db
      .query('xTweets')
      .withIndex('by_tweetId', (q) => q.eq('tweetId', args.tweetId))
      .first();

    if (existing) {
      // Update existing tweet
      await ctx.db.patch(existing._id, {
        ...args,
        fetchedAt: Date.now(),
      });
      return existing._id;
    }

    // Insert new tweet
    return await ctx.db.insert('xTweets', {
      ...args,
      postedAt: args.postedAt ?? Date.now(),
      fetchedAt: Date.now(),
    });
  },
});

export const logTweetActivity = internalMutation({
  args: {
    actionType: v.string(),
    summary: v.string(),
    visibility: v.union(v.literal('public'), v.literal('private')),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert('activityLog', {
      actionType: args.actionType,
      summary: args.summary,
      channel: 'x',
      visibility: args.visibility,
      timestamp: Date.now(),
    });
  },
});

// ============================================
// OAuth 1.0a Helper (simplified)
// ============================================

async function makeOAuthRequest(
  method: string,
  url: string,
  body: Record<string, unknown>,
  credentials: {
    apiKey: string;
    apiSecret: string;
    accessToken: string;
    accessTokenSecret: string;
  }
): Promise<Response> {
  // OAuth 1.0a implementation using Web Crypto API
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const nonce = Array.from(crypto.getRandomValues(new Uint8Array(16)))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');

  // Create signature base string
  const oauthParams: Record<string, string> = {
    oauth_consumer_key: credentials.apiKey,
    oauth_nonce: nonce,
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: timestamp,
    oauth_token: credentials.accessToken,
    oauth_version: '1.0',
  };

  // Sort parameters alphabetically
  const sortedParams = Object.keys(oauthParams)
    .sort()
    .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(oauthParams[key])}`)
    .join('&');

  const signatureBaseString = [
    method.toUpperCase(),
    encodeURIComponent(url),
    encodeURIComponent(sortedParams),
  ].join('&');

  // Create signing key
  const signingKey = `${encodeURIComponent(credentials.apiSecret)}&${encodeURIComponent(credentials.accessTokenSecret)}`;

  // Generate HMAC-SHA1 signature
  const encoder = new TextEncoder();
  const keyData = encoder.encode(signingKey);
  const messageData = encoder.encode(signatureBaseString);
  
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-1' },
    false,
    ['sign']
  );
  
  const signatureBuffer = await crypto.subtle.sign('HMAC', cryptoKey, messageData);
  const signature = btoa(String.fromCharCode(...new Uint8Array(signatureBuffer)));

  // Build Authorization header
  const authHeader = `OAuth ${Object.keys(oauthParams)
    .sort()
    .map(key => `${encodeURIComponent(key)}="${encodeURIComponent(oauthParams[key])}"`)
    .join(', ')}, oauth_signature="${encodeURIComponent(signature)}"`;

  return fetch(url, {
    method,
    headers: {
      Authorization: authHeader,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
}

/**
 * NOTE: For production X/Twitter integration, you should:
 *
 * 1. Install oauth-1.0a package: npm install oauth-1.0a
 * 2. Use proper OAuth 1.0a signing for POST requests
 * 3. Implement proper rate limiting (450 requests/15 min for user auth)
 * 4. Handle pagination for reading tweets
 * 5. Implement webhook for real-time mentions (requires Twitter Premium)
 *
 * Example with oauth-1.0a:
 *
 * import OAuth from 'oauth-1.0a';
 * import crypto from 'crypto';
 *
 * const oauth = new OAuth({
 *   consumer: { key: apiKey, secret: apiSecret },
 *   signature_method: 'HMAC-SHA1',
 *   hash_function(baseString, key) {
 *     return crypto.createHmac('sha1', key).update(baseString).digest('base64');
 *   },
 * });
 */
