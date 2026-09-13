/**
 * AppexQuant Markets Global - Social Automation & Distribution Types
 * Full-stack data contracts for Credential Vault, 90-Day Scheduling, Observability,
 * Manual Overrides, and Execution Log Audit Trail.
 */

export type SocialPlatform =
  | 'TELEGRAM_BOT'
  | 'TELEGRAM_USERBOT'
  | 'DISCORD_WEBHOOK'
  | 'META_INSTAGRAM'
  | 'META_FACEBOOK'
  | 'TIKTOK'
  | 'SNAPCHAT'
  | 'WHATSAPP_BUSINESS';

export type PostExecutionStatus =
  | 'PENDING'
  | 'PROCESSING'
  | 'PUBLISHED'
  | 'PARTIALLY_PUBLISHED'
  | 'FAILED'
  | 'CANCELLED';

export interface ConnectedChannelDTO {
  id: number;
  userId: string;
  platform: SocialPlatform;
  channelName: string;
  accountIdentifier: string;
  isActive: boolean;
  settingsMetadata?: Record<string, any>;
  hasEncryptedCredentials?: boolean;
  tokenExpiresAt?: string | null;
  rateLimitReset?: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface ChannelCredentialInput {
  platform: SocialPlatform;
  channelName: string;
  accountIdentifier: string;
  credentials: Record<string, any>;
  settingsMetadata?: Record<string, any>;
  tokenExpiresAt?: string;
}

export interface ScheduledPostDTO {
  id: number;
  userId: string;
  targetChannelIds: number[];
  cleanedCopy: string;
  rawContent?: string;
  mediaPaths: string[];
  mediaMetadata?: Record<string, any>;
  scheduledTime: string; // ISO-8601 UTC
  status: PostExecutionStatus;
  retryCount: number;
  idempotencyKey?: string;
  publishedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ScheduledPostInput {
  targetChannelIds: number[];
  cleanedCopy: string;
  scheduledTime: string; // ISO string
  mediaPaths?: string[];
  mediaMetadata?: Record<string, any>;
}

export interface CalendarDayBucketDTO {
  date: string; // 'YYYY-MM-DD'
  totalPosts: number;
  pendingCount: number;
  publishedCount: number;
  failedCount: number;
  posts: ScheduledPostDTO[];
}

export interface CalendarViewResponseDTO {
  startDate: string;
  endDate: string;
  totalScheduled: number;
  days: CalendarDayBucketDTO[];
}

export interface PostExecutionLogDTO {
  id: number;
  postId: number;
  channelId: number;
  channelName?: string;
  platform: SocialPlatform;
  status: 'SUCCESS' | 'FAILED' | 'PENDING';
  attemptCount: number;
  platformPostId?: string | null;
  responsePayload?: Record<string, any>;
  errorMessage?: string | null;
  executedAt: string;
}

export interface SocialAnalyticsSummaryDTO {
  totalPublished: number;
  totalPending: number;
  totalFailed: number;
  overallSuccessRatePct: number;
  estimatedReach: number;
  activeChannelsCount: number;
  platformDistribution: {
    platform: SocialPlatform;
    count: number;
    successRate: number;
  }[];
  timeSeriesDelivery: {
    date: string;
    successful: number;
    failed: number;
    reach: number;
  }[];
}

export interface SyncPublishOverrideResultDTO {
  triggeredAt: string;
  postsProcessed: number;
  tokensRefreshed: number;
  message: string;
  status: 'QUEUED' | 'IN_PROGRESS' | 'COMPLETED';
}
