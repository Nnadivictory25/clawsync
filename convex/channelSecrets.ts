import { query, mutation, internalQuery, internalAction } from './_generated/server';
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

// Add or update a secret (upsert)
export const upsert = mutation({
  args: {
    channelId: v.id('channelConfig'),
    key: v.string(),
    value: v.string(),
  },
  handler: async (ctx, args) => {
    // Check if secret already exists
    const existing = await ctx.db
      .query('channelSecrets')
      .withIndex('by_channel', (q) => q.eq('channelId', args.channelId))
      .filter((q) => q.eq(q.field('key'), args.key))
      .first();

    // In production, encrypt the value using SKILL_SECRET_ENCRYPTION_KEY
    const encryptedValue = args.value; // TODO: Encrypt

    if (existing) {
      // Update existing secret
      await ctx.db.patch(existing._id, {
        encryptedValue,
      });
      return existing._id;
    } else {
      // Create new secret
      return await ctx.db.insert('channelSecrets', {
        channelId: args.channelId,
        key: args.key,
        encryptedValue,
        createdAt: Date.now(),
      });
    }
  },
});

// Delete a secret
export const remove = mutation({
  args: { id: v.id('channelSecrets') },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});

// Helper function to get Slack configuration
export const getSlackConfig = internalQuery({
  args: {},
  handler: async (ctx) => {
    // Find Slack channel config
    const slackConfig = await ctx.db
      .query('channelConfig')
      .withIndex('by_type', (q) => q.eq('channelType', 'slack'))
      .first();

    if (!slackConfig) {
      return null;
    }

    // Get secrets for Slack
    const secrets = await ctx.db
      .query('channelSecrets')
      .withIndex('by_channel', (q) => q.eq('channelId', slackConfig._id))
      .collect();

    const botToken = secrets.find((s) => s.key === 'botToken')?.encryptedValue;
    const signingSecret = secrets.find((s) => s.key === 'signingSecret')?.encryptedValue;

    return {
      botToken,
      signingSecret,
      channelId: slackConfig._id,
    };
  },
});

// Helper function to get Email configuration
export const getEmailConfig = internalQuery({
  args: {},
  handler: async (ctx) => {
    // Find Email channel config
    const emailConfig = await ctx.db
      .query('channelConfig')
      .withIndex('by_type', (q) => q.eq('channelType', 'email'))
      .first();

    if (!emailConfig) {
      return null;
    }

    // Get secrets for Email
    const secrets = await ctx.db
      .query('channelSecrets')
      .withIndex('by_channel', (q) => q.eq('channelId', emailConfig._id))
      .collect();

    const apiKey = secrets.find((s) => s.key === 'apiKey')?.encryptedValue;

    // Parse metadata for fromEmail
    let fromEmail = '';
    try {
      if (emailConfig.metadata) {
        const metadata = JSON.parse(emailConfig.metadata);
        fromEmail = metadata.fromEmail || '';
      }
    } catch (e) {
      // Ignore parse error
    }

    return {
      apiKey,
      fromEmail,
      channelId: emailConfig._id,
    };
  },
});

// Helper function to get Telegram configuration
export const getTelegramConfig = internalQuery({
  args: {},
  handler: async (ctx) => {
    // Find Telegram channel config
    const telegramConfig = await ctx.db
      .query('channelConfig')
      .withIndex('by_type', (q) => q.eq('channelType', 'telegram'))
      .first();

    if (!telegramConfig) {
      return null;
    }

    // Get secrets for Telegram
    const secrets = await ctx.db
      .query('channelSecrets')
      .withIndex('by_channel', (q) => q.eq('channelId', telegramConfig._id))
      .collect();

    const botToken = secrets.find((s) => s.key === 'botToken')?.encryptedValue;
    const webhookSecret = secrets.find((s) => s.key === 'webhookSecret')?.encryptedValue;

    return {
      botToken,
      webhookSecret,
      channelId: telegramConfig._id,
    };
  },
});

// Helper action to send Slack message
export const sendSlackMessage = internalAction({
  args: {
    botToken: v.string(),
    channel: v.string(),
    text: v.string(),
    threadTs: v.optional(v.string()),
  },
  handler: async (_ctx, args) => {
    const response = await fetch('https://slack.com/api/chat.postMessage', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${args.botToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        channel: args.channel,
        text: args.text,
        thread_ts: args.threadTs,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to send Slack message: ${response.status}`);
    }

    const data = await response.json();
    if (!data.ok) {
      throw new Error(`Slack API error: ${data.error}`);
    }

    return data;
  },
});

// Helper action to send email via Resend
export const sendEmail = internalAction({
  args: {
    apiKey: v.string(),
    from: v.string(),
    to: v.string(),
    subject: v.string(),
    text: v.string(),
    replyTo: v.optional(v.string()),
  },
  handler: async (_ctx, args) => {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${args.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: args.from,
        to: args.to,
        subject: args.subject,
        text: args.text,
        reply_to: args.replyTo,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Failed to send email: ${errorData.message || response.statusText}`);
    }

    const data = await response.json();
    return { messageId: data.id };
  },
});
