import type { ReactNode } from "react";

import type { Place, PlaceId } from "#/pages/home/ui/common/places";
import { cn } from "#/shared/lib/utils";
import { ChannelIcon } from "#/shared/ui/channel-icon";

import { ActivityMark } from "./activity-mark";
import type { Activity } from "./sidebar-categories";
import { ThreadCorner } from "./thread-corner";

const TONE: Readonly<Record<Activity["status"], string>> = {
  read: "text-dc-muted",
  unread: "text-dc-bright",
  mention: "text-dc-bright",
};

const UNREAD_LABEL = "未読";

const spoken = (activity: Activity): string => {
  if (activity.status === "mention") {
    return `メンション ${activity.count} 件`;
  }
  if (activity.status === "unread") {
    return UNREAD_LABEL;
  }
  return "";
};

export const PlainRow = ({
  place,
  activity,
  peek,
  className,
  children,
}: Readonly<{
  place: Place;
  activity: Activity;
  peek?: PlaceId;
  className?: string;
  children?: ReactNode;
}>): ReactNode => (
  <span
    data-peek={peek}
    className={cn(
      "ch-row relative flex items-center gap-1.5 rounded-sm px-2 py-1 font-bold whitespace-nowrap",
      TONE[activity.status],
      className,
    )}
  >
    {place.type === "thread" && <ThreadCorner />}
    {place.type === "channel" && <ChannelIcon kind={place.kind} size="md" />}
    <span className="truncate">{place.name}</span>
    <ActivityMark activity={activity} />
    <span className="sr-only">{spoken(activity)}</span>
    {children}
  </span>
);
