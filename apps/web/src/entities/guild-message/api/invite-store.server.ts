import { inviteLedger } from "./invite-ledger.server";
import type { InviteJoinLookup, InviteJoinPage, InviteJoinWrite } from "./invite-ledger.server";
import { RelationStore } from "./relation-store.server";

abstract class InviteStore extends RelationStore {
  readonly #invites = inviteLedger(this.db);

  public saveInviteCounts(write: InviteJoinWrite): void {
    this.#invites.record(write, this.erasedIds());
  }

  public readInviteJoins(lookup: InviteJoinLookup): InviteJoinPage {
    return this.#invites.read(lookup, this.erasedIds());
  }

  public override eraseAuthor(authorId: string): Promise<void> {
    this.#invites.forget(authorId);
    return super.eraseAuthor(authorId);
  }
}

export { InviteStore };
