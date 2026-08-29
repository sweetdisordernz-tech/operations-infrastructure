import { prisma } from "@/lib/db";
import { AdminValidationError } from "@/lib/admin/errors";

/**
 * Employee productivity (brief Section 9) - EmployeeLabourLog viewing, plus
 * a trivial manual add-entry form. Nothing writes to this table yet (no
 * time-clock UI exists), so this stage is view + manual entry only, not a
 * full time-tracking system.
 */

export type LabourLogRow = {
  id: string;
  employeeId: string;
  employeeName: string;
  date: Date;
  hoursWorked: number;
  notes: string | null;
  orderTaskStage: string | null;
};

export async function getLabourLog(): Promise<LabourLogRow[]> {
  const logs = await prisma.employeeLabourLog.findMany({
    include: { employee: true, orderTask: { select: { stage: true } } },
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
  });

  return logs.map((log) => ({
    id: log.id,
    employeeId: log.employeeId,
    employeeName: log.employee.name,
    date: log.date,
    hoursWorked: log.hoursWorked.toNumber(),
    notes: log.notes,
    orderTaskStage: log.orderTask?.stage ?? null,
  }));
}

export type EmployeeOption = { id: string; name: string };

export async function getActiveEmployees(): Promise<EmployeeOption[]> {
  const employees = await prisma.user.findMany({
    where: { role: "EMPLOYEE", active: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });
  return employees;
}

/** Daily totals per employee - the "per employee per day" view the brief asks for. */
export type DailyTotalRow = { employeeId: string; employeeName: string; date: Date; totalHours: number };

export function summarizeByEmployeeAndDay(logs: LabourLogRow[]): DailyTotalRow[] {
  const totals = new Map<string, DailyTotalRow>();
  for (const log of logs) {
    const dayKey = log.date.toISOString().slice(0, 10);
    const key = `${log.employeeId}:${dayKey}`;
    const existing = totals.get(key);
    if (existing) {
      existing.totalHours += log.hoursWorked;
    } else {
      totals.set(key, { employeeId: log.employeeId, employeeName: log.employeeName, date: log.date, totalHours: log.hoursWorked });
    }
  }
  return [...totals.values()].sort((a, b) => b.date.getTime() - a.date.getTime());
}

export async function addLabourLogEntry(input: {
  employeeId: string;
  date: Date;
  hoursWorked: number;
  notes: string | null;
}): Promise<void> {
  if (!input.employeeId) {
    throw new AdminValidationError("Choose an employee.");
  }
  if (!Number.isFinite(input.hoursWorked) || input.hoursWorked <= 0 || input.hoursWorked > 24) {
    throw new AdminValidationError("Hours worked must be a number between 0 and 24.");
  }
  if (Number.isNaN(input.date.getTime())) {
    throw new AdminValidationError("Enter a valid date.");
  }

  const employee = await prisma.user.findUnique({ where: { id: input.employeeId } });
  if (!employee || employee.role !== "EMPLOYEE") {
    throw new AdminValidationError("That employee no longer exists.");
  }

  await prisma.employeeLabourLog.create({
    data: {
      employeeId: input.employeeId,
      date: input.date,
      hoursWorked: input.hoursWorked,
      notes: input.notes,
    },
  });
}
