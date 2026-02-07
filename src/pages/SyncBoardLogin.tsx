import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';

interface SyncBoardLoginProps {
  onLogin: (token: string) => void;
}

export function SyncBoardLogin({ onLogin }: SyncBoardLoginProps) {
  const navigate = useNavigate();
  const login = useMutation(api.syncboardAuth.login);

  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const result = await login({ password });

      if (result.success && result.token) {
        // Store token in localStorage
        localStorage.setItem('syncboard_token', result.token);
        if (result.expiresAt) {
          localStorage.setItem('syncboard_token_expires', result.expiresAt.toString());
        }
        onLogin(result.token);
      } else {
        setError(result.error || 'Login failed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-header">
          <img src="/clawsync-logo.svg" alt="ClawSync" className="login-logo" onError={(e) => { e.currentTarget.src = '/clawsync-logo.png'; }} />
          <p className="subtitle">SyncBoard Admin</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              autoFocus
              disabled={isLoading}
            />
          </div>

          {error && <div className="error-message">{error}</div>}

          <button type="submit" className="btn btn-primary btn-full" disabled={isLoading || !password}>
            {isLoading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div className="login-footer">
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/chat')}>
            &larr; Back to Chat
          </button>
        </div>
      </div>

      <style>{`
        .login-page {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--bg-primary);
          padding: var(--space-4);
        }

        .login-container {
          background: var(--bg-primary);
          border-radius: var(--radius-2xl);
          box-shadow: 0 4px 24px rgba(0, 0, 0, 0.1);
          padding: var(--space-8);
          max-width: 400px;
          width: 100%;
        }

        .login-header {
          text-align: center;
          margin-bottom: var(--space-8);
        }

        .login-logo {
          height: 40px;
          width: auto;
          margin-bottom: var(--space-2);
        }

        .subtitle {
          color: var(--text-secondary);
          font-size: var(--text-sm);
        }

        .login-form {
          display: flex;
          flex-direction: column;
          gap: var(--space-4);
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: var(--space-2);
        }

        .form-group label {
          font-size: var(--text-sm);
          font-weight: 500;
        }

        .form-group input {
          padding: var(--space-3);
          border: 1px solid var(--border);
          border-radius: var(--radius-lg);
          font-size: var(--text-base);
          background: var(--bg-secondary);
        }

        .form-group input:focus {
          outline: none;
          border-color: var(--interactive);
          box-shadow: 0 0 0 3px rgba(234, 91, 38, 0.1);
        }

        .form-group input:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .error-message {
          background: rgba(239, 68, 68, 0.1);
          color: var(--error);
          padding: var(--space-3);
          border-radius: var(--radius-md);
          font-size: var(--text-sm);
          text-align: center;
        }

        .btn-full {
          width: 100%;
        }

        .login-footer {
          margin-top: var(--space-6);
          text-align: center;
        }

        .btn-sm {
          font-size: var(--text-sm);
          padding: var(--space-2) var(--space-4);
        }
      `}</style>
    </div>
  );
}
