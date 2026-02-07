import React from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { SyncBoardLayout } from '../components/syncboard/SyncBoardLayout';
import {
  TelegramLogo,
  WhatsappLogo,
  SlackLogo,
  DiscordLogo,
  EnvelopeSimple,
  Link as LinkIcon,
} from '@phosphor-icons/react';

const channelInfo: Record<string, { icon: React.ReactNode; description: string }> = {
  telegram: {
    icon: <TelegramLogo size={32} weight="regular" />,
    description: 'Receive and respond to messages from Telegram',
  },
  whatsapp: {
    icon: <WhatsappLogo size={32} weight="regular" />,
    description: 'Connect via Twilio WhatsApp API',
  },
  slack: {
    icon: <SlackLogo size={32} weight="regular" />,
    description: 'Add as a Slack bot in your workspace',
  },
  discord: {
    icon: <DiscordLogo size={32} weight="regular" />,
    description: 'Add as a Discord bot to your server',
  },
  email: {
    icon: <EnvelopeSimple size={32} weight="regular" />,
    description: 'Receive and reply to emails via Resend',
  },
};

export function SyncBoardChannels() {
  const channels = useQuery(api.channelConfig.list);
  const toggleChannel = useMutation(api.channelConfig.toggle);
  const seedChannels = useMutation(api.channelConfig.seed);

  const handleSeed = async () => {
    await seedChannels({});
  };

  return (
    <SyncBoardLayout title="Channels">
      <div className="channels-page">
        <div className="page-description">
          <p>
            Connect messaging channels to let your agent respond on multiple platforms.
            Each channel requires platform-specific configuration.
          </p>
        </div>

        {(!channels || channels.length === 0) && (
          <div className="empty-state">
            <p>No channels configured.</p>
            <button className="btn btn-primary" onClick={handleSeed}>
              Initialize Default Channels
            </button>
          </div>
        )}

        <div className="channels-grid">
          {channels?.map((channel: { _id: string; channelType: string; displayName: string; enabled: boolean; rateLimitPerMinute: number; webhookUrl?: string }) => {
            const info = channelInfo[channel.channelType] || {
              icon: <LinkIcon size={32} weight="regular" />,
              description: 'Custom channel',
            };

            return (
              <div key={channel._id} className="channel-card card">
                <div className="channel-icon">{info.icon}</div>
                <div className="channel-info">
                  <h3>{channel.displayName}</h3>
                  <p>{info.description}</p>
                </div>

                <div className="channel-status">
                  <span className={`badge ${channel.enabled ? 'badge-success' : ''}`}>
                    {channel.enabled ? 'Active' : 'Inactive'}
                  </span>
                </div>

                <div className="channel-config">
                  <span className="config-item">
                    Rate limit: {channel.rateLimitPerMinute}/min
                  </span>
                  {channel.webhookUrl && (
                    <span className="config-item">Webhook configured</span>
                  )}
                </div>

                <div className="channel-actions">
                  <button
                    className={`btn ${channel.enabled ? 'btn-secondary' : 'btn-primary'}`}
                    onClick={() => toggleChannel({ id: channel._id })}
                  >
                    {channel.enabled ? 'Disable' : 'Enable'}
                  </button>
                  <button className="btn btn-ghost">Configure</button>
                </div>
              </div>
            );
          })}
        </div>

        <div className="setup-instructions">
          <h3>Setup Instructions</h3>
          <p>
            Each channel requires specific configuration in your environment variables.
            See the <a href="#">documentation</a> for setup guides.
          </p>
        </div>
      </div>

      <style>{`
        .channels-page {
          max-width: 900px;
        }

        .page-description {
          margin-bottom: var(--space-6);
        }

        .page-description p {
          color: var(--text-secondary);
        }

        .empty-state {
          text-align: center;
          padding: var(--space-8);
          background-color: var(--bg-secondary);
          border-radius: var(--radius-xl);
          margin-bottom: var(--space-6);
        }

        .empty-state p {
          color: var(--text-secondary);
          margin-bottom: var(--space-4);
        }

        .channels-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: var(--space-4);
          margin-bottom: var(--space-8);
        }

        .channel-card {
          display: flex;
          flex-direction: column;
          gap: var(--space-3);
        }

        .channel-icon {
          color: var(--interactive);
        }

        .channel-info h3 {
          font-size: var(--text-lg);
          margin-bottom: var(--space-1);
        }

        .channel-info p {
          font-size: var(--text-sm);
          color: var(--text-secondary);
          margin: 0;
        }

        .channel-config {
          display: flex;
          flex-direction: column;
          gap: var(--space-1);
        }

        .config-item {
          font-size: var(--text-xs);
          color: var(--text-secondary);
        }

        .channel-actions {
          display: flex;
          gap: var(--space-2);
          margin-top: auto;
        }

        .setup-instructions {
          padding: var(--space-4);
          background-color: var(--bg-secondary);
          border-radius: var(--radius-xl);
        }

        .setup-instructions h3 {
          margin-bottom: var(--space-2);
        }

        .setup-instructions p {
          color: var(--text-secondary);
          margin: 0;
        }

        .setup-instructions a {
          color: var(--interactive);
        }
      `}</style>
    </SyncBoardLayout>
  );
}
