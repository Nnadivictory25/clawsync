import { components } from './_generated/api';
import {
  exposeUploadApi,
  exposeDeploymentQuery,
} from '@convex-dev/self-static-hosting';

/**
 * Static Hosting API
 *
 * Exposes the upload API for @convex-dev/self-static-hosting.
 * These are INTERNAL functions - only callable via CLI or server-side.
 *
 * Deployment modes (in order of preference):
 * 1. Convex Storage - Files in Convex, served via HTTP actions (simplest)
 * 2. Convex + Cloudflare CDN - Files in Convex, cached at edge
 * 3. Cloudflare Pages - Files at Cloudflare edge (best performance)
 *
 * See: https://github.com/get-convex/self-static-hosting
 */

// Internal functions for secure uploads (CLI only, not public)
export const { generateUploadUrl, recordAsset, gcOldAssets, listAssets } =
  exposeUploadApi(components.selfStaticHosting);

// Public query for live reload notifications
export const { getCurrentDeployment } =
  exposeDeploymentQuery(components.selfStaticHosting);
