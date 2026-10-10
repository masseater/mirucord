import type { ReactNode } from "react";

import type { Place, PlaceId } from "#/pages/home/ui/common/places";
import { cn } from "#/shared/lib/utils";

import { ActivityMark } from "./activity-mark";
import { RowLead } from "./row-lead";
import type { Activity } from "./sidebar-categories";

const TONE: Readonly<Record<Activity["status"], string>> = {
  read: "text-dc-muted",
  unread: "text-dc-bright",
  mention: "text-dc-bright",
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
    <RowLead place={place} />
    <span className="truncate">{place.name}</span>
    <ActivityMark activity={activity} />
    {children}
  </span>
);

export { PlainRow };
