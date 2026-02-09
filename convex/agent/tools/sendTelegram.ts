import { createTool } from '@convex-dev/agent';
import { jsonSchema } from 'ai';
import { ActionCtx } from '../../_generated/server';
import { internal } from '../../_generated/api';

/**
 * Telegram Send Message Tool
 * 
 * Sends messages and files to Telegram users.
 * Use this to deliver generated content (PDFs, reports, etc.) to users via Telegram.
 */

export function createSendTelegramMessageTool(ctx: ActionCtx) {
  return createTool({
    description: `Send a message or file to a Telegram user/chat.
Use this when:
- The user asks you to send something to Telegram
- You've generated a PDF/report and the user wants it delivered on Telegram
- You need to notify the user about completed tasks
- The user says "send it to me on Telegram" or "message me on Telegram"

IMPORTANT: If the user has previously messaged the bot on Telegram, their chat ID is automatically stored in the session and will be used. If no Telegram session exists, you should tell the user to message the bot on Telegram first before you can send them anything.

You can send either:
- A simple text message
- A file (PDF, document, image) with optional caption`,
    args: jsonSchema<{
      message: string;
      fileUrl?: string;
      fileName?: string;
    }>({
      type: 'object',
      properties: {
        message: {
          type: 'string',
          description: 'Text message to send. Can include markdown formatting.',
        },
        fileUrl: {
          type: 'string',
          description: 'Optional: URL of a file to send (PDF, image, document). The file will be attached to the message.',
        },
        fileName: {
          type: 'string',
          description: 'Optional: Custom filename for the file being sent.',
        },
      },
      required: ['message'],
    }),
    handler: async (_toolCtx, args: any) => {
      const { message, fileUrl, fileName } = args as {
        message: string;
        fileUrl?: string;
        fileName?: string;
      };
      
      // Try to get chatId from the most recent Telegram session
      let chatId: string | undefined;
      try {
        // Get the most recent active Telegram session
        const sessions = await ctx.runQuery(internal.telegramSessions.getRecentSessions, {
          limit: 1,
        });
        
        if (sessions && sessions.length > 0) {
          chatId = sessions[0].chatId;
          console.log('Auto-detected Telegram chat ID from session:', chatId);
        }
      } catch (e) {
        console.error('Error getting Telegram session:', e);
      }
      
      // If no session found, tell user to message the bot first
      if (!chatId) {
        return {
          success: false,
          error: 'No Telegram session found.',
          message: "I don't have your Telegram contact yet. Please message me on Telegram first, then I can send you files and updates there!",
        };
      }

      try {
        // Ensure chatId is defined
        if (!chatId) {
          return {
            success: false,
            error: 'No Telegram chat ID available.',
            message: 'Could not determine your Telegram chat ID. Please message me on Telegram first, then ask me to send you something.',
          };
        }

        // Get Telegram bot token
        const telegramConfig = await ctx.runQuery(internal.channelSecrets.getTelegramConfig);
        if (!telegramConfig?.botToken) {
          return {
            success: false,
            error: 'Telegram bot not configured. Please set up Telegram integration first.',
            message: 'Cannot send Telegram message: Bot token not found.',
          };
        }

        let response;

        // If file URL provided, send as document
        if (fileUrl) {
          console.log(`Sending file to Telegram chat ${chatId}: ${fileName || 'document'}`);
          
          // Fetch the file
          const fileResponse = await fetch(fileUrl);
          if (!fileResponse.ok) {
            throw new Error(`Failed to fetch file: ${fileResponse.status}`);
          }
          
          const fileBuffer = await fileResponse.arrayBuffer();
          const blob = new Blob([fileBuffer]);
          
          // Create form data
          const formData = new FormData();
          formData.append('chat_id', chatId);
          formData.append('caption', message);
          formData.append('parse_mode', 'Markdown');
          formData.append('document', blob, fileName || 'document.pdf');
          
          // Send document
          response = await fetch(
            `https://api.telegram.org/bot${telegramConfig.botToken}/sendDocument`,
            {
              method: 'POST',
              body: formData,
            }
          );
        } else {
          // Send text message only
          console.log(`Sending message to Telegram chat ${chatId}`);
          
          response = await fetch(
            `https://api.telegram.org/bot${telegramConfig.botToken}/sendMessage`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                chat_id: chatId,
                text: message,
                parse_mode: 'Markdown',
              }),
            }
          );
        }

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.description || `HTTP ${response.status}`);
        }

        const result = await response.json();
        
        return {
          success: true,
          message: fileUrl 
            ? `File "${fileName || 'document'}" sent successfully to Telegram!`
            : 'Message sent successfully to Telegram!',
          telegramMessageId: result.result?.message_id,
          chatId: chatId,
        };
      } catch (error) {
        console.error('Telegram send error:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to send Telegram message',
          message: 'Could not send message to Telegram. Make sure:\n1. The chat_id is correct\n2. The user has started a conversation with the bot\n3. The bot token is valid',
        };
      }
    },
  });
}
