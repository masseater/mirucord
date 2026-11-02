type StoredScheduledEvent = Readonly<{
  id: string;
  name: string;
  description: string | null;
  channelId: string | null;
  creatorId: string | null;
  location: string | null;
  entityType: number;
  status: number;
  startsAt: number;
  endsAt: number | null;
  recurring: boolean;
  updatedAt: number;
  removedAt: number | null;
  interestedUserIds: readonly string[];
}>;

type ScheduledEventLookup = Readonly<{
  channelIds: readonly string[];
  eventId: string | null;
  userIds: readonly string[] | null;
  since: number | null;
  until: number | null;
  limit: number;
  offset: number;
}>;

type ScheduledEventPage = Readonly<{ total: number; events: readonly StoredScheduledEvent[] }>;

export type { ScheduledEventLookup, ScheduledEventPage, StoredScheduledEvent };
