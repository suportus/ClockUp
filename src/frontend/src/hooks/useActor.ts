import { useActor as useActorBase } from "@caffeineai/core-infrastructure";
import { type Backend, createActor } from "../backend";

export function useActor(): { actor: Backend | null; isFetching: boolean } {
  return useActorBase<Backend>(createActor);
}
