import { ThemeProvider } from "next-themes";
import { useState } from "react";
import { AdminPage } from "./components/AdminPage";
import { PrincipalDisplay } from "./components/PrincipalDisplay";
import { UserNameDisplay } from "./components/UserNameDisplay";
import { UserNamePrompt } from "./components/UserNamePrompt";
import { WorkHoursLogger } from "./components/WorkHoursLogger";
import { Button } from "./components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./components/ui/card";
import { Toaster } from "./components/ui/sonner";
import { useInternetIdentity } from "./hooks/useInternetIdentity";
import { useGetUserName } from "./hooks/useQueries";
import { isAccessDenied } from "./lib/canisterEnv";

export default function App() {
  const { identity, login, clear, isInitializing, isLoggingIn, loginError } =
    useInternetIdentity();
  const {
    data: userName,
    isLoading: isLoadingUserName,
    error: userNameError,
  } = useGetUserName(!!identity);
  const [showAdmin, setShowAdmin] = useState(false);
  const principal = identity?.getPrincipal().toText() ?? "";

  if (isInitializing) {
    return (
      <ThemeProvider
        attribute="class"
        defaultTheme="light"
        forcedTheme="light"
        enableSystem={false}
      >
        <div
          className="min-h-screen flex items-center justify-center"
          style={{ backgroundColor: "#f9f9f9" }}
        >
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
            <p className="text-muted-foreground">Nalaganje...</p>
          </div>
        </div>
      </ThemeProvider>
    );
  }

  if (!identity) {
    return (
      <ThemeProvider
        attribute="class"
        defaultTheme="light"
        forcedTheme="light"
        enableSystem={false}
      >
        <div
          className="min-h-screen flex items-center justify-center p-4"
          style={{ backgroundColor: "#f9f9f9" }}
        >
          <Card
            className="w-full max-w-md shadow-soft-lg"
            style={{ borderRadius: "10px" }}
          >
            <CardHeader className="text-center space-y-2">
              <CardTitle className="text-3xl font-bold">ClockUp</CardTitle>
              <CardDescription className="text-base">
                Prijavite se za dostop do vaših delovnih ur
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button
                onClick={login}
                disabled={isLoggingIn}
                className="w-full h-12 text-base rounded-lg transition-all hover:scale-[1.02]"
                size="lg"
              >
                {isLoggingIn ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    Prijavljanje...
                  </>
                ) : (
                  "Prijava"
                )}
              </Button>
              {loginError && (
                <p className="text-sm text-destructive text-center break-words">
                  Prijava ni uspela: {loginError.message}
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </ThemeProvider>
    );
  }

  // Show loading while checking for user name
  if (isLoadingUserName) {
    return (
      <ThemeProvider
        attribute="class"
        defaultTheme="light"
        forcedTheme="light"
        enableSystem={false}
      >
        <div
          className="min-h-screen flex items-center justify-center"
          style={{ backgroundColor: "#f9f9f9" }}
        >
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
            <p className="text-muted-foreground">Nalaganje...</p>
          </div>
        </div>
      </ThemeProvider>
    );
  }

  // Not on the allow-list (or backend unreachable): show the principal so
  // the user can send it to the administrator.
  if (userNameError) {
    const denied = isAccessDenied(userNameError);
    return (
      <ThemeProvider
        attribute="class"
        defaultTheme="light"
        forcedTheme="light"
        enableSystem={false}
      >
        <div
          className="min-h-screen flex items-center justify-center p-4"
          style={{ backgroundColor: "#f9f9f9" }}
        >
          <Card
            className="w-full max-w-md shadow-soft-lg"
            style={{ borderRadius: "10px" }}
          >
            <CardHeader className="text-center space-y-2">
              <CardTitle className="text-2xl font-bold">
                {denied ? "Dostop zavrnjen" : "Napaka pri povezavi"}
              </CardTitle>
              <CardDescription className="text-base">
                {denied
                  ? "Vaš račun še nima dostopa. Spodnji principal pošljite skrbniku, da vas doda."
                  : "Povezava z zaledjem ni uspela. Poskusite znova pozneje."}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <PrincipalDisplay principal={principal} />
              <Button
                onClick={clear}
                variant="outline"
                className="w-full rounded-lg"
              >
                Odjava
              </Button>
            </CardContent>
          </Card>
        </div>
        <Toaster />
      </ThemeProvider>
    );
  }

  // Show name prompt if user doesn't have a name set
  if (!userName) {
    return (
      <ThemeProvider
        attribute="class"
        defaultTheme="light"
        forcedTheme="light"
        enableSystem={false}
      >
        <UserNamePrompt />
        <Toaster />
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="light"
      forcedTheme="light"
      enableSystem={false}
    >
      <div className="min-h-screen" style={{ backgroundColor: "#f9f9f9" }}>
        <header className="border-b bg-white sticky top-0 z-10 shadow-xs">
          <div className="container mx-auto px-4 py-4 flex flex-wrap justify-between items-center gap-2">
            <div className="flex items-center gap-4">
              <img
                src="/assets/logo.png"
                alt="ClockUp"
                style={{ height: "32px", width: "auto" }}
              />
              <h1 className="text-2xl font-bold text-primary">ClockUp</h1>
              <UserNameDisplay userName={userName} />
            </div>
            <div className="flex items-center gap-2">
              <Button
                onClick={() => setShowAdmin(true)}
                variant="outline"
                className="rounded-lg"
              >
                Admin
              </Button>
              <Button onClick={clear} variant="outline" className="rounded-lg">
                Odjava
              </Button>
            </div>
          </div>
        </header>
        <main className="container mx-auto px-4 py-6">
          {showAdmin ? (
            <AdminPage
              principal={principal}
              onBack={() => setShowAdmin(false)}
            />
          ) : (
            <WorkHoursLogger userName={userName} />
          )}
        </main>
        <footer
          className="px-4 pt-6 text-center text-xs text-muted-foreground"
          style={{ paddingBottom: "max(1.5rem, env(safe-area-inset-bottom))" }}
        >
          © {new Date().getFullYear()} · Powered by{" "}
          <a
            href="https://internetcomputer.org"
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2 hover:text-foreground"
          >
            Internet Computer
          </a>
        </footer>
        <Toaster />
      </div>
    </ThemeProvider>
  );
}
