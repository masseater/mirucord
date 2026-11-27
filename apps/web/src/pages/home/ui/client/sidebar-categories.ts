import { Array, pipe } from "effect";

import {
  CHANNELS,
  FAQ_CHANNEL,
  FEATURES_CHANNEL,
  FORUM_CHANNEL,
  HOW_CHANNEL,
  SAFETY_CHANNEL,
  START_CHANNEL,
  TOP_CHANNEL,
  WHY_CHANNEL,
} from "#/pages/home/ui/common/channels";
import type { Channel } from "#/pages/home/ui/common/channels";
import type { Place, PlaceId } from "#/pages/home/ui/common/places";
import { SERVICE_NAME } from "#/shared/config";

import { GUIDE_CHANNELS } from "./guide-channels";

export type Activity =
  | Readonly<{ status: "read" }>
  | Readonly<{ status: "unread" }>
  | Readonly<{ status: "mention"; count: number }>;

export type SidebarRow =
  | Readonly<{ type: "link"; channel: Channel }>
  | Readonly<{ type: "page"; page: (typeof GUIDE_CHANNELS)[number] }>
  | Readonly<{ type: "peek"; id: PlaceId; activity: Activity }>
  | Readonly<{ type: "idle"; place: Place; activity: Activity }>;

export type SidebarCategory =
  | Readonly<{ state: "open"; name: string; rows: readonly SidebarRow[] }>
  | Readonly<{ state: "collapsed"; name: string }>;

export const rowKey = (row: SidebarRow): string => {
  if (row.type === "link") {
    return row.channel.id;
  }
  if (row.type === "page") {
    return row.page.href;
  }
  if (row.type === "peek") {
    return row.id;
  }
  return row.place.name;
};

export const LINK_ROWS: readonly SidebarRow[] = pipe(
  CHANNELS,
  Array.map((channel) => ({ type: "link", channel }) as const),
);

export const PAGE_ROWS: readonly SidebarRow[] = pipe(
  GUIDE_CHANNELS,
  Array.map((page) => ({ type: "page", page }) as const),
);

const READ: Activity = { status: "read" };
const UNREAD: Activity = { status: "unread" };

export const CATEGORIES: readonly SidebarCategory[] = [
  {
    state: "open",
    name: "はじめに",
    rows: [
      { type: "peek", id: "announce", activity: { status: "mention", count: 2 } },
      { type: "idle", place: { type: "channel", name: "ルール", kind: "text" }, activity: READ },
    ],
  },
  {
    state: "open",
    name: "ざつだん",
    rows: [
      { type: "link", channel: TOP_CHANNEL },
      { type: "peek", id: "campPlan", activity: UNREAD },
      { type: "link", channel: WHY_CHANNEL },
      { type: "peek", id: "hitori", activity: READ },
      { type: "peek", id: "photo", activity: UNREAD },
      { type: "peek", id: "kansou", activity: READ },
      { type: "peek", id: "hansei", activity: READ },
    ],
  },
  {
    state: "open",
    name: "しゅみ",
    rows: [
      { type: "link", channel: FORUM_CHANNEL },
      { type: "peek", id: "recipe", activity: UNREAD },
      { type: "peek", id: "game", activity: { status: "mention", count: 5 } },
    ],
  },
  {
    state: "open",
    name: SERVICE_NAME,
    rows: [
      { type: "link", channel: HOW_CHANNEL },
      { type: "link", channel: FEATURES_CHANNEL },
      { type: "link", channel: START_CHANNEL },
      { type: "link", channel: SAFETY_CHANNEL },
      { type: "link", channel: FAQ_CHANNEL },
      ...PAGE_ROWS,
    ],
  },
  { state: "collapsed", name: "イベント" },
  {
    state: "open",
    name: "ボイスチャンネル",
    rows: [
      {
        type: "idle",
        place: { type: "channel", name: "まったり部屋", kind: "voice" },
        activity: READ,
      },
      {
        type: "idle",
        place: { type: "channel", name: "夜の雑談会", kind: "stage" },
        activity: READ,
      },
    ],
  },
];
