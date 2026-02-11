'use node';

import { internalAction } from './_generated/server';
import { v } from 'convex/values';
import { internal } from './_generated/api';

/**
 * Node.js action for AI analytics report generation.
 * Calls external AI APIs (Anthropic/OpenAI) and stores via analyticsReport.saveReport.
 */
export const generate = internalAction({
  args: {
    reportType: v.union(v.literal('weekly'), v.literal('manual')),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Gather metrics snapshot
    const dataSnapshot: string = await ctx.runQuery(
      internal.analytics.getMetricsSnapshot
    );

    const snapshot = JSON.parse(dataSnapshot);

    // Build prompt for AI analysis
    const prompt = `You are an analytics AI. Analyze the following metrics for the past 7 days and provide:
1. Executive summary (2-3 sentences)
2. Key trends (list of observations)
3. Anomalies (any unusual patterns, spikes, or drops)
4. Recommendations (actionable next steps)

Metrics data:
${JSON.stringify(snapshot, null, 2)}

Respond in valid JSON with this structure:
{
  "title": "string",
  "summary": "string",
  "sections": [{"heading": "string", "content": "string"}],
  "anomalies": [{"metric": "string", "description": "string", "severity": "low|medium|high"}],
  "recommendations": [{"action": "string", "priority": "low|medium|high", "reasoning": "string"}]
}`;

    // Get the agent config to determine which model to use
    const config = (await ctx.runQuery(
      internal.agentConfig.getConfig as any
    )) as { model?: string; modelProvider?: string } | null;

    const model = config?.model ?? 'claude-sonnet-4-20250514';

    // Call AI via the configured provider
    const apiKey = process.env.ANTHROPIC_API_KEY ?? process.env.OPENAI_API_KEY;
    if (!apiKey) {
      console.error(
        'No AI API key configured for analytics report generation'
      );
      return null;
    }

    let responseText = '';

    // Try Anthropic first, then OpenAI
    if (process.env.ANTHROPIC_API_KEY) {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model,
          max_tokens: 4096,
          messages: [{ role: 'user', content: prompt }],
        }),
      });

      if (!response.ok) {
        console.error('Anthropic API error:', await response.text());
        return null;
      }

      const result = await response.json();
      responseText = result.content?.[0]?.text ?? '';
    } else if (process.env.OPENAI_API_KEY) {
      const response = await fetch(
        'https://api.openai.com/v1/chat/completions',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          },
          body: JSON.stringify({
            model: 'gpt-4o',
            messages: [{ role: 'user', content: prompt }],
            response_format: { type: 'json_object' },
          }),
        }
      );

      if (!response.ok) {
        console.error('OpenAI API error:', await response.text());
        return null;
      }

      const result = await response.json();
      responseText = result.choices?.[0]?.message?.content ?? '';
    }

    if (!responseText) {
      console.error('No response from AI model');
      return null;
    }

    // Parse the AI response
    let parsed: {
      title?: string;
      summary?: string;
      sections?: unknown[];
      anomalies?: unknown[];
      recommendations?: unknown[];
    };

    try {
      parsed = JSON.parse(responseText);
    } catch {
      parsed = {
        title: `${args.reportType === 'weekly' ? 'Weekly' : 'Manual'} Analytics Report`,
        summary: responseText.slice(0, 500),
        sections: [],
        anomalies: [],
        recommendations: [],
      };
    }

    // Store the report
    await ctx.runMutation(internal.analyticsReport.saveReport, {
      reportType: args.reportType,
      title:
        parsed.title ??
        `${args.reportType === 'weekly' ? 'Weekly' : 'Manual'} Analytics Report`,
      summary: parsed.summary ?? 'Report generated.',
      sections: JSON.stringify(parsed.sections ?? []),
      anomalies: JSON.stringify(parsed.anomalies ?? []),
      recommendations: JSON.stringify(parsed.recommendations ?? []),
      dataSnapshot,
      model,
    });

    return null;
  },
});
