import { v } from 'convex/values';
import { query, mutation, action } from './_generated/server';
import { api, internal } from './_generated/api';

// AgentMail API base URL
const AGENTMAIL_API_URL = 'https://api.agentmail.to/v0';

// ============================================
// Queries
// ============================================

// Get AgentMail configuration
export const getConfig = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query('agentMailConfig').first();
  },
});

// List all inboxes (capped at 100)
export const listInboxes = query({
  args: {},
  returns: v.array(v.object({
    _id: v.id('agentMailInboxes'),
    _creationTime: v.number(),
    inboxId: v.string(),
    email: v.string(),
    displayName: v.optional(v.string()),
    isDefault: v.boolean(),
    isActive: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })),
  handler: async (ctx) => {
    return await ctx.db.query('agentMailInboxes').take(100);
  },
});

// Get default inbox
export const getDefaultInbox = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query('agentMailInboxes')
      .withIndex('by_default', (q) => q.eq('isDefault', true))
      .first();
  },
});

// Get inbox by email
export const getInboxByEmail = query({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('agentMailInboxes')
      .withIndex('by_email', (q) => q.eq('email', args.email))
      .first();
  },
});

// List recent messages
export const listMessages = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 50;
    return await ctx.db
      .query('agentMailMessages')
      .withIndex('by_timestamp')
      .order('desc')
      .take(limit);
  },
});

// Get messages by inbox
export const getMessagesByInbox = query({
  args: { inboxId: v.string(), limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 50;
    return await ctx.db
      .query('agentMailMessages')
      .withIndex('by_inboxId', (q) => q.eq('inboxId', args.inboxId))
      .order('desc')
      .take(limit);
  },
});

// ============================================
// Mutations
// ============================================

// Initialize or update AgentMail config
export const updateConfig = mutation({
  args: {
    enabled: v.boolean(),
    defaultInboxId: v.optional(v.string()),
    autoReply: v.boolean(),
    forwardToAgent: v.boolean(),
    rateLimitPerHour: v.number(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.query('agentMailConfig').first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        enabled: args.enabled,
        defaultInboxId: args.defaultInboxId,
        autoReply: args.autoReply,
        forwardToAgent: args.forwardToAgent,
        rateLimitPerHour: args.rateLimitPerHour,
        updatedAt: Date.now(),
      });
      return existing._id;
    } else {
      return await ctx.db.insert('agentMailConfig', {
        enabled: args.enabled,
        defaultInboxId: args.defaultInboxId,
        autoReply: args.autoReply,
        forwardToAgent: args.forwardToAgent,
        rateLimitPerHour: args.rateLimitPerHour,
        updatedAt: Date.now(),
      });
    }
  },
});

// Toggle AgentMail enabled state
export const toggleEnabled = mutation({
  args: {},
  handler: async (ctx) => {
    const config = await ctx.db.query('agentMailConfig').first();
    if (config) {
      await ctx.db.patch(config._id, {
        enabled: !config.enabled,
        updatedAt: Date.now(),
      });
      return !config.enabled;
    }
    // Create default config if none exists
    await ctx.db.insert('agentMailConfig', {
      enabled: true,
      autoReply: false,
      forwardToAgent: true,
      rateLimitPerHour: 100,
      updatedAt: Date.now(),
    });
    return true;
  },
});

// Add inbox from AgentMail
export const addInbox = mutation({
  args: {
    inboxId: v.string(),
    email: v.string(),
    displayName: v.optional(v.string()),
    isDefault: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    // Check if inbox already exists
    const existing = await ctx.db
      .query('agentMailInboxes')
      .withIndex('by_inboxId', (q) => q.eq('inboxId', args.inboxId))
      .first();

    if (existing) {
      throw new Error('Inbox already exists');
    }

    // If this is the first inbox or marked as default, set it as default
    const existingInboxes = await ctx.db.query('agentMailInboxes').take(1);
    const isDefault = args.isDefault ?? existingInboxes.length === 0;

    // If setting as default, unset other defaults
    if (isDefault) {
      const currentDefault = await ctx.db
        .query('agentMailInboxes')
        .withIndex('by_default', (q) => q.eq('isDefault', true))
        .first();
      if (currentDefault) {
        await ctx.db.patch(currentDefault._id, { isDefault: false });
      }
    }

    return await ctx.db.insert('agentMailInboxes', {
      inboxId: args.inboxId,
      email: args.email,
      displayName: args.displayName,
      isDefault,
      isActive: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

// Remove inbox
export const removeInbox = mutation({
  args: { id: v.id('agentMailInboxes') },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});

// Sync inboxes from AgentMail API to local database
export const syncInboxes = action({
  args: {},
  handler: async (ctx) => {
    const apiKey = process.env.AGENTMAIL_API_KEY;
    if (!apiKey) {
      throw new Error('AGENTMAIL_API_KEY not configured');
    }

    console.log('[AgentMail] Syncing inboxes from API...');
    
    // Fetch all inboxes from AgentMail
    const response = await fetch(`${AGENTMAIL_API_URL}/inboxes`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to fetch inboxes: ${error}`);
    }

    const data = await response.json();
    console.log('[AgentMail] API response:', JSON.stringify(data, null, 2));
    
    // Handle different response formats
    let inboxes: any[] = [];
    if (Array.isArray(data)) {
      inboxes = data;
    } else if (data.inboxes && Array.isArray(data.inboxes)) {
      inboxes = data.inboxes;
    } else if (data.data && Array.isArray(data.data)) {
      inboxes = data.data;
    }
    
    console.log(`[AgentMail] Found ${inboxes.length} inboxes in API`);
    
    // Sync each inbox to our database
    const synced: string[] = [];
    for (const inbox of inboxes) {
      // AgentMail uses 'inbox_id' as the email address
      const inboxId = inbox.inbox_id || inbox.id;
      const email = inbox.inbox_id || inbox.email || inbox.address;
      
      if (!inboxId || !email) {
        console.warn('[AgentMail] Skipping inbox with missing fields:', inbox);
        continue;
      }
      
      // Check if already exists in our DB
      const existing = await ctx.runQuery(internal.agentMail.getInboxByEmail, { email });
      
      if (!existing) {
        // Add to our database
        await ctx.runMutation(internal.agentMail.addInbox, {
          inboxId,
          email,
          displayName: inbox.display_name || inbox.displayName || 'AgentMail Inbox',
        });
        synced.push(email);
        console.log(`[AgentMail] Synced inbox: ${email}`);
      } else {
        console.log(`[AgentMail] Inbox already in DB: ${email}`);
      }
    }
    
    return {
      total: inboxes.length,
      synced: synced.length,
      emails: synced,
    };
  },
});

// Set default inbox
export const setDefaultInbox = mutation({
  args: { id: v.id('agentMailInboxes') },
  handler: async (ctx, args) => {
    // Unset current default
    const currentDefault = await ctx.db
      .query('agentMailInboxes')
      .withIndex('by_default', (q) => q.eq('isDefault', true))
      .first();
    if (currentDefault) {
      await ctx.db.patch(currentDefault._id, { isDefault: false });
    }

    // Set new default
    await ctx.db.patch(args.id, { isDefault: true, updatedAt: Date.now() });
  },
});

// Log incoming message
export const logMessage = mutation({
  args: {
    messageId: v.string(),
    inboxId: v.string(),
    direction: v.union(v.literal('inbound'), v.literal('outbound')),
    fromEmail: v.string(),
    toEmail: v.string(),
    subject: v.string(),
    bodyPreview: v.optional(v.string()),
    threadId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert('agentMailMessages', {
      messageId: args.messageId,
      inboxId: args.inboxId,
      direction: args.direction,
      fromEmail: args.fromEmail,
      toEmail: args.toEmail,
      subject: args.subject,
      bodyPreview: args.bodyPreview,
      threadId: args.threadId,
      processedByAgent: false,
      timestamp: Date.now(),
    });
  },
});

// Mark message as processed by agent
export const markProcessed = mutation({
  args: {
    id: v.id('agentMailMessages'),
    agentResponse: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      processedByAgent: true,
      agentResponse: args.agentResponse,
    });
  },
});

// ============================================
// Actions (API calls to AgentMail)
// ============================================

// Create a new inbox via AgentMail API
export const createInbox = action({
  args: {
    username: v.optional(v.string()), // Local part of email
    displayName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const apiKey = process.env.AGENTMAIL_API_KEY;
    if (!apiKey) {
      throw new Error('AGENTMAIL_API_KEY environment variable not set');
    }

    // First check if we already have inboxes in AgentMail
    console.log('[AgentMail] Checking existing inboxes...');
    const existingInboxes = await ctx.runAction(internal.agentMail.fetchInboxes);
    
    if (existingInboxes && existingInboxes.length > 0) {
      // Use the first existing inbox
      const inbox = existingInboxes[0];
      console.log('[AgentMail] Using existing inbox:', inbox.email);
      
      // Check if we already have it in our database
      const dbInbox = await ctx.runQuery(internal.agentMail.getInboxByEmail, {
        email: inbox.email,
      });
      
      if (!dbInbox) {
        // Add to our database
        await ctx.runMutation(internal.agentMail.addInbox, {
          inboxId: inbox.id,
          email: inbox.email,
          displayName: args.displayName || inbox.display_name || 'AgentMail Inbox',
        });
      }
      
      return inbox;
    }

    // No existing inboxes, create a new one
    console.log('[AgentMail] Creating new inbox...');
    const response = await fetch(`${AGENTMAIL_API_URL}/inboxes`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: args.username,
        display_name: args.displayName,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = errorText;
      let errorDetails = '';
      
      try {
        const errorJson = JSON.parse(errorText);
        errorMessage = errorJson.message || errorJson.error || errorText;
        errorDetails = JSON.stringify(errorJson);
      } catch {
        // Keep original text if not JSON
      }
      
      console.error('AgentMail create inbox failed:', {
        status: response.status,
        statusText: response.statusText,
        error: errorMessage,
        details: errorDetails,
        url: AGENTMAIL_API_URL,
      });
      
      if (response.status === 401) {
        throw new Error(`AgentMail authentication failed. Check AGENTMAIL_API_KEY in Convex Dashboard.`);
      } else if (response.status === 403 && errorMessage.toLowerCase().includes('already exists')) {
        // Inbox already exists, fetch and return it
        console.log('[AgentMail] Inbox already exists, fetching existing inboxes...');
        const inboxes: any[] = await ctx.runAction(api.agentMail.fetchInboxes);
        console.log('[AgentMail] Fetched inboxes:', JSON.stringify(inboxes));
        if (inboxes && inboxes.length > 0) {
          const inbox = inboxes[0];
          // Store in database if not already there
          const dbInbox = await ctx.runQuery(api.agentMail.getInboxByEmail, {
            email: inbox.email,
          });
          if (!dbInbox) {
            await ctx.runMutation(api.agentMail.addInbox, {
              inboxId: inbox.id,
              email: inbox.email,
              displayName: args.displayName || inbox.display_name || 'AgentMail Inbox',
            });
          }
          return inbox;
        }
        throw new Error('Inbox exists but could not be retrieved. Response: ' + JSON.stringify(inboxes));
      } else {
        throw new Error(`Failed to create inbox (${response.status}): ${errorMessage}`);
      }
    }

    const data = await response.json();
    
    console.log('[AgentMail] API response:', JSON.stringify(data, null, 2));

    // AgentMail API returns different field names - handle both
    const inboxId = data.id || data.inbox_id;
    const email = data.email || data.address || data.inbox_email;
    
    if (!inboxId || !email) {
      console.error('[AgentMail] Missing required fields in response:', data);
      throw new Error(`Invalid API response: missing inboxId or email. Response: ${JSON.stringify(data)}`);
    }

    // Store inbox in database
    await ctx.runMutation(api.agentMail.addInbox, {
      inboxId: inboxId,
      email: email,
      displayName: args.displayName,
    });

    // Log activity (internal mutation)
    await ctx.runMutation(internal.activityLog.log, {
      actionType: 'agentmail_inbox_created',
      summary: `Created AgentMail inbox: ${data.email}`,
      visibility: 'private',
    });

    return data;
  },
});

// List inboxes from AgentMail API
export const fetchInboxes = action({
  args: {},
  handler: async (_ctx) => {
    const apiKey = process.env.AGENTMAIL_API_KEY;
    if (!apiKey) {
      throw new Error('AGENTMAIL_API_KEY environment variable not set');
    }

    const response = await fetch(`${AGENTMAIL_API_URL}/inboxes`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to fetch inboxes: ${error}`);
    }

    const data = await response.json();
    console.log('[AgentMail] Fetch inboxes response:', JSON.stringify(data, null, 2));
    
    // Handle different response formats
    if (Array.isArray(data)) {
      return data;
    } else if (data.inboxes && Array.isArray(data.inboxes)) {
      return data.inboxes;
    } else if (data.data && Array.isArray(data.data)) {
      return data.data;
    }
    
    return [];
  },
});

// Send email via AgentMail API
export const sendEmail = action({
  args: {
    inboxId: v.string(),
    to: v.string(),
    subject: v.string(),
    body: v.string(),
    html: v.optional(v.string()),
    replyToMessageId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const apiKey = process.env.AGENTMAIL_API_KEY;
    if (!apiKey) {
      throw new Error('AGENTMAIL_API_KEY environment variable not set');
    }

    // Check rate limit
    const config = await ctx.runQuery(api.agentMail.getConfig);
    if (!config?.enabled) {
      throw new Error('AgentMail is not enabled');
    }

    const response = await fetch(`${AGENTMAIL_API_URL}/inboxes/${encodeURIComponent(args.inboxId)}/messages/send`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: args.to,
        subject: args.subject,
        text: args.body,
        html: args.html,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to send email: ${error}`);
    }

    const data = await response.json();
    console.log('[AgentMail] Send email response:', JSON.stringify(data, null, 2));

    // Log outbound message
    await ctx.runMutation(api.agentMail.logMessage, {
      messageId: data.message_id || data.id || `sent-${Date.now()}`,
      inboxId: args.inboxId,
      direction: 'outbound',
      fromEmail: data.from || 'agent',
      toEmail: args.to,
      subject: args.subject,
      bodyPreview: args.body.substring(0, 200),
    });

    // Log activity (internal mutation)
    await ctx.runMutation(internal.activityLog.log, {
      actionType: 'agentmail_sent',
      summary: `Sent email to ${args.to}: ${args.subject}`,
      visibility: 'private',
    });

    return data;
  },
});

// Fetch messages from AgentMail API
export const fetchMessages = action({
  args: { inboxId: v.string() },
  handler: async (_ctx, args) => {
    const apiKey = process.env.AGENTMAIL_API_KEY;
    if (!apiKey) {
      throw new Error('AGENTMAIL_API_KEY environment variable not set');
    }

    const response = await fetch(`${AGENTMAIL_API_URL}/inboxes/${args.inboxId}/messages`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to fetch messages: ${error}`);
    }

    return await response.json();
  },
});

// Delete inbox via AgentMail API
export const deleteInbox = action({
  args: { inboxId: v.string() },
  handler: async (ctx, args) => {
    const apiKey = process.env.AGENTMAIL_API_KEY;
    if (!apiKey) {
      throw new Error('AGENTMAIL_API_KEY environment variable not set');
    }

    const response = await fetch(`${AGENTMAIL_API_URL}/inboxes/${args.inboxId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to delete inbox: ${error}`);
    }

    // Remove from database
    const inbox = await ctx.runQuery(api.agentMail.listInboxes);
    const found = inbox.find((i: { inboxId: string }) => i.inboxId === args.inboxId);
    if (found) {
      await ctx.runMutation(api.agentMail.removeInbox, { id: found._id });
    }

    // Log activity (internal mutation)
    await ctx.runMutation(internal.activityLog.log, {
      actionType: 'agentmail_inbox_deleted',
      summary: `Deleted AgentMail inbox: ${args.inboxId}`,
      visibility: 'private',
    });

    return { success: true };
  },
});

// Webhook handler for incoming emails
export const handleWebhook = action({
  args: {
    inboxId: v.string(),
    messageId: v.string(),
    from: v.string(),
    to: v.array(v.string()),
    subject: v.string(),
    body: v.string(),
    html: v.optional(v.string()),
    threadId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Log the incoming message
    const messageId = await ctx.runMutation(internal.agentMail.logMessage, {
      messageId: args.messageId,
      inboxId: args.inboxId,
      direction: 'inbound',
      fromEmail: args.from,
      toEmail: args.to.join(', '),
      subject: args.subject,
      bodyPreview: args.body.slice(0, 200),
      threadId: args.threadId,
    });

    console.log(`[AgentMail] Received email from ${args.from}: "${args.subject}"`);

    // Get AgentMail config to check if auto-reply is enabled
    const config = await ctx.runQuery(internal.agentMail.getConfig);

    if (config?.forwardToAgent) {
      // Forward to agent for processing
      try {
        const agent = await ctx.runAction(internal.chat.send, {
          message: `Email received from ${args.from}:\n\nSubject: ${args.subject}\n\nBody:\n${args.body}`,
          metadata: {
            source: 'email',
            from: args.from,
            subject: args.subject,
            inboxId: args.inboxId,
          },
        });

        // Mark as processed
        await ctx.runMutation(internal.agentMail.markProcessed, {
          id: messageId as any,
          agentResponse: agent.response,
        });

        // If auto-reply is enabled, send response back
        if (config.autoReply) {
          await ctx.runAction(internal.agentMail.sendEmail, {
            inboxId: args.inboxId,
            to: [args.from],
            subject: `Re: ${args.subject}`,
            body: agent.response,
          });
        }
      } catch (error) {
        console.error('[AgentMail] Failed to process email with agent:', error);
      }
    }

    return { success: true };
  },
});
