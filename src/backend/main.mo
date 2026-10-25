import OrderedMap "mo:base/OrderedMap";
import Int "mo:base/Int";
import Iter "mo:base/Iter";
import Time "mo:base/Time";
import Principal "mo:base/Principal";
import Debug "mo:base/Debug";
import Cycles "mo:base/ExperimentalCycles";
import Runtime "mo:core/Runtime";

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

  transient let principalMap = OrderedMap.Make(Principal.compare);
  transient let intMap = OrderedMap.Make<Int>(Int.compare);

  // Data is keyed by the full principal (not a 32-bit hash).
  var userEntries : OrderedMap.Map<Principal, OrderedMap.Map<Int, WorkEntry>> = principalMap.empty<OrderedMap.Map<Int, WorkEntry>>();
  var userProfiles : OrderedMap.Map<Principal, UserProfile> = principalMap.empty<UserProfile>();

  // Only principals in this list may read or write data.
  // The list is managed by a canister controller (your dfx identity).
  var allowedUsers : OrderedMap.Map<Principal, Bool> = principalMap.empty<Bool>();

  // ---------- Access control ----------

  func requireUser(caller : Principal) {
    if (Principal.isAnonymous(caller)) {
      Debug.trap("Anonymous access is not allowed");
    };
    switch (principalMap.get(allowedUsers, caller)) {
      case (null) { Debug.trap("Access denied") };
      case (?_) {};
    };
  };

  func requireController(caller : Principal) {
    if (not Principal.isController(caller)) {
      Debug.trap("Only a canister controller can do this");
    };
  };

  public shared ({ caller }) func addUser(user : Principal) : async () {
    requireController(caller);
    allowedUsers := principalMap.put(allowedUsers, user, true);
  };

  public shared ({ caller }) func removeUser(user : Principal) : async () {
    requireController(caller);
    allowedUsers := principalMap.delete(allowedUsers, user);
  };

  public shared ({ caller }) func listUsers() : async [Principal] {
    requireController(caller);
    Iter.toArray(
      Iter.map(
        principalMap.entries(allowedUsers),
        func((p, _) : (Principal, Bool)) : Principal { p },
      )
    );
  };

  // Cycle balance of this (backend) canister, shown on the Admin page.
  public shared query ({ caller }) func getCycleBalance() : async Nat {
    requireUser(caller);
    Cycles.balance();
  };

  // ---------- Top-up from a wallet (cycles ledger) ----------

  // Cycles held in a wallet (e.g. Oisy) are tokens on the cycles ledger.
  // Sending them to this canister's principal only credits its ledger
  // account; `claimCycles` moves them onto a canister's real cycle balance.
  type LedgerAccount = { owner : Principal; subaccount : ?Blob };
  type WithdrawArgs = {
    amount : Nat;
    from_subaccount : ?Blob;
    to : Principal;
    created_at_time : ?Nat64;
  };
  type RejectionCode = {
    #NoError;
    #CanisterError;
    #SysTransient;
    #DestinationInvalid;
    #Unknown;
    #SysFatal;
    #CanisterReject;
  };
  type WithdrawError = {
    #GenericError : { message : Text; error_code : Nat };
    #TemporarilyUnavailable;
    #FailedToWithdraw : {
      fee_block : ?Nat;
      rejection_code : RejectionCode;
      rejection_reason : Text;
    };
    #Duplicate : { duplicate_of : Nat };
    #BadFee : { expected_fee : Nat };
    #InvalidReceiver : { receiver : Principal };
    #CreatedInFuture : { ledger_time : Nat64 };
    #TooOld;
    #InsufficientFunds : { balance : Nat };
  };

  transient let cyclesLedger = actor "um5iw-rqaaa-aaaaq-qaaba-cai" : actor {
    icrc1_balance_of : shared query LedgerAccount -> async Nat;
    withdraw : shared WithdrawArgs -> async { #Ok : Nat; #Err : WithdrawError };
  };
  transient let cyclesLedgerFee = 100_000_000;

  // Cycles waiting in this canister's cycles-ledger account. An update call:
  // the cycles ledger is on another subnet, which a composite query can't reach.
  public shared ({ caller }) func getWalletCycles() : async Nat {
    requireUser(caller);
    await cyclesLedger.icrc1_balance_of({
      owner = Principal.fromActor(ClockUp);
      subaccount = null;
    });
  };

  // Moves all waiting cycles (minus the ledger fee) onto the backend or the
  // frontend canister. Returns the amount moved.
  public shared ({ caller }) func claimCycles(target : { #backend; #frontend }) : async Nat {
    requireUser(caller);
    let self = Principal.fromActor(ClockUp);
    let to = switch (target) {
      case (#backend) { self };
      case (#frontend) {
        switch (Runtime.envVar<system>("PUBLIC_CANISTER_ID:frontend")) {
          case (?id) { Principal.fromText(id) };
          case (null) { Debug.trap("Frontend canister ID is not configured") };
        };
      };
    };
    let balance = await cyclesLedger.icrc1_balance_of({
      owner = self;
      subaccount = null;
    });
    if (balance <= cyclesLedgerFee) {
      Debug.trap("No cycles to claim");
    };
    let amount : Nat = balance - cyclesLedgerFee;
    switch (await cyclesLedger.withdraw({ amount; from_subaccount = null; to; created_at_time = null })) {
      case (#Ok(_)) { amount };
      case (#Err(e)) { Debug.trap("Withdraw failed: " # debug_show (e)) };
    };
  };

  // ---------- Helpers ----------

  func calculateWorkedMinutes(arrivalTime : Int, departureTime : Int) : Int {
    let arrivalHours = arrivalTime / 100;
    let arrivalMinutes = arrivalTime % 100;
    let departureHours = departureTime / 100;
    let departureMinutes = departureTime % 100;

    let arrivalTotal = arrivalHours * 60 + arrivalMinutes;
    let departureTotal = departureHours * 60 + departureMinutes;

    departureTotal - arrivalTotal;
  };

  // ---------- Work entries ----------

  public shared ({ caller }) func saveEntry(entryInput : WorkEntryInput) : async () {
    requireUser(caller);
    let entry : WorkEntry = {
      date = entryInput.date;
      arrivalTime = entryInput.arrivalTime;
      departureTime = entryInput.departureTime;
      dayType = entryInput.dayType;
      workedMinutes = calculateWorkedMinutes(entryInput.arrivalTime, entryInput.departureTime);
    };

    let userMap = switch (principalMap.get(userEntries, caller)) {
      case (null) { intMap.empty<WorkEntry>() };
      case (?map) { map };
    };

    let updatedUserMap = intMap.put(userMap, entry.date, entry);
    userEntries := principalMap.put(userEntries, caller, updatedUserMap);
  };

  public shared query ({ caller }) func getEntriesForMonth(year : Int, month : Int) : async [WorkEntry] {
    requireUser(caller);
    switch (principalMap.get(userEntries, caller)) {
      case (null) { [] };
      case (?userMap) {
        let startOfMonth = year * 10000 + month * 100 + 1;
        let endOfMonth = year * 10000 + month * 100 + 31;

        Iter.toArray(
          Iter.filter(
            intMap.vals(userMap),
            func(entry : WorkEntry) : Bool {
              entry.date >= startOfMonth and entry.date <= endOfMonth
            },
          )
        );
      };
    };
  };

  public shared ({ caller }) func deleteEntry(date : Int) : async () {
    requireUser(caller);
    switch (principalMap.get(userEntries, caller)) {
      case (null) {};
      case (?userMap) {
        let updatedUserMap = intMap.delete(userMap, date);
        userEntries := principalMap.put(userEntries, caller, updatedUserMap);
      };
    };
  };

  public shared ({ caller }) func deleteMonth(year : Int, month : Int) : async () {
    requireUser(caller);
    switch (principalMap.get(userEntries, caller)) {
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
        userEntries := principalMap.put(userEntries, caller, updatedUserMap);
      };
    };
  };

  public shared query ({ caller }) func getEntry(date : Int) : async ?WorkEntry {
    requireUser(caller);
    switch (principalMap.get(userEntries, caller)) {
      case (null) { null };
      case (?userMap) { intMap.get(userMap, date) };
    };
  };

  public shared query ({ caller }) func getAllEntries() : async [WorkEntry] {
    requireUser(caller);
    switch (principalMap.get(userEntries, caller)) {
      case (null) { [] };
      case (?userMap) { Iter.toArray(intMap.vals(userMap)) };
    };
  };

  // Days since the Unix epoch (kept as in the original app).
  public shared query func getCurrentDate() : async Int {
    Time.now() / (24 * 60 * 60 * 1000000000);
  };

  // ---------- Profile ----------

  public shared ({ caller }) func setUserName(name : Text) : async () {
    requireUser(caller);
    let profile : UserProfile = { name };
    userProfiles := principalMap.put(userProfiles, caller, profile);
  };

  public shared query ({ caller }) func getUserName() : async ?Text {
    requireUser(caller);
    switch (principalMap.get(userProfiles, caller)) {
      case (null) { null };
      case (?profile) { ?profile.name };
    };
  };
};
