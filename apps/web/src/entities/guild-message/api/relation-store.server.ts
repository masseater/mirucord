import type { ReactionChange } from "@repo/ingest-util-gateway-contract";
import { Array } from "effect";

import { erasedAuthors } from "./erased-authors.server.ts";
import { memberLedger } from "./member-ledger.server.ts";
import type { MemberLookup, MemberWrite, StoredMember } from "./member-types.ts";
import { NoteStore } from "./note-store.server.ts";
import { reactionLedger } from "./reaction-ledger.server.ts";
import type { ReactionLookup, ReactionPage } from "./reaction-ledger.server.ts";
import { voiceLedger } from "./voice-ledger.server.ts";
import type {
  VoiceChangeWrite,
  VoiceLookup,
  VoicePage,
  VoiceSnapshotWrite,
} from "./voice-types.ts";

export abstract class RelationStore extends NoteStore {
  readonly #erased = erasedAuthors(this.db);

  readonly #members = memberLedger(this.db);

  readonly #voice = voiceLedger(this.db);

  readonly #reactions = reactionLedger(this.db);

  public saveMembers(request: MemberWrite): void {
    this.#members.write(request, this.#erased.ids());
  }

  public departMembers(userIds: readonly string[], now: number): void {
    this.#members.depart(userIds, now);
  }

  public readMembers(lookup: MemberLookup): readonly StoredMember[] {
    return this.#members.read(lookup, this.#erased.ids());
  }

  public saveVoiceChanges(changes: readonly VoiceChangeWrite[]): void {
    this.#voice.change(changes, this.#erased.ids());
  }

  public saveVoiceSnapshot(snapshot: VoiceSnapshotWrite): void {
    this.#voice.snapshot(snapshot, this.#erased.ids());
  }

  public readVoiceSessions(lookup: VoiceLookup): VoicePage {
    return this.#voice.read(lookup, this.#erased.ids());
  }

  public saveReactions(changes: readonly ReactionChange[]): void {
    this.#reactions.change(changes, this.#erased.ids());
  }

  public readReactions(lookup: ReactionLookup): ReactionPage {
    return this.#reactions.read(lookup, this.#erased.ids());
  }

  public keptUserIds(userIds: readonly string[]): readonly string[] {
    return Array.difference(userIds, this.#erased.ids());
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
