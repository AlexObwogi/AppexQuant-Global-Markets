/**
 * AppexQuant Markets Global - Edit Trader Profile Modal
 */

import React, { useState } from 'react';
import { TraderProfile } from '../../types/community';
import { User, X, Save, ShieldCheck } from 'lucide-react';

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentProfile: TraderProfile;
  onSaveProfile: (updates: Partial<TraderProfile>) => void;
  onRequestVerification: () => void;
}

export const EditProfileModal: React.FC<EditProfileModalProps> = ({
  isOpen,
  onClose,
  currentProfile,
  onSaveProfile,
  onRequestVerification,
}) => {
  const [displayName, setDisplayName] = useState(currentProfile.displayName);
  const [avatar, setAvatar] = useState(currentProfile.avatar);
  const [country, setCountry] = useState(currentProfile.country);
  const [experience, setExperience] = useState(currentProfile.experience);
  const [marketsText, setMarketsText] = useState((currentProfile.markets || []).join(', '));
  const [categoriesText, setCategoriesText] = useState((currentProfile.strategyCategories || []).join(', '));
  const [bio, setBio] = useState(currentProfile.bio);
  const [isPublic, setIsPublic] = useState(currentProfile.isPublic);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveProfile({
      displayName,
      avatar,
      country,
      experience,
      markets: marketsText.split(',').map((s) => s.trim()).filter(Boolean),
      strategyCategories: categoriesText.split(',').map((s) => s.trim()).filter(Boolean),
      bio,
      isPublic,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#111622] border border-border-color rounded-2xl max-w-xl w-full p-6 space-y-5 max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="flex items-center justify-between border-b border-border-color pb-4">
          <div className="flex items-center gap-2">
            <User className="w-5 h-5 text-cyan-400" />
            <h3 className="text-base font-bold text-slate-100 font-mono uppercase">Edit Trader Profile</h3>
          </div>
          <button onClick={onClose} className="text-text-secondary hover:text-slate-200 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs font-sans">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-text-primary font-mono uppercase text-[11px] mb-1 font-bold">Display Name</label>
              <input
                type="text"
                required
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full bg-[#131822] border border-border-color rounded-lg px-3 py-2 text-xs text-slate-100"
              />
            </div>

            <div>
              <label className="block text-text-primary font-mono uppercase text-[11px] mb-1 font-bold">Avatar Initials / Icon</label>
              <input
                type="text"
                value={avatar}
                onChange={(e) => setAvatar(e.target.value)}
                className="w-full bg-[#131822] border border-border-color rounded-lg px-3 py-2 text-xs text-slate-100 font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-text-primary font-mono uppercase text-[11px] mb-1 font-bold">Country / Region</label>
              <input
                type="text"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                className="w-full bg-[#131822] border border-border-color rounded-lg px-3 py-2 text-xs text-slate-100"
              />
            </div>

            <div>
              <label className="block text-text-primary font-mono uppercase text-[11px] mb-1 font-bold">Experience Level</label>
              <select
                value={experience}
                onChange={(e) => setExperience(e.target.value)}
                className="w-full bg-[#131822] border border-border-color rounded-lg px-3 py-2 text-xs text-slate-100 font-mono"
              >
                <option value="1-3 Years">1-3 Years</option>
                <option value="3-5 Years">3-5 Years</option>
                <option value="5-7 Years">5-7 Years</option>
                <option value="7+ Years (Quantitative Trader)">7+ Years (Quantitative Trader)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-text-primary font-mono uppercase text-[11px] mb-1 font-bold">Markets (Comma Separated)</label>
            <input
              type="text"
              value={marketsText}
              onChange={(e) => setMarketsText(e.target.value)}
              placeholder="Synthetic Indices, Forex, Crypto"
              className="w-full bg-[#131822] border border-border-color rounded-lg px-3 py-2 text-xs text-slate-100 font-mono"
            />
          </div>

          <div>
            <label className="block text-text-primary font-mono uppercase text-[11px] mb-1 font-bold">Strategy Categories (Comma Separated)</label>
            <input
              type="text"
              value={categoriesText}
              onChange={(e) => setCategoriesText(e.target.value)}
              placeholder="Scalping, Institutional SMC, Trend Following"
              className="w-full bg-[#131822] border border-border-color rounded-lg px-3 py-2 text-xs text-slate-100 font-mono"
            />
          </div>

          <div>
            <label className="block text-text-primary font-mono uppercase text-[11px] mb-1 font-bold">Trader Bio</label>
            <textarea
              rows={3}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="w-full bg-[#131822] border border-border-color rounded-lg px-3 py-2 text-xs text-slate-100"
            />
          </div>

          {/* Visibility Toggle */}
          <div className="flex items-center justify-between p-3 bg-[#0B0E14] border border-border-color rounded-xl">
            <div>
              <span className="font-bold text-slate-200 text-xs font-mono block">Public Profile Visibility</span>
              <span className="text-[11px] text-text-secondary">Allow other community members to view your posts and stats</span>
            </div>
            <button
              type="button"
              onClick={() => setIsPublic(!isPublic)}
              className={`w-12 h-6 rounded-full transition-colors p-0.5 cursor-pointer flex items-center ${
                isPublic ? 'bg-cyan-500 justify-end' : 'bg-bg-hover justify-start'
              }`}
            >
              <span className="w-5 h-5 rounded-full bg-bg-main shadow-md" />
            </button>
          </div>

          {/* Request Verification Level Button */}
          <div className="p-3 bg-indigo-950/30 border border-indigo-800/40 rounded-xl flex items-center justify-between">
            <div>
              <span className="font-bold text-indigo-300 text-xs font-mono block">Verification Status</span>
              <span className="text-[10px] font-mono text-text-secondary">Current Level: {currentProfile.verificationStatus}</span>
            </div>
            <button
              type="button"
              onClick={() => {
                onClose();
                onRequestVerification();
              }}
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs font-mono rounded-lg transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Request Upgrade</span>
            </button>
          </div>

          <div className="pt-3 border-t border-border-color flex justify-end gap-3 font-mono">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-bg-hover text-text-primary font-bold text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-bg-main font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save Changes</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
