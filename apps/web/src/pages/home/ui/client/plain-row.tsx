import type { ReactNode } from "react";

import type { Place, PlaceId } from "#/pages/home/ui/common/places";
import { cn } from "#/shared/lib/utils";
import { ChannelIcon } from "#/shared/ui/channel-icon";

import type { Activity } from "./sidebar-categories";

const TONE: Readonly<Record<Activity["status"], string>> = {
  read: "text-dc-muted",
  unread: "text-dc-bright",
  mention: "text-dc-bright",
};

const MARK: Readonly<Record<Activity["status"], string>> = {
  read: "hidden",
  unread: "bg-dc-bright absolute -left-2 h-2 w-1 rounded-r-full",
  mention: "bg-dc-new text-dc-rail ml-auto rounded-full px-1.5 text-xs leading-5 font-black",
};

const UNREAD_LABEL = "未読";

const shown = (activity: Activity): string => {
  if (activity.status === "mention") {
    return String(activity.count);
  }
  return "";
};

const spoken = (activity: Activity): string => {
  if (activity.status === "mention") {
    return `メンション ${activity.count} 件`;
  }
  if (activity.status === "unread") {
    return UNREAD_LABEL;
  }
  return "";
};

const PlainRow = ({
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
      "relative flex items-center gap-1.5 rounded-sm px-2 py-1 font-bold whitespace-nowrap",
      TONE[activity.status],
      className,
    )}
  >
    {place.type === "thread" && (
      <span
        aria-hidden="true"
        className="border-dc-line ml-2 h-3 w-3 shrink-0 -translate-y-1 rounded-bl-md border-b-2 border-l-2"
      />
    )}
    {place.type === "channel" && <ChannelIcon kind={place.kind} size="md" />}
    <span className="truncate">{place.name}</span>
    <span aria-hidden="true" className={MARK[activity.status]}>
      {shown(activity)}
    </span>
    <span className="sr-only">{spoken(activity)}</span>
    {children}
  </span>
);

export { PlainRow };
