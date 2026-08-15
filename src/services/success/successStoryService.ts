/**
 * AppexQuant Markets Global - Success Stories Service
 * Manages trader success stories, submissions, verification, and moderation.
 */

import { SuccessStory } from '../../types/ea.ts';
import { INITIAL_SUCCESS_STORIES } from '../ea/eaEngine.ts';

let storiesStore: SuccessStory[] = [...INITIAL_SUCCESS_STORIES];

export function getSuccessStories(): SuccessStory[] {
  return storiesStore;
}

export function submitSuccessStory(payload: Omit<SuccessStory, 'id' | 'createdAt' | 'verificationStatus'>): SuccessStory {
  const newStory: SuccessStory = {
    ...payload,
    id: `story-${Date.now()}`,
    verificationStatus: 'PENDING_REVIEW',
    createdAt: new Date().toISOString(),
  };
  storiesStore = [newStory, ...storiesStore];
  return newStory;
}

export function moderateSuccessStory(id: string, status: 'VERIFIED' | 'COMMUNITY_SUBMITTED' | 'UNVERIFIED'): boolean {
  const index = storiesStore.findIndex((s) => s.id === id);
  if (index !== -1) {
    storiesStore[index] = { ...storiesStore[index], verificationStatus: status };
    return true;
  }
  return false;
}
