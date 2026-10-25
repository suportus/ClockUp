import { endOfMonth, format, getDaysInMonth, startOfMonth } from "date-fns";
import { sl } from "date-fns/locale";
import {
  ArrowDown,
  ArrowUp,
  Calendar as CalendarIcon,
  Edit,
  FileText,
  Save,
  Trash2,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { DayType } from "../backend";
import {
  useDeleteEntry,
  useDeleteMonth,
  useGetEntriesForMonth,
  useGetEntry,
  useSaveEntry,
} from "../hooks/useQueries";
import { generatePDF } from "../lib/pdfGenerator";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "./ui/alert-dialog";
import { Button } from "./ui/button";
import { Calendar } from "./ui/calendar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";

const dayTypeLabels: Record<DayType, string> = {
  [DayType.delovniDan]: "Delovni dan",
  [DayType.nedelja]: "Nedelja",
  [DayType.praznik]: "Praznik",
  [DayType.dopust]: "Dopust",
  [DayType.bolniska]: "Bolniška",
  [DayType.prostiDan]: "Prosti dan",
};

const SORT_ORDER_KEY = "clockup-sort-order";

interface WorkHoursLoggerProps {
  userName: string;
}

// Helper function to format minutes into readable display
const formatWorkedTime = (minutes: number): string => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  if (mins === 0) {
    return `${hours} h`;
  }
  if (mins === 30) {
    return `${hours}.5 h`;
  }
  return `${hours} h ${mins} min`;
};

export function WorkHoursLogger({ userName }: WorkHoursLoggerProps) {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [dayType, setDayType] = useState<DayType>(DayType.delovniDan);
  const [arrivalHour, setArrivalHour] = useState<string>("");
  const [arrivalMinute, setArrivalMinute] = useState<string>("00");
  const [departureHour, setDepartureHour] = useState<string>("");
  const [departureMinute, setDepartureMinute] = useState<string>("00");
  const [editingDate, setEditingDate] = useState<number | null>(null);
  const [deleteMonthDialogOpen, setDeleteMonthDialogOpen] = useState(false);
  const [deleteEntryDialogOpen, setDeleteEntryDialogOpen] = useState(false);
  const [entryToDelete, setEntryToDelete] = useState<bigint | null>(null);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [duplicateDialogOpen, setDuplicateDialogOpen] = useState(false);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">(() => {
    const saved = localStorage.getItem(SORT_ORDER_KEY);
    return (saved === "desc" ? "desc" : "asc") as "asc" | "desc";
  });

  const year = selectedDate.getFullYear();
  const month = selectedDate.getMonth() + 1;

  const { data: entries = [], isLoading } = useGetEntriesForMonth(
    BigInt(year),
    BigInt(month),
  );
  const saveEntryMutation = useSaveEntry();
  const deleteEntryMutation = useDeleteEntry();
  const deleteMonthMutation = useDeleteMonth();

  // Persist sort order to localStorage
  useEffect(() => {
    localStorage.setItem(SORT_ORDER_KEY, sortOrder);
  }, [sortOrder]);

  const toggleSortOrder = () => {
    setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
  };

  const dateToInt = (date: Date): number => {
    const y = date.getFullYear();
    const m = date.getMonth() + 1;
    const d = date.getDate();
    return y * 10000 + m * 100 + d;
  };

  const intToDate = (dateInt: number): Date => {
    const y = Math.floor(dateInt / 10000);
    const m = Math.floor((dateInt % 10000) / 100);
    const d = dateInt % 100;
    return new Date(y, m - 1, d);
  };

  const timeToInt = (hour: string, minute: string): number => {
    const h = Number.parseInt(hour) || 0;
    const m = Number.parseInt(minute) || 0;
    return h * 100 + m;
  };

  const intToTime = (timeInt: number): { hour: string; minute: string } => {
    const hours = Math.floor(timeInt / 100);
    const minutes = timeInt % 100;
    return {
      hour: hours.toString(),
      minute: minutes.toString().padStart(2, "0"),
    };
  };

  // Determine if time fields should be disabled based on day type
  const areTimeFieldsDisabled = () => {
    return (
      dayType === DayType.dopust ||
      dayType === DayType.bolniska ||
      dayType === DayType.prostiDan
    );
  };

  // Determine if time fields are required
  const areTimeFieldsRequired = () => {
    return dayType === DayType.delovniDan;
  };

  const handleSaveEntry = async () => {
    const timeFieldsDisabled = areTimeFieldsDisabled();
    const timeFieldsRequired = areTimeFieldsRequired();

    // Validate time fields if they are required
    if (timeFieldsRequired) {
      if (!arrivalHour || !departureHour) {
        toast.error("Prosim izpolnite oba časa");
        return;
      }

      // Use default "00" for minutes if not explicitly set
      const arrivalMin = arrivalMinute || "00";
      const departureMin = departureMinute || "00";

      const arrivalInt = timeToInt(arrivalHour, arrivalMin);
      const departureInt = timeToInt(departureHour, departureMin);

      if (departureInt <= arrivalInt) {
        toast.error("Čas odhoda mora biti po času prihoda");
        return;
      }
    }

    // For optional time fields, use provided values or default to 0
    let arrivalInt = 0;
    let departureInt = 0;

    if (!timeFieldsDisabled && arrivalHour && departureHour) {
      const arrivalMin = arrivalMinute || "00";
      const departureMin = departureMinute || "00";

      arrivalInt = timeToInt(arrivalHour, arrivalMin);
      departureInt = timeToInt(departureHour, departureMin);

      if (departureInt <= arrivalInt) {
        toast.error("Čas odhoda mora biti po času prihoda");
        return;
      }
    }

    const currentDateInt = dateToInt(selectedDate);

    // Check for duplicate date only when adding a new entry
    // OR when editing and the date has changed
    if (!editingDate || (editingDate && editingDate !== currentDateInt)) {
      // Check if the new date already exists in entries
      const existingEntry = entries.find(
        (entry) => Number(entry.date) === currentDateInt,
      );
      if (existingEntry) {
        setDuplicateDialogOpen(true);
        return;
      }
    }

    try {
      await saveEntryMutation.mutateAsync({
        date: BigInt(currentDateInt),
        arrivalTime: BigInt(arrivalInt),
        departureTime: BigInt(departureInt),
        dayType,
      });
      toast.success(editingDate ? "Vnos posodobljen" : "Vnos shranjen");

      // Reset form after successful save
      resetForm();
    } catch (_error) {
      toast.error("Napaka pri shranjevanju vnosa");
    }
  };

  const resetForm = () => {
    setEditingDate(null);
    setArrivalHour("");
    setArrivalMinute("00");
    setDepartureHour("");
    setDepartureMinute("00");
    setDayType(DayType.delovniDan);
  };

  const handleEdit = (entry: (typeof entries)[0]) => {
    setSelectedDate(intToDate(Number(entry.date)));
    const arrival = intToTime(Number(entry.arrivalTime));
    const departure = intToTime(Number(entry.departureTime));
    setArrivalHour(arrival.hour);
    setArrivalMinute(arrival.minute);
    setDepartureHour(departure.hour);
    setDepartureMinute(departure.minute);
    setDayType(entry.dayType);
    setEditingDate(Number(entry.date));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDeleteClick = (date: bigint) => {
    setEntryToDelete(date);
    setDeleteEntryDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!entryToDelete) return;

    try {
      await deleteEntryMutation.mutateAsync(entryToDelete);
      toast.success("Vnos izbrisan");

      // If we were editing this entry, reset the form
      if (editingDate === Number(entryToDelete)) {
        resetForm();
      }

      setDeleteEntryDialogOpen(false);
      setEntryToDelete(null);
    } catch (_error) {
      toast.error("Napaka pri brisanju vnosa");
    }
  };

  const handleDeleteMonth = async () => {
    try {
      await deleteMonthMutation.mutateAsync({
        year: BigInt(year),
        month: BigInt(month),
      });
      toast.success("Mesec izbrisan");
      setDeleteMonthDialogOpen(false);

      // Reset form if we were editing an entry from this month
      if (editingDate) {
        resetForm();
      }
    } catch (_error) {
      toast.error("Napaka pri brisanju meseca");
    }
  };

  const handleCancelEdit = () => {
    resetForm();
    toast.info("Urejanje preklicano");
  };

  const summary = useMemo(() => {
    let totalWorkedMinutes = 0;
    let vacationDays = 0;
    let sundayMinutes = 0;
    let holidayMinutes = 0;
    let sickDays = 0;
    let freeDays = 0;

    for (const entry of entries) {
      const minutes = Number(entry.workedMinutes);

      switch (entry.dayType) {
        case DayType.delovniDan:
          totalWorkedMinutes += minutes;
          break;
        case DayType.nedelja:
          if (minutes > 0) {
            sundayMinutes += minutes;
            totalWorkedMinutes += minutes;
          }
          break;
        case DayType.praznik:
          holidayMinutes += 8 * 60; // 8 hours in minutes
          if (minutes > 0) {
            totalWorkedMinutes += minutes;
          }
          break;
        case DayType.dopust:
          vacationDays += 1;
          break;
        case DayType.bolniska:
          sickDays += 1;
          break;
        case DayType.prostiDan:
          freeDays += 1;
          break;
      }
    }

    const vacationMinutes = vacationDays * 8 * 60; // 8 hours per day in minutes
    const sickMinutes = sickDays * 8 * 60; // 8 hours per day in minutes
    const totalAllMinutes =
      totalWorkedMinutes +
      vacationMinutes +
      sickMinutes +
      holidayMinutes +
      sundayMinutes;

    return {
      totalWorkedMinutes,
      vacationMinutes,
      sundayMinutes,
      holidayMinutes,
      sickMinutes,
      freeDays,
      totalAllMinutes,
    };
  }, [entries]);

  const handleGeneratePDF = () => {
    const monthName = format(selectedDate, "MMMM", { locale: sl });
    generatePDF(entries, summary, monthName, year, userName);
  };

  const sortedEntries = useMemo(() => {
    const sorted = [...entries].sort((a, b) => Number(a.date) - Number(b.date));
    return sortOrder === "desc" ? sorted.reverse() : sorted;
  }, [entries, sortOrder]);

  const formatTimeDisplay = (timeInt: number): string => {
    const hours = Math.floor(timeInt / 100);
    const minutes = timeInt % 100;
    return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
  };

  const handleHourInput = (value: string, setter: (val: string) => void) => {
    // Only allow numeric input
    const numericValue = value.replace(/[^0-9]/g, "");

    // Limit to 2 digits and max 23
    if (numericValue.length <= 2) {
      const num = Number.parseInt(numericValue);
      if (Number.isNaN(num)) {
        setter("");
      } else if (num > 23) {
        setter("23");
      } else {
        setter(numericValue);
      }
    }
  };

  const timeFieldsDisabled = areTimeFieldsDisabled();
  const timeFieldsRequired = areTimeFieldsRequired();

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <Card className="shadow-soft" style={{ borderRadius: "10px" }}>
        <CardHeader>
          <CardTitle className="text-xl">
            {editingDate
              ? "Uredi vnos delovnih ur"
              : "Dodajte nov vnos delovnih ur"}
          </CardTitle>
          {editingDate && (
            <CardDescription>
              Urejate vnos za datum:{" "}
              {format(intToDate(editingDate), "dd. MM. yyyy")}
            </CardDescription>
          )}
        </CardHeader>
        <CardContent className="space-y-3">
          <div
            className="bg-muted/30 p-4 rounded-lg shadow-xs"
            style={{ borderRadius: "10px", marginBottom: "12px" }}
          >
            <div className="flex items-center gap-3">
              <Label className="text-label w-24 shrink-0">Datum</Label>
              <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="flex-1 justify-start text-left rounded-lg bg-white text-gray-900 font-medium"
                  >
                    <CalendarIcon className="mr-2 h-5 w-5" />
                    {format(selectedDate, "dd. MM. yyyy")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  className="w-auto p-0 rounded-lg"
                  align="center"
                  side="bottom"
                >
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={(date) => {
                      if (date) {
                        setSelectedDate(date);
                        setCalendarOpen(false);
                      }
                    }}
                    locale={sl}
                    weekStartsOn={1}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div
            className="bg-muted/30 p-4 rounded-lg shadow-xs"
            style={{ borderRadius: "10px", marginBottom: "12px" }}
          >
            <div className="flex items-center gap-3">
              <Label className="text-label w-24 shrink-0">Tip dneva</Label>
              <Select
                value={dayType}
                onValueChange={(value) => setDayType(value as DayType)}
              >
                <SelectTrigger className="flex-1 rounded-lg bg-white text-gray-900 font-medium">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-lg">
                  {Object.entries(dayTypeLabels).map(([key, label]) => (
                    <SelectItem key={key} value={key}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div
            className="bg-muted/30 p-4 rounded-lg shadow-xs"
            style={{ borderRadius: "10px", marginBottom: "12px" }}
          >
            <div className="flex items-center gap-3">
              <Label className="text-label w-24 shrink-0">
                Prihod{" "}
                {timeFieldsRequired && (
                  <span className="text-destructive">*</span>
                )}
              </Label>
              <div className="flex-1 flex items-center gap-2">
                <Input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={arrivalHour}
                  onChange={(e) =>
                    handleHourInput(e.target.value, setArrivalHour)
                  }
                  placeholder="ura"
                  className="w-20 rounded-lg bg-white text-gray-900 font-medium"
                  disabled={timeFieldsDisabled}
                />
                <span className="text-muted-foreground">:</span>
                <Select
                  value={arrivalMinute}
                  onValueChange={setArrivalMinute}
                  disabled={timeFieldsDisabled}
                >
                  <SelectTrigger className="w-20 rounded-lg bg-white text-gray-900 font-medium">
                    <SelectValue placeholder="min" />
                  </SelectTrigger>
                  <SelectContent className="rounded-lg">
                    <SelectItem value="00">00</SelectItem>
                    <SelectItem value="30">30</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div
            className="bg-muted/30 p-4 rounded-lg shadow-xs"
            style={{ borderRadius: "10px", marginBottom: "12px" }}
          >
            <div className="flex items-center gap-3">
              <Label className="text-label w-24 shrink-0">
                Odhod{" "}
                {timeFieldsRequired && (
                  <span className="text-destructive">*</span>
                )}
              </Label>
              <div className="flex-1 flex items-center gap-2">
                <Input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={departureHour}
                  onChange={(e) =>
                    handleHourInput(e.target.value, setDepartureHour)
                  }
                  placeholder="ura"
                  className="w-20 rounded-lg bg-white text-gray-900 font-medium"
                  disabled={timeFieldsDisabled}
                />
                <span className="text-muted-foreground">:</span>
                <Select
                  value={departureMinute}
                  onValueChange={setDepartureMinute}
                  disabled={timeFieldsDisabled}
                >
                  <SelectTrigger className="w-20 rounded-lg bg-white text-gray-900 font-medium">
                    <SelectValue placeholder="min" />
                  </SelectTrigger>
                  <SelectContent className="rounded-lg">
                    <SelectItem value="00">00</SelectItem>
                    <SelectItem value="30">30</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              onClick={handleSaveEntry}
              disabled={saveEntryMutation.isPending}
              className="flex-1 rounded-lg h-12 transition-all hover:scale-[1.02]"
              size="lg"
            >
              {saveEntryMutation.isPending ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Shranjevanje...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  {editingDate ? "Posodobi vnos" : "Shrani vnos"}
                </>
              )}
            </Button>
            {editingDate && (
              <Button
                onClick={handleCancelEdit}
                variant="outline"
                size="lg"
                className="rounded-lg h-12"
                disabled={saveEntryMutation.isPending}
              >
                Prekliči
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-soft" style={{ borderRadius: "10px" }}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <CardTitle className="text-xl">
                  Vnosi za {format(selectedDate, "MMMM yyyy", { locale: sl })}
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={toggleSortOrder}
                  className="h-8 w-8 p-0 rounded-lg hover:bg-primary/10 transition-colors"
                  title={
                    sortOrder === "asc"
                      ? "Razvrsti padajoče"
                      : "Razvrsti naraščajoče"
                  }
                >
                  {sortOrder === "asc" ? (
                    <ArrowUp className="h-5 w-5 text-primary" />
                  ) : (
                    <ArrowDown className="h-5 w-5 text-primary" />
                  )}
                </Button>
              </div>
              <CardDescription>
                Pregled vseh vnosov za izbrani mesec
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
            </div>
          ) : sortedEntries.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Ni vnosov za ta mesec
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Datum</TableHead>
                    <TableHead>Prihod</TableHead>
                    <TableHead>Odhod</TableHead>
                    <TableHead>Tip dneva</TableHead>
                    <TableHead>Opravljene ure</TableHead>
                    <TableHead className="text-right">Akcije</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedEntries.map((entry) => {
                    const isCurrentlyEditing =
                      editingDate === Number(entry.date);
                    return (
                      <TableRow
                        key={Number(entry.date)}
                        className={isCurrentlyEditing ? "bg-primary/5" : ""}
                      >
                        <TableCell>
                          {format(
                            intToDate(Number(entry.date)),
                            "dd. MM. yyyy",
                          )}
                        </TableCell>
                        <TableCell>
                          {formatTimeDisplay(Number(entry.arrivalTime))}
                        </TableCell>
                        <TableCell>
                          {formatTimeDisplay(Number(entry.departureTime))}
                        </TableCell>
                        <TableCell>{dayTypeLabels[entry.dayType]}</TableCell>
                        <TableCell>
                          {formatWorkedTime(Number(entry.workedMinutes))}
                        </TableCell>
                        <TableCell className="text-right space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(entry)}
                            disabled={isCurrentlyEditing}
                            className="rounded-lg"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteClick(entry.date)}
                            disabled={deleteEntryMutation.isPending}
                            className="rounded-lg"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="shadow-soft" style={{ borderRadius: "10px" }}>
        <CardHeader>
          <CardTitle className="text-xl">Povzetek</CardTitle>
          <CardDescription>Mesečni pregled ur in dni</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex justify-between p-3 bg-muted/40 rounded-lg">
              <span className="font-medium">Opravljene ure:</span>
              <span className="font-bold text-primary">
                {formatWorkedTime(summary.totalWorkedMinutes)}
              </span>
            </div>
            <div className="flex justify-between p-3 bg-muted/40 rounded-lg">
              <span className="font-medium">Dopust:</span>
              <span className="font-bold">
                {formatWorkedTime(summary.vacationMinutes)}
              </span>
            </div>
            <div className="flex justify-between p-3 bg-muted/40 rounded-lg">
              <span className="font-medium">Nedelja:</span>
              <span className="font-bold">
                {formatWorkedTime(summary.sundayMinutes)}
              </span>
            </div>
            <div className="flex justify-between p-3 bg-muted/40 rounded-lg">
              <span className="font-medium">Praznik:</span>
              <span className="font-bold">
                {formatWorkedTime(summary.holidayMinutes)}
              </span>
            </div>
            <div className="flex justify-between p-3 bg-muted/40 rounded-lg">
              <span className="font-medium">Bolniška:</span>
              <span className="font-bold">
                {formatWorkedTime(summary.sickMinutes)}
              </span>
            </div>
            <div className="flex justify-between p-3 bg-muted/40 rounded-lg">
              <span className="font-medium">Prosti dnevi:</span>
              <span className="font-bold">{summary.freeDays} dni</span>
            </div>
          </div>

          <div className="flex justify-between p-4 bg-primary/10 rounded-lg border-2 border-primary mt-4">
            <span className="font-bold text-lg">Skupaj vse ure:</span>
            <span className="font-bold text-lg text-primary">
              {formatWorkedTime(summary.totalAllMinutes)}
            </span>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <Button
              onClick={handleGeneratePDF}
              variant="default"
              className="flex-1 rounded-lg h-12 transition-all hover:scale-[1.02]"
              disabled={sortedEntries.length === 0}
            >
              <FileText className="mr-2 h-4 w-4" />
              Ustvari PDF
            </Button>
            <Button
              onClick={() => setDeleteMonthDialogOpen(true)}
              variant="outline"
              className="flex-1 rounded-lg h-12 border-destructive/30 text-destructive hover:bg-destructive/10"
              disabled={sortedEntries.length === 0}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Izbriši mesec
            </Button>
          </div>
        </CardContent>
      </Card>

      <AlertDialog
        open={deleteMonthDialogOpen}
        onOpenChange={setDeleteMonthDialogOpen}
      >
        <AlertDialogContent className="rounded-lg shadow-soft-lg">
          <AlertDialogHeader>
            <AlertDialogTitle>Ste prepričani?</AlertDialogTitle>
            <AlertDialogDescription>
              To bo izbrisalo vse vnose za{" "}
              {format(selectedDate, "MMMM yyyy", { locale: sl })}. Tega dejanja
              ni mogoče razveljaviti.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-lg">
              Prekliči
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteMonth}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-lg"
            >
              Izbriši
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={deleteEntryDialogOpen}
        onOpenChange={setDeleteEntryDialogOpen}
      >
        <AlertDialogContent className="rounded-lg shadow-soft-lg">
          <AlertDialogHeader className="text-center">
            <AlertDialogDescription className="text-center text-base">
              Ali ste prepričani, da želite izbrisati ta vnos?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="!flex-row !justify-center gap-3 sm:!flex-row sm:!justify-center sm:!space-x-0">
            <AlertDialogCancel
              onClick={() => {
                setDeleteEntryDialogOpen(false);
                setEntryToDelete(null);
              }}
              className="rounded-lg mt-0"
            >
              Prekliči
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-lg mt-0"
            >
              Izbriši
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={duplicateDialogOpen}
        onOpenChange={setDuplicateDialogOpen}
      >
        <AlertDialogContent className="rounded-lg shadow-soft-lg">
          <AlertDialogHeader>
            <AlertDialogDescription className="text-center text-base">
              Ta datum je že vpisan. Uredi ali izbriši prejšnji vnos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex justify-center sm:justify-center">
            <AlertDialogAction
              onClick={() => setDuplicateDialogOpen(false)}
              className="rounded-lg"
            >
              V redu
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
