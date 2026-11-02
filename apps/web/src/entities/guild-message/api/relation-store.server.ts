import type { ReactionChange } from "@repo/ingest-util-gateway-contract";
import { Array, pipe } from "effect";

import { memberLedger } from "./member-ledger.server";
import type { MemberLookup, MemberWrite, StoredMember } from "./member-types";
import { NoteStore } from "./note-store.server";
import { reactionLedger } from "./reaction-ledger.server";
import type { ReactionLookup, ReactionPage } from "./reaction-ledger.server";
import { voiceLedger } from "./voice-ledger.server";
import type { VoiceChangeWrite, VoiceLookup, VoicePage, VoiceSnapshotWrite } from "./voice-types";

abstract class RelationStore extends NoteStore {
  readonly #members = memberLedger(this.db);

  readonly #voice = voiceLedger(this.db);

  readonly #reactions = reactionLedger(this.db);

  protected erasedIds(): readonly string[] {
    return pipe(
      this.erasedAuthors(),
      Array.map(({ id }) => id),
    );
  }

  public saveMembers(request: MemberWrite): void {
    this.#members.write(request, this.erasedIds());
  }

  public departMembers(userIds: readonly string[], now: number): void {
    this.#members.depart(userIds, now);
  }

  public readMembers(lookup: MemberLookup): readonly StoredMember[] {
    return this.#members.read(lookup, this.erasedIds());
  }

  public saveVoiceChanges(changes: readonly VoiceChangeWrite[]): void {
    this.#voice.change(changes, this.erasedIds());
  }

  public saveVoiceSnapshot(snapshot: VoiceSnapshotWrite): void {
    this.#voice.snapshot(snapshot, this.erasedIds());
  }

  public readVoiceSessions(lookup: VoiceLookup): VoicePage {
    return this.#voice.read(lookup, this.erasedIds());
  }

  public saveReactions(changes: readonly ReactionChange[]): void {
    this.#reactions.change(changes, this.erasedIds());
  }

  public readReactions(lookup: ReactionLookup): ReactionPage {
    return this.#reactions.read(lookup, this.erasedIds());
  }

  public keptUserIds(userIds: readonly string[]): readonly string[] {
    return Array.difference(userIds, this.erasedIds());
  }

  public override remove(ids: readonly string[]): Promise<void> {
    this.#reactions.forgetMessages(ids);
    return super.remove(ids);
  }

  public override removeChannel(channelId: string): Promise<void> {
    this.#reactions.forgetChannel(channelId);
    return super.removeChannel(channelId);
  }

  public override eraseAuthor(authorId: string): Promise<void> {
    this.#members.forget(authorId);
    this.#voice.forget(authorId);
    this.#reactions.forget(authorId);
    return super.eraseAuthor(authorId);
  }
}

export { RelationStore };
