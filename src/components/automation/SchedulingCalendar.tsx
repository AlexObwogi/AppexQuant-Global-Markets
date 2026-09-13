/**
 * AppexQuant Markets Global - 90-Day Content Scheduling Calendar
 * Interactive drag-and-drop & click-to-reschedule calendar interface with optimistic UI updates.
 */

import React, { useState } from 'react';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  Send,
  Plus,
  Radio,
  Image as ImageIcon,
  CheckCircle2,
  AlertCircle,
  GripVertical,
  MoveRight,
} from 'lucide-react';
import {
  CalendarViewResponseDTO,
  CalendarDayBucketDTO,
  ScheduledPostDTO,
  ScheduledPostInput,
  ConnectedChannelDTO,
} from '../../types/socialAutomation.ts';
import { Button } from '../ui/Button.tsx';

interface SchedulingCalendarProps {
  calendarData: CalendarViewResponseDTO;
  channels: ConnectedChannelDTO[];
  onCreatePost: (payload: ScheduledPostInput) => Promise<void>;
  onReschedulePost: (postId: number, newTimeIso: string) => Promise<void>;
  onImmediateDispatch?: (postId: number) => Promise<void>;
  loading?: boolean;
}

export const SchedulingCalendar: React.FC<SchedulingCalendarProps> = ({
  calendarData,
  channels,
  onCreatePost,
  onReschedulePost,
  onImmediateDispatch,
  loading = false,
}) => {
  const [selectedDay, setSelectedDay] = useState<CalendarDayBucketDTO | null>(
    calendarData.days[0] || null
  );
  const [selectedPost, setSelectedPost] = useState<ScheduledPostDTO | null>(null);
  const [draggedPostId, setDraggedPostId] = useState<number | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // New post form state
  const [newCopy, setNewCopy] = useState('');
  const [selectedChannels, setSelectedChannels] = useState<number[]>([]);
  const [scheduledDate, setScheduledDate] = useState(
    new Date(Date.now() + 86400000).toISOString().split('T')[0]
  );
  const [scheduledTime, setScheduledTime] = useState('14:30');
  const [submitting, setSubmitting] = useState(false);

  // Reschedule Target Selection Modal state
  const [reschedulingPost, setReschedulingPost] = useState<ScheduledPostDTO | null>(null);
  const [targetNewDate, setTargetNewDate] = useState('');

  const handleDragStart = (e: React.DragEvent, postId: number) => {
    e.dataTransfer.setData('text/plain', String(postId));
    setDraggedPostId(postId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent, targetDateStr: string) => {
    e.preventDefault();
    const postIdStr = e.dataTransfer.getData('text/plain') || String(draggedPostId);
    const postId = Number(postIdStr);
    if (!postId || isNaN(postId)) return;

    // Build new UTC target ISO string for 12:00:00 UTC on target drop day
    const newTimestamp = `${targetDateStr}T12:00:00.000Z`;
    await onReschedulePost(postId, newTimestamp);
    setDraggedPostId(null);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCopy.trim() || selectedChannels.length === 0) return;

    try {
      setSubmitting(true);
      const isoDateTime = new Date(`${scheduledDate}T${scheduledTime}:00Z`).toISOString();
      await onCreatePost({
        targetChannelIds: selectedChannels,
        cleanedCopy: newCopy.trim(),
        scheduledTime: isoDateTime,
        mediaPaths: [],
      });
      setNewCopy('');
      setShowCreateModal(false);
    } finally {
      setSubmitting(false);
    }
  };

  const toggleChannelSelection = (id: number) => {
    setSelectedChannels((prev) =>
      prev.includes(id) ? prev.filter((chId) => chId !== id) : [...prev, id]
    );
  };

  return (
    <div className="space-y-6">
      {/* CALENDAR HEADER */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-2xl bg-bg-surface border border-border-color shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <CalendarIcon className="w-5 h-5" />
            </span>
            <h2 className="text-lg font-bold text-text-primary">90-Day Content Scheduling Calendar</h2>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-bg-main border border-border-color text-cyan-400">
              {calendarData.totalScheduled} Posts Queued
            </span>
          </div>
          <p className="text-xs text-text-secondary leading-relaxed">
            Drag and drop signals and visual charts to shift broadcast dates. Fully synchronized with Celery beat queue workers.
          </p>
        </div>

        <Button
          onClick={() => {
            if (channels.length > 0 && selectedChannels.length === 0) {
              setSelectedChannels([channels[0].id]);
            }
            setShowCreateModal(true);
          }}
          variant="primary"
          size="sm"
          className="shrink-0"
        >
          <Plus className="w-4 h-4 mr-1.5" />
          Schedule Signal Post
        </Button>
      </div>

      {/* HORIZONTAL DATE STRIP / BUCKET GRID */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
            Scheduled Distribution Horizon (Next 30 Days)
          </h3>
          <span className="text-[11px] text-cyan-400 font-mono">
            Drag cards onto dates to reschedule instantly
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2.5 overflow-x-auto pb-2">
          {calendarData.days.slice(0, 14).map((day) => {
            const isSelected = selectedDay?.date === day.date;
            const dateObj = new Date(day.date);
            const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'short' });
            const dayNum = dateObj.getDate();
            const monthName = dateObj.toLocaleDateString('en-US', { month: 'short' });

            return (
              <div
                key={day.date}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, day.date)}
                onClick={() => setSelectedDay(day)}
                className={`p-3 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between min-h-[110px] ${
                  isSelected
                    ? 'bg-cyan-500/10 border-cyan-500/60 shadow-md ring-1 ring-cyan-500/30'
                    : 'bg-bg-surface border-border-color hover:border-border-color/80'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-text-secondary uppercase">
                    {dayName}
                  </span>
                  <span className="text-xs font-mono font-bold text-text-primary">
                    {monthName} {dayNum}
                  </span>
                </div>

                <div className="my-2 space-y-1">
                  <div className="flex items-center gap-1.5 text-[11px] font-bold text-text-primary">
                    <Clock className="w-3 h-3 text-cyan-400" />
                    <span>{day.totalPosts} {day.totalPosts === 1 ? 'post' : 'posts'}</span>
                  </div>

                  <div className="flex items-center gap-1">
                    {day.pendingCount > 0 && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-mono">
                        {day.pendingCount} pending
                      </span>
                    )}
                    {day.publishedCount > 0 && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono">
                        {day.publishedCount} sent
                      </span>
                    )}
                  </div>
                </div>

                <div className="text-[9px] text-text-secondary truncate border-t border-border-color/40 pt-1.5">
                  Drop to set {monthName} {dayNum}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* SELECTED DAY POST DETAIL VIEW */}
      {selectedDay && (
        <div className="p-5 rounded-2xl bg-bg-surface border border-border-color space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pb-3 border-b border-border-color">
            <div>
              <h4 className="text-sm font-bold text-text-primary flex items-center gap-2">
                <Clock className="w-4 h-4 text-cyan-400" />
                Scheduled Queue for {new Date(selectedDay.date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
              </h4>
              <span className="text-xs text-text-secondary">
                {selectedDay.posts.length} queued broadcasts on this date
              </span>
            </div>

            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setScheduledDate(selectedDay.date);
                setShowCreateModal(true);
              }}
            >
              <Plus className="w-3.5 h-3.5 mr-1" />
              Add Post to This Date
            </Button>
          </div>

          {selectedDay.posts.length === 0 ? (
            <div className="py-8 text-center text-xs text-text-secondary">
              No broadcasts scheduled for this day. Click "Schedule Signal Post" to queue content.
            </div>
          ) : (
            <div className="space-y-3">
              {selectedDay.posts.map((post) => {
                const postTime = new Date(post.scheduledTime).toLocaleTimeString('en-US', {
                  hour: '2-digit',
                  minute: '2-digit',
                  timeZone: 'UTC',
                });

                return (
                  <div
                    key={post.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, post.id)}
                    className="p-4 rounded-xl bg-bg-main border border-border-color hover:border-cyan-500/40 transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
                  >
                    <div className="flex items-start gap-3 flex-1">
                      <div className="p-1 text-text-secondary cursor-grab active:cursor-grabbing hover:text-text-primary pt-1">
                        <GripVertical className="w-4 h-4" />
                      </div>

                      <div className="space-y-1.5 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/15 text-cyan-400 border border-cyan-500/30">
                            {postTime} UTC
                          </span>

                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                              post.status === 'PUBLISHED'
                                ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                                : post.status === 'FAILED'
                                ? 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                                : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                            }`}
                          >
                            {post.status}
                          </span>

                          <span className="text-[10px] text-text-secondary font-mono">
                            Channels: [{post.targetChannelIds.join(', ')}]
                          </span>
                        </div>

                        <p className="text-xs text-text-primary font-sans whitespace-pre-line line-clamp-2">
                          {post.cleanedCopy}
                        </p>

                        {post.mediaPaths && post.mediaPaths.length > 0 && (
                          <div className="flex items-center gap-1.5 text-[10px] text-cyan-400 font-mono">
                            <ImageIcon className="w-3 h-3" />
                            <span>{post.mediaPaths.length} Branded 9:16 Canvas Attached</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                      {onImmediateDispatch && post.status !== 'PUBLISHED' && (
                        <button
                          onClick={() => onImmediateDispatch(post.id)}
                          className="px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-[11px] font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
                        >
                          <Send className="w-3 h-3" />
                          <span>Dispatch Now</span>
                        </button>
                      )}

                      <button
                        onClick={() => {
                          setReschedulingPost(post);
                          setTargetNewDate(selectedDay.date);
                        }}
                        className="px-2.5 py-1.5 rounded-lg bg-bg-surface hover:bg-bg-hover text-text-secondary hover:text-text-primary text-[11px] border border-border-color transition-colors flex items-center gap-1 cursor-pointer"
                      >
                        <MoveRight className="w-3 h-3" />
                        <span>Shift Date</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* DATE SHIFT MODAL DIALOG */}
      {reschedulingPost && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="p-5 rounded-2xl bg-bg-surface border border-cyan-500/30 max-w-sm w-full space-y-4 shadow-xl">
            <h4 className="text-sm font-bold text-text-primary flex items-center gap-2">
              <CalendarIcon className="w-4 h-4 text-cyan-400" />
              Reschedule Post #{reschedulingPost.id}
            </h4>
            <div className="space-y-1.5">
              <label className="text-xs text-text-secondary">Select New Target Date</label>
              <input
                type="date"
                value={targetNewDate}
                onChange={(e) => setTargetNewDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-bg-main border border-border-color text-xs text-text-primary font-mono focus:outline-none focus:border-cyan-500"
              />
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setReschedulingPost(null)}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={async () => {
                  if (targetNewDate) {
                    await onReschedulePost(reschedulingPost.id, `${targetNewDate}T12:00:00.000Z`);
                    setReschedulingPost(null);
                  }
                }}
              >
                Confirm Shift
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* CREATE POST MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
          <form
            onSubmit={handleCreateSubmit}
            className="p-5 sm:p-6 rounded-2xl bg-bg-surface border border-cyan-500/30 max-w-lg w-full space-y-4 shadow-2xl"
          >
            <div className="flex items-center justify-between pb-3 border-b border-border-color">
              <h3 className="text-sm font-bold text-text-primary flex items-center gap-2">
                <Plus className="w-4 h-4 text-cyan-400" />
                Schedule Signal Broadcast
              </h3>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="text-text-secondary hover:text-text-primary text-xs"
              >
                ✕
              </button>
            </div>

            {/* Channel Checkbox Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-text-secondary block">
                Target Channels ({selectedChannels.length} selected)
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-36 overflow-y-auto p-1">
                {channels.map((ch) => (
                  <button
                    key={ch.id}
                    type="button"
                    onClick={() => toggleChannelSelection(ch.id)}
                    className={`p-2.5 rounded-xl border text-left text-xs transition-all cursor-pointer flex items-center justify-between ${
                      selectedChannels.includes(ch.id)
                        ? 'bg-cyan-500/15 border-cyan-500/50 text-text-primary font-bold'
                        : 'bg-bg-main border-border-color text-text-secondary'
                    }`}
                  >
                    <span className="truncate">{ch.channelName}</span>
                    <span className="text-[10px] font-mono opacity-60 shrink-0 ml-1">{ch.platform.split('_')[0]}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Post Copy Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-text-secondary">
                Signal Message Copy
              </label>
              <textarea
                required
                rows={4}
                value={newCopy}
                onChange={(e) => setNewCopy(e.target.value)}
                placeholder="Paste institutional market intelligence, entry, stop loss, and targets..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-bg-main border border-border-color text-xs text-text-primary focus:outline-none focus:border-cyan-500 transition-colors font-sans"
              />
            </div>

            {/* Date & Time Picker */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-text-secondary">Target Date</label>
                <input
                  type="date"
                  required
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-bg-main border border-border-color text-xs text-text-primary font-mono focus:outline-none focus:border-cyan-500"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-text-secondary">Target Time (UTC)</label>
                <input
                  type="time"
                  required
                  value={scheduledTime}
                  onChange={(e) => setScheduledTime(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-bg-main border border-border-color text-xs text-text-primary font-mono focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-border-color">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setShowCreateModal(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                disabled={submitting}
              >
                {submitting ? 'Adding to Queue...' : 'Commit to Schedule'}
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
