import { useState } from 'react';

/**
 * Hook to manage session ID for anonymous users.
 * Persists in localStorage across page reloads.
 */
export function useSessionId(): string {
  const [sessionId] = useState(() => {
    const stored = localStorage.getItem('clawsync_session_id');
    if (stored) return stored;

    const newId = crypto.randomUUID();
    localStorage.setItem('clawsync_session_id', newId);
    return newId;
  });

  return sessionId;
}
