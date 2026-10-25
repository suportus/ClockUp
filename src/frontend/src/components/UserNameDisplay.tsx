import { Edit } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useSetUserName } from "../hooks/useQueries";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
import { Input } from "./ui/input";
import { Label } from "./ui/label";

interface UserNameDisplayProps {
  userName: string;
}

export function UserNameDisplay({ userName }: UserNameDisplayProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [newName, setNewName] = useState(userName);
  const setUserNameMutation = useSetUserName();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newName.trim()) {
      toast.error("Prosim vnesite svoje ime");
      return;
    }

    try {
      await setUserNameMutation.mutateAsync(newName.trim());
      toast.success("Ime posodobljeno");
      setIsOpen(false);
    } catch (_error) {
      toast.error("Napaka pri posodabljanju imena");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" className="flex items-center gap-2 rounded-lg">
          <span className="font-semibold">{userName}</span>
          <Edit className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="rounded-lg shadow-soft-lg">
        <DialogHeader>
          <DialogTitle>Uredi ime</DialogTitle>
          <DialogDescription>Spremenite svoje ime in priimek</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name" className="text-label">
                Ime in priimek
              </Label>
              <Input
                id="edit-name"
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Vnesite svoje ime"
                className="rounded-lg text-input"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setNewName(userName);
                setIsOpen(false);
              }}
              className="rounded-lg"
            >
              Prekliči
            </Button>
            <Button
              type="submit"
              disabled={setUserNameMutation.isPending}
              className="rounded-lg"
            >
              {setUserNameMutation.isPending ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Shranjevanje...
                </>
              ) : (
                "Shrani"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
