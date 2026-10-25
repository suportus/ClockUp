export const idlFactory = ({ IDL }) => {
  const DayType = IDL.Variant({
    'nedelja' : IDL.Null,
    'dopust' : IDL.Null,
    'delovniDan' : IDL.Null,
    'bolniska' : IDL.Null,
    'prostiDan' : IDL.Null,
    'praznik' : IDL.Null,
  });
  const WorkEntry = IDL.Record({
    'arrivalTime' : IDL.Int,
    'departureTime' : IDL.Int,
    'workedHours' : IDL.Int,
    'date' : IDL.Int,
    'dayType' : DayType,
  });
  const WorkEntryInput = IDL.Record({
    'arrivalTime' : IDL.Int,
    'departureTime' : IDL.Int,
    'date' : IDL.Int,
    'dayType' : DayType,
  });
  return IDL.Service({
    'deleteEntry' : IDL.Func([IDL.Int], [], []),
    'deleteMonth' : IDL.Func([IDL.Int, IDL.Int], [], []),
    'getAllEntries' : IDL.Func([], [IDL.Vec(WorkEntry)], []),
    'getCurrentDate' : IDL.Func([], [IDL.Int], []),
    'getEntriesForMonth' : IDL.Func(
        [IDL.Int, IDL.Int],
        [IDL.Vec(WorkEntry)],
        [],
      ),
    'getEntry' : IDL.Func([IDL.Int], [IDL.Opt(WorkEntry)], []),
    'getUserName' : IDL.Func([], [IDL.Opt(IDL.Text)], []),
    'saveEntry' : IDL.Func([WorkEntryInput], [], []),
    'setUserName' : IDL.Func([IDL.Text], [], []),
  });
};
export const init = ({ IDL }) => { return []; };
