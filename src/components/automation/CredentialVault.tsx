/**
 * AppexQuant Markets Global - Credential Vault Component
 * Secure ingestion form with masked fields, platform auto-detection,
 * and cryptographic verification status badges.
 */

import React, { useState } from 'react';
import {
  ShieldCheck,
  Lock,
  KeyRound,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Plus,
  Trash2,
  Radio,
  Share2,
} from 'lucide-react';
import {
  ConnectedChannelDTO,
  ChannelCredentialInput,
  SocialPlatform,
} from '../../types/socialAutomation.ts';
import { Button } from '../ui/Button.tsx';

interface CredentialVaultProps {
  channels: ConnectedChannelDTO[];
  onSaveChannel: (data: ChannelCredentialInput) => Promise<void>;
  onDeleteChannel: (channelId: number) => Promise<void>;
  onTestConnection: (channelId: number) => Promise<{ verified: boolean; message: string }>;
  loading?: boolean;
}

const PLATFORM_CONFIG: Record<
  SocialPlatform,
  { label: string; iconBg: string; fields: { key: string; label: string; placeholder: string; isSecret?: boolean }[] }
> = {
  TELEGRAM_BOT: {
    label: 'Telegram Bot API',
    iconBg: 'bg-sky-500/20 text-sky-400 border-sky-500/30',
    fields: [
      { key: 'bot_token', label: 'Bot Token', placeholder: '123456:ABC-DEF1234ghIkl...', isSecret: true },
      { key: 'chat_id', label: 'Chat / Channel ID', placeholder: '-100192837465' },
    ],
  },
  TELEGRAM_USERBOT: {
    label: 'Telegram Telethon Userbot',
    iconBg: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    fields: [
      { key: 'api_id', label: 'Telegram API ID', placeholder: '2938471' },
      { key: 'api_hash', label: 'Telegram API Hash', placeholder: '9f8e7d6c5b4a...', isSecret: true },
      { key: 'session_string', label: 'StringSession Key', placeholder: '1BVtsOKMBu...', isSecret: true },
    ],
  },
  DISCORD_WEBHOOK: {
    label: 'Discord Webhook',
    iconBg: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
    fields: [
      { key: 'webhook_url', label: 'Webhook URL', placeholder: 'https://discord.com/api/webhooks/...', isSecret: true },
    ],
  },
  META_INSTAGRAM: {
    label: 'Instagram Business (Meta Graph)',
    iconBg: 'bg-pink-500/20 text-pink-400 border-pink-500/30',
    fields: [
      { key: 'access_token', label: 'User / Page Access Token', placeholder: 'EAAO...', isSecret: true },
      { key: 'instagram_business_id', label: 'IG Business Account ID', placeholder: '17841405...' },
    ],
  },
  META_FACEBOOK: {
    label: 'Facebook Page (Meta Graph)',
    iconBg: 'bg-blue-600/20 text-blue-400 border-blue-600/30',
    fields: [
      { key: 'access_token', label: 'Page Access Token', placeholder: 'EAAO...', isSecret: true },
      { key: 'page_id', label: 'Facebook Page ID', placeholder: '1092837465' },
    ],
  },
  TIKTOK: {
    label: 'TikTok Creator Content API',
    iconBg: 'bg-rose-500/20 text-rose-400 border-rose-500/30',
    fields: [
      { key: 'access_token', label: 'User Access Token', placeholder: 'act.example...', isSecret: true },
      { key: 'open_id', label: 'Creator Open ID', placeholder: 'open_id_xyz' },
    ],
  },
  SNAPCHAT: {
    label: 'Snapchat Marketing & Stories API',
    iconBg: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    fields: [
      { key: 'access_token', label: 'Snap OAuth Token', placeholder: 'snap_token...', isSecret: true },
      { key: 'profile_id', label: 'Public Profile ID', placeholder: 'snap_profile_123' },
    ],
  },
  WHATSAPP_BUSINESS: {
    label: 'WhatsApp Business Cloud API',
    iconBg: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    fields: [
      { key: 'access_token', label: 'System User Token', placeholder: 'EAAO...', isSecret: true },
      { key: 'phone_number_id', label: 'Phone Number ID', placeholder: '1029384756' },
      { key: 'recipient_number', label: 'Default Broadcast / Group', placeholder: '+14155552671' },
    ],
  },
};

export const CredentialVault: React.FC<CredentialVaultProps> = ({
  channels,
  onSaveChannel,
  onDeleteChannel,
  onTestConnection,
  loading = false,
}) => {
  const [selectedPlatform, setSelectedPlatform] = useState<SocialPlatform>('TELEGRAM_BOT');
  const [channelName, setChannelName] = useState('');
  const [accountIdentifier, setAccountIdentifier] = useState('');
  const [credentials, setCredentials] = useState<Record<string, string>>({});
  const [visibleSecrets, setVisibleSecrets] = useState<Record<string, boolean>>({});
  const [testingId, setTestingId] = useState<number | null>(null);
  const [testResults, setTestResults] = useState<Record<number, { success: boolean; message: string }>>({});
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const toggleSecretVisibility = (key: string) => {
    setVisibleSecrets((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleFieldChange = (key: string, val: string) => {
    setCredentials((prev) => ({ ...prev, [key]: val }));

    // Auto-detect account identifier if applicable
    if (key === 'chat_id' || key === 'instagram_business_id' || key === 'open_id' || key === 'webhook_url') {
      setAccountIdentifier(val);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!channelName.trim()) return;

    try {
      setSubmitting(true);
      await onSaveChannel({
        platform: selectedPlatform,
        channelName: channelName.trim(),
        accountIdentifier: accountIdentifier.trim() || Object.values(credentials)[0] || 'channel_default',
        credentials,
      });
      // Reset form
      setChannelName('');
      setAccountIdentifier('');
      setCredentials({});
      setShowForm(false);
    } finally {
      setSubmitting(false);
    }
  };

  const handleTest = async (channelId: number) => {
    try {
      setTestingId(channelId);
      const res = await onTestConnection(channelId);
      setTestResults((prev) => ({
        ...prev,
        [channelId]: { success: res.verified, message: res.message },
      }));
    } catch (err: any) {
      setTestResults((prev) => ({
        ...prev,
        [channelId]: { success: false, message: err?.message || 'Verification timed out.' },
      }));
    } finally {
      setTestingId(null);
    }
  };

  const activeConfig = PLATFORM_CONFIG[selectedPlatform];

  return (
    <div className="space-y-6">
      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-2xl bg-bg-surface border border-border-color shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <KeyRound className="w-5 h-5" />
            </span>
            <h2 className="text-lg font-bold text-text-primary">Social Credential Vault</h2>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
              <ShieldCheck className="w-3 h-3" />
              Fernet 256-Bit Encrypted
            </span>
          </div>
          <p className="text-xs text-text-secondary leading-relaxed max-w-2xl">
            Store and manage multi-platform OAuth 2.0 access tokens, bot authorization keys, and secure webhooks.
            All tokens are encrypted at rest and dynamically decrypted during asynchronous Celery worker dispatches.
          </p>
        </div>

        <Button
          onClick={() => setShowForm(!showForm)}
          variant={showForm ? 'secondary' : 'primary'}
          size="sm"
          className="shrink-0"
        >
          {showForm ? 'Cancel Form' : (
            <>
              <Plus className="w-4 h-4 mr-1.5" />
              Connect Platform
            </>
          )}
        </Button>
      </div>

      {/* NEW CHANNEL INGESTION MODAL / EXPANDABLE FORM */}
      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="p-5 rounded-2xl bg-bg-surface border border-cyan-500/30 shadow-lg space-y-5 animate-in fade-in duration-200"
        >
          <div className="flex items-center justify-between pb-3 border-b border-border-color">
            <h3 className="text-sm font-bold text-text-primary flex items-center gap-2">
              <Lock className="w-4 h-4 text-cyan-400" />
              Register New Distribution Channel
            </h3>
            <span className="text-[11px] text-text-secondary">Instant Ingestion & Symmetric Encryption</span>
          </div>

          {/* Platform Selector Grid */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-text-secondary block">
              1. Select Destination Platform
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {(Object.keys(PLATFORM_CONFIG) as SocialPlatform[]).map((platformKey) => {
                const conf = PLATFORM_CONFIG[platformKey];
                const isSelected = selectedPlatform === platformKey;
                return (
                  <button
                    key={platformKey}
                    type="button"
                    onClick={() => {
                      setSelectedPlatform(platformKey);
                      setCredentials({});
                    }}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between min-h-[64px] ${
                      isSelected
                        ? 'bg-cyan-500/15 border-cyan-500/50 shadow-sm'
                        : 'bg-bg-main border-border-color hover:border-border-color/80'
                    }`}
                  >
                    <span className="text-xs font-bold text-text-primary leading-tight">{conf.label}</span>
                    <span className={`text-[10px] mt-1 font-mono px-1.5 py-0.5 rounded w-fit ${conf.iconBg}`}>
                      {platformKey.split('_')[0]}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Channel Name & Destination Identifiers */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-text-secondary">
                2. Internal Channel Name / Label
              </label>
              <input
                type="text"
                required
                value={channelName}
                onChange={(e) => setChannelName(e.target.value)}
                placeholder="e.g. VIP Signals Telegram Broadcast"
                className="w-full px-3.5 py-2.5 rounded-xl bg-bg-main border border-border-color text-xs text-text-primary focus:outline-none focus:border-cyan-500 transition-colors"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-text-secondary">
                3. Primary Account / Chat / Page Identifier
              </label>
              <input
                type="text"
                value={accountIdentifier}
                onChange={(e) => setAccountIdentifier(e.target.value)}
                placeholder="e.g. @appexquant or -1001839281"
                className="w-full px-3.5 py-2.5 rounded-xl bg-bg-main border border-border-color text-xs text-text-primary focus:outline-none focus:border-cyan-500 transition-colors"
              />
            </div>
          </div>

          {/* Platform Specific Credential Inputs */}
          <div className="space-y-3 pt-2">
            <label className="text-xs font-semibold text-text-secondary block">
              4. Secrets & Authentication Credentials ({activeConfig.label})
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {activeConfig.fields.map((field) => {
                const isSecret = field.isSecret;
                const isVisible = visibleSecrets[field.key];
                return (
                  <div key={field.key} className="space-y-1">
                    <label className="text-[11px] font-medium text-text-secondary flex items-center justify-between">
                      <span>{field.label}</span>
                      {isSecret && (
                        <span className="text-[10px] text-cyan-400 font-mono">Masked Secret</span>
                      )}
                    </label>
                    <div className="relative">
                      <input
                        type={isSecret && !isVisible ? 'password' : 'text'}
                        required={isSecret}
                        value={credentials[field.key] || ''}
                        onChange={(e) => handleFieldChange(field.key, e.target.value)}
                        placeholder={field.placeholder}
                        className="w-full pl-3.5 pr-10 py-2.5 rounded-xl bg-bg-main border border-border-color text-xs text-text-primary font-mono focus:outline-none focus:border-cyan-500 transition-colors"
                      />
                      {isSecret && (
                        <button
                          type="button"
                          onClick={() => toggleSecretVisibility(field.key)}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary p-1 cursor-pointer"
                        >
                          {isVisible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-border-color">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setShowForm(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={submitting}
            >
              {submitting ? 'Encrypting & Storing...' : 'Save & Encrypt Channel'}
            </Button>
          </div>
        </form>
      )}

      {/* CONNECTED CHANNELS AUDIT CARDS */}
      <div className="space-y-3">
        <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
          Active Connected Channels ({channels.length})
        </h3>

        {channels.length === 0 ? (
          <div className="p-8 rounded-2xl bg-bg-surface border border-dashed border-border-color text-center space-y-2">
            <Radio className="w-8 h-8 mx-auto text-text-secondary opacity-40" />
            <p className="text-xs font-semibold text-text-primary">No Social Channels Connected Yet</p>
            <p className="text-[11px] text-text-secondary max-w-sm mx-auto">
              Connect Telegram, Discord, Instagram, or TikTok to automatically distribute generated charts and quantitative signals.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {channels.map((ch) => {
              const test = testResults[ch.id];
              const isTesting = testingId === ch.id;

              return (
                <div
                  key={ch.id}
                  className="p-4 rounded-2xl bg-bg-surface border border-border-color hover:border-cyan-500/30 transition-all flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-0.5">
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-bg-main border border-border-color text-text-secondary">
                          {ch.platform}
                        </span>
                        <h4 className="text-xs font-bold text-text-primary truncate">{ch.channelName}</h4>
                      </div>
                      <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                        <CheckCircle2 className="w-3 h-3" />
                        Active
                      </span>
                    </div>

                    <div className="text-[11px] font-mono text-text-secondary bg-bg-main p-2 rounded-lg border border-border-color truncate">
                      ID: {ch.accountIdentifier}
                    </div>

                    <div className="flex items-center gap-2 text-[10px] text-text-secondary">
                      <Lock className="w-3 h-3 text-cyan-400" />
                      <span>Encrypted credentials at rest</span>
                    </div>

                    {test && (
                      <div
                        className={`text-[11px] p-2 rounded-lg border flex items-center gap-1.5 ${
                          test.success
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                            : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                        }`}
                      >
                        {test.success ? <CheckCircle2 className="w-3.5 h-3.5 shrink-0" /> : <AlertTriangle className="w-3.5 h-3.5 shrink-0" />}
                        <span className="truncate">{test.message}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-border-color gap-2">
                    <button
                      onClick={() => handleTest(ch.id)}
                      disabled={isTesting}
                      className="px-2.5 py-1.5 rounded-lg bg-bg-hover hover:bg-border-color text-text-primary text-[11px] font-medium border border-border-color flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <RefreshCw className={`w-3 h-3 ${isTesting ? 'animate-spin text-cyan-400' : ''}`} />
                      <span>{isTesting ? 'Verifying...' : 'Verify Secret'}</span>
                    </button>

                    <button
                      onClick={() => onDeleteChannel(ch.id)}
                      className="p-1.5 rounded-lg text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 transition-colors cursor-pointer"
                      title="Disconnect channel"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
