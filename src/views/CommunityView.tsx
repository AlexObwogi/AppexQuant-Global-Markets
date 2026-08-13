/**
 * AppexQuant Markets Global - Upgraded Trader Community & Verification Center View
 */

import React, { useState, useEffect } from 'react';
import {
  TraderProfile,
  CommunityPost,
  CommunityReport,
  VerificationRequest,
} from '../types/community';
import {
  getTraderProfiles,
  getTraderProfileByUserId,
  updateTraderProfile,
  toggleFollowTrader,
  getCommunityPosts,
  createCommunityPost,
  toggleLikePost,
  addPostComment,
  submitCommunityReport,
  toggleBlockTrader,
  submitVerificationRequest,
  getAdminReports,
  resolveAdminReport,
  getAdminVerificationRequests,
  reviewAdminVerificationRequest,
} from '../services/community/communityService';
import { PostCard } from '../components/community/PostCard';
import { TraderProfileCard } from '../components/community/TraderProfileCard';
import { CreatePostModal } from '../components/community/CreatePostModal';
import { EditProfileModal } from '../components/community/EditProfileModal';
import { RequestVerificationModal } from '../components/community/RequestVerificationModal';
import { AdminCommunityConsoleModal } from '../components/community/AdminCommunityConsoleModal';
import { SuccessStoriesSection } from '../components/success/SuccessStoriesSection';
import { VerificationBadge } from '../components/community/VerificationBadge';
import { useGlobalState } from '../state/GlobalStateContext';
import {
  Users,
  MessageSquare,
  PlusCircle,
  Search,
  Filter,
  ShieldAlert,
  User,
  Globe,
  Award,
  Sparkles,
} from 'lucide-react';

export const CommunityView: React.FC = () => {
  const { state, dispatch } = useGlobalState();
  const user = state.user;
  const currentUserId = user?.id || 'usr-default-001';
  const isAdmin = user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN' || user?.role === 'RISK_MANAGER';

  const [activeTab, setActiveTab] = useState<'POSTS_FEED' | 'TRADERS' | 'SUCCESS_STORIES' | 'CHANNELS'>('POSTS_FEED');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Domain state
  const [profiles, setProfiles] = useState<TraderProfile[]>([]);
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [reports, setReports] = useState<CommunityReport[]>([]);
  const [verificationRequests, setVerificationRequests] = useState<VerificationRequest[]>([]);
  const [currentUserProfile, setCurrentUserProfile] = useState<TraderProfile | null>(null);

  // Modals
  const [isCreatePostOpen, setIsCreatePostOpen] = useState(false);
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [isRequestVerificationOpen, setIsRequestVerificationOpen] = useState(false);
  const [isAdminConsoleOpen, setIsAdminConsoleOpen] = useState(false);

  // Initial Load
  useEffect(() => {
    fetchCommunityData();
  }, [selectedCategory, searchQuery, currentUserId]);

  const fetchCommunityData = () => {
    const fetchedProfiles = getTraderProfiles(currentUserId);
    setProfiles(fetchedProfiles);

    const me = getTraderProfileByUserId(currentUserId, currentUserId) || fetchedProfiles[fetchedProfiles.length - 1];
    setCurrentUserProfile(me || null);

    const fetchedPosts = getCommunityPosts(selectedCategory, searchQuery, currentUserId);
    setPosts(fetchedPosts);

    if (isAdmin) {
      setReports(getAdminReports());
      setVerificationRequests(getAdminVerificationRequests());
    }
  };

  // Helper for notification
  const notify = (title: string, message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info') => {
    dispatch({
      type: 'ADD_NOTIFICATION',
      payload: { title, message, type },
    });
  };

  // Actions
  const handleLikePost = (postId: string) => {
    toggleLikePost(postId, currentUserId);
    fetchCommunityData();
  };

  const handleAddComment = (postId: string, content: string) => {
    if (!currentUserProfile) return;
    addPostComment(postId, {
      postId,
      authorId: currentUserId,
      authorName: currentUserProfile.displayName,
      authorUsername: currentUserProfile.username,
      authorAvatar: currentUserProfile.avatar,
      authorVerificationStatus: currentUserProfile.verificationStatus,
      content,
    });
    fetchCommunityData();
    notify('Community', 'Comment added to discussion.', 'success');
  };

  const handleCreatePost = (postPayload: any) => {
    if (!currentUserProfile) return;
    createCommunityPost({
      ...postPayload,
      authorId: currentUserId,
      authorName: currentUserProfile.displayName,
      authorUsername: currentUserProfile.username,
      authorAvatar: currentUserProfile.avatar,
      authorCountry: currentUserProfile.country,
      authorVerificationStatus: currentUserProfile.verificationStatus,
    });
    fetchCommunityData();
    notify('Community', 'Community post published successfully!', 'success');
  };

  const handleToggleFollow = (targetTraderId: string) => {
    const res = toggleFollowTrader(currentUserId, targetTraderId);
    fetchCommunityData();
    notify('Community', res.isFollowing ? 'Trader followed.' : 'Trader unfollowed.', 'info');
  };

  const handleToggleBlock = (targetUserId: string) => {
    const isBlocked = toggleBlockTrader(currentUserId, targetUserId);
    fetchCommunityData();
    notify('Community', isBlocked ? 'Trader blocked. Content hidden.' : 'Trader unblocked.', 'warning');
  };

  const handleReport = (targetType: 'POST' | 'COMMENT' | 'TRADER', targetId: string, title: string) => {
    if (!currentUserProfile) return;
    submitCommunityReport({
      reporterId: currentUserId,
      reporterName: currentUserProfile.displayName,
      targetType,
      targetId,
      targetTitleOrName: title,
      reason: 'MISLEADING_CLAIMS',
      details: `User reported ${targetType} "${title}" for potential compliance/misleading claim review.`,
    });
    fetchCommunityData();
    notify('Community', 'Report submitted to administrator review queue.', 'info');
  };

  const handleSaveProfile = (updates: Partial<TraderProfile>) => {
    updateTraderProfile(currentUserId, updates);
    fetchCommunityData();
    notify('Profile Updated', 'Trader profile saved successfully.', 'success');
  };

  const handleSubmitVerificationRequest = (payload: any) => {
    if (!currentUserProfile) return;
    submitVerificationRequest({
      userId: currentUserId,
      userName: currentUserProfile.displayName,
      userUsername: currentUserProfile.username,
      ...payload,
    });
    fetchCommunityData();
    notify('Verification Queue', 'Verification request submitted for admin review.', 'info');
  };

  const handleResolveAdminReport = (reportId: string, actionTaken: string) => {
    resolveAdminReport(reportId, actionTaken);
    fetchCommunityData();
    notify('Admin Console', `Report resolved: ${actionTaken}`, 'success');
  };

  const handleReviewAdminVerification = (requestId: string, status: 'APPROVED' | 'REJECTED', rejectionReason?: string) => {
    reviewAdminVerificationRequest(requestId, status, rejectionReason);
    fetchCommunityData();
    notify(
      'Admin Console',
      status === 'APPROVED' ? 'Verification granted & level elevated!' : 'Verification request rejected.',
      status === 'APPROVED' ? 'success' : 'warning'
    );
  };

  const handleForkStrategyToBacktest = (sharedStrategy: any) => {
    notify('Strategy Forked', `Strategy "${sharedStrategy.strategyName}" parameters loaded for Backtest.`, 'success');
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Top Banner & User Profile Quick Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-[#131822] to-slate-900 border border-border-color shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-extrabold text-text-primary tracking-tight flex items-center gap-2">
              <Users className="w-7 h-7 text-cyan-400" />
              AppexQuant Trader Community
            </h1>
            <span className="text-xs px-2.5 py-0.5 rounded-full font-mono bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-bold uppercase">
              AUDITED TRUST ECOSYSTEM
            </span>
          </div>
          <p className="text-xs text-text-secondary max-w-2xl">
            Collaborate with verified traders, share strategies with executable criteria, and inspect audited performance records.
          </p>
        </div>

        {/* User Status Badge & Action Controls */}
        <div className="flex flex-wrap items-center gap-3">
          {currentUserProfile && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#0B0E14] border border-border-color">
              <div className="w-8 h-8 rounded-lg bg-bg-hover border border-border-color flex items-center justify-center font-bold text-xs text-text-secondary">
                {currentUserProfile.avatar || currentUserProfile.displayName.charAt(0)}
              </div>
              <div>
                <span className="font-bold text-xs text-text-secondary block">{currentUserProfile.displayName}</span>
                <VerificationBadge status={currentUserProfile.verificationStatus} size="sm" />
              </div>
            </div>
          )}

          <button
            onClick={() => setIsCreatePostOpen(true)}
            className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-text-secondary font-bold text-xs uppercase tracking-wider transition-all shadow-lg shadow-cyan-500/20 cursor-pointer flex items-center gap-2"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Publish Post</span>
          </button>

          <button
            onClick={() => setIsEditProfileOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-bg-hover hover:bg-bg-hover text-text-secondary font-bold text-xs font-mono transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <User className="w-3.5 h-3.5 text-cyan-400" />
            <span>Edit Profile</span>
          </button>

          {isAdmin && (
            <button
              onClick={() => setIsAdminConsoleOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 font-bold text-xs font-mono transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>Admin Console</span>
            </button>
          )}
        </div>
      </div>

      {/* Primary Community Navigation Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-border-color pb-3">
        <div className="flex flex-wrap gap-2 text-xs font-mono">
          {[
            { id: 'POSTS_FEED', label: 'Discussions & Posts', icon: <MessageSquare className="w-4 h-4" /> },
            { id: 'TRADERS', label: 'Trader Directory', icon: <Users className="w-4 h-4" /> },
            { id: 'SUCCESS_STORIES', label: 'Verified Success Stories', icon: <Award className="w-4 h-4 text-amber-400" /> },
            { id: 'CHANNELS', label: 'Official Channels', icon: <Globe className="w-4 h-4" /> },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-2 ${
                activeTab === tab.id
                  ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 shadow-sm'
                  : 'bg-[#111622] text-text-secondary border border-border-color/80 hover:text-text-secondary'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Search Bar */}
        {activeTab === 'POSTS_FEED' && (
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-text-secondary absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search posts, strategy, tags..."
              className="w-full bg-[#111622] border border-border-color rounded-xl pl-9 pr-3 py-2 text-xs text-text-secondary focus:outline-none focus:border-cyan-500"
            />
          </div>
        )}
      </div>

      {/* VIEW 1: DISCUSSIONS & POSTS FEED */}
      {activeTab === 'POSTS_FEED' && (
        <div className="space-y-6">
          {/* Category Filter Pills */}
          <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
            <span className="text-text-secondary text-[11px] font-bold uppercase mr-1 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5" /> Filter:
            </span>
            {[
              { id: 'ALL', label: 'All Content' },
              { id: 'STRATEGY_DISCUSSION', label: 'Strategy Shares' },
              { id: 'EDUCATIONAL', label: 'Educational Guides' },
              { id: 'PERFORMANCE_SNAPSHOT', label: 'Performance Snapshots' },
              { id: 'SUCCESS_STORY', label: 'Success Stories' },
            ].map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer border ${
                  selectedCategory === cat.id
                    ? 'bg-bg-hover text-cyan-300 border-cyan-500/40'
                    : 'bg-[#111622] text-text-secondary border-border-color hover:text-text-secondary'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Posts List */}
          {posts.length === 0 ? (
            <div className="p-12 text-center rounded-2xl bg-[#111622] border border-border-color space-y-3 font-mono">
              <Sparkles className="w-8 h-8 text-text-secondary mx-auto" />
              <h4 className="text-sm font-bold text-text-secondary">No community posts match your filter</h4>
              <p className="text-xs text-text-secondary">Be the first trader to publish a post or strategy share!</p>
            </div>
          ) : (
            <div className="space-y-5">
              {posts.map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  currentUserId={currentUserId}
                  onLike={handleLikePost}
                  onAddComment={handleAddComment}
                  onReport={handleReport}
                  onForkStrategy={handleForkStrategyToBacktest}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* VIEW 2: TRADER DIRECTORY */}
      {activeTab === 'TRADERS' && (
        <div className="space-y-6">
          <div className="p-4 rounded-xl bg-[#0B0E14] border border-border-color text-xs font-mono text-text-secondary flex items-center justify-between">
            <span>
              Showing <strong className="text-text-secondary">{profiles.length}</strong> Community Traders
            </span>
            <span className="text-cyan-400">Explicit Verification Levels Enforced</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {profiles.map((prof) => (
              <TraderProfileCard
                key={prof.id}
                profile={prof}
                currentUserId={currentUserId}
                onToggleFollow={handleToggleFollow}
                onToggleBlock={handleToggleBlock}
                onReport={handleReport}
                onRequestVerificationModal={() => setIsRequestVerificationOpen(true)}
              />
            ))}
          </div>
        </div>
      )}

      {/* VIEW 3: VERIFIED SUCCESS STORIES CAROUSEL */}
      {activeTab === 'SUCCESS_STORIES' && <SuccessStoriesSection />}

      {/* VIEW 4: OFFICIAL CHANNELS */}
      {activeTab === 'CHANNELS' && (
        <div className="p-6 rounded-2xl bg-[#111622] border border-border-color space-y-4">
          <h3 className="text-base font-bold text-text-primary flex items-center gap-2">
            <Globe className="w-5 h-5 text-cyan-400" />
            Official Community Channels
          </h3>
          <p className="text-xs text-text-secondary">
            Join our verified global channels for real-time market discussions, strategy insights, and EA update releases.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 font-mono">
            <div className="p-4 rounded-xl bg-[#0B0E14] border border-border-color space-y-2">
              <span className="text-xs font-bold text-cyan-400 block">Telegram Channel</span>
              <p className="text-[11px] text-text-secondary font-sans">Daily quantitative signals and market news updates.</p>
              <a
                href="https://telegram.org"
                target="_blank"
                rel="noreferrer"
                className="text-xs text-cyan-300 font-bold hover:underline inline-flex items-center gap-1 pt-1"
              >
                Join Telegram ↗
              </a>
            </div>

            <div className="p-4 rounded-xl bg-[#0B0E14] border border-border-color space-y-2">
              <span className="text-xs font-bold text-indigo-400 block">Discord Server</span>
              <p className="text-[11px] text-text-secondary font-sans">Strategy backtesting rooms, MQL5 coding channels & Q&A.</p>
              <a
                href="https://discord.com"
                target="_blank"
                rel="noreferrer"
                className="text-xs text-indigo-300 font-bold hover:underline inline-flex items-center gap-1 pt-1"
              >
                Join Discord ↗
              </a>
            </div>

            <div className="p-4 rounded-xl bg-[#0B0E14] border border-border-color space-y-2">
              <span className="text-xs font-bold text-emerald-400 block">WhatsApp Community</span>
              <p className="text-[11px] text-text-secondary font-sans">Instant trade alerts and Deriv MT5 notifications.</p>
              <a
                href="https://whatsapp.com"
                target="_blank"
                rel="noreferrer"
                className="text-xs text-emerald-300 font-bold hover:underline inline-flex items-center gap-1 pt-1"
              >
                Join WhatsApp ↗
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      <CreatePostModal
        isOpen={isCreatePostOpen}
        onClose={() => setIsCreatePostOpen(false)}
        onSubmit={handleCreatePost}
        currentUserVerificationStatus={currentUserProfile?.verificationStatus || 'UNVERIFIED'}
      />

      {currentUserProfile && (
        <EditProfileModal
          isOpen={isEditProfileOpen}
          onClose={() => setIsEditProfileOpen(false)}
          currentProfile={currentUserProfile}
          onSaveProfile={handleSaveProfile}
          onRequestVerification={() => setIsRequestVerificationOpen(true)}
        />
      )}

      <RequestVerificationModal
        isOpen={isRequestVerificationOpen}
        onClose={() => setIsRequestVerificationOpen(false)}
        onSubmitRequest={handleSubmitVerificationRequest}
      />

      {isAdmin && (
        <AdminCommunityConsoleModal
          isOpen={isAdminConsoleOpen}
          onClose={() => setIsAdminConsoleOpen(false)}
          reports={reports}
          verificationRequests={verificationRequests}
          onResolveReport={handleResolveAdminReport}
          onReviewVerificationRequest={handleReviewAdminVerification}
        />
      )}
    </div>
  );
};
