import { defineApp } from 'convex/server';
import agent from '@convex-dev/agent/convex.config';
import rateLimiter from '@convex-dev/rate-limiter/convex.config';
import selfStaticHosting from '@convex-dev/self-static-hosting/convex.config.js';
import textStreaming from '@convex-dev/persistent-text-streaming/convex.config';
import r2 from '@convex-dev/r2/convex.config';
import stagehand from '@browserbasehq/convex-stagehand/convex.config';
import firecrawlScrape from 'convex-firecrawl-scrape/convex.config';

const app = defineApp();

// Core components
app.use(agent);
app.use(rateLimiter);

// Self-hosting for static frontend
app.use(selfStaticHosting);

// Text streaming for real-time updates
app.use(textStreaming);

// File storage: Cloudflare R2 (optional, needs R2_* env vars)
app.use(r2);

// Browser automation: Stagehand (optional, needs BROWSERBASE_* env vars)
app.use(stagehand, { name: 'stagehand' });

// Web scraping: Firecrawl (optional, needs FIRECRAWL_API_KEY)
app.use(firecrawlScrape);

export default app;
