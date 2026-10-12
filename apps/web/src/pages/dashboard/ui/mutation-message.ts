import { Option } from "effect";

type MutationStatus = "idle" | "pending" | "error" | "success";

const mutationMessage =
  <Result extends string>({
    messages,
    resultMessage,
  }: Readonly<{
    messages: Readonly<Record<Exclude<MutationStatus, "success">, string>>;
    resultMessage: (status: Result) => string;
  }>) =>
  (status: MutationStatus, result: Option.Option<Readonly<{ status: Result }>>): string => {
    if (status !== "success") {
      return messages[status];
    }
    return Option.match(result, {
      onNone: () => messages.idle,
      onSome: (answered) => resultMessage(answered.status),
    });
  };

export { mutationMessage };
