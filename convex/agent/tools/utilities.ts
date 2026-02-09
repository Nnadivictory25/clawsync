import { createTool } from '@convex-dev/agent';
import { jsonSchema } from 'ai';
import { ActionCtx } from '../../_generated/server';

/**
 * Utility Tools
 * 
 * Simple helper tools for common tasks like getting current date/time,
 * calculations, and other utilities.
 */

export function createUtilityTools(_ctx: ActionCtx) {
  return {
    // Get current date and time
    getCurrentDateTime: createTool({
      description: `Get the current date and time. 
Use this when the user asks for:
- Current date or time
- What day is it today
- Current timestamp
- Today's date`,
      args: jsonSchema<{
        format?: string;
        timezone?: string;
      }>({
        type: 'object',
        properties: {
          format: {
            type: 'string',
            description: 'Date format preference: "short" (MM/DD/YYYY), "long" (Month DD, YYYY), "iso" (ISO 8601), or "relative" (e.g., "2 days ago"). Default is "long".',
          },
          timezone: {
            type: 'string',
            description: 'Timezone (e.g., "America/New_York", "Europe/London", "UTC"). Default is local timezone.',
          },
        },
      }),
      handler: async (_toolCtx, args: any) => {
        const { format = 'long', timezone } = args;
        const now = new Date();
        
        let formattedDate: string;
        let formattedTime: string;
        
        try {
          const locale = 'en-US';
          const tzOptions: Intl.DateTimeFormatOptions = timezone 
            ? { timeZone: timezone } 
            : {};
          
          switch (format) {
            case 'short':
              formattedDate = now.toLocaleDateString(locale, {
                ...tzOptions,
                month: 'numeric',
                day: 'numeric',
                year: 'numeric',
              });
              break;
            case 'iso':
              formattedDate = now.toISOString();
              break;
            case 'relative':
              // For relative, just return the date - user can calculate relative time
              formattedDate = now.toLocaleDateString(locale, {
                ...tzOptions,
                month: 'long',
                day: 'numeric',
                year: 'numeric',
              });
              break;
            case 'long':
            default:
              formattedDate = now.toLocaleDateString(locale, {
                ...tzOptions,
                weekday: 'long',
                month: 'long',
                day: 'numeric',
                year: 'numeric',
              });
          }
          
          formattedTime = now.toLocaleTimeString(locale, {
            ...tzOptions,
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          });
          
          const dayOfWeek = now.toLocaleDateString(locale, {
            ...tzOptions,
            weekday: 'long',
          });
          
          return {
            success: true,
            date: formattedDate,
            time: formattedTime,
            dayOfWeek,
            timestamp: now.getTime(),
            isoString: now.toISOString(),
            timezone: timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
            message: `Today is ${dayOfWeek}, ${formattedDate} at ${formattedTime}`,
          };
        } catch (error) {
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to get date/time',
            message: 'Could not retrieve current date and time.',
          };
        }
      },
    }),

    // Simple calculator
    calculate: createTool({
      description: `Perform mathematical calculations.
Use this when the user asks for:
- Math calculations
- Sums, differences, products, divisions
- Percentages
- Simple arithmetic`,
      args: jsonSchema<{
        expression: string;
      }>({
        type: 'object',
        properties: {
          expression: {
            type: 'string',
            description: 'Mathematical expression to evaluate (e.g., "10 + 5", "100 * 0.15", "(20 + 30) / 2"). Supports: +, -, *, /, %, **, parentheses.',
          },
        },
        required: ['expression'],
      }),
      handler: async (_toolCtx, args: any) => {
        const { expression } = args;
        
        try {
          // Sanitize and validate the expression
          const sanitized = expression
            .replace(/[^0-9+\-*/().\s%^]/g, '')
            .replace(/\*\*/g, '^'); // Convert ** to ^ for evaluation
          
          if (sanitized !== expression.replace(/\*\*/g, '^').replace(/\s/g, '')) {
            return {
              success: false,
              error: 'Invalid characters in expression',
              message: 'The expression contains invalid characters. Only numbers and basic operators (+, -, *, /, %, **) are allowed.',
            };
          }
          
          // Use Function constructor for safe evaluation
          // eslint-disable-next-line no-new-func
          const result = new Function('return ' + sanitized)();
          
          if (typeof result !== 'number' || !isFinite(result)) {
            return {
              success: false,
              error: 'Invalid result',
              message: 'The calculation resulted in an invalid number.',
            };
          }
          
          return {
            success: true,
            expression: expression,
            result: result,
            formatted: result.toLocaleString(),
            message: `${expression} = ${result.toLocaleString()}`,
          };
        } catch (error) {
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Calculation failed',
            message: `Could not calculate "${expression}". Please check your syntax.`,
          };
        }
      },
    }),

    // Generate random number
    randomNumber: createTool({
      description: `Generate random numbers.
Use this when the user asks for:
- Random number
- Dice roll
- Random choice
- Coin flip`,
      args: jsonSchema<{
        min?: number;
        max?: number;
        type?: 'integer' | 'decimal' | 'coin' | 'dice';
        count?: number;
      }>({
        type: 'object',
        properties: {
          min: {
            type: 'number',
            description: 'Minimum value (inclusive). Default: 1',
          },
          max: {
            type: 'number',
            description: 'Maximum value (inclusive). Default: 100',
          },
          type: {
            type: 'string',
            enum: ['integer', 'decimal', 'coin', 'dice'],
            description: 'Type of random value: integer, decimal (0-1), coin (heads/tails), or dice (1-6). Default: integer',
          },
          count: {
            type: 'number',
            description: 'Number of random values to generate (1-10). Default: 1',
          },
        },
      }),
      handler: async (_toolCtx, args: any) => {
        const { 
          min = 1, 
          max = 100, 
          type = 'integer',
          count = 1 
        } = args;
        
        try {
          const clampedCount = Math.min(Math.max(count, 1), 10);
          const results: (number | string)[] = [];
          
          for (let i = 0; i < clampedCount; i++) {
            switch (type) {
              case 'coin': {
                results.push(Math.random() < 0.5 ? 'heads' : 'tails');
                break;
              }
              case 'dice': {
                results.push(Math.floor(Math.random() * 6) + 1);
                break;
              }
              case 'decimal': {
                results.push(Math.random());
                break;
              }
              case 'integer':
              default: {
                const range = max - min;
                results.push(Math.floor(Math.random() * range) + min);
              }
            }
          }
          
          const message = type === 'coin' 
            ? `Coin flip result: ${results.join(', ')}`
            : type === 'dice'
            ? `Dice roll result: ${results.join(', ')}`
            : clampedCount === 1
            ? `Random ${type}: ${results[0]}`
            : `Random ${type}s (${clampedCount}): ${results.join(', ')}`;
          
          return {
            success: true,
            type,
            results,
            count: clampedCount,
            range: type === 'integer' ? { min, max } : undefined,
            message,
          };
        } catch (error) {
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Random generation failed',
            message: 'Could not generate random number.',
          };
        }
      },
    }),

    // Count words/characters
    countText: createTool({
      description: `Count words, characters, and other metrics in text.
Use this when the user asks for:
- Word count
- Character count
- Text statistics
- Length of text`,
      args: jsonSchema<{
        text: string;
      }>({
        type: 'object',
        properties: {
          text: {
            type: 'string',
            description: 'Text to analyze',
          },
        },
        required: ['text'],
      }),
      handler: async (_toolCtx, args: any) => {
        const { text } = args;
        
        try {
          const characters = text.length;
          const charactersNoSpaces = text.replace(/\s/g, '').length;
          const words = text.trim() ? text.trim().split(/\s+/).length : 0;
          const lines = text.split(/\r?\n/).length;
          const sentences = text.split(/[.!?]+/).filter((s: string) => s.trim()).length;
          const paragraphs = text.split(/\n\s*\n/).filter((p: string) => p.trim()).length;
          
          return {
            success: true,
            characters,
            charactersNoSpaces,
            words,
            lines,
            sentences,
            paragraphs,
            message: `Text contains: ${words} words, ${characters} characters (${charactersNoSpaces} without spaces), ${sentences} sentences, ${paragraphs} paragraphs`,
          };
        } catch (error) {
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Text analysis failed',
            message: 'Could not analyze the text.',
          };
        }
      },
    }),
  };
}
