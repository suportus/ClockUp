import { useState } from "react";
import { toast } from "sonner";
import { useSetUserName } from "../hooks/useQueries";
import { Button } from "./ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Input } from "./ui/input";
import { Label } from "./ui/label";

export function UserNamePrompt() {
  const [name, setName] = useState("");
  const setUserNameMutation = useSetUserName();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error("Prosim vnesite svoje ime");
      return;
    }

    try {
      await setUserNameMutation.mutateAsync(name.trim());
      toast.success("Ime shranjeno");
    } catch (_error) {
      toast.error("Napaka pri shranjevanju imena");
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ backgroundColor: "#f9f9f9" }}
    >
      <Card
        className="w-full max-w-md shadow-soft-lg"
        style={{ borderRadius: "10px" }}
      >
        <CardHeader className="text-center space-y-2">
          <CardTitle className="text-3xl font-bold">
            Dobrodošli v ClockUp
          </CardTitle>
          <CardDescription className="text-base">
            Prosim vnesite svoje ime za nadaljevanje
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-label">
                Ime in priimek
              </Label>
              <Input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Vnesite svoje ime"
                className="rounded-lg text-input"
                autoFocus
              />
            </div>
            <Button
              type="submit"
              disabled={setUserNameMutation.isPending}
              className="w-full h-12 text-base rounded-lg transition-all hover:scale-[1.02]"
              size="lg"
            >
              {setUserNameMutation.isPending ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Shranjevanje...
                </>
              ) : (
                "Nadaljuj"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
