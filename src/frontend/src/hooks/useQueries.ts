import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { WorkEntry, WorkEntryInput } from "../backend";
import { useActor } from "./useActor";

export function useGetEntriesForMonth(year: bigint, month: bigint) {
  const { actor, isFetching } = useActor();

  return useQuery<WorkEntry[]>({
    queryKey: ["entries", year.toString(), month.toString()],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getEntriesForMonth(year, month);
    },
    enabled: !!actor && !isFetching,
  });
}

export function useSaveEntry() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (entry: WorkEntryInput) => {
      if (!actor) throw new Error("Actor not initialized");
      return actor.saveEntry(entry);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["entries"] });
    },
  });
}

export function useDeleteEntry() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (date: bigint) => {
      if (!actor) throw new Error("Actor not initialized");
      return actor.deleteEntry(date);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["entries"] });
    },
  });
}

export function useDeleteMonth() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ year, month }: { year: bigint; month: bigint }) => {
      if (!actor) throw new Error("Actor not initialized");
      return actor.deleteMonth(year, month);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["entries"] });
    },
  });
}

export function useGetEntry(date: bigint, enabled = true) {
  const { actor, isFetching } = useActor();

  return useQuery<WorkEntry | null>({
    queryKey: ["entry", date.toString()],
    queryFn: async () => {
      if (!actor) return null;
      return actor.getEntry(date);
    },
    enabled: !!actor && !isFetching && enabled,
  });
}

export function useGetUserName(enabled: boolean) {
  const { actor, isFetching } = useActor();

  return useQuery<string | null>({
    queryKey: ["userName"],
    queryFn: async () => {
      if (!actor) return null;
      return actor.getUserName();
    },
    enabled: !!actor && !isFetching && enabled,
  });
}

export function useSetUserName() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (name: string) => {
      if (!actor) throw new Error("Actor not initialized");
      return actor.setUserName(name);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["userName"] });
    },
  });
}
