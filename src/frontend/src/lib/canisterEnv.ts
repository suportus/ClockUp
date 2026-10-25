import { safeGetCanisterEnv } from "@icp-sdk/core/agent/canister-env";

// Canister IDs and the network root key are injected by `icp deploy` and
// served by the frontend canister in the `ic_env` cookie.
type ClockUpEnv = {
  readonly "PUBLIC_CANISTER_ID:backend"?: string;
  readonly "PUBLIC_CANISTER_ID:frontend"?: string;
};

export function getCanisterEnv() {
  const env = safeGetCanisterEnv<ClockUpEnv>();
  return {
    backendId: env?.["PUBLIC_CANISTER_ID:backend"],
    frontendId: env?.["PUBLIC_CANISTER_ID:frontend"],
    rootKey: env?.IC_ROOT_KEY,
  };
}

// The backend traps with this message for principals that are not on the
// allow-list.
export function isAccessDenied(error: unknown): boolean {
  return String(error).includes("Access denied");
}
