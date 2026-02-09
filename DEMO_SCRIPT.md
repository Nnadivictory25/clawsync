# ClawSync Demo Script

## Opening Hook (15 seconds)
"What if your AI assistant could do literally everything? Not just chat, but actually take action—send emails, post tweets, generate PDFs, research the web, and even schedule itself to work while you sleep."

## Introduction (30 seconds)
"This is ClawSync—an open-source AI agent platform I built that integrates everything an AI needs to be truly useful. Let me show you what it can do."

---

## Demo 1: Natural Language Research + PDF Generation (1 minute)

**You say:** "Research top productivity apps and compile findings into a PDF"

**AI does:**
- Uses Exa web search to find latest productivity apps
- Analyzes and summarizes findings  
- Generates professional PDF with title, content, formatting
- Saves to storage

**Show:** The generated PDF with proper formatting

**Script:** "Just by asking naturally, the agent researches the web, analyzes information, and creates a professional document. No coding, no configuration."

---

## Demo 2: Email Automation with AgentMail (45 seconds)

**You say:** "Email me a summary of today's AI news"

**AI does:**
- Researches latest AI developments
- Generates summary
- Sends email via AgentMail integration
- Remembers your email for future use

**Show:** Email arriving in inbox

**Script:** "The agent can send emails directly. And once you tell it your email once, it remembers for all future communications."

---

## Demo 3: Social Media with X/Twitter (45 seconds)

**You say:** "Post a tweet about the latest AI developments"

**AI does:**
- Researches current AI news
- Crafts engaging tweet (under 280 chars)
- Posts to X via API
- Returns tweet URL

**Show:** Tweet appearing on X timeline

**Script:** "Social media automation—just ask and it posts. Perfect for sharing research or updates."

---

## Demo 4: Telegram Bot Integration (30 seconds)

**Show:** Phone with Telegram

**Script:** "The agent works anywhere. Message it on Telegram and get the same capabilities. Research, PDFs, emails—all through chat."

**Quick demo:** Send image to Telegram bot, agent analyzes it

---

## Demo 5: Scheduled Automation with Cron Jobs (1 minute)

**You say:** "Every day at 9am, research AI news and email me a summary"

**AI does:**
- Creates scheduled task in database
- Convex cron job checks every minute
- At 9am daily: researches → generates summary → emails

**Show:** Scheduled task in SyncBoard

**Script:** "This is where it gets powerful. Set it once, and it runs automatically every day. The agent works while you sleep."

---

## Demo 6: Multi-Model Support (30 seconds)

**Show:** SyncBoard Models page

**Script:** "Not locked into one AI. Switch between GPT-5, Claude, Gemini, or 300+ models via OpenRouter. Use the right model for the job."

**Quick demo:** "Switch to Claude for this task" → agent switches model

---

## Demo 7: File Analysis (30 seconds)

**Upload PDF:** "Analyze this document and summarize key points"

**AI does:**
- Extracts text from PDF
- Analyzes content
- Provides summary with citations

**Script:** "Upload documents, images, PDFs—the agent can analyze them all."

---

## Demo 8: MCP Server Integration (30 seconds)

**Show:** MCP Servers page with Exa connected

**Script:** "The agent connects to external tools via MCP. Exa for web search, but you can add any MCP server—unlimited extensibility."

---

## Closing (30 seconds)

**Show:** All quick message buttons working

**Script:** "Everything you see here works through simple conversation. No complex setup, no coding. Just talk to your AI like you would a person."

**Final line:** "ClawSync—an AI agent that actually does things. Open source, built with React, Convex, and Vercel AI SDK. Try it yourself."

---

## Technical Stack (if asked)
- **Frontend:** React + TypeScript
- **Backend:** Convex (real-time, serverless)
- **AI:** Vercel AI SDK
- **Models:** Multiple providers (OpenAI, Anthropic, Google, OpenRouter)
- **Integrations:** AgentMail, X API, Telegram Bot API, Exa

## Key Talking Points
1. **Natural language interface** - no commands to remember
2. **Integrated tools** - email, social, documents, research
3. **Automation** - scheduled tasks with cron jobs
4. **Multi-platform** - web chat + Telegram
5. **Multi-model** - not locked into one AI provider
6. **Open source** - fully customizable

## Pro Tips for Recording
- Have X/Twitter tab open to show real-time posting
- Have email inbox ready to show delivery
- Keep responses concise for demo flow
- Show the SyncBoard for visual appeal
- Emphasize "just by talking" throughout
