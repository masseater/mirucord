import type { ReactNode } from "react";

import type { Activity } from "./sidebar-categories";

const MARK: Readonly<Record<Exclude<Activity["status"], "read">, string>> = {
  unread: "bg-dc-bright absolute -left-2 h-2 w-1 rounded-r-full",
  mention: "bg-dc-new text-dc-rail ml-auto rounded-full px-1.5 text-xs leading-5 font-black",
};

export const ActivityMark = ({ activity }: Readonly<{ activity: Activity }>): ReactNode =>
  activity.status !== "read" && (
    <span aria-hidden="true" className={MARK[activity.status]}>
      {activity.status === "mention" && activity.count}
    </span>
  );
