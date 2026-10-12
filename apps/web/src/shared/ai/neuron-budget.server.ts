import { DurableObject } from "cloudflare:workers";
import { Match, Option, Schema } from "effect";

const SPENT_KEY = "spent";
const NOTHING_SPENT = 0;

const Spent = Schema.Struct({ day: Schema.String, neurons: Schema.Finite });
const decodeSpent = Schema.decodeUnknownOption(Spent);

type Spending =
  | Readonly<{ status: "capped"; day: string; neurons: number; limit: number }>
  | Readonly<{ status: "settled"; day: string; neurons: number }>;

class NeuronBudget extends DurableObject {
  private spentOn(day: string): number {
    return decodeSpent(this.ctx.storage.kv.get(SPENT_KEY)).pipe(
      Option.filter((spent) => spent.day === day),
      Option.match({ onNone: () => NOTHING_SPENT, onSome: ({ neurons }) => neurons }),
    );
  }

  public spend(spending: Spending): boolean {
    const spent = this.spentOn(spending.day);
    const granted = Match.value(spending).pipe(
      Match.discriminatorsExhaustive("status")({
        capped: ({ neurons, limit }) => spent + neurons <= limit,
        settled: () => true,
      }),
    );
    if (granted) {
      this.ctx.storage.kv.put(SPENT_KEY, { day: spending.day, neurons: spent + spending.neurons });
    }
    return granted;
  }
}

export { NeuronBudget };
export type { Spending };
