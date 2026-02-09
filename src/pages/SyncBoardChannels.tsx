import React, { useState } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { SyncBoardLayout } from '../components/syncboard/SyncBoardLayout';
import {
  TelegramLogoIcon,
  WhatsappLogoIcon,
  SlackLogoIcon,
  DiscordLogoIcon,
  EnvelopeSimpleIcon,
  LinkIcon,
  X,
  CheckCircle,
  WarningCircle,
  Copy,
} from '@phosphor-icons/react';

const channelInfo: Record<string, { icon: React.ReactNode; description: string }> = {
  telegram: {
    icon: <TelegramLogoIcon size={32} weight="regular" />,
    description: 'Receive and respond to messages from Telegram',
  },
  whatsapp: {
    icon: <WhatsappLogoIcon size={32} weight="regular" />,
    description: 'Connect via Twilio WhatsApp API',
  },
  slack: {
    icon: <SlackLogoIcon  size={32} weight="regular" />,
    description: 'Add as a Slack bot in your workspace',
  },
  discord: {
    icon: <DiscordLogoIcon size={32} weight="regular" />,
    description: 'Add as a Discord bot to your server',
  },
  email: {
    icon: <EnvelopeSimpleIcon size={32} weight="regular" />,
    description: 'Receive and reply to emails via Resend',
  },
};

// Channel Configuration Modal Component
interface ChannelConfigModalProps {
  channel: {
    _id: string;
    channelType: string;
    displayName: string;
    enabled: boolean;
    rateLimitPerMinute: number;
  } | null;
  isOpen: boolean;
  onClose: () => void;
}

// Configuration content for each channel type
const channelConfigContent: Record<string, {
  title: string;
  steps: Array<{
    number: number;
    title: string;
    content: React.ReactNode;
  }>;
  fields: Array<{
    key: string;
    label: string;
    type?: string;
    placeholder: string;
    help: string;
    required?: boolean;
  }>;
  webhookPath: string;
  saveHandler: (params: {
    channel: any;
    secrets: Record<string, string>;
    webhookUrl: string;
    upsertSecret: any;
    updateConfig: any;
  }) => Promise<{ success: boolean; message: string }>;
}> = {
  telegram: {
    title: 'Configure Telegram Bot',
    webhookPath: 'telegram',
    steps: [
      {
        number: 1,
        title: 'Create a Telegram Bot',
        content: (
          <>
            Open Telegram and message{' '}
            <a href="https://t.me/botfather" target="_blank" rel="noopener noreferrer">
              @BotFather
            </a>
            . Use the /newbot command to create a bot and get your bot token.
          </>
        ),
      },
      {
        number: 2,
        title: 'Enter Bot Token',
        content: 'Enter your bot token below. This will be securely stored.',
      },
      {
        number: 3,
        title: 'Webhook Configuration',
        content: 'Click "Save Configuration" to automatically set up the webhook.',
      },
    ],
    fields: [
      {
        key: 'botToken',
        label: 'Bot Token',
        type: 'password',
        placeholder: '123456789:ABCdefGHIjklMNOpqrsTUVwxyz',
        help: 'Your bot token from @BotFather. Keep this secret!',
        required: true,
      },
    ],
    saveHandler: async ({ secrets, webhookUrl, upsertSecret, updateConfig, channel }) => {
      const botToken = secrets.botToken;
      
      await upsertSecret({
        channelId: channel._id,
        key: 'botToken',
        value: botToken,
      });

      await updateConfig({
        id: channel._id,
        updates: {
          webhookUrl,
          enabled: true,
        },
      });

      const response = await fetch(`https://api.telegram.org/bot${botToken}/setWebhook`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: webhookUrl }),
      });

      const data = await response.json();

      if (data.ok) {
        return { success: true, message: 'Configuration saved and webhook set! Your bot is now active.' };
      } else {
        return { success: false, message: `Configuration saved but webhook failed: ${data.description}` };
      }
    },
  },
  discord: {
    title: 'Configure Discord Bot',
    webhookPath: 'discord',
    steps: [
      {
        number: 1,
        title: 'Create a Discord Application',
        content: (
          <>
            Go to the{' '}
            <a href="https://discord.com/developers/applications" target="_blank" rel="noopener noreferrer">
              Discord Developer Portal
            </a>{' '}
            and create a new application. Navigate to the "Bot" section and enable it.
          </>
        ),
      },
      {
        number: 2,
        title: 'Get Application Credentials',
        content: 'Copy your Bot Token, Application ID, and Public Key from the Discord Developer Portal.',
      },
      {
        number: 3,
        title: 'Set Up Interactions Endpoint',
        content: 'In your Discord application, go to General Information and set the Interactions Endpoint URL to the webhook URL shown below. This enables slash commands and message interactions.',
      },
      {
        number: 4,
        title: 'Add Bot to Server',
        content: 'Use the OAuth2 URL Generator in your Discord app. Select scopes: bot and applications.commands. Copy the generated URL and open it in your browser to add the bot to your server.',
      },
    ],
    fields: [
      {
        key: 'botToken',
        label: 'Bot Token',
        type: 'password',
        placeholder: 'YOUR_BOT_TOKEN_HERE',
        help: 'Copy from Bot section → Token → Reset Token',
        required: true,
      },
      {
        key: 'applicationId',
        label: 'Application ID',
        placeholder: '1234567890123456789',
        help: 'Found in General Information → Application ID',
        required: false,
      },
      {
        key: 'publicKey',
        label: 'Public Key (Optional)',
        placeholder: 'a1b2c3d4e5f6...',
        help: 'Found in General Information → Public Key. Required for webhook verification.',
        required: false,
      },
    ],
    saveHandler: async ({ secrets, webhookUrl, upsertSecret, updateConfig, channel }) => {
      const botToken = secrets.botToken;
      const applicationId = secrets.applicationId;
      const publicKey = secrets.publicKey;

      // Save bot token as secret
      await upsertSecret({
        channelId: channel._id,
        key: 'botToken',
        value: botToken,
      });

      // Save public key if provided
      if (publicKey) {
        await upsertSecret({
          channelId: channel._id,
          key: 'publicKey',
          value: publicKey,
        });
      }

      // Update channel config
      await updateConfig({
        id: channel._id,
        updates: {
          webhookUrl,
          enabled: true,
          metadata: JSON.stringify({ applicationId }),
        },
      });

      // Register Discord commands via API if application ID is provided
      if (applicationId) {
        const commandsResponse = await fetch(
          `https://discord.com/api/v10/applications/${applicationId}/commands`,
          {
            method: 'PUT',
            headers: {
              'Authorization': `Bot ${botToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify([
              {
                name: 'chat',
                description: 'Chat with the AI agent',
                type: 1,
                options: [
                  {
                    name: 'message',
                    description: 'Your message to the agent',
                    type: 3,
                    required: true,
                  },
                ],
              },
              {
                name: 'help',
                description: 'Get help using the agent',
                type: 1,
              },
            ]),
          }
        );

        if (commandsResponse.ok) {
          return { success: true, message: 'Configuration saved and Discord commands registered! Your bot is now active.' };
        } else {
          const errorData = await commandsResponse.json();
          return { success: false, message: `Configuration saved but commands failed: ${errorData.message || 'Unknown error'}` };
        }
      }

      return { success: true, message: 'Configuration saved! Add the bot to your server to start using it.' };
    },
  },
  whatsapp: {
    title: 'Configure WhatsApp (Twilio)',
    webhookPath: 'whatsapp',
    steps: [
      {
        number: 1,
        title: 'Set Up Twilio Account',
        content: (
          <>
            Sign up for a{' '}
            <a href="https://www.twilio.com/try-twilio" target="_blank" rel="noopener noreferrer">
              Twilio account
            </a>{' '}
            and enable the WhatsApp sandbox in your console.
          </>
        ),
      },
      {
        number: 2,
        title: 'Enter Twilio Credentials',
        content: 'Enter your Account SID, Auth Token, and WhatsApp phone number below.',
      },
      {
        number: 3,
        title: 'Configure Webhook URL',
        content: 'Set this webhook URL in your Twilio Console for incoming WhatsApp messages.',
      },
    ],
    fields: [
      {
        key: 'accountSid',
        label: 'Account SID',
        placeholder: 'ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
        help: 'Found in Twilio Console → Account Info',
        required: true,
      },
      {
        key: 'authToken',
        label: 'Auth Token',
        type: 'password',
        placeholder: 'your_auth_token',
        help: 'Found in Twilio Console → Account Info',
        required: true,
      },
      {
        key: 'phoneNumber',
        label: 'WhatsApp Number',
        placeholder: '+1234567890',
        help: 'Your Twilio WhatsApp number (with country code)',
        required: false,
      },
    ],
    saveHandler: async ({ secrets, webhookUrl, upsertSecret, updateConfig, channel }) => {
      await upsertSecret({
        channelId: channel._id,
        key: 'accountSid',
        value: secrets.accountSid,
      });

      await upsertSecret({
        channelId: channel._id,
        key: 'authToken',
        value: secrets.authToken,
      });

      await updateConfig({
        id: channel._id,
        updates: {
          webhookUrl,
          enabled: true,
          metadata: JSON.stringify({ phoneNumber: secrets.phoneNumber }),
        },
      });

      return { success: true, message: 'WhatsApp configuration saved! Configure the webhook URL in your Twilio console.' };
    },
  },
  slack: {
    title: 'Configure Slack Bot',
    webhookPath: 'slack',
    steps: [
      {
        number: 1,
        title: 'Create a Slack App',
        content: (
          <>
            Go to{' '}
            <a href="https://api.slack.com/apps" target="_blank" rel="noopener noreferrer">
              Slack API
            </a>{' '}
            and create a new app. Choose "From scratch" and give it a name.
          </>
        ),
      },
      {
        number: 2,
        title: 'Get Bot Token',
        content: 'Enable Bot permissions and copy your Bot User OAuth Token.',
      },
      {
        number: 3,
        title: 'Configure Events',
        content: 'Enable Events and set the Request URL to the webhook URL below. Subscribe to bot events like message.im and app_mention.',
      },
    ],
    fields: [
      {
        key: 'botToken',
        label: 'Bot User OAuth Token',
        type: 'password',
        placeholder: 'xoxb-your-token',
        help: 'OAuth & Permissions → Bot User OAuth Token',
        required: true,
      },
      {
        key: 'signingSecret',
        label: 'Signing Secret (Optional)',
        type: 'password',
        placeholder: 'your_signing_secret',
        help: 'Basic Information → Signing Secret',
        required: false,
      },
    ],
    saveHandler: async ({ secrets, webhookUrl, upsertSecret, updateConfig, channel }) => {
      await upsertSecret({
        channelId: channel._id,
        key: 'botToken',
        value: secrets.botToken,
      });

      if (secrets.signingSecret) {
        await upsertSecret({
          channelId: channel._id,
          key: 'signingSecret',
          value: secrets.signingSecret,
        });
      }

      await updateConfig({
        id: channel._id,
        updates: { webhookUrl, enabled: true },
      });

      return { success: true, message: 'Slack configuration saved! Configure the Request URL in your Slack app.' };
    },
  },
  email: {
    title: 'Configure Email (Resend)',
    webhookPath: 'email',
    steps: [
      {
        number: 1,
        title: 'Get Resend API Key',
        content: (
          <>
            Sign up for{' '}
            <a href="https://resend.com" target="_blank" rel="noopener noreferrer">
              Resend
            </a>{' '}
            and generate an API key from your dashboard.
          </>
        ),
      },
      {
        number: 2,
        title: 'Enter Configuration',
        content: 'Enter your Resend API key and verified sender email address.',
      },
      {
        number: 3,
        title: 'Configure Inbound Webhook',
        content: 'Set this webhook URL in Resend for inbound email processing.',
      },
    ],
    fields: [
      {
        key: 'apiKey',
        label: 'API Key',
        type: 'password',
        placeholder: 're_xxxxxxxx',
        help: 'Your Resend API key',
        required: true,
      },
      {
        key: 'fromEmail',
        label: 'From Email',
        placeholder: 'agent@yourdomain.com',
        help: 'Verified sender email address',
        required: false,
      },
    ],
    saveHandler: async ({ secrets, webhookUrl, upsertSecret, updateConfig, channel }) => {
      await upsertSecret({
        channelId: channel._id,
        key: 'apiKey',
        value: secrets.apiKey,
      });

      await updateConfig({
        id: channel._id,
        updates: {
          webhookUrl,
          enabled: true,
          metadata: JSON.stringify({ fromEmail: secrets.fromEmail }),
        },
      });

      return { success: true, message: 'Email configuration saved! Configure the webhook in your email provider.' };
    },
  },
};

function ChannelConfigModal({ channel, isOpen, onClose }: ChannelConfigModalProps) {
  const [secrets, setSecrets] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [webhookStatus, setWebhookStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [webhookMessage, setWebhookMessage] = useState('');
  const [copiedUrl, setCopiedUrl] = useState(false);

  const upsertSecret = useMutation(api.channelSecrets.upsert);
  const updateConfig = useMutation(api.channelConfig.update);

  // Get configuration for this channel type
  const config = channel ? channelConfigContent[channel.channelType] : null;

  // Generate webhook URL - uses Convex site URL (not localhost)
  const convexUrl = import.meta.env.VITE_CONVEX_SITE_URL;
  const webhookUrl = convexUrl && config 
    ? `${convexUrl}/api/webhook/${config.webhookPath}`
    : '';

  // Reset state when modal opens with new channel
  React.useEffect(() => {
    if (isOpen && channel && config) {
      setSecrets({});
      setWebhookStatus('idle');
      setWebhookMessage('');
      setCopiedUrl(false);
    }
  }, [isOpen, channel, config]);

  const handleSecretChange = (key: string, value: string) => {
    setSecrets(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    if (!channel || !config) return;

    // Validate required fields
    const requiredFields = config.fields.filter(f => f.required);
    for (const field of requiredFields) {
      if (!secrets[field.key]?.trim()) {
        setWebhookStatus('error');
        setWebhookMessage(`${field.label} is required.`);
        return;
      }
    }

    setIsLoading(true);
    setWebhookStatus('idle');
    
    try {
      const result = await config.saveHandler({
        channel,
        secrets,
        webhookUrl,
        upsertSecret,
        updateConfig,
      });

      setWebhookStatus(result.success ? 'success' : 'error');
      setWebhookMessage(result.message);
    } catch (error) {
      setWebhookStatus('error');
      setWebhookMessage('Failed to save configuration. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const copyWebhookUrl = () => {
    navigator.clipboard.writeText(webhookUrl);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  if (!isOpen || !channel || !config) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-large" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{config.title}</h3>
          <button className="btn btn-ghost btn-icon" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="modal-content">
          <div className="setup-steps">
            {config.steps.map((step) => (
              <div key={step.number} className="step">
                <div className="step-number">{step.number}</div>
                <div className="step-content">
                  <h4>{step.title}</h4>
                  <p>{step.content}</p>
                  
                  {/* Show input fields on step 2 if there are fields */}
                  {step.number === 2 && config.fields.length > 0 && (
                    <div className="fields-container">
                      {config.fields.map((field) => (
                        <div key={field.key} className="form-group">
                          <label>{field.label}</label>
                          <input
                            type={field.type || 'text'}
                            value={secrets[field.key] || ''}
                            onChange={(e) => handleSecretChange(field.key, e.target.value)}
                            placeholder={field.placeholder}
                            className="input-full"
                          />
                          <span className="input-help">{field.help}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Show webhook URL on the last step */}
                  {step.number === config.steps.length && webhookUrl && (
                    <div className="webhook-url-display">
                      <code>{webhookUrl}</code>
                      <button 
                        className="btn btn-sm btn-secondary" 
                        onClick={copyWebhookUrl}
                      >
                        {copiedUrl ? <CheckCircle size={16} /> : <Copy size={16} />}
                        {copiedUrl ? ' Copied!' : ' Copy'}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {webhookStatus !== 'idle' && (
            <div className={`alert ${webhookStatus === 'success' ? 'alert-success' : 'alert-error'}`}>
              {webhookStatus === 'success' ? <CheckCircle size={20} /> : <WarningCircle size={20} />}
              <span>{webhookMessage}</span>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button 
            className="btn btn-primary" 
            onClick={handleSave}
            disabled={isLoading}
          >
            {isLoading ? 'Saving...' : 'Save Configuration'}
          </button>
        </div>
      </div>

      <style>{`
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: var(--space-4);
        }

        .modal {
          background: var(--bg-primary);
          border-radius: var(--radius-xl);
          box-shadow: 0 4px 24px rgba(0, 0, 0, 0.15);
          width: 100%;
          max-width: 600px;
          max-height: 90vh;
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: var(--space-4) var(--space-6);
          border-bottom: 1px solid var(--border);
        }

        .modal-header h3 {
          margin: 0;
          font-size: var(--text-lg);
        }

        .btn-icon {
          padding: var(--space-2);
        }

        .modal-content {
          padding: var(--space-6);
          overflow-y: auto;
          flex: 1;
        }

        .modal-footer {
          display: flex;
          justify-content: flex-end;
          gap: var(--space-3);
          padding: var(--space-4) var(--space-6);
          border-top: 1px solid var(--border);
          background: var(--bg-secondary);
        }

        .setup-steps {
          display: flex;
          flex-direction: column;
          gap: var(--space-6);
        }

        .step {
          display: flex;
          gap: var(--space-4);
        }

        .step-number {
          width: 32px;
          height: 32px;
          background: var(--interactive);
          color: white;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 600;
          flex-shrink: 0;
        }

        .step-content {
          flex: 1;
        }

        .step-content h4 {
          margin: 0 0 var(--space-2) 0;
          font-size: var(--text-base);
        }

        .step-content p {
          margin: 0 0 var(--space-3) 0;
          color: var(--text-secondary);
          font-size: var(--text-sm);
        }

        .fields-container {
          display: flex;
          flex-direction: column;
          gap: var(--space-4);
          margin-top: var(--space-3);
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: var(--space-2);
        }

        .form-group label {
          font-weight: 500;
          font-size: var(--text-sm);
        }

        .input-full {
          width: 100%;
          padding: var(--space-3);
          border: 1px solid var(--border);
          border-radius: var(--radius-lg);
          font-size: var(--text-base);
          background: var(--bg-secondary);
        }

        .input-full:focus {
          outline: none;
          border-color: var(--interactive);
          box-shadow: 0 0 0 3px rgba(234, 91, 38, 0.1);
        }

        .input-help {
          font-size: var(--text-xs);
          color: var(--text-secondary);
        }

        .webhook-url-display {
          display: flex;
          gap: var(--space-2);
          align-items: center;
          background: var(--bg-secondary);
          padding: var(--space-3);
          border-radius: var(--radius-lg);
          border: 1px solid var(--border);
          margin-top: var(--space-3);
        }

        .webhook-url-display code {
          flex: 1;
          font-family: var(--font-mono);
          font-size: var(--text-sm);
          word-break: break-all;
        }

        .alert {
          display: flex;
          align-items: center;
          gap: var(--space-2);
          padding: var(--space-3) var(--space-4);
          border-radius: var(--radius-lg);
          margin-top: var(--space-4);
        }

        .alert-success {
          background: rgba(34, 197, 94, 0.1);
          color: #16a34a;
        }

        .alert-error {
          background: rgba(239, 68, 68, 0.1);
          color: #dc2626;
        }

        .step-content a {
          color: var(--interactive);
          text-decoration: none;
        }

        .step-content a:hover {
          text-decoration: underline;
        }
      `}</style>
    </div>
  );
}

export function SyncBoardChannels() {
  const channels = useQuery(api.channelConfig.list);
  const toggleChannel = useMutation(api.channelConfig.toggle);
  const seedChannels = useMutation(api.channelConfig.seed);
  
  const [configuringChannel, setConfiguringChannel] = useState<typeof channels[0] | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleSeed = async () => {
    await seedChannels({});
  };

  const handleConfigure = (channel: typeof channels[0]) => {
    setConfiguringChannel(channel);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setConfiguringChannel(null);
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
                  <button 
                    className="btn btn-ghost"
                    onClick={() => handleConfigure(channel)}
                  >
                    Configure
                  </button>
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

      <ChannelConfigModal
        channel={configuringChannel}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
      />
    </SyncBoardLayout>
  );
}
