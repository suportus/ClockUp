import { DayType, type WorkEntry } from "../backend";

const dayTypeLabels: Record<DayType, string> = {
  [DayType.delovniDan]: "Delovni dan",
  [DayType.nedelja]: "Nedelja",
  [DayType.praznik]: "Praznik",
  [DayType.dopust]: "Dopust",
  [DayType.bolniska]: "Bolniška",
  [DayType.prostiDan]: "Prosti dan",
};

interface Summary {
  totalWorkedMinutes: number;
  vacationMinutes: number;
  sundayMinutes: number;
  holidayMinutes: number;
  sickMinutes: number;
  freeDays: number;
  totalAllMinutes: number;
}

const intToDate = (dateInt: number): Date => {
  const y = Math.floor(dateInt / 10000);
  const m = Math.floor((dateInt % 10000) / 100);
  const d = dateInt % 100;
  return new Date(y, m - 1, d);
};

const intToTime = (timeInt: number): string => {
  const hours = Math.floor(timeInt / 100);
  const minutes = timeInt % 100;
  return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
};

const formatDate = (date: Date): string => {
  const day = date.getDate().toString().padStart(2, "0");
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const year = date.getFullYear();
  return `${day}.${month}.${year}`;
};

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

export function generatePDF(
  entries: WorkEntry[],
  summary: Summary,
  monthName: string,
  year: number,
  userName: string,
) {
  const sortedEntries = [...entries].sort(
    (a, b) => Number(a.date) - Number(b.date),
  );

  let html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Delovne ure - ${monthName} ${year}</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      margin: 40px;
      color: #333;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 30px;
    }
    h1 {
      color: #2563eb;
      border-bottom: 3px solid #2563eb;
      padding-bottom: 10px;
      margin: 0;
    }
    .user-name {
      font-size: 1.2em;
      font-weight: bold;
      color: #2563eb;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 30px;
    }
    th, td {
      border: 1px solid #ddd;
      padding: 12px;
      text-align: left;
    }
    th {
      background-color: #2563eb;
      color: white;
      font-weight: bold;
    }
    tr:nth-child(even) {
      background-color: #f9fafb;
    }
    .summary {
      background-color: #f0f9ff;
      border: 2px solid #2563eb;
      border-radius: 8px;
      padding: 20px;
      margin-top: 30px;
    }
    .summary h2 {
      color: #2563eb;
      margin-top: 0;
      margin-bottom: 15px;
    }
    .summary-item {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      border-bottom: 1px solid #dbeafe;
    }
    .summary-item:last-child {
      border-bottom: none;
    }
    .summary-label {
      font-weight: 600;
    }
    .summary-value {
      color: #2563eb;
      font-weight: bold;
    }
    .summary-total {
      display: flex;
      justify-content: space-between;
      padding: 12px;
      margin-top: 15px;
      background-color: #dbeafe;
      border: 2px solid #2563eb;
      border-radius: 6px;
      font-size: 1.1em;
    }
    .summary-total .summary-label {
      font-weight: bold;
      font-size: 1.1em;
    }
    .summary-total .summary-value {
      font-weight: bold;
      font-size: 1.1em;
    }
    .footer {
      margin-top: 40px;
      text-align: center;
      font-size: 0.8em;
      color: #6b7280;
    }
    .footer a {
      color: inherit;
    }
    @media print {
      body {
        margin: 20px;
      }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>Delovne ure - ${monthName} ${year}</h1>
    <div class="user-name">${userName}</div>
  </div>
  
  <table>
    <thead>
      <tr>
        <th>Datum</th>
        <th>Prihod</th>
        <th>Odhod</th>
        <th>Tip dneva</th>
        <th>Opravljene ure</th>
      </tr>
    </thead>
    <tbody>
`;

  for (const entry of sortedEntries) {
    html += `
      <tr>
        <td>${formatDate(intToDate(Number(entry.date)))}</td>
        <td>${intToTime(Number(entry.arrivalTime))}</td>
        <td>${intToTime(Number(entry.departureTime))}</td>
        <td>${dayTypeLabels[entry.dayType]}</td>
        <td>${formatWorkedTime(Number(entry.workedMinutes))}</td>
      </tr>
`;
  }

  html += `
    </tbody>
  </table>

  <div class="summary">
    <h2>Povzetek</h2>
    <div class="summary-item">
      <span class="summary-label">Opravljene ure:</span>
      <span class="summary-value">${formatWorkedTime(summary.totalWorkedMinutes)}</span>
    </div>
    <div class="summary-item">
      <span class="summary-label">Dopust:</span>
      <span class="summary-value">${formatWorkedTime(summary.vacationMinutes)}</span>
    </div>
    <div class="summary-item">
      <span class="summary-label">Nedelja:</span>
      <span class="summary-value">${formatWorkedTime(summary.sundayMinutes)}</span>
    </div>
    <div class="summary-item">
      <span class="summary-label">Praznik:</span>
      <span class="summary-value">${formatWorkedTime(summary.holidayMinutes)}</span>
    </div>
    <div class="summary-item">
      <span class="summary-label">Bolniška:</span>
      <span class="summary-value">${formatWorkedTime(summary.sickMinutes)}</span>
    </div>
    <div class="summary-item">
      <span class="summary-label">Prosti dnevi:</span>
      <span class="summary-value">${summary.freeDays} dni</span>
    </div>
    <div class="summary-total">
      <span class="summary-label">Skupaj vse ure:</span>
      <span class="summary-value">${formatWorkedTime(summary.totalAllMinutes)}</span>
    </div>
  </div>

  <div class="footer">
    © ${new Date().getFullYear()} · Powered by
    <a href="https://internetcomputer.org" target="_blank" rel="noopener noreferrer">Internet Computer</a>
  </div>
</body>
</html>
`;

  // Create a temporary container for the print content
  const printContainer = document.createElement("div");
  printContainer.innerHTML = html;
  printContainer.style.display = "none";
  document.body.appendChild(printContainer);

  // Create a new window for printing
  const printWindow = window.open("", "_blank");
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();

    // Wait for content to load, then trigger print dialog
    printWindow.onload = () => {
      printWindow.print();
    };
  } else {
    // Fallback: use window.print() on current page
    window.print();
  }

  // Clean up
  setTimeout(() => {
    document.body.removeChild(printContainer);
  }, 1000);
}
