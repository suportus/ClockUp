import type { Principal } from '@dfinity/principal';
import type { ActorMethod } from '@dfinity/agent';
import type { IDL } from '@dfinity/candid';

export type DayType = { 'nedelja' : null } |
  { 'dopust' : null } |
  { 'delovniDan' : null } |
  { 'bolniska' : null } |
  { 'prostiDan' : null } |
  { 'praznik' : null };
export interface WorkEntry {
  'arrivalTime' : bigint,
  'departureTime' : bigint,
  'workedHours' : bigint,
  'date' : bigint,
  'dayType' : DayType,
}
export interface WorkEntryInput {
  'arrivalTime' : bigint,
  'departureTime' : bigint,
  'date' : bigint,
  'dayType' : DayType,
}
export interface _SERVICE {
  'deleteEntry' : ActorMethod<[bigint], undefined>,
  'deleteMonth' : ActorMethod<[bigint, bigint], undefined>,
  'getAllEntries' : ActorMethod<[], Array<WorkEntry>>,
  'getCurrentDate' : ActorMethod<[], bigint>,
  'getEntriesForMonth' : ActorMethod<[bigint, bigint], Array<WorkEntry>>,
  'getEntry' : ActorMethod<[bigint], [] | [WorkEntry]>,
  'getUserName' : ActorMethod<[], [] | [string]>,
  'saveEntry' : ActorMethod<[WorkEntryInput], undefined>,
  'setUserName' : ActorMethod<[string], undefined>,
}
export declare const idlFactory: IDL.InterfaceFactory;
export declare const init: (args: { IDL: typeof IDL }) => IDL.Type[];
