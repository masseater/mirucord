import type { ReactNode } from "react";

import type { Activity } from "./sidebar-categories";

const MARK: Readonly<Record<Activity["status"], string>> = {
  read: "hidden",
  unread: "bg-dc-bright absolute -left-2 h-2 w-1 rounded-r-full",
  mention: "bg-dc-new text-dc-rail ml-auto rounded-full px-1.5 text-xs leading-5 font-black",
};

const mentions = (activity: Activity): string => {
  if (activity.status === "mention") {
    return String(activity.count);
  }
  return "";
};

const ActivityMark = ({ activity }: Readonly<{ activity: Activity }>): ReactNode => (
  <span className={MARK[activity.status]}>{mentions(activity)}</span>
);

export { ActivityMark };
