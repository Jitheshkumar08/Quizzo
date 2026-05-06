"use client";

export const LIVE_USER_UPDATED_EVENT = "mcqify:live-user-updated";

export interface LiveUser {
  name: string;
  email: string;
  username?: string;
  role: string;
}

export function dispatchLiveUserUpdated(user: LiveUser) {
  window.dispatchEvent(new CustomEvent<LiveUser>(LIVE_USER_UPDATED_EVENT, { detail: user }));
}

export function isLiveUserUpdatedEvent(event: Event): event is CustomEvent<LiveUser> {
  return event.type === LIVE_USER_UPDATED_EVENT;
}
