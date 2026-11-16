import type { MutationStatus } from "@tanstack/react-query";
import { Option } from "effect";

type Fix = "none" | "signIn" | "refresh";

export type Feedback = Readonly<{ tone: "error" | "busy" | "done"; text: string; fix: Fix }>;

export const fixable =
  (fix: Fix) =>
  (text: string): Option.Option<Feedback> =>
    Option.some({ tone: "error", text, fix });

export const failure = fixable("none");

export const progress = (text: string): Option.Option<Feedback> =>
  Option.some({ tone: "busy", text, fix: "none" });

export const success = (text: string): Option.Option<Feedback> =>
  Option.some({ tone: "done", text, fix: "none" });

export const SIGNED_OUT = fixable("signIn")("ログインの期限が切れました");

export const FORBIDDEN = failure("サーバー管理の権限がありません");

export const mutationFeedback =
  <Result extends string>({
    pending,
    failed,
    result,
  }: Readonly<{
    pending: Option.Option<Feedback>;
    failed: string;
    result: (status: Result) => Option.Option<Feedback>;
  }>) =>
  (
    status: MutationStatus,
    answer: Option.Option<Readonly<{ status: Result }>>,
  ): Option.Option<Feedback> => {
    if (status === "pending") {
      return pending;
    }
    if (status === "error") {
      return failure(failed);
    }
    return answer.pipe(
      Option.filter(() => status === "success"),
      Option.flatMap((answered) => result(answered.status)),
    );
  };
