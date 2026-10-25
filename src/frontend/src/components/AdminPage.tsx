import { AlertTriangle, ArrowLeft, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Variant_frontend_backend } from "../backend";
import {
  useClaimCycles,
  useGetCycleBalance,
  useGetWalletCycles,
} from "../hooks/useQueries";
import { getCanisterEnv } from "../lib/canisterEnv";
import { PrincipalDisplay } from "./PrincipalDisplay";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";
import { Button } from "./ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";

// Below this balance the page shows a warning (1 T cycles).
const LOW_CYCLES_THRESHOLD = 1_000_000_000_000n;

// Fee the cycles ledger charges for each withdraw (100 M cycles).
const CYCLES_LEDGER_FEE = 100_000_000n;

function formatTrillions(cycles: bigint): string {
  const trillions = Number(cycles) / 1e12;
  return `${trillions.toLocaleString("sl-SI", { maximumFractionDigits: 3 })} T`;
}

function Command({ children }: { children: string }) {
  return (
    <pre className="bg-muted rounded-lg px-3 py-2 text-xs font-mono overflow-x-auto">
      {children}
    </pre>
  );
}

interface AdminPageProps {
  principal: string;
  onBack: () => void;
}

export function AdminPage({ principal, onBack }: AdminPageProps) {
  const {
    data: balance,
    isLoading,
    isError,
    refetch,
    isFetching,
  } = useGetCycleBalance();
  const {
    data: walletCycles,
    isLoading: isLoadingWallet,
    isError: isWalletError,
    refetch: refetchWallet,
    isFetching: isFetchingWallet,
  } = useGetWalletCycles();
  const claimCycles = useClaimCycles();
  const { backendId, frontendId } = getCanisterEnv();
  const isLow = balance !== undefined && balance < LOW_CYCLES_THRESHOLD;
  const canClaim =
    walletCycles !== undefined &&
    walletCycles > CYCLES_LEDGER_FEE &&
    !claimCycles.isPending;

  const handleClaim = async (target: Variant_frontend_backend) => {
    try {
      const moved = await claimCycles.mutateAsync(target);
      toast.success(`Preneseno ${formatTrillions(moved)} ciklov v ${target}`);
    } catch (error) {
      toast.error(`Prenos ni uspel: ${String(error)}`);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-2xl font-bold">Administracija</h2>
        <Button onClick={onBack} variant="outline" className="rounded-lg">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Nazaj na ure
        </Button>
      </div>

      <Card className="shadow-soft-lg" style={{ borderRadius: "10px" }}>
        <CardHeader>
          <CardTitle>Stanje ciklov (backend)</CardTitle>
          <CardDescription>
            Cikli so "gorivo" kanistra. Z vsako uporabo in s hrambo podatkov se
            počasi porabljajo.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? (
            <p className="text-muted-foreground">Nalaganje...</p>
          ) : isError || balance === undefined ? (
            <p className="text-destructive">
              Stanja ciklov ni bilo mogoče naložiti.
            </p>
          ) : (
            <div>
              <p className="text-3xl font-bold">{formatTrillions(balance)}</p>
              <p className="text-sm text-muted-foreground">
                {balance.toLocaleString("sl-SI")} ciklov
              </p>
            </div>
          )}
          <Button
            onClick={() => refetch()}
            variant="outline"
            size="sm"
            disabled={isFetching}
            className="rounded-lg"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Osveži
          </Button>
          {isLow && (
            <Alert variant="destructive">
              <AlertTriangle />
              <AlertTitle>Malo ciklov</AlertTitle>
              <AlertDescription>
                Stanje je pod {formatTrillions(LOW_CYCLES_THRESHOLD)}. Ko cikli
                pošle, se kanister zamrzne in aplikacija ne deluje več. Če
                ostane prazen predolgo, se izbriše skupaj z vsemi podatki.
                Kanister čim prej napolnite (navodila spodaj).
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      <Card className="shadow-soft-lg" style={{ borderRadius: "10px" }}>
        <CardHeader>
          <CardTitle>ID-ji kanistrov</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex flex-wrap gap-2">
            <span className="text-muted-foreground w-24">Backend:</span>
            <code className="font-mono break-all">{backendId ?? "neznan"}</code>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="text-muted-foreground w-24">Frontend:</span>
            <code className="font-mono break-all">
              {frontendId ?? "neznan"}
            </code>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-soft-lg" style={{ borderRadius: "10px" }}>
        <CardHeader>
          <CardTitle>Polnjenje iz denarnice (Oisy)</CardTitle>
          <CardDescription>
            Cikle iz denarnice pošljete na naslov spodaj, nato jih z gumbom
            prenesete na kanister.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div className="space-y-2">
            <p>
              1. V denarnici pošljite žeton <strong>Cycles</strong> (ledger{" "}
              <code>um5iw-rqaaa-aaaaq-qaaba-cai</code>) na ta naslov:
            </p>
            {backendId ? (
              <PrincipalDisplay principal={backendId} label="Naslov" />
            ) : (
              <p className="text-destructive">Naslov ni znan.</p>
            )}
          </div>
          <Alert variant="destructive">
            <AlertTriangle />
            <AlertTitle>Pošiljajte samo Cycles, nikoli ICP</AlertTitle>
            <AlertDescription>
              ICP, poslan na ta naslov, ostane zaklenjen in ga aplikacija ne
              more uporabiti.
            </AlertDescription>
          </Alert>
          <div className="space-y-2">
            <p>2. Cikli, ki čakajo na prenos:</p>
            {isLoadingWallet ? (
              <p className="text-muted-foreground">Nalaganje...</p>
            ) : isWalletError || walletCycles === undefined ? (
              <p className="text-destructive">
                Stanja ni bilo mogoče naložiti.
              </p>
            ) : (
              <p className="text-xl font-bold">
                {formatTrillions(walletCycles)}
              </p>
            )}
            <Button
              onClick={() => refetchWallet()}
              variant="outline"
              size="sm"
              disabled={isFetchingWallet}
              className="rounded-lg"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Osveži
            </Button>
          </div>
          <div className="space-y-2">
            <p>3. Prenesite vse čakajoče cikle na kanister:</p>
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={() => handleClaim(Variant_frontend_backend.backend)}
                disabled={!canClaim}
                className="rounded-lg"
              >
                Prenesi v backend
              </Button>
              <Button
                onClick={() => handleClaim(Variant_frontend_backend.frontend)}
                disabled={!canClaim}
                variant="outline"
                className="rounded-lg"
              >
                Prenesi v frontend
              </Button>
            </div>
            <p className="text-muted-foreground">
              Ledger pri vsakem prenosu zaračuna{" "}
              {formatTrillions(CYCLES_LEDGER_FEE)} ciklov (100 milijonov).
              Backend porabi več ciklov kot frontend.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-soft-lg" style={{ borderRadius: "10px" }}>
        <CardHeader>
          <CardTitle>Polnjenje ciklov prek terminala</CardTitle>
          <CardDescription>
            Ukaze zaženete v terminalu, v mapi projekta, z istim icp profilom
            (identiteto), s katerim ste aplikacijo namestili.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div className="space-y-2">
            <p>1. Preverite, koliko ciklov ima vaš icp profil:</p>
            <Command>icp cycles balance -n ic</Command>
          </div>
          <div className="space-y-2">
            <p>
              2. Če jih je premalo, pretvorite ICP v cikle (ICP najprej pošljite
              na račun iz <code>icp identity account-id</code>) ali jih kupite s
              kartico:
            </p>
            <Command>icp cycles mint --icp 1.0 -n ic</Command>
            <Command>icp cycles buy --amount 10 -n ic</Command>
          </div>
          <div className="space-y-2">
            <p>3. Napolnite kanister (primer: 1 T ciklov):</p>
            <Command>icp canister top-up backend --amount 1t -e ic</Command>
            <Command>icp canister top-up frontend --amount 1t -e ic</Command>
          </div>
          <div className="space-y-2">
            <p>4. Stanje frontend kanistra preverite z:</p>
            <Command>icp canister status frontend -e ic</Command>
          </div>
          <p className="text-muted-foreground">
            Za polnjenje kanistra ne uporabljajte{" "}
            <code>icp cycles transfer</code>: ti cikli ne pridejo na stanje
            kanistra.
          </p>
        </CardContent>
      </Card>

      <Card className="shadow-soft-lg" style={{ borderRadius: "10px" }}>
        <CardHeader>
          <CardTitle>Uporabniki</CardTitle>
          <CardDescription>
            Dostop ima samo, kdor je na seznamu. Seznam lahko ureja le
            upravljavec (controller) kanistra, prek terminala.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <PrincipalDisplay principal={principal} />
          <div className="space-y-2">
            <p>Dodaj uporabnika (principal vam pošlje uporabnik):</p>
            <Command>
              {
                "icp canister call backend addUser '(principal \"PRINCIPAL\")' -e ic"
              }
            </Command>
          </div>
          <div className="space-y-2">
            <p>Odstrani uporabnika:</p>
            <Command>
              {
                "icp canister call backend removeUser '(principal \"PRINCIPAL\")' -e ic"
              }
            </Command>
          </div>
          <div className="space-y-2">
            <p>Seznam uporabnikov:</p>
            <Command>icp canister call backend listUsers '()' -e ic</Command>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
