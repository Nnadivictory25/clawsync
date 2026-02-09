import { createTool } from '@convex-dev/agent';
import { jsonSchema } from 'ai';
import { ActionCtx } from '../../_generated/server';
import { internal } from '../../_generated/api';

/**
 * Send Email Tool
 * 
 * Sends emails using AgentMail. Can send to any email address.
 * Use this to deliver reports, updates, or any content via email.
 */

// Simple markdown to HTML converter
function markdownToHtml(markdown: string): string {
  let html = markdown
    // Headers
    .replace(/^### (.*$)/gim, '<h3>$1</h3>')
    .replace(/^## (.*$)/gim, '<h2>$1</h2>')
    .replace(/^# (.*$)/gim, '<h1>$1</h1>')
    // Bold and italic
    .replace(/\*\*\*(.*?)\*\*\*/g, '<strong><em>$1</em></strong>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    // Lists
    .replace(/^\* (.*$)/gim, '<li>$1</li>')
    // Code
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    // Links
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
    // Line breaks
    .replace(/\n/g, '<br>');
  
  // Wrap lists
  html = html.replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>');
  
  return html;
}

// Clean markdown for plain text
function cleanMarkdown(text: string): string {
  return text
    .replace(/^#{1,6}\s+/gim, '') // Remove headers
    .replace(/\*\*/g, '') // Remove bold
    .replace(/\*/g, '') // Remove italic
    .replace(/`{3}[\s\S]*?`{3}/g, '[Code Block]') // Replace code blocks
    .replace(/`([^`]+)`/g, '$1') // Remove inline code
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1 ($2)') // Convert links to text
    .replace(/^\*\s+/gim, '• '); // Convert list markers to bullets
}

export function createSendEmailTool(ctx: ActionCtx) {
  return createTool({
    description: `Send an email to any email address using AgentMail.
Use this when:
- The user asks you to send something via email
- You've generated a PDF/report and the user wants it emailed
- You need to send updates or notifications via email
- The user says "email me" or "send to my email"

You need:
- to: Recipient email address (required)
- subject: Email subject (required)
- body: Email content/text (required)
- Optional: html for HTML formatted email`,
    args: jsonSchema<{
      to?: string;
      subject: string;
      body: string;
      html?: string;
    }>({
      type: 'object',
      properties: {
        to: {
          type: 'string',
          description: 'Recipient email address (e.g., user@example.com). If not provided, will use the stored user email address.',
        },
        subject: {
          type: 'string',
          description: 'Email subject line',
        },
        body: {
          type: 'string',
          description: 'Plain text email body content',
        },
        html: {
          type: 'string',
          description: 'Optional: HTML formatted email body',
        },
      },
      required: ['subject', 'body'],
    }),
    handler: async (_toolCtx, args: any) => {
      let { to, subject, body, html } = args as {
        to: string;
        subject: string;
        body: string;
        html?: string;
      };

      try {
        // If no "to" address provided, check for stored user email
        if (!to) {
          const userEmail = await ctx.runQuery(internal.userPreferences.getEmail);
          if (userEmail) {
            to = userEmail;
          } else {
            return {
              success: false,
              error: 'No recipient email provided',
              message: 'Please provide an email address or tell me "save my email as user@example.com" so I can remember it for future messages.',
            };
          }
        }

        // Store the email for future use if it's a new email
        const existingEmail = await ctx.runQuery(internal.userPreferences.getEmail);
        if (!existingEmail && to) {
          await ctx.runMutation(internal.userPreferences.setEmail, { email: to });
        }

        // Get default inbox
        const inbox = await ctx.runQuery(internal.agentMail.getDefaultInbox);
        
        if (!inbox) {
          return {
            success: false,
            error: 'No email inbox configured',
            message: 'I don\'t have an email inbox set up yet. Please configure AgentMail first.',
          };
        }

        // Convert markdown to clean formats
        const cleanBody = cleanMarkdown(body);
        const htmlBody = html || markdownToHtml(body);

        // Send email via AgentMail
        const result = await ctx.runAction(internal.agentMail.sendEmail, {
          inboxId: inbox.inboxId,
          to: to,
          subject: subject,
          body: cleanBody,
          html: htmlBody,
        });

        return {
          success: true,
          message: `Email sent successfully to ${to}`,
          subject: subject,
          from: inbox.email,
          messageId: result.messageId,
        };
      } catch (error) {
        console.error('Send email error:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to send email',
          message: 'Could not send email. Please check the email address and try again.',
        };
      }
    },
  });
}
