import OrderedMap "mo:base/OrderedMap";
import Nat "mo:base/Nat";
import Int "mo:base/Int";
import Iter "mo:base/Iter";
import Time "mo:base/Time";
import Principal "mo:base/Principal";
import Nat32 "mo:base/Nat32";
import Text "mo:base/Text";




persistent actor ClockUp {

  public type DayType = {
    #delovniDan;
    #nedelja;
    #praznik;
    #dopust;
    #bolniska;
    #prostiDan;
  };

  public type WorkEntry = {
    date : Int;
    arrivalTime : Int;
    departureTime : Int;
    dayType : DayType;
    workedMinutes : Int;
  };

  public type WorkEntryInput = {
    date : Int;
    arrivalTime : Int;
    departureTime : Int;
    dayType : DayType;
  };

  public type UserProfile = {
    name : Text;
  };

  transient let natMap = OrderedMap.Make(Nat.compare);
  transient let intMap = OrderedMap.Make<Int>(Int.compare);

  var userEntries : OrderedMap.Map<Nat, OrderedMap.Map<Int, WorkEntry>> = natMap.empty<OrderedMap.Map<Int, WorkEntry>>();
  var userProfiles : OrderedMap.Map<Nat, UserProfile> = natMap.empty<UserProfile>();

  func calculateWorkedMinutes(arrivalTime : Int, departureTime : Int) : Int {
    let arrivalHours = arrivalTime / 100;
    let arrivalMinutes = arrivalTime % 100;
    let departureHours = departureTime / 100;
    let departureMinutes = departureTime % 100;

    let arrivalTotal = arrivalHours * 60 + arrivalMinutes;
    let departureTotal = departureHours * 60 + departureMinutes;

    let workedMinutes = departureTotal - arrivalTotal;
    workedMinutes;
  };

  public shared ({ caller }) func saveEntry(entryInput : WorkEntryInput) : async () {
    let userIdNat = Nat32.toNat(Principal.hash(caller));
    let entry : WorkEntry = {
      date = entryInput.date;
      arrivalTime = entryInput.arrivalTime;
      departureTime = entryInput.departureTime;
      dayType = entryInput.dayType;
      workedMinutes = calculateWorkedMinutes(entryInput.arrivalTime, entryInput.departureTime);
    };

    let userMap = switch (natMap.get(userEntries, userIdNat)) {
      case (null) { intMap.empty<WorkEntry>() };
      case (?map) { map };
    };

    let updatedUserMap = intMap.put(userMap, entry.date, entry);
    userEntries := natMap.put(userEntries, userIdNat, updatedUserMap);
  };

  public shared ({ caller }) func getEntriesForMonth(year : Int, month : Int) : async [WorkEntry] {
    let userIdNat = Nat32.toNat(Principal.hash(caller));
    switch (natMap.get(userEntries, userIdNat)) {
      case (null) { [] };
      case (?userMap) {
        let startOfMonth = year * 10000 + month * 100 + 1;
        let endOfMonth = year * 10000 + month * 100 + 31;

        let filteredEntries = Iter.toArray(
          Iter.filter(
            intMap.vals(userMap),
            func(entry : WorkEntry) : Bool {
              entry.date >= startOfMonth and entry.date <= endOfMonth
            },
          )
        );
        filteredEntries;
      };
    };
  };

  public shared ({ caller }) func deleteEntry(date : Int) : async () {
    let userIdNat = Nat32.toNat(Principal.hash(caller));
    switch (natMap.get(userEntries, userIdNat)) {
      case (null) {};
      case (?userMap) {
        let updatedUserMap = intMap.delete(userMap, date);
        userEntries := natMap.put(userEntries, userIdNat, updatedUserMap);
      };
    };
  };

  public shared ({ caller }) func deleteMonth(year : Int, month : Int) : async () {
    let userIdNat = Nat32.toNat(Principal.hash(caller));
    switch (natMap.get(userEntries, userIdNat)) {
      case (null) {};
      case (?userMap) {
        var updatedUserMap = userMap;
        let startOfMonth = year * 10000 + month * 100 + 1;
        let endOfMonth = year * 10000 + month * 100 + 31;

        for ((date, _) in intMap.entries(userMap)) {
          if (date >= startOfMonth and date <= endOfMonth) {
            updatedUserMap := intMap.delete(updatedUserMap, date);
          };
        };
        userEntries := natMap.put(userEntries, userIdNat, updatedUserMap);
      };
    };
  };

  public shared ({ caller }) func getEntry(date : Int) : async ?WorkEntry {
    let userIdNat = Nat32.toNat(Principal.hash(caller));
    switch (natMap.get(userEntries, userIdNat)) {
      case (null) { null };
      case (?userMap) { intMap.get(userMap, date) };
    };
  };

  public shared ({ caller }) func getAllEntries() : async [WorkEntry] {
    let userIdNat = Nat32.toNat(Principal.hash(caller));
    switch (natMap.get(userEntries, userIdNat)) {
      case (null) { [] };
      case (?userMap) { Iter.toArray(intMap.vals(userMap)) };
    };
  };

  public shared func getCurrentDate() : async Int {
    let now = Time.now();
    let daysSinceEpoch = now / (24 * 60 * 60 * 1000000000);
    daysSinceEpoch;
  };

  public shared ({ caller }) func setUserName(name : Text) : async () {
    let userIdNat = Nat32.toNat(Principal.hash(caller));
    let profile : UserProfile = {
      name;
    };
    userProfiles := natMap.put(userProfiles, userIdNat, profile);
  };

  public shared ({ caller }) func getUserName() : async ?Text {
    let userIdNat = Nat32.toNat(Principal.hash(caller));
    switch (natMap.get(userProfiles, userIdNat)) {
      case (null) { null };
      case (?profile) { ?profile.name };
    };
  };
};

