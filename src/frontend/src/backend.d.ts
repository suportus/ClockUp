import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface WorkEntryInput {
    arrivalTime: bigint;
    departureTime: bigint;
    date: bigint;
    dayType: DayType;
}
export interface WorkEntry {
    arrivalTime: bigint;
    departureTime: bigint;
    date: bigint;
    workedMinutes: bigint;
    dayType: DayType;
}
export enum DayType {
    nedelja = "nedelja",
    dopust = "dopust",
    delovniDan = "delovniDan",
    bolniska = "bolniska",
    prostiDan = "prostiDan",
    praznik = "praznik"
}
export interface backendInterface {
    deleteEntry(date: bigint): Promise<void>;
    deleteMonth(year: bigint, month: bigint): Promise<void>;
    getAllEntries(): Promise<Array<WorkEntry>>;
    getCurrentDate(): Promise<bigint>;
    getEntriesForMonth(year: bigint, month: bigint): Promise<Array<WorkEntry>>;
    getEntry(date: bigint): Promise<WorkEntry | null>;
    getUserName(): Promise<string | null>;
    saveEntry(entryInput: WorkEntryInput): Promise<void>;
    setUserName(name: string): Promise<void>;
}
