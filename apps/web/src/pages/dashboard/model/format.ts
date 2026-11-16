const LOCALE = "ja-JP";

export const dateFormat = new Intl.DateTimeFormat(LOCALE, {
  dateStyle: "long",
  timeStyle: "short",
  timeZone: "Asia/Tokyo",
});

export const countFormat = new Intl.NumberFormat(LOCALE);
