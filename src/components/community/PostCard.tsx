/**
 * AppexQuant Markets Global - Community Post Card Component
 * Supports Discussions, Educational, Strategy Sharing, and Verified Performance Snapshots/Success Stories
 */

import React, { useState } from 'react';
import { CommunityPost, Comment } from '../../types/community.js';
import { VerificationBadge } from './VerificationBadge.js';
import { PerformanceBadge } from '../common/PerformanceDisclaimer.js';
import {
  Heart,
  MessageSquare,
  Share2,
  Flag,
  Award,
  Play,
  Copy,
  CheckCircle2,
  AlertTriangle,
  User,
  Send,
  Database,
  Calendar,
  Layers,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface PostCardProps {
  post: CommunityPost;
  currentUserId: string;
  onLike: (postId: string) => void;
  onAddComment: (postId: string, content: string) => void;
  onReport: (targetType: 'POST' | 'COMMENT' | 'TRADER', targetId: string, title: string) => void;
  onForkStrategy?: (sharedStrategy: NonNullable<CommunityPost['sharedStrategy']>) => void;
}

export const PostCard: React.FC<PostCardProps> = ({
  post,
  currentUserId,
  onLike,
  onAddComment,
  onReport,
  onForkStrategy,
}) => {
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);

  const handleCommentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    onAddComment(post.id, commentText);
    setCommentText('');
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const getCategoryColor = (cat: CommunityPost['category']) => {
    switch (cat) {
      case 'SUCCESS_STORY':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'PERFORMANCE_SNAPSHOT':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'STRATEGY_DISCUSSION':
        return 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20';
      case 'EDUCATIONAL':
        return 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20';
      default:
        return 'bg-bg-hover text-text-primary border-border-color';
    }
  };

  return (
    <div className="p-6 rounded-2xl bg-bg-surface border border-border-color shadow-lg space-y-5 transition-all hover:border-border-color/80">
      {/* Header: Author Info */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border-color/60 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-bg-secondary border border-border-color flex items-center justify-center font-bold text-text-primary text-sm">
            {post.authorAvatar || post.authorName.charAt(0)}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-text-primary text-sm">{post.authorName}</span>
              <span className="text-xs text-text-secondary font-mono">@{post.authorUsername}</span>
              <VerificationBadge status={post.authorVerificationStatus} size="sm" />
            </div>
            <p className="text-[11px] text-text-secondary font-mono mt-0.5">
              {post.authorCountry} • {new Date(post.createdAt).toLocaleDateString()}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold uppercase tracking-wider border ${getCategoryColor(post.category)}`}>
            {post.category.replace('_', ' ')}
          </span>
          <button
            onClick={() => onReport('POST', post.id, post.title)}
            className="p-1.5 rounded-lg bg-bg-hover/60 text-text-secondary hover:text-amber-400 hover:bg-bg-hover transition-colors cursor-pointer"
            title="Report post"
          >
            <Flag className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Post Content */}
      <div className="space-y-3">
        <h3 className="text-lg font-bold text-text-primary leading-snug">{post.title}</h3>
        <p className="text-xs sm:text-sm text-text-primary leading-relaxed whitespace-pre-line">{post.content}</p>

        {/* Tags */}
        {post.tags && post.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {post.tags.map((tag) => (
              <span key={tag} className="text-[10px] font-mono text-cyan-400 bg-cyan-950/40 px-2 py-0.5 rounded border border-cyan-800/30">
                #{tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* SPECIAL PAYLOAD 1: PERFORMANCE SNAPSHOT / SUCCESS STORY */}
      {post.performanceSnapshot && (
        <div className="p-5 rounded-xl bg-bg-secondary border border-border-color space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border-color pb-3">
            <div className="flex items-center gap-2">
              <Award className="w-5 h-5 text-amber-500 dark:text-amber-400" />
              <span className="font-bold text-text-primary text-xs uppercase font-mono tracking-wider">
                Performance Record & Verification Audit
              </span>
            </div>
            <PerformanceBadge environment={post.performanceSnapshot.accountType} size="sm" showSubtext />
          </div>

          {/* Mandatory 4 Key Mandatory Display Fields */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono bg-bg-surface p-3 rounded-lg border border-border-color">
            <div>
              <span className="text-text-secondary text-[10px] uppercase block flex items-center gap-1">
                <Database className="w-3 h-3 text-text-secondary" /> Data Source
              </span>
              <span className="font-bold text-text-primary truncate block mt-0.5" title={post.performanceSnapshot.dataSource}>
                {post.performanceSnapshot.dataSource}
              </span>
            </div>

            <div>
              <span className="text-text-secondary text-[10px] uppercase block flex items-center gap-1">
                <Calendar className="w-3 h-3 text-text-secondary" /> Period
              </span>
              <span className="font-bold text-text-primary block mt-0.5">
                {post.performanceSnapshot.period}
              </span>
            </div>

            <div>
              <span className="text-text-secondary text-[10px] uppercase block flex items-center gap-1">
                <Layers className="w-3 h-3 text-text-secondary" /> Account Type
              </span>
              <span className="font-bold text-sky-400 block mt-0.5">
                {post.performanceSnapshot.accountType}
              </span>
            </div>

            <div>
              <span className="text-text-secondary text-[10px] uppercase block">Verification State</span>
              <VerificationBadge status={post.performanceSnapshot.verificationStatus} size="sm" className="mt-0.5" />
            </div>
          </div>

          {/* Financial Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center pt-2">
            <div className="p-2.5 rounded-lg bg-bg-surface border border-border-color">
              <span className="text-[10px] text-text-secondary font-mono block">Win Rate</span>
              <span className="text-sm font-bold font-mono text-emerald-600 dark:text-emerald-400">
                {post.performanceSnapshot.winRatePct}%
              </span>
            </div>
            <div className="p-2.5 rounded-lg bg-bg-surface border border-border-color">
              <span className="text-[10px] text-text-secondary font-mono block">Net Result (USD)</span>
              <span className="text-sm font-bold font-mono text-emerald-600 dark:text-emerald-400">
                +${post.performanceSnapshot.netProfitUsd.toLocaleString()}
              </span>
            </div>
            <div className="p-2.5 rounded-lg bg-bg-surface border border-border-color">
              <span className="text-[10px] text-text-secondary font-mono block">Profit Factor</span>
              <span className="text-sm font-bold font-mono text-text-primary">
                {post.performanceSnapshot.profitFactor}
              </span>
            </div>
            <div className="p-2.5 rounded-lg bg-bg-surface border border-border-color">
              <span className="text-[10px] text-text-secondary font-mono block">Max Drawdown</span>
              <span className="text-sm font-bold font-mono text-amber-600 dark:text-amber-400">
                {post.performanceSnapshot.maxDrawdownPct}%
              </span>
            </div>
          </div>

          {/* Verification Source Note & Regulatory Safeguard */}
          <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg text-[11px] text-amber-300 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400 mt-0.5" />
            <div>
              <strong>Audit Status:</strong> {post.performanceSnapshot.verificationSourceNote}.
              <span className="text-text-secondary block mt-0.5">
                Past performance is not indicative of future returns. Self-reported logs must be verified against connected broker statements.
              </span>
            </div>
          </div>
        </div>
      )}

      {/* SPECIAL PAYLOAD 2: SHARED STRATEGY PARAMS */}
      {post.sharedStrategy && (
        <div className="p-5 rounded-xl bg-bg-secondary border border-cyan-500/20 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border-color pb-3">
            <div>
              <span className="text-[10px] font-mono text-cyan-600 dark:text-cyan-400 uppercase tracking-wider block">Shared Strategy Parameters</span>
              <h4 className="text-sm font-bold text-text-primary">{post.sharedStrategy.strategyName}</h4>
            </div>
            {onForkStrategy && (
              <button
                onClick={() => onForkStrategy(post.sharedStrategy!)}
                className="px-3.5 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs font-mono uppercase tracking-wider transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <Play className="w-3.5 h-3.5" />
                <span>Fork to Backtest</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
            <div>
              <span className="text-text-secondary text-[10px] uppercase block">Symbols</span>
              <span className="text-cyan-600 dark:text-cyan-300 font-bold">{post.sharedStrategy.symbols.join(', ')}</span>
            </div>
            <div>
              <span className="text-text-secondary text-[10px] uppercase block">Timeframe</span>
              <span className="text-text-primary font-bold">{post.sharedStrategy.timeframe}</span>
            </div>
            <div>
              <span className="text-text-secondary text-[10px] uppercase block">Risk/Reward</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-bold">{post.sharedStrategy.riskRewardRatio}</span>
            </div>
            <div>
              <span className="text-text-secondary text-[10px] uppercase block">Backtest Win %</span>
              <span className="text-amber-600 dark:text-amber-300 font-bold">{post.sharedStrategy.winRatePct || 65}%</span>
            </div>
          </div>

          {post.sharedStrategy.rules && (
            <div className="pt-2 text-xs space-y-1">
              <span className="text-[11px] font-mono text-text-secondary uppercase block">Execution Criteria Rules:</span>
              <ul className="list-disc list-inside text-text-primary space-y-0.5 text-[11px]">
                {post.sharedStrategy.rules.map((rule, idx) => (
                  <li key={idx}>{rule}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Card Footer Actions */}
      <div className="flex items-center justify-between pt-2 border-t border-border-color/80 text-xs font-mono">
        <div className="flex items-center gap-4">
          <button
            onClick={() => onLike(post.id)}
            className={`flex items-center gap-1.5 cursor-pointer transition-colors ${
              post.likedByCurrentUser ? 'text-rose-400 font-bold' : 'text-text-secondary hover:text-rose-400'
            }`}
          >
            <Heart className={`w-4 h-4 ${post.likedByCurrentUser ? 'fill-rose-400' : ''}`} />
            <span>{post.likeCount}</span>
          </button>

          <button
            onClick={() => setShowComments(!showComments)}
            className="flex items-center gap-1.5 text-text-secondary hover:text-sky-400 transition-colors cursor-pointer"
          >
            <MessageSquare className="w-4 h-4" />
            <span>{post.commentCount} Comments</span>
            {showComments ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>

        <button
          onClick={handleShare}
          className="flex items-center gap-1.5 text-text-secondary hover:text-slate-200 transition-colors cursor-pointer"
        >
          {copiedLink ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <Share2 className="w-4 h-4" />}
          <span>{copiedLink ? 'Link Copied!' : 'Share'}</span>
        </button>
      </div>

      {/* Comment Section Drawer */}
      {showComments && (
        <div className="p-4 bg-bg-secondary rounded-xl border border-border-color space-y-4 text-xs font-sans">
          {/* Add Comment Input */}
          <form onSubmit={handleCommentSubmit} className="flex gap-2">
            <input
              type="text"
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="Add a constructive community comment or question..."
              className="flex-1 bg-bg-surface border border-border-color rounded-lg px-3 py-2 text-xs text-text-primary focus:outline-none focus:border-cyan-500"
            />
            <button
              type="submit"
              disabled={!commentText.trim()}
              className="px-3.5 py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-lg transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>

          {/* Comment List */}
          {post.comments && post.comments.length > 0 ? (
            <div className="space-y-3 pt-2 divide-y divide-border-color">
              {post.comments.map((comment) => (
                <div key={comment.id} className="pt-3 space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-text-primary text-xs">{comment.authorName}</span>
                      <VerificationBadge status={comment.authorVerificationStatus} size="sm" />
                      <span className="text-[10px] text-text-secondary font-mono">
                        {new Date(comment.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <button
                      onClick={() => onReport('COMMENT', comment.id, `Comment by ${comment.authorName}`)}
                      className="text-text-secondary hover:text-amber-500 text-[10px]"
                      title="Report comment"
                    >
                      <Flag className="w-3 h-3" />
                    </button>
                  </div>
                  <p className="text-xs text-text-primary leading-relaxed">{comment.content}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-text-secondary text-[11px] text-center py-2 font-mono">
              No comments yet. Be the first trader to join the discussion!
            </p>
          )}
        </div>
      )}
    </div>
  );
};
