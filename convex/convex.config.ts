import { defineApp } from 'convex/server';
import agent from '@convex-dev/agent/convex.config';
import rateLimiter from '@convex-dev/rate-limiter/convex.config';
import selfStaticHosting from '@convex-dev/self-static-hosting/convex.config.js';

// Uncomment as you add components:
// import actionCache from '@convex-dev/action-cache/convex.config';
// import rag from '@convex-dev/rag/convex.config';
// import presence from '@convex-dev/presence/convex.config.js';
import textStreaming from '@convex-dev/persistent-text-streaming/convex.config';

const app = defineApp();

// Core components
app.use(agent);
app.use(rateLimiter);

// Self-hosting for static frontend (Convex Self Static Hosting)
// See: https://github.com/get-convex/self-static-hosting
app.use(selfStaticHosting);

// Optional components (uncomment as needed):
// app.use(actionCache);
// app.use(rag);
// app.use(presence);
app.use(textStreaming);

export default app;
