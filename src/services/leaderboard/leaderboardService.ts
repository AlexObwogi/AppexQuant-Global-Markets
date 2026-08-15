/**
 * AppexQuant Markets Global - Leaderboard State & Real-Time Sync Service
 * Manages live ranking computation, 2-year retention filtering, and Hall of Fame queries
 */

import { LeaderboardEntry, HallOfFameInductee, LeaderboardWindow, VerifiedBadge } from '../../types/leaderboard.ts';
import { LEADERBOARD_MASTER_DATA, HALL_OF_FAME_INDUCTEES, BADGE_TRIPLE_LEADER_PURPLE, BADGE_ALL_TIME_EARNER_GOLD } from './leaderboardData.ts';

class LeaderboardService {
  private leaderboardData: Record<LeaderboardWindow, LeaderboardEntry[]> = { ...LEADERBOARD_MASTER_DATA };
  private hallOfFameData: HallOfFameInductee[] = [...HALL_OF_FAME_INDUCTEES];

  /**
   * Get ranked leaderboard entries for specified competition window (WEEKLY, MONTHLY, YEARLY, ALL_TIME)
   */
  public getLeaderboard(window: LeaderboardWindow = 'MONTHLY', search?: string): LeaderboardEntry[] {
    let entries = this.leaderboardData[window] || this.leaderboardData.MONTHLY;

    if (search && search.trim()) {
      const q = search.toLowerCase().trim();
      entries = entries.filter(
        (e) =>
          e.displayName.toLowerCase().includes(q) ||
          e.username.toLowerCase().includes(q) ||
          e.primaryStrategy.toLowerCase().includes(q) ||
          e.country.toLowerCase().includes(q)
      );
    }

    // Re-verify badging logic dynamically
    return entries.map((entry) => this.decorateWithBadges(entry));
  }

  /**
   * Get permanent Hall of Fame inductees with verified thumbnails and telemetry records
   */
  public getHallOfFame(windowFilter?: 'ALL' | 'YEARLY' | 'MONTHLY'): HallOfFameInductee[] {
    if (!windowFilter || windowFilter === 'ALL') {
      return this.hallOfFameData;
    }
    return this.hallOfFameData.filter((item) => item.inductionWindow === windowFilter);
  }

  /**
   * Get trader by userId across leaderboard windows
   */
  public getTraderById(userId: string): LeaderboardEntry | null {
    for (const win of ['ALL_TIME', 'YEARLY', 'MONTHLY', 'WEEKLY'] as LeaderboardWindow[]) {
      const found = this.leaderboardData[win]?.find((u) => u.userId === userId);
      if (found) {
        return this.decorateWithBadges(found);
      }
    }
    return null;
  }

  /**
   * Get 2-Year Rolling Historical Performance Log for a specific trader (24 Months)
   */
  public getTraderHistoricalRetention(userId: string): { userId: string; logs: any[] } | null {
    for (const win of ['ALL_TIME', 'YEARLY', 'MONTHLY', 'WEEKLY'] as LeaderboardWindow[]) {
      const found = this.leaderboardData[win].find((u) => u.userId === userId);
      if (found) {
        return {
          userId,
          logs: found.historicalRetentionLogs,
        };
      }
    }
    return null;
  }

  /**
   * Automatically inspect criteria and decorate entry with verified badges
   * 1. Triple-Leader Purple Badge: Achieved 3x #1 finishes
   * 2. All-Time Earner Gold Badge: Reigning all-time top earner (styled like social media verification)
   */
  private decorateWithBadges(entry: LeaderboardEntry): LeaderboardEntry {
    const badges: VerifiedBadge[] = [...entry.badges];

    // Check Triple-Leader criteria
    if (entry.firstPlaceFinishesCount >= 3) {
      if (!badges.some((b) => b.type === 'TRIPLE_LEADER_PURPLE')) {
        badges.unshift(BADGE_TRIPLE_LEADER_PURPLE);
      }
    }

    // Check All-Time Earner criteria
    if (entry.isAllTimeLeader) {
      if (!badges.some((b) => b.type === 'ALL_TIME_EARNER_GOLD')) {
        badges.unshift(BADGE_ALL_TIME_EARNER_GOLD);
      }
    }

    return {
      ...entry,
      badges,
    };
  }

  /**
   * Simulate real-time live performance tick updates (fluctuates PnL / Win-rate slightly)
   */
  public tickLiveLeaderboard(): void {
    const weekly = this.leaderboardData.WEEKLY;
    if (weekly && weekly.length > 0) {
      const delta = (Math.random() - 0.48) * 45;
      weekly[0].pnlUsd = +(weekly[0].pnlUsd + delta).toFixed(2);
      weekly[0].totalTrades += Math.random() > 0.8 ? 1 : 0;
    }
  }
}

export const leaderboardService = new LeaderboardService();
