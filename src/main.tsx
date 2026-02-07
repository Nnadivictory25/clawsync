import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ConvexProvider, ConvexReactClient } from 'convex/react';
import { getConvexUrl } from '@convex-dev/self-static-hosting';
import { App } from './App';
import './styles/global.css';

/**
 * Convex Client Setup
 *
 * Uses VITE_CONVEX_URL in development, or derives from self-hosted URL in production.
 *
 * FUTURE: When WorkOS AuthKit is enabled, this will be wrapped with:
 * - AuthKitProvider from @workos-inc/authkit-react
 * - ConvexProviderWithAuth instead of ConvexProvider
 *
 * Example (when WorkOS is ready):
 *
 * import { AuthKitProvider, useAuth } from '@workos-inc/authkit-react';
 * import { ConvexProviderWithAuth } from 'convex/react';
 *
 * function useAuthFromWorkOS() {
 *   const { getAccessToken, isAuthenticated } = useAuth();
 *   return {
 *     isLoading: false,
 *     isAuthenticated,
 *     fetchAccessToken: async ({ forceRefreshToken }) => {
 *       try {
 *         return await getAccessToken();
 *       } catch {
 *         return null;
 *       }
 *     },
 *   };
 * }
 *
 * <AuthKitProvider clientId={import.meta.env.VITE_WORKOS_CLIENT_ID}>
 *   <ConvexProviderWithAuth client={convex} useAuth={useAuthFromWorkOS}>
 *     <App />
 *   </ConvexProviderWithAuth>
 * </AuthKitProvider>
 */
const convexUrl = import.meta.env.VITE_CONVEX_URL ?? getConvexUrl();
const convex = new ConvexReactClient(convexUrl);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ConvexProvider client={convex}>
      <App />
    </ConvexProvider>
  </StrictMode>
);
