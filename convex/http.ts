import { httpRouter } from 'convex/server';
import { httpAction } from './_generated/server';
import { internal, components } from './_generated/api';
import {
  authenticateRequest,
  getCorsHeaders,
  jsonResponse,
  errorResponse,
} from './api/auth';
import { registerStaticRoutes } from '@convex-dev/self-static-hosting';

/**
 * HTTP Routes
 *
 * Public API for external integrations:
 * - /api/v1/agent/* - Agent API (chat, threads)
 * - /api/v1/data/* - Data API (skills, activity, config)
 * - /api/v1/mcp/* - MCP API (tools, resources)
 *
 * Channel webhooks:
 * - /api/webhook/* - Telegram, WhatsApp, Slack, Discord, Email
 */

const http = httpRouter();

// ============================================
// CORS Preflight Handler
// ============================================

const handleOptions = httpAction(async (_, request) => {
  const origin = request.headers.get('Origin');
  return new Response(null, {
    status: 204,
    headers: getCorsHeaders(origin),
  });
});

// Register OPTIONS for all API routes
http.route({ path: '/api/v1/agent/chat', method: 'OPTIONS', handler: handleOptions });
http.route({ path: '/api/v1/agent/threads', method: 'OPTIONS', handler: handleOptions });
http.route({ pathPrefix: '/api/v1/agent/threads/', method: 'OPTIONS', handler: handleOptions });
http.route({ path: '/api/v1/data/skills', method: 'OPTIONS', handler: handleOptions });
http.route({ path: '/api/v1/data/activity', method: 'OPTIONS', handler: handleOptions });
http.route({ path: '/api/v1/data/config', method: 'OPTIONS', handler: handleOptions });
http.route({ path: '/api/v1/data/usage', method: 'OPTIONS', handler: handleOptions });
http.route({ path: '/api/v1/mcp/tools', method: 'OPTIONS', handler: handleOptions });
http.route({ path: '/api/v1/mcp/tools/call', method: 'OPTIONS', handler: handleOptions });
http.route({ path: '/api/v1/mcp/resources', method: 'OPTIONS', handler: handleOptions });

// ============================================
// Health Check
// ============================================

http.route({
  path: '/api/health',
  method: 'GET',
  handler: httpAction(async () => {
    return jsonResponse({
      status: 'ok',
      version: '1.0.0',
      timestamp: Date.now(),
    });
  }),
});

// ============================================
// Agent API
// ============================================

// POST /api/v1/agent/chat - Send a message to the agent
http.route({
  path: '/api/v1/agent/chat',
  method: 'POST',
  handler: httpAction(async (ctx, request) => {
    const origin = request.headers.get('Origin');
    const cors = getCorsHeaders(origin);

    // Authenticate
    const auth = await authenticateRequest(ctx, request, {
      requiredScopes: ['agent:chat'],
    });

    if (!auth.valid) {
      return errorResponse(auth.error!, auth.statusCode, cors);
    }

    try {
      const body = await request.json();
      const { message, threadId, sessionId } = body;

      if (!message || typeof message !== 'string') {
        return errorResponse('Missing or invalid message', 400, cors);
      }

      const startTime = Date.now();

      // Call the chat action
      const result = await ctx.runAction(internal.chat.apiSend, {
        message,
        threadId,
        sessionId: sessionId ?? `api_${auth.apiKey?._id}`,
        apiKeyId: auth.apiKey?._id,
      });

      // Log usage
      if (auth.apiKey) {
        await ctx.runMutation(internal.apiUsage.log, {
          apiKeyId: auth.apiKey._id,
          endpoint: '/api/v1/agent/chat',
          method: 'POST',
          statusCode: result.error ? 400 : 200,
          tokensUsed: result.tokensUsed,
          inputTokens: result.inputTokens,
          outputTokens: result.outputTokens,
          durationMs: Date.now() - startTime,
          requestSize: message.length,
          responseSize: result.response?.length,
          userAgent: request.headers.get('User-Agent') ?? undefined,
        });
      }

      if (result.error) {
        return errorResponse(result.error, 400, cors);
      }

      return jsonResponse({
        response: result.response,
        threadId: result.threadId,
        tokensUsed: result.tokensUsed,
      }, 200, cors);
    } catch (error) {
      console.error('Chat API error:', error);
      return errorResponse('Internal server error', 500, cors);
    }
  }),
});

// GET /api/v1/agent/threads - List threads
http.route({
  path: '/api/v1/agent/threads',
  method: 'GET',
  handler: httpAction(async (ctx, request) => {
    const origin = request.headers.get('Origin');
    const cors = getCorsHeaders(origin);

    const auth = await authenticateRequest(ctx, request, {
      requiredScopes: ['agent:threads:read'],
    });

    if (!auth.valid) {
      return errorResponse(auth.error!, auth.statusCode, cors);
    }

    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get('limit') ?? '20');

    const threads = await ctx.runQuery(internal.threads.list, { limit });

    return jsonResponse({ threads }, 200, cors);
  }),
});

// GET /api/v1/agent/threads/:id - Get thread messages
http.route({
  pathPrefix: '/api/v1/agent/threads/',
  method: 'GET',
  handler: httpAction(async (ctx, request) => {
    const origin = request.headers.get('Origin');
    const cors = getCorsHeaders(origin);

    const auth = await authenticateRequest(ctx, request, {
      requiredScopes: ['agent:threads:read'],
    });

    if (!auth.valid) {
      return errorResponse(auth.error!, auth.statusCode, cors);
    }

    const url = new URL(request.url);
    const threadId = url.pathname.replace('/api/v1/agent/threads/', '');

    if (!threadId) {
      return errorResponse('Missing thread ID', 400, cors);
    }

    const messages = await ctx.runQuery(internal.threads.getMessages, { threadId });

    return jsonResponse({ threadId, messages }, 200, cors);
  }),
});

// POST /api/v1/agent/threads - Create a new thread
http.route({
  path: '/api/v1/agent/threads',
  method: 'POST',
  handler: httpAction(async (ctx, request) => {
    const origin = request.headers.get('Origin');
    const cors = getCorsHeaders(origin);

    const auth = await authenticateRequest(ctx, request, {
      requiredScopes: ['agent:threads:create'],
    });

    if (!auth.valid) {
      return errorResponse(auth.error!, auth.statusCode, cors);
    }

    const body = await request.json().catch(() => ({}));
    const thread = await ctx.runMutation(internal.threads.create, {
      metadata: body.metadata,
    });

    return jsonResponse({ threadId: thread.threadId }, 201, cors);
  }),
});

// ============================================
// Data API
// ============================================

// GET /api/v1/data/skills - List active skills
http.route({
  path: '/api/v1/data/skills',
  method: 'GET',
  handler: httpAction(async (ctx, request) => {
    const origin = request.headers.get('Origin');
    const cors = getCorsHeaders(origin);

    const auth = await authenticateRequest(ctx, request, {
      requiredScopes: ['data:skills:read'],
    });

    if (!auth.valid) {
      return errorResponse(auth.error!, auth.statusCode, cors);
    }

    const skills = await ctx.runQuery(internal.skillRegistry.getActiveApproved);

    // Return public info only
    const publicSkills = skills.map((s) => ({
      name: s.name,
      description: s.description,
      skillType: s.skillType,
      supportsImages: s.supportsImages,
      supportsStreaming: s.supportsStreaming,
    }));

    return jsonResponse({ skills: publicSkills }, 200, cors);
  }),
});

// GET /api/v1/data/activity - Get public activity
http.route({
  path: '/api/v1/data/activity',
  method: 'GET',
  handler: httpAction(async (ctx, request) => {
    const origin = request.headers.get('Origin');
    const cors = getCorsHeaders(origin);

    const auth = await authenticateRequest(ctx, request, {
      requiredScopes: ['data:activity:read'],
      allowPublic: true, // Allow unauthenticated access for public activity
    });

    if (!auth.valid) {
      return errorResponse(auth.error!, auth.statusCode, cors);
    }

    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get('limit') ?? '20');

    // If authenticated, return all activity; otherwise just public
    const activity = auth.apiKey
      ? await ctx.runQuery(internal.activityLog.listAll, { limit })
      : await ctx.runQuery(internal.activityLog.listPublicOnly, { limit });

    return jsonResponse({ activity }, 200, cors);
  }),
});

// GET /api/v1/data/config - Get agent config
http.route({
  path: '/api/v1/data/config',
  method: 'GET',
  handler: httpAction(async (ctx, request) => {
    const origin = request.headers.get('Origin');
    const cors = getCorsHeaders(origin);

    const auth = await authenticateRequest(ctx, request, {
      requiredScopes: ['data:config:read'],
    });

    if (!auth.valid) {
      return errorResponse(auth.error!, auth.statusCode, cors);
    }

    const config = await ctx.runQuery(internal.agentConfig.getPublic);

    return jsonResponse({ config }, 200, cors);
  }),
});

// GET /api/v1/data/usage - Get API usage stats
http.route({
  path: '/api/v1/data/usage',
  method: 'GET',
  handler: httpAction(async (ctx, request) => {
    const origin = request.headers.get('Origin');
    const cors = getCorsHeaders(origin);

    const auth = await authenticateRequest(ctx, request, {
      requiredScopes: ['data:usage:read'],
    });

    if (!auth.valid) {
      return errorResponse(auth.error!, auth.statusCode, cors);
    }

    const url = new URL(request.url);
    const days = parseInt(url.searchParams.get('days') ?? '7');

    const summary = await ctx.runQuery(internal.apiUsage.getSummaryForKey, {
      apiKeyId: auth.apiKey!._id,
      days,
    });

    return jsonResponse({ usage: summary }, 200, cors);
  }),
});

// ============================================
// MCP API (Model Context Protocol)
// ============================================

// GET /api/v1/mcp/tools - List available MCP tools
http.route({
  path: '/api/v1/mcp/tools',
  method: 'GET',
  handler: httpAction(async (ctx, request) => {
    const origin = request.headers.get('Origin');
    const cors = getCorsHeaders(origin);

    const auth = await authenticateRequest(ctx, request, {
      requiredScopes: ['mcp:tools:list'],
      allowPublic: true, // Allow listing tools publicly (like MCP spec)
    });

    if (!auth.valid) {
      return errorResponse(auth.error!, auth.statusCode, cors);
    }

    // Get active skills as MCP tools
    const skills = await ctx.runQuery(internal.skillRegistry.getActiveApproved);

    const tools = skills.map((skill) => {
      // Parse config for input schema
      let inputSchema = {};
      try {
        if (skill.config) {
          const config = JSON.parse(skill.config);
          inputSchema = config.inputSchema ?? {};
        }
      } catch {
        // Use empty schema
      }

      return {
        name: skill.name,
        description: skill.description,
        inputSchema,
      };
    });

    return jsonResponse({ tools }, 200, cors);
  }),
});

// POST /api/v1/mcp/tools/call - Call an MCP tool
http.route({
  path: '/api/v1/mcp/tools/call',
  method: 'POST',
  handler: httpAction(async (ctx, request) => {
    const origin = request.headers.get('Origin');
    const cors = getCorsHeaders(origin);

    const auth = await authenticateRequest(ctx, request, {
      requiredScopes: ['mcp:tools:call'],
    });

    if (!auth.valid) {
      return errorResponse(auth.error!, auth.statusCode, cors);
    }

    try {
      const body = await request.json();
      const { name, arguments: args } = body;

      if (!name || typeof name !== 'string') {
        return errorResponse('Missing tool name', 400, cors);
      }

      const startTime = Date.now();

      // Execute the tool
      const result = await ctx.runAction(internal.mcp.executeTool, {
        toolName: name,
        input: args,
        apiKeyId: auth.apiKey?._id,
      });

      // Log usage
      if (auth.apiKey) {
        await ctx.runMutation(internal.apiUsage.log, {
          apiKeyId: auth.apiKey._id,
          endpoint: '/api/v1/mcp/tools/call',
          method: 'POST',
          statusCode: result.error ? 400 : 200,
          durationMs: Date.now() - startTime,
          userAgent: request.headers.get('User-Agent') ?? undefined,
        });
      }

      if (result.error) {
        return errorResponse(result.error, 400, cors);
      }

      return jsonResponse({ result: result.output }, 200, cors);
    } catch (error) {
      console.error('MCP tool call error:', error);
      return errorResponse('Internal server error', 500, cors);
    }
  }),
});

// GET /api/v1/mcp/resources - List MCP resources
http.route({
  path: '/api/v1/mcp/resources',
  method: 'GET',
  handler: httpAction(async (ctx, request) => {
    const origin = request.headers.get('Origin');
    const cors = getCorsHeaders(origin);

    const auth = await authenticateRequest(ctx, request, {
      requiredScopes: ['mcp:resources:read'],
      allowPublic: true,
    });

    if (!auth.valid) {
      return errorResponse(auth.error!, auth.statusCode, cors);
    }

    // Get available resources (knowledge bases, etc.)
    const resources = await ctx.runAction(internal.mcp.listResources);

    return jsonResponse({ resources }, 200, cors);
  }),
});

// ============================================
// Channel Webhooks
// ============================================

// Telegram webhook
http.route({
  path: '/api/webhook/telegram',
  method: 'POST',
  handler: httpAction(async (ctx, request) => {
    try {
      const body = await request.json();
      const message = body.message;
      
      if (!message) {
        return jsonResponse({ ok: true });
      }
      
      const chatId = String(message.chat?.id);
      const from = message.from;
      const text = message.text;
      
      console.log('Telegram webhook received message:', {
        chatId,
        from: from?.username || from?.id,
        hasText: !!text,
        hasPhoto: !!(message.photo && message.photo.length > 0),
        hasSticker: !!message.sticker,
        hasDocument: !!message.document,
        documentMime: message.document?.mime_type,
        hasCaption: !!message.caption,
        photoCount: message.photo?.length || 0,
        messageKeys: Object.keys(message),
      });
      
      // Get or create session for this chat
      const session = await ctx.runMutation(internal.telegramSessions.getOrCreateSession, {
        chatId: chatId,
        username: from?.username,
        firstName: from?.first_name,
        lastName: from?.last_name,
      });
      
      console.log(`Telegram session for chat ${chatId}:`, session.isNew ? 'NEW' : 'EXISTING', 'thread:', session.threadId || 'none');
      
      // Handle /start command
      if (text === '/start') {
        await ctx.runMutation(internal.telegramSessions.resetSession, { chatId });
        
        const telegramConfig = await ctx.runQuery(internal.channelSecrets.getTelegramConfig);
        if (telegramConfig?.botToken) {
          await fetch(`https://api.telegram.org/bot${telegramConfig.botToken}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: chatId,
              text: `👋 Hello! I'm your AI assistant.\n\nYour previous conversation has been cleared. Let's start fresh!\n\nYou can:\n• Send me messages to chat\n• Upload images for analysis\n• Use /start anytime to reset the conversation`,
            }),
          });
        }
        return jsonResponse({ ok: true });
      }
      
      // Handle photos
      if (message.photo && message.photo.length > 0) {
        const photo = message.photo[message.photo.length - 1];
        const fileId = photo.file_id;
        const caption = message.caption || '';
        
        console.log(`Telegram photo from ${from?.username || from?.id}: ${caption}`);
        
        const telegramConfig = await ctx.runQuery(internal.channelSecrets.getTelegramConfig);
        if (telegramConfig?.botToken) {
          const fileResponse = await fetch(`https://api.telegram.org/bot${telegramConfig.botToken}/getFile?file_id=${fileId}`);
          const fileData = await fileResponse.json();
          
          if (fileData.ok) {
            const fileUrl = `https://api.telegram.org/file/bot${telegramConfig.botToken}/${fileData.result.file_path}`;
            
            // Send image to agent with caption
            try {
              const result = await ctx.runAction(internal.chat.apiSend, {
                message: caption || 'What do you see in this image?',
                threadId: session.threadId || undefined,
                sessionId: `telegram-${chatId}`,
                imageUrl: fileUrl,
              });
              
              // Update thread ID if new
              if (result.threadId && !session.threadId) {
                await ctx.runMutation(internal.telegramSessions.updateThreadId, {
                  sessionId: session.sessionId,
                  threadId: result.threadId,
                });
              }
              
              // Send response
              let responseText = result.response || 'I received your image but could not analyze it.';
              if (responseText.length > 4000) {
                responseText = responseText.substring(0, 4000) + '\n\n... (truncated)';
              }
              
              await fetch(`https://api.telegram.org/bot${telegramConfig.botToken}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  chat_id: chatId,
                  text: responseText,
                }),
              });
            } catch (error) {
              console.error('Error processing image:', error);
              await fetch(`https://api.telegram.org/bot${telegramConfig.botToken}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  chat_id: chatId,
                  text: 'I received your image but encountered an error analyzing it.',
                }),
              });
            }
          }
        }
        return jsonResponse({ ok: true });
      }
      
      // Handle stickers
      if (message.sticker) {
        const sticker = message.sticker;
        const fileId = sticker.file_id;
        const emoji = sticker.emoji || '';
        
        console.log(`Telegram sticker from ${from?.username || from?.id}: ${emoji}`);
        
        const telegramConfig = await ctx.runQuery(internal.channelSecrets.getTelegramConfig);
        if (telegramConfig?.botToken) {
          const fileResponse = await fetch(`https://api.telegram.org/bot${telegramConfig.botToken}/getFile?file_id=${fileId}`);
          const fileData = await fileResponse.json();
          
          if (fileData.ok) {
            const fileUrl = `https://api.telegram.org/file/bot${telegramConfig.botToken}/${fileData.result.file_path}`;
            
            // Send sticker info to agent
            try {
              const result = await ctx.runAction(internal.chat.apiSend, {
                message: `What does this sticker represent or express? ${emoji ? `It has emoji: ${emoji}` : ''}`,
                threadId: session.threadId || undefined,
                sessionId: `telegram-${chatId}`,
                imageUrl: fileUrl,
              });
              
              // Update thread ID if new
              if (result.threadId && !session.threadId) {
                await ctx.runMutation(internal.telegramSessions.updateThreadId, {
                  sessionId: session.sessionId,
                  threadId: result.threadId,
                });
              }
              
              // Send response
              let responseText = result.response || 'I received your sticker!';
              if (responseText.length > 4000) {
                responseText = responseText.substring(0, 4000) + '\n\n... (truncated)';
              }
              
              await fetch(`https://api.telegram.org/bot${telegramConfig.botToken}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  chat_id: chatId,
                  text: responseText,
                }),
              });
            } catch (error) {
              console.error('Error processing sticker:', error);
              await fetch(`https://api.telegram.org/bot${telegramConfig.botToken}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  chat_id: chatId,
                  text: 'I received your sticker but could not analyze it.',
                }),
              });
            }
          }
        }
        return jsonResponse({ ok: true });
      }

      // Handle documents (files) - including WEBP images sent as files
      if (message.document) {
        const document = message.document;
        const fileId = document.file_id;
        const fileName = document.file_name || 'file';
        const mimeType = document.mime_type || 'application/octet-stream';
        const caption = message.caption || '';

        console.log(`Telegram document: ${fileName} (${mimeType}) from ${from?.username || from?.id}`);

        // Process image files (including WEBP)
        if (mimeType.startsWith('image/')) {
          const telegramConfig = await ctx.runQuery(internal.channelSecrets.getTelegramConfig);
          if (telegramConfig?.botToken) {
            const fileResponse = await fetch(`https://api.telegram.org/bot${telegramConfig.botToken}/getFile?file_id=${fileId}`);
            const fileData = await fileResponse.json();

            if (fileData.ok) {
              const fileUrl = `https://api.telegram.org/file/bot${telegramConfig.botToken}/${fileData.result.file_path}`;

              // Send image to agent with caption
              try {
                const result = await ctx.runAction(internal.chat.apiSend, {
                  message: caption || 'What do you see in this image?',
                  threadId: session.threadId || undefined,
                  sessionId: `telegram-${chatId}`,
                  imageUrl: fileUrl,
                });

                // Update thread ID if new
                if (result.threadId && !session.threadId) {
                  await ctx.runMutation(internal.telegramSessions.updateThreadId, {
                    sessionId: session.sessionId,
                    threadId: result.threadId,
                  });
                }

                // Send response
                let responseText = result.response || 'I received your image but could not analyze it.';
                if (responseText.length > 4000) {
                  responseText = responseText.substring(0, 4000) + '\n\n... (truncated)';
                }

                await fetch(`https://api.telegram.org/bot${telegramConfig.botToken}/sendMessage`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    chat_id: chatId,
                    text: responseText,
                  }),
                });
              } catch (error) {
                console.error('Error processing document image:', error);
                await fetch(`https://api.telegram.org/bot${telegramConfig.botToken}/sendMessage`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    chat_id: chatId,
                    text: 'I received your image but encountered an error analyzing it.',
                  }),
                });
              }
            }
          }
        } else {
          // Non-image file
          const telegramConfig = await ctx.runQuery(internal.channelSecrets.getTelegramConfig);
          if (telegramConfig?.botToken) {
            await fetch(`https://api.telegram.org/bot${telegramConfig.botToken}/sendMessage`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                chat_id: chatId,
                text: `I received your file "${fileName}" (${mimeType}).\n\nI can currently only analyze images. File processing coming soon!`,
              }),
            });
          }
        }
        return jsonResponse({ ok: true });
      }

      // Handle regular text messages
      if (text) {
        console.log(`Telegram message from ${from?.username || from?.id}: ${text}`);
        
        try {
          const result = await ctx.runAction(internal.chat.apiSend, {
            message: text,
            threadId: session.threadId || undefined,
            sessionId: `telegram-${chatId}`,
          });
          
          console.log('Agent response result:', JSON.stringify(result).substring(0, 200));
          
          // Update thread ID for conversation history
          if (result.threadId && (!session.threadId || result.threadId !== session.threadId)) {
            await ctx.runMutation(internal.telegramSessions.updateThreadId, {
              sessionId: session.sessionId,
              threadId: result.threadId,
            });
          }
          
          // Send response back to Telegram
          const telegramConfig = await ctx.runQuery(internal.channelSecrets.getTelegramConfig);
          if (telegramConfig?.botToken) {
            let responseText = result.response || result.error || 'Sorry, I could not generate a response.';
            
            if (responseText.length > 4000) {
              responseText = responseText.substring(0, 4000) + '\n\n... (message truncated)';
            }
            
            const tgResponse = await fetch(`https://api.telegram.org/bot${telegramConfig.botToken}/sendMessage`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                chat_id: chatId,
                text: responseText,
                parse_mode: 'Markdown',
              }),
            });
            
            if (!tgResponse.ok) {
              // Try without markdown
              await fetch(`https://api.telegram.org/bot${telegramConfig.botToken}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  chat_id: chatId,
                  text: responseText,
                }),
              });
            }
          }
        } catch (error) {
          console.error('Error processing Telegram message:', error);
          const telegramConfig = await ctx.runQuery(internal.channelSecrets.getTelegramConfig);
          if (telegramConfig?.botToken) {
            await fetch(`https://api.telegram.org/bot${telegramConfig.botToken}/sendMessage`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                chat_id: chatId,
                text: 'Sorry, I encountered an error processing your message. Please try again.',
              }),
            });
          }
        }
      }
      
      return jsonResponse({ ok: true });
    } catch (error) {
      console.error('Telegram webhook error:', error);
      return jsonResponse({ ok: false, error: 'Internal server error' }, 500);
    }
  }),
});

// WhatsApp/Twilio webhook
http.route({
  path: '/api/webhook/whatsapp',
  method: 'POST',
  handler: httpAction(async (ctx, request) => {
    // TODO: Implement WhatsApp webhook handler
    console.log('WhatsApp webhook received');
    return jsonResponse({ ok: true });
  }),
});

// Slack webhook
http.route({
  path: '/api/webhook/slack',
  method: 'POST',
  handler: httpAction(async (ctx, request) => {
    try {
      const body = await request.json();
      
      // Handle Slack URL Verification (challenge)
      if (body.type === 'url_verification') {
        console.log('Slack URL verification received');
        return jsonResponse({ challenge: body.challenge });
      }
      
      // Handle Event Callback
      if (body.type === 'event_callback') {
        const event = body.event;
        const teamId = body.team_id;
        const eventType = event?.type;
        
        console.log(`Slack event received: ${eventType} from team ${teamId}`);
        
        // Get the Slack channel configuration
        const slackConfig = await ctx.runQuery(internal.channelSecrets.getSlackConfig);
        
        if (!slackConfig?.botToken) {
          console.error('Slack bot token not configured');
          return jsonResponse({ ok: true });
        }
        
        // Handle app_mention event
        if (eventType === 'app_mention') {
          const { text, channel, user, ts: threadTs } = event;
          const userMessage = text.replace(/<@.*?>/g, '').trim(); // Remove bot mention
          
          console.log(`App mention from ${user} in ${channel}: ${userMessage}`);
          
          // TODO: Send message to agent and get response
          // For now, send a placeholder response
          const responseText = `👋 Hi <@${user}>! You said: "${userMessage}"\n\nI'm still learning how to respond. Check back soon!`;
          
          // Send response back to Slack
          await ctx.runAction(internal.channelSecrets.sendSlackMessage, {
            botToken: slackConfig.botToken,
            channel,
            text: responseText,
            threadTs,
          });
        }
        
        // Handle direct message (message.im)
        if (eventType === 'message' && event.channel_type === 'im') {
          const { text, channel, user, ts: threadTs } = event;
          
          // Skip bot messages to avoid loops
          if (event.bot_id || event.subtype === 'bot_message') {
            return jsonResponse({ ok: true });
          }
          
          console.log(`Direct message from ${user} in ${channel}: ${text}`);
          
          // TODO: Send message to agent and get response
          const responseText = `👋 Hello <@${user}>! You said: "${text}"\n\nI'm still learning how to respond. Check back soon!`;
          
          await ctx.runAction(internal.channelSecrets.sendSlackMessage, {
            botToken: slackConfig.botToken,
            channel,
            text: responseText,
            threadTs,
          });
        }
        
        // Handle message with bot mentioned (for channels where bot is present)
        if (eventType === 'message' && event.text?.includes(`<@${body.authorizations?.[0]?.user_id}>`)) {
          const { text, channel, user, ts: threadTs } = event;
          const userMessage = text.replace(/<@.*?>/g, '').trim();
          
          // Skip bot messages
          if (event.bot_id || event.subtype === 'bot_message') {
            return jsonResponse({ ok: true });
          }
          
          console.log(`Message with mention from ${user} in ${channel}: ${userMessage}`);
          
          // TODO: Send message to agent and get response
          const responseText = `👋 Hi <@${user}>! You said: "${userMessage}"\n\nI'm still learning how to respond. Check back soon!`;
          
          await ctx.runAction(internal.channelSecrets.sendSlackMessage, {
            botToken: slackConfig.botToken,
            channel,
            text: responseText,
            threadTs,
          });
        }
      }
      
      return jsonResponse({ ok: true });
    } catch (error) {
      console.error('Slack webhook error:', error);
      return jsonResponse({ ok: false, error: 'Internal server error' }, 500);
    }
  }),
});

// Discord webhook
http.route({
  path: '/api/webhook/discord',
  method: 'POST',
  handler: httpAction(async (ctx, request) => {
    // Read raw body first so we never fail verification due to parse errors
    let body: { type?: number; data?: any; member?: any; user?: any; channel_id?: string; guild_id?: string; id?: string; token?: string; options?: any[] };
    try {
      const rawBody = await request.text();
      body = rawBody ? JSON.parse(rawBody) : {};
    } catch {
      // Verification probe or malformed body: respond with pong so Discord can verify the URL
      return jsonResponse({ type: 1 }, 200);
    }

    try {
      // Handle Discord Ping (type 1) - required for URL validation when saving Interactions Endpoint
      if (body.type === 1) {
        return jsonResponse({ type: 1 }, 200);
      }
      
      // Handle Application Command (type 2)
      if (body.type === 2) {
        const { data, member, user, channel_id, guild_id, id: interactionId, token: interactionToken } = body;
        const commandName = data?.name;
        const options = data?.options || [];
        
        // Get the user info (prefer member.user for guild interactions)
        const userInfo = member?.user || user;
        const userId = userInfo?.id;
        const username = userInfo?.username || 'Unknown';
        
        console.log(`Discord command received: ${commandName} from ${username} (${userId})`);
        
        // Process the command
        let responseContent = '';
        
        switch (commandName) {
          case 'chat': {
            const messageOption = options.find((opt: any) => opt.name === 'message');
            const message = messageOption?.value || 'Hello!';
            
            // TODO: Send message to agent and get response
            // For now, return a placeholder response
            responseContent = `👋 Hello ${username}! You said: "${message}"\n\nI'm still learning how to respond. Check back soon!`;
            break;
          }
          
          case 'help': {
            responseContent = `🤖 **ClawSync Agent Help**\n\nAvailable commands:\n• **/chat** <message> - Chat with the AI agent\n• **/help** - Show this help message\n\nThe agent can help you with various tasks and answer questions.`;
            break;
          }
          
          default:
            responseContent = `Unknown command: ${commandName}`;
        }
        
        // Return immediate response (type 4 = CHANNEL_MESSAGE_WITH_SOURCE)
        return jsonResponse({
          type: 4,
          data: {
            content: responseContent,
            flags: 0,
          },
        });
      }
      
      // Handle Message Component (type 3)
      if (body.type === 3) {
        console.log('Discord message component interaction received');
        return jsonResponse({
          type: 4,
          data: {
            content: 'Button clicked!',
          },
        });
      }
      
      // Unknown interaction type
      console.log('Unknown Discord interaction type:', body.type);
      return jsonResponse({ type: 1 }); // Default pong
      
    } catch (error) {
      console.error('Discord webhook error:', error);
      return jsonResponse({ 
        type: 4,
        data: {
          content: '❌ An error occurred while processing your request.',
          flags: 64, // EPHEMERAL - only visible to the user
        },
      }, 500);
    }
  }),
});

// Email webhook (Resend)
http.route({
  path: '/api/webhook/email',
  method: 'POST',
  handler: httpAction(async (ctx, request) => {
    try {
      const body = await request.json();
      
      // Resend webhook payload structure for inbound emails
      const {
        from,
        to,
        subject,
        text,
        html,
        messageId,
        headers,
      } = body;
      
      console.log(`Email received: ${subject} from ${from} to ${to}`);
      
      // Get email configuration
      const emailConfig = await ctx.runQuery(internal.channelSecrets.getEmailConfig);
      
      if (!emailConfig?.apiKey) {
        console.error('Resend API key not configured');
        return jsonResponse({ ok: true });
      }
      
      // Extract sender email and recipient
      const senderEmail = from;
      const recipientEmail = Array.isArray(to) ? to[0] : to;
      
      // Clean up the message text (remove signatures, etc.)
      const cleanText = text?.replace(/\n--+\s*\n.*$/s, '').trim() || '';
      
      console.log(`Processing email from ${senderEmail}: "${cleanText.substring(0, 100)}..."`);
      
      // TODO: Send message to agent and get response
      // For now, send an auto-reply
      const responseSubject = `Re: ${subject}`;
      const responseBody = `Hello!\n\nThank you for your email. You said:\n\n"${cleanText}"\n\nI'm an AI assistant and I'm still learning how to respond to emails. I'll get back to you soon!\n\nBest regards,\nClawSync Agent`;
      
      // Send response via Resend
      await ctx.runAction(internal.channelSecrets.sendEmail, {
        apiKey: emailConfig.apiKey,
        from: emailConfig.fromEmail || recipientEmail,
        to: senderEmail,
        subject: responseSubject,
        text: responseBody,
        replyTo: recipientEmail,
      });
      
      console.log('Email response sent');
      
      return jsonResponse({ ok: true });
    } catch (error) {
      console.error('Email webhook error:', error);
      return jsonResponse({ ok: false, error: 'Internal server error' }, 500);
    }
  }),
});

// AgentMail Webhook
http.route({
  path: '/api/webhook/agentmail',
  method: 'POST',
  handler: httpAction(async (ctx, request) => {
    try {
      const payload = await request.json();
      
      console.log('[AgentMail Webhook] Received:', payload);
      
      // AgentMail webhook payload
      const {
        inbox_id,
        message_id,
        from,
        to,
        subject,
        body: emailBody,
        html,
        thread_id,
      } = payload;
      
      if (!inbox_id || !message_id) {
        return jsonResponse({ error: 'Missing required fields' }, 400);
      }
      
      // Process the incoming email
      await ctx.runAction(internal.agentMail.handleWebhook, {
        inboxId: inbox_id,
        messageId: message_id,
        from: from || 'unknown',
        to: Array.isArray(to) ? to : [to],
        subject: subject || '(No subject)',
        body: emailBody || '',
        html: html || undefined,
        threadId: thread_id || undefined,
      });
      
      return jsonResponse({ ok: true });
    } catch (error) {
      console.error('[AgentMail Webhook] Error:', error);
      return jsonResponse({ ok: false, error: 'Internal server error' }, 500);
    }
  }),
});

// ============================================
// Static File Hosting (Convex Self Static Hosting)
// ============================================
// Serves the React frontend from Convex Storage.
// API routes are prefixed with /api, static files served from root.
// See: https://github.com/get-convex/self-static-hosting
registerStaticRoutes(http, components.selfStaticHosting, {
  spaFallback: true, // Serve index.html for client-side routing
});

export default http;
