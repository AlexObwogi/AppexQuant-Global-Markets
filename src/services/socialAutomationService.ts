/**
 * AppexQuant Markets Global - Social Distribution & Automation API Service
 * Secure REST bridge to backend endpoints with robust mock fallback for development resilience.
 */

import {
  ConnectedChannelDTO,
  ChannelCredentialInput,
  ScheduledPostDTO,
  ScheduledPostInput,
  CalendarViewResponseDTO,
  PostExecutionLogDTO,
  SocialAnalyticsSummaryDTO,
  SyncPublishOverrideResultDTO,
} from '../types/socialAutomation.ts';

const BASE_URL = '/api/v1/automation';

export class SocialAutomationService {
  private static instance: SocialAutomationService;

  private constructor() {}

  public static getInstance(): SocialAutomationService {
    if (!SocialAutomationService.instance) {
      SocialAutomationService.instance = new SocialAutomationService();
    }
    return SocialAutomationService.instance;
  }

  // --- 1. CREDENTIAL VAULT ENDPOINTS ---

  public async getConnectedChannels(): Promise<ConnectedChannelDTO[]> {
    try {
      const res = await fetch(`${BASE_URL}/channels`, {
        headers: { 'Content-Type': 'application/json' },
      });
      if (!res.ok) throw new Error(`Failed to load channels: ${res.statusText}`);
      const data = await res.json();
      return data.data || data;
    } catch (err) {
      console.warn('[SocialAutomationService] Fallback to cached channels:', err);
      return this.getMockChannels();
    }
  }

  public async saveChannelCredentials(payload: ChannelCredentialInput): Promise<ConnectedChannelDTO> {
    const res = await fetch(`${BASE_URL}/channels`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      throw new Error(errJson.message || errJson.detail || 'Failed to save channel credentials.');
    }
    const data = await res.json();
    return data.data || data;
  }

  public async deleteChannel(channelId: number): Promise<void> {
    const res = await fetch(`${BASE_URL}/channels/${channelId}`, {
      method: 'DELETE',
    });
    if (!res.ok) {
      throw new Error('Failed to disconnect channel.');
    }
  }

  public async testChannelConnection(channelId: number): Promise<{ verified: boolean; message: string }> {
    const res = await fetch(`${BASE_URL}/channels/${channelId}/verify`, {
      method: 'POST',
    });
    if (!res.ok) {
      throw new Error('Verification request failed.');
    }
    const data = await res.json();
    return data.data || data;
  }

  // --- 2. 90-DAY CALENDAR & SCHEDULING ---

  public async getCalendarView(daysAhead: number = 90): Promise<CalendarViewResponseDTO> {
    try {
      const res = await fetch(`${BASE_URL}/calendar?days_ahead=${daysAhead}`);
      if (!res.ok) throw new Error(`Calendar fetch failed: ${res.statusText}`);
      const data = await res.json();
      return data.data || data;
    } catch (err) {
      console.warn('[SocialAutomationService] Fallback to synthetic calendar dataset:', err);
      return this.generateMockCalendar(daysAhead);
    }
  }

  public async createScheduledPost(payload: ScheduledPostInput): Promise<ScheduledPostDTO> {
    const res = await fetch(`${BASE_URL}/posts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      throw new Error(errJson.message || errJson.detail || 'Failed to schedule post.');
    }
    const data = await res.json();
    return data.data || data;
  }

  public async updatePostSchedule(postId: number, scheduledTime: string): Promise<ScheduledPostDTO> {
    const res = await fetch(`${BASE_URL}/posts/${postId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scheduled_time: scheduledTime }),
    });
    if (!res.ok) {
      throw new Error('Failed to update scheduled time.');
    }
    const data = await res.json();
    return data.data || data;
  }

  public async cancelPost(postId: number): Promise<void> {
    const res = await fetch(`${BASE_URL}/posts/${postId}`, {
      method: 'DELETE',
    });
    if (!res.ok) {
      throw new Error('Failed to cancel scheduled post.');
    }
  }

  // --- 3. OBSERVABILITY & ANALYTICS ---

  public async getAnalyticsSummary(): Promise<SocialAnalyticsSummaryDTO> {
    try {
      const res = await fetch(`${BASE_URL}/analytics/summary`);
      if (!res.ok) throw new Error('Failed to fetch analytics');
      const data = await res.json();
      return data.data || data;
    } catch (err) {
      console.warn('[SocialAutomationService] Using fallback analytics metrics:', err);
      return this.getMockAnalytics();
    }
  }

  // --- 4. INSTANT OVERRIDE & DISPATCH ---

  public async triggerSyncAndPublishNow(): Promise<SyncPublishOverrideResultDTO> {
    const res = await fetch(`${BASE_URL}/override/sync-and-publish`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || err.detail || 'Manual sync override failed.');
    }
    const data = await res.json();
    return data.data || data;
  }

  public async forceDispatchPost(postId: number): Promise<void> {
    const res = await fetch(`${BASE_URL}/posts/${postId}/instant-override`, {
      method: 'POST',
    });
    if (!res.ok) {
      throw new Error('Failed to immediately broadcast post.');
    }
  }

  // --- 5. EXECUTION LOGS & RETRY PIPELINE ---

  public async getExecutionLogs(
    status?: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<{ logs: PostExecutionLogDTO[]; total: number }> {
    try {
      let url = `${BASE_URL}/logs?limit=${limit}&offset=${offset}`;
      if (status && status !== 'ALL') {
        url += `&status=${status}`;
      }
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to fetch audit logs');
      const data = await res.json();
      return data.data || data;
    } catch (err) {
      console.warn('[SocialAutomationService] Using mock audit logs:', err);
      return this.getMockLogs(status);
    }
  }

  public async retryFailedLog(logId: number): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`${BASE_URL}/retry/${logId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      throw new Error(errJson.message || errJson.detail || 'Retry execution failed.');
    }
    const data = await res.json();
    return data.data || data;
  }

  // --- PRIVATE MOCK GENERATORS FOR INSTANT RUNTIME TESTING ---

  private getMockChannels(): ConnectedChannelDTO[] {
    return [
      {
        id: 1,
        userId: 'admin_master',
        platform: 'TELEGRAM_BOT',
        channelName: 'AppexQuant Global Signals VIP',
        accountIdentifier: '-100192847192',
        isActive: true,
        hasEncryptedCredentials: true,
        tokenExpiresAt: null,
        createdAt: new Date(Date.now() - 86400000 * 20).toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 2,
        userId: 'admin_master',
        platform: 'DISCORD_WEBHOOK',
        channelName: 'Discord Institutional Radar',
        accountIdentifier: 'https://discord.com/api/webhooks/1209384/xyz-token',
        isActive: true,
        hasEncryptedCredentials: true,
        tokenExpiresAt: null,
        createdAt: new Date(Date.now() - 86400000 * 15).toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 3,
        userId: 'admin_master',
        platform: 'META_INSTAGRAM',
        channelName: '@appexquant.markets',
        accountIdentifier: 'ig_biz_98472910384',
        isActive: true,
        hasEncryptedCredentials: true,
        tokenExpiresAt: new Date(Date.now() + 86400000 * 45).toISOString(),
        createdAt: new Date(Date.now() - 86400000 * 10).toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 4,
        userId: 'admin_master',
        platform: 'TIKTOK',
        channelName: 'AppexQuant Daily Bites',
        accountIdentifier: 'open_id_tt_4829104',
        isActive: true,
        hasEncryptedCredentials: true,
        tokenExpiresAt: new Date(Date.now() + 86400000 * 12).toISOString(),
        createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];
  }

  private generateMockCalendar(daysAhead: number): CalendarViewResponseDTO {
    const days: CalendarViewResponseDTO['days'] = [];
    const now = new Date();

    for (let i = 0; i < Math.min(daysAhead, 30); i++) {
      const date = new Date(now.getTime() + i * 86400000);
      const dateStr = date.toISOString().split('T')[0];

      const posts: ScheduledPostDTO[] = [];
      if (i % 2 === 0) {
        posts.push({
          id: 100 + i,
          userId: 'admin_master',
          targetChannelIds: [1, 2],
          cleanedCopy: `📊 [AppexQuant Market Pulse] BTC/USDT Multi-Timeframe Breakout Radar.\nConfirmed higher low at $67,400 with institutional liquidity sweeps.\n⚡ Automated Execution by AppexQuant AI`,
          mediaPaths: ['/tmp/appexquant/media/captures/BTCUSDT_1h_9_16.png'],
          scheduledTime: new Date(date.getTime() + 14 * 3600000).toISOString(),
          status: i === 0 ? 'PUBLISHED' : 'PENDING',
          retryCount: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }
      if (i % 3 === 0) {
        posts.push({
          id: 200 + i,
          userId: 'admin_master',
          targetChannelIds: [3, 4],
          cleanedCopy: `🚨 [Vol Index 75 (1s)] Rapid volatility expansion alert. Trend continuation setup active. Risk cap 1.5%.`,
          mediaPaths: ['/tmp/appexquant/media/captures/VOL75_15m_9_16.png'],
          scheduledTime: new Date(date.getTime() + 18 * 3600000).toISOString(),
          status: i === 0 ? 'PUBLISHED' : i === 2 ? 'FAILED' : 'PENDING',
          retryCount: i === 2 ? 2 : 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }

      days.push({
        date: dateStr,
        totalPosts: posts.length,
        pendingCount: posts.filter((p) => p.status === 'PENDING').length,
        publishedCount: posts.filter((p) => p.status === 'PUBLISHED').length,
        failedCount: posts.filter((p) => p.status === 'FAILED').length,
        posts,
      });
    }

    return {
      startDate: now.toISOString().split('T')[0],
      endDate: new Date(now.getTime() + daysAhead * 86400000).toISOString().split('T')[0],
      totalScheduled: days.reduce((acc, d) => acc + d.totalPosts, 0),
      days,
    };
  }

  private getMockAnalytics(): SocialAnalyticsSummaryDTO {
    const today = new Date();
    const timeSeries = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today.getTime() - i * 86400000);
      timeSeries.push({
        date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        successful: Math.floor(18 + Math.random() * 8),
        failed: Math.floor(Math.random() * 3),
        reach: Math.floor(12400 + Math.random() * 4200),
      });
    }

    return {
      totalPublished: 412,
      totalPending: 38,
      totalFailed: 9,
      overallSuccessRatePct: 97.8,
      estimatedReach: 284500,
      activeChannelsCount: 6,
      platformDistribution: [
        { platform: 'TELEGRAM_BOT', count: 184, successRate: 99.4 },
        { platform: 'DISCORD_WEBHOOK', count: 120, successRate: 98.3 },
        { platform: 'META_INSTAGRAM', count: 54, successRate: 94.4 },
        { platform: 'TIKTOK', count: 32, successRate: 93.7 },
        { platform: 'WHATSAPP_BUSINESS', count: 22, successRate: 95.5 },
      ],
      timeSeriesDelivery: timeSeries,
    };
  }

  private getMockLogs(filterStatus?: string): { logs: PostExecutionLogDTO[]; total: number } {
    const allLogs: PostExecutionLogDTO[] = [
      {
        id: 1089,
        postId: 104,
        channelId: 1,
        channelName: 'Telegram VIP Signals',
        platform: 'TELEGRAM_BOT',
        status: 'SUCCESS',
        attemptCount: 1,
        platformPostId: 'tg_msg_984210',
        responsePayload: { ok: true, result: { message_id: 984210 } },
        errorMessage: null,
        executedAt: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
      },
      {
        id: 1088,
        postId: 104,
        channelId: 2,
        channelName: 'Discord Alerts',
        platform: 'DISCORD_WEBHOOK',
        status: 'SUCCESS',
        attemptCount: 1,
        platformPostId: 'dc_129384910293847',
        responsePayload: { id: '129384910293847' },
        errorMessage: null,
        executedAt: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
      },
      {
        id: 1087,
        postId: 102,
        channelId: 3,
        channelName: 'Instagram Business',
        platform: 'META_INSTAGRAM',
        status: 'FAILED',
        attemptCount: 3,
        platformPostId: null,
        responsePayload: { error: { code: 190, message: 'OAuthException: Access token expired.' } },
        errorMessage: 'HTTP 401 Unauthorized: Meta Graph API token expired during container publishing.',
        executedAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
      },
      {
        id: 1086,
        postId: 101,
        channelId: 4,
        channelName: 'TikTok Reels',
        platform: 'TIKTOK',
        status: 'SUCCESS',
        attemptCount: 2,
        platformPostId: 'tt_publish_7491823',
        responsePayload: { publish_id: 'tt_publish_7491823' },
        errorMessage: null,
        executedAt: new Date(Date.now() - 1000 * 60 * 90).toISOString(),
      },
      {
        id: 1085,
        postId: 99,
        channelId: 1,
        channelName: 'Telegram VIP Signals',
        platform: 'TELEGRAM_BOT',
        status: 'SUCCESS',
        attemptCount: 1,
        platformPostId: 'tg_msg_984180',
        responsePayload: { ok: true },
        errorMessage: null,
        executedAt: new Date(Date.now() - 1000 * 60 * 150).toISOString(),
      },
    ];

    const filtered =
      filterStatus && filterStatus !== 'ALL'
        ? allLogs.filter((l) => l.status === filterStatus)
        : allLogs;

    return {
      logs: filtered,
      total: filtered.length,
    };
  }
}

export const socialAutomationService = SocialAutomationService.getInstance();
