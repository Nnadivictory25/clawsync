import { exposeApi } from 'convex-firecrawl-scrape';
import { components } from './_generated/api';

/**
 * Firecrawl (Web Scraping via convex-firecrawl-scrape)
 *
 * Optional feature: requires FIRECRAWL_API_KEY environment variable.
 * Uses exposeApi pattern for auth-gated scraping with durable caching.
 */

// Expose component API with a simple auth callback.
// Since SyncBoard is already behind password auth, we just
// return the API key from the environment.
export const {
  scrape,
  getCached,
  getStatus,
  getContent,
  invalidate,
} = exposeApi(components.firecrawlScrape, {
  auth: async (_ctx, _operation) => {
    const key = process.env.FIRECRAWL_API_KEY;
    if (!key) {
      throw new Error(
        'FIRECRAWL_API_KEY not configured. Add it to your Convex environment variables.'
      );
    }
    return key;
  },
});
