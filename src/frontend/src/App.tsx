import { ThemeProvider } from "next-themes";
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

export default function App() {
  const { identity, login, clear, isInitializing, isLoggingIn } =
    useInternetIdentity();
  const { data: userName, isLoading: isLoadingUserName } = useGetUserName(
    !!identity,
  );

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
          <div className="container mx-auto px-4 py-4 flex justify-between items-center">
            <div className="flex items-center gap-4">
              <img
                src="https://nar7q-4iaaa-aaaao-qksbq-cai.raw.icp0.io///Caffeine/pictures/logo.png"
                alt="ClockUp"
                style={{ height: "32px", width: "auto" }}
              />
              <h1 className="text-2xl font-bold text-primary">ClockUp</h1>
              <UserNameDisplay userName={userName} />
            </div>
            <Button onClick={clear} variant="outline" className="rounded-lg">
              Odjava
            </Button>
          </div>
        </header>
        <main className="container mx-auto px-4 py-6">
          <WorkHoursLogger userName={userName} />
        </main>
        <footer className="border-t bg-white mt-12">
          <div className="container mx-auto px-4 py-6 text-center text-sm text-muted-foreground">
            © 2025. Built with love using{" "}
            <a
              href="https://caffeine.ai"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              caffeine.ai
            </a>
          </div>
        </footer>
        <Toaster />
      </div>
    </ThemeProvider>
  );
}
