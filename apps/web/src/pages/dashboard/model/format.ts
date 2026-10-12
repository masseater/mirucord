const LOCALE = "ja-JP";

const dateFormat = new Intl.DateTimeFormat(LOCALE, {
  dateStyle: "long",
  timeStyle: "short",
  timeZone: "Asia/Tokyo",
});

const countFormat = new Intl.NumberFormat(LOCALE);

export { countFormat, dateFormat };
