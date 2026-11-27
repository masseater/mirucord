export type ConsentDetail =
  | Readonly<{ status: "awaiting" }>
  | Readonly<{ status: "withdrawing" }>
  | Readonly<{
      status: "granted";
      grantedBy: string;
      grantedAt: number;
      noticeChannelId: string;
    }>;
