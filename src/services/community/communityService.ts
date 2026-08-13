/**
 * AppexQuant Markets Global - Community & Verification Service
 * Handles trader profiles, verification status transitions, discussions, comments, moderation, and reports.
 */

import {
  TraderProfile,
  CommunityPost,
  Comment,
  CommunityReport,
  VerificationRequest,
  VerificationStatus,
} from '../../types/community';
import {
  INITIAL_TRADER_PROFILES,
  INITIAL_COMMUNITY_POSTS,
  INITIAL_COMMUNITY_REPORTS,
  INITIAL_VERIFICATION_REQUESTS,
} from '../../data/communityData';

let profilesStore: TraderProfile[] = [...INITIAL_TRADER_PROFILES];
let postsStore: CommunityPost[] = [...INITIAL_COMMUNITY_POSTS];
let reportsStore: CommunityReport[] = [...INITIAL_COMMUNITY_REPORTS];
let verificationRequestsStore: VerificationRequest[] = [...INITIAL_VERIFICATION_REQUESTS];
let userFollowsStore: Record<string, string[]> = {
  'usr-default-001': ['trader-001'],
};
let userBlocksStore: Record<string, string[]> = {};

// 1. Get Profiles
export function getTraderProfiles(currentUserId?: string): TraderProfile[] {
  const blockedIds = currentUserId ? userBlocksStore[currentUserId] || [] : [];
  return profilesStore
    .filter((p) => !blockedIds.includes(p.id))
    .map((p) => ({
      ...p,
      isFollowedByCurrentUser: currentUserId
        ? (userFollowsStore[currentUserId] || []).includes(p.id)
        : false,
    }));
}

export function getTraderProfileByUserId(userId: string, currentUserId?: string): TraderProfile | undefined {
  const profile = profilesStore.find((p) => p.userId === userId || p.id === userId);
  if (!profile) return undefined;

  return {
    ...profile,
    isFollowedByCurrentUser: currentUserId
      ? (userFollowsStore[currentUserId] || []).includes(profile.id)
      : false,
  };
}

// Update Current User Profile
export function updateTraderProfile(
  userId: string,
  updates: Partial<Pick<TraderProfile, 'displayName' | 'avatar' | 'country' | 'experience' | 'markets' | 'strategyCategories' | 'bio' | 'isPublic'>>
): TraderProfile | null {
  const index = profilesStore.findIndex((p) => p.userId === userId || p.id === userId);
  if (index === -1) return null;

  profilesStore[index] = {
    ...profilesStore[index],
    ...updates,
  };
  return profilesStore[index];
}

// 2. Follow / Unfollow
export function toggleFollowTrader(currentUserId: string, targetTraderId: string): { isFollowing: boolean; followerCount: number } {
  const follows = userFollowsStore[currentUserId] || [];
  const targetIndex = profilesStore.findIndex((p) => p.id === targetTraderId || p.userId === targetTraderId);

  let isFollowing = false;
  if (follows.includes(targetTraderId)) {
    // Unfollow
    userFollowsStore[currentUserId] = follows.filter((id) => id !== targetTraderId);
    if (targetIndex !== -1) {
      profilesStore[targetIndex].followerCount = Math.max(0, profilesStore[targetIndex].followerCount - 1);
    }
    isFollowing = false;
  } else {
    // Follow
    userFollowsStore[currentUserId] = [...follows, targetTraderId];
    if (targetIndex !== -1) {
      profilesStore[targetIndex].followerCount += 1;
    }
    isFollowing = true;
  }

  const updatedCount = targetIndex !== -1 ? profilesStore[targetIndex].followerCount : 0;
  return { isFollowing, followerCount: updatedCount };
}

// 3. Get Posts
export function getCommunityPosts(category?: string, search?: string, currentUserId?: string): CommunityPost[] {
  const blockedUserIds = currentUserId ? userBlocksStore[currentUserId] || [] : [];
  let filtered = postsStore.filter((post) => !blockedUserIds.includes(post.authorId));

  if (category && category !== 'ALL') {
    filtered = filtered.filter((post) => post.category === category);
  }

  if (search && search.trim() !== '') {
    const q = search.toLowerCase();
    filtered = filtered.filter(
      (post) =>
        post.title.toLowerCase().includes(q) ||
        post.content.toLowerCase().includes(q) ||
        post.authorName.toLowerCase().includes(q) ||
        post.tags.some((t) => t.toLowerCase().includes(q))
    );
  }

  return filtered.map((post) => ({
    ...post,
    likedByCurrentUser: Boolean(post.likedByCurrentUser),
  }));
}

// 4. Create Post
export function createCommunityPost(
  payload: Omit<CommunityPost, 'id' | 'createdAt' | 'likeCount' | 'commentCount' | 'comments'>
): CommunityPost {
  const newPost: CommunityPost = {
    ...payload,
    id: `post-${Date.now()}`,
    likeCount: 0,
    commentCount: 0,
    comments: [],
    createdAt: new Date().toISOString(),
  };

  postsStore = [newPost, ...postsStore];

  // Update post count for author
  const authorIndex = profilesStore.findIndex((p) => p.userId === payload.authorId);
  if (authorIndex !== -1) {
    profilesStore[authorIndex].postCount += 1;
  }

  return newPost;
}

// 5. Like / Unlike Post
export function toggleLikePost(postId: string, currentUserId: string): { liked: boolean; likeCount: number } {
  const postIndex = postsStore.findIndex((p) => p.id === postId);
  if (postIndex === -1) return { liked: false, likeCount: 0 };

  const post = postsStore[postIndex];
  const currentStatus = Boolean(post.likedByCurrentUser);
  const newStatus = !currentStatus;

  postsStore[postIndex] = {
    ...post,
    likedByCurrentUser: newStatus,
    likeCount: newStatus ? post.likeCount + 1 : Math.max(0, post.likeCount - 1),
  };

  return { liked: newStatus, likeCount: postsStore[postIndex].likeCount };
}

// 6. Comments
export function addPostComment(postId: string, commentData: Omit<Comment, 'id' | 'createdAt' | 'likes'>): Comment | null {
  const postIndex = postsStore.findIndex((p) => p.id === postId);
  if (postIndex === -1) return null;

  const newComment: Comment = {
    ...commentData,
    id: `cmt-${Date.now()}`,
    createdAt: new Date().toISOString(),
    likes: 0,
  };

  const existingComments = postsStore[postIndex].comments || [];
  postsStore[postIndex].comments = [...existingComments, newComment];
  postsStore[postIndex].commentCount += 1;

  return newComment;
}

// 7. Report Item
export function submitCommunityReport(reportData: Omit<CommunityReport, 'id' | 'createdAt' | 'status'>): CommunityReport {
  const newReport: CommunityReport = {
    ...reportData,
    id: `rep-${Date.now()}`,
    status: 'PENDING',
    createdAt: new Date().toISOString(),
  };

  reportsStore = [newReport, ...reportsStore];
  return newReport;
}

// 8. Block Trader
export function toggleBlockTrader(currentUserId: string, targetUserId: string): boolean {
  const blocks = userBlocksStore[currentUserId] || [];
  if (blocks.includes(targetUserId)) {
    userBlocksStore[currentUserId] = blocks.filter((id) => id !== targetUserId);
    return false; // unblocked
  } else {
    userBlocksStore[currentUserId] = [...blocks, targetUserId];
    return true; // blocked
  }
}

export function getBlockedTraderIds(currentUserId: string): string[] {
  return userBlocksStore[currentUserId] || [];
}

// 9. Submit Verification Request
export function submitVerificationRequest(payload: Omit<VerificationRequest, 'id' | 'submittedAt' | 'status'>): VerificationRequest {
  const newReq: VerificationRequest = {
    ...payload,
    id: `ver-req-${Date.now()}`,
    status: 'PENDING',
    submittedAt: new Date().toISOString(),
  };

  verificationRequestsStore = [newReq, ...verificationRequestsStore];
  return newReq;
}

// 10. Admin: Reports Management
export function getAdminReports(): CommunityReport[] {
  return reportsStore;
}

export function resolveAdminReport(reportId: string, actionTaken: string): boolean {
  const reportIndex = reportsStore.findIndex((r) => r.id === reportId);
  if (reportIndex === -1) return false;

  const report = reportsStore[reportIndex];
  reportsStore[reportIndex] = {
    ...report,
    status: 'RESOLVED',
    resolvedAt: new Date().toISOString(),
    actionTaken,
  };

  if (actionTaken === 'DELETE_POST') {
    postsStore = postsStore.filter((p) => p.id !== report.targetId);
  }

  return true;
}

// 11. Admin: Verification Requests
export function getAdminVerificationRequests(): VerificationRequest[] {
  return verificationRequestsStore;
}

export function reviewAdminVerificationRequest(
  requestId: string,
  status: 'APPROVED' | 'REJECTED',
  rejectionReason?: string
): VerificationRequest | null {
  const reqIndex = verificationRequestsStore.findIndex((r) => r.id === requestId);
  if (reqIndex === -1) return null;

  const request = verificationRequestsStore[reqIndex];
  const updatedReq: VerificationRequest = {
    ...request,
    status,
    reviewedAt: new Date().toISOString(),
    rejectionReason,
  };

  verificationRequestsStore[reqIndex] = updatedReq;

  if (status === 'APPROVED') {
    // Transition target user's verification status
    const targetUserIndex = profilesStore.findIndex((p) => p.userId === request.userId);
    if (targetUserIndex !== -1) {
      const now = new Date().toISOString();
      const currentVerification = profilesStore[targetUserIndex].verificationDetails || {};

      let newLevel: VerificationStatus = request.requestedLevel;
      let newDetails = { ...currentVerification };

      if (newLevel === 'IDENTITY_VERIFIED') {
        newDetails.identityVerifiedAt = now;
      } else if (newLevel === 'ACCOUNT_VERIFIED') {
        newDetails.identityVerifiedAt = newDetails.identityVerifiedAt || now;
        newDetails.accountVerifiedAt = now;
        newDetails.connectedBrokerAccount = request.proofDetails;
      } else if (newLevel === 'PERFORMANCE_VERIFIED') {
        newDetails.identityVerifiedAt = newDetails.identityVerifiedAt || now;
        newDetails.accountVerifiedAt = newDetails.accountVerifiedAt || now;
        newDetails.performanceVerifiedAt = now;
        newDetails.connectedBrokerAccount = request.proofDetails;
        newDetails.dataSourceName = 'Deriv MT5 Live Gateway';
        newDetails.verificationNotes = `Audited execution record via ${request.proofDetails}.`;
      }

      profilesStore[targetUserIndex] = {
        ...profilesStore[targetUserIndex],
        verificationStatus: newLevel,
        verificationDetails: newDetails,
      };
    }
  }

  return updatedReq;
}
