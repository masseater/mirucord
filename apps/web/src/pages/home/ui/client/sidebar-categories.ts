import { CHANNELS } from "#/pages/home/ui/common/channels";
import type { Place, PlaceId } from "#/pages/home/ui/common/places";

type Activity =
  | Readonly<{ status: "read" }>
  | Readonly<{ status: "unread" }>
  | Readonly<{ status: "mention"; count: number }>;

type SidebarRow =
  | Readonly<{ type: "link"; channel: (typeof CHANNELS)[number] }>
  | Readonly<{ type: "peek"; id: PlaceId; activity: Activity }>
  | Readonly<{ type: "idle"; place: Place; activity: Activity }>;

type SidebarCategory =
  | Readonly<{ state: "open"; name: string; rows: readonly SidebarRow[] }>
  | Readonly<{ state: "collapsed"; name: string }>;

const READ: Activity = { status: "read" };
const UNREAD: Activity = { status: "unread" };

const [top, why, forum, how, features, start, safety, faq] = CHANNELS;

const CATEGORIES: readonly SidebarCategory[] = [
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
      { type: "link", channel: top },
      { type: "peek", id: "campPlan", activity: UNREAD },
      { type: "link", channel: why },
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
      { type: "link", channel: forum },
      { type: "peek", id: "recipe", activity: UNREAD },
      { type: "peek", id: "game", activity: { status: "mention", count: 5 } },
    ],
  },
  {
    state: "open",
    name: "mirucord",
    rows: [
      { type: "link", channel: how },
      { type: "link", channel: features },
      { type: "link", channel: start },
      { type: "link", channel: safety },
      { type: "link", channel: faq },
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

export { CATEGORIES };
export type { Activity, SidebarCategory, SidebarRow };
