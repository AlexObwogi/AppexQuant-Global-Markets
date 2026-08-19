/**
 * AppexQuant Markets Global - Trader Profile Card & Modal Component
 */

import React, { useState } from 'react';
import { TraderProfile } from '../../types/community.ts';
import { VerificationBadge } from './VerificationBadge.tsx';
import {
  User,
  MapPin,
  Briefcase,
  Layers,
  Users,
  UserCheck,
  UserX,
  Flag,
  Ban,
  ShieldCheck,
  Calendar,
  ExternalLink,
  Lock,
  Globe,
} from 'lucide-react';

interface TraderProfileCardProps {
  profile: TraderProfile;
  currentUserId: string;
  onToggleFollow: (targetTraderId: string) => void;
  onToggleBlock: (targetUserId: string) => void;
  onReport: (targetType: 'TRADER', targetId: string, name: string) => void;
  onRequestVerificationModal?: () => void;
}

export const TraderProfileCard: React.FC<TraderProfileCardProps> = ({
  profile,
  currentUserId,
  onToggleFollow,
  onToggleBlock,
  onReport,
  onRequestVerificationModal,
}) => {
  const [showDetailModal, setShowDetailModal] = useState(false);
  const isSelf = profile.userId === currentUserId || profile.id === currentUserId;

  return (
    <>
      <div className="p-5 rounded-2xl bg-bg-surface border border-border-color shadow-lg flex flex-col justify-between space-y-4 hover:border-border-color transition-all">
        {/* Profile Header */}
        <div className="space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-bg-secondary border border-border-color flex items-center justify-center font-bold text-text-primary text-base shadow-inner">
                {profile.avatar || (profile.displayName ? profile.displayName.charAt(0) : 'T')}
              </div>
              <div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <h4 className="font-bold text-text-primary text-sm">{profile.displayName}</h4>
                  {profile.isPublic ? (
                    <span title="Public Profile"><Globe className="w-3.5 h-3.5 text-text-secondary" /></span>
                  ) : (
                    <span title="Private Profile"><Lock className="w-3.5 h-3.5 text-amber-500" /></span>
                  )}
                </div>
                <p className="text-xs text-text-secondary font-mono">@{profile.username}</p>
              </div>
            </div>

            {/* Verification State Badge */}
            <VerificationBadge status={profile.verificationStatus} size="sm" />
          </div>

          <p className="text-xs text-text-primary line-clamp-2 leading-relaxed">{profile.bio}</p>

          {/* Quick Info Grid */}
          <div className="grid grid-cols-2 gap-2 text-[11px] font-mono text-text-secondary pt-1">
            <div className="flex items-center gap-1.5 truncate">
              <MapPin className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
              <span className="truncate">{profile.country}</span>
            </div>
            <div className="flex items-center gap-1.5 truncate">
              <Briefcase className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span className="truncate">{profile.experience}</span>
            </div>
          </div>

          {/* Market Tags */}
          {profile.markets && profile.markets.length > 0 && (
            <div className="flex flex-wrap gap-1 pt-1">
              {profile.markets.map((m) => (
                <span key={m} className="px-2 py-0.5 rounded text-[10px] font-mono bg-bg-hover text-text-primary border border-border-color/60">
                  {m}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="pt-3 border-t border-border-color/80 flex items-center justify-between text-xs font-mono">
          <div className="flex items-center gap-3 text-text-secondary text-[11px]">
            <span>
              <strong className="text-text-primary">{profile.followerCount}</strong> Followers
            </span>
            <span>
              <strong className="text-text-primary">{profile.postCount}</strong> Posts
            </span>
          </div>

          <div className="flex items-center gap-2">
            {!isSelf && (
              <button
                onClick={() => onToggleFollow(profile.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold font-mono transition-colors cursor-pointer flex items-center gap-1.5 ${
                  profile.isFollowedByCurrentUser
                    ? 'bg-bg-hover text-text-primary hover:bg-bg-hover'
                    : 'bg-cyan-500 hover:bg-cyan-400 text-bg-main'
                }`}
              >
                {profile.isFollowedByCurrentUser ? (
                  <>
                    <UserCheck className="w-3.5 h-3.5" />
                    <span>Following</span>
                  </>
                ) : (
                  <>
                    <User className="w-3.5 h-3.5" />
                    <span>Follow</span>
                  </>
                )}
              </button>
            )}

            <button
              onClick={() => setShowDetailModal(true)}
              className="p-1.5 rounded-lg bg-bg-hover hover:bg-bg-hover text-text-primary transition-colors cursor-pointer"
              title="View full trader profile"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Full Profile Details Modal */}
      {showDetailModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-bg-surface border border-border-color rounded-2xl max-w-xl w-full p-6 space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between gap-3 border-b border-border-color pb-4">
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-2xl bg-bg-secondary border border-border-color flex items-center justify-center font-bold text-text-primary text-xl">
                  {profile.avatar || (profile.displayName ? profile.displayName.charAt(0) : 'T')}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-text-primary">{profile.displayName}</h3>
                  <p className="text-xs text-text-secondary font-mono">@{profile.username} • Joined {new Date(profile.createdAt).toLocaleDateString()}</p>
                </div>
              </div>
              <button
                onClick={() => setShowDetailModal(false)}
                className="text-text-secondary hover:text-text-primary text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Verification Status Banner */}
            <div className="p-4 rounded-xl bg-bg-secondary border border-border-color space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-text-secondary uppercase">Verification Level</span>
                <VerificationBadge status={profile.verificationStatus} size="md" />
              </div>

              {profile.verificationDetails?.connectedBrokerAccount && (
                <div className="text-xs font-mono text-cyan-300 bg-cyan-950/30 p-2.5 rounded-lg border border-cyan-800/40">
                  <strong>Connected Account Record:</strong> {profile.verificationDetails.connectedBrokerAccount}
                </div>
              )}

              {profile.verificationDetails?.verificationNotes && (
                <p className="text-xs text-text-secondary italic">
                  "{profile.verificationDetails.verificationNotes}"
                </p>
              )}

              {isSelf && profile.verificationStatus !== 'PERFORMANCE_VERIFIED' && onRequestVerificationModal && (
                <button
                  onClick={() => {
                    setShowDetailModal(false);
                    onRequestVerificationModal();
                  }}
                  className="mt-2 w-full py-2 bg-gradient-to-r from-cyan-500 to-blue-600 text-bg-main font-bold text-xs font-mono rounded-lg transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>Request Verification Level Upgrade</span>
                </button>
              )}
            </div>

            {/* Bio & Strategy Info */}
            <div className="space-y-3 text-xs text-text-primary">
              <div>
                <h5 className="font-mono text-[11px] text-text-secondary uppercase font-bold">About Trader</h5>
                <p className="mt-1 leading-relaxed text-text-primary">{profile.bio}</p>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2 font-mono">
                <div>
                  <span className="text-text-secondary text-[10px] uppercase block">Country / Region</span>
                  <span className="text-text-primary font-bold">{profile.country}</span>
                </div>
                <div>
                  <span className="text-text-secondary text-[10px] uppercase block">Experience</span>
                  <span className="text-text-primary font-bold">{profile.experience}</span>
                </div>
              </div>

              {profile.strategyCategories && profile.strategyCategories.length > 0 && (
                <div>
                  <h5 className="font-mono text-[11px] text-text-secondary uppercase font-bold mb-1">Strategy Focus Areas</h5>
                  <div className="flex flex-wrap gap-1.5">
                    {profile.strategyCategories.map((cat) => (
                      <span key={cat} className="px-2.5 py-1 rounded bg-indigo-950/40 text-indigo-300 border border-indigo-800/40 font-mono text-[11px]">
                        {cat}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Admin / User Action Buttons */}
            {!isSelf && (
              <div className="flex items-center justify-between pt-4 border-t border-border-color text-xs font-mono">
                <button
                  onClick={() => onReport('TRADER', profile.id, profile.displayName)}
                  className="px-3 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/20 flex items-center gap-1.5 cursor-pointer"
                >
                  <Flag className="w-3.5 h-3.5" />
                  <span>Report Trader</span>
                </button>

                <button
                  onClick={() => onToggleBlock(profile.id)}
                  className="px-3 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 flex items-center gap-1.5 cursor-pointer"
                >
                  <Ban className="w-3.5 h-3.5" />
                  <span>{profile.isBlockedByCurrentUser ? 'Unblock Trader' : 'Block Trader'}</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};
