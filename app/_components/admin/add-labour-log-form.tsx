"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { INITIAL_ACTION_RESULT, type ActionResult } from "@/lib/action-result";
import { addLabourLogAction } from "@/app/(admin)/admin/(authenticated)/employees/actions";
import type { EmployeeOption } from "@/lib/admin/employees";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="sd-btn sd-btn-primary" disabled={pending}>
      {pending ? "Adding..." : "Add entry"}
    </button>
  );
}

export function AddLabourLogForm({ employees }: { employees: EmployeeOption[] }) {
  const [state, formAction] = useActionState<ActionResult, FormData>(addLabourLogAction, INITIAL_ACTION_RESULT);
  const today = new Date().toISOString().slice(0, 10);

  return (
    <form action={formAction} className="sd-crud-form">
      <div className="sd-crud-grid">
        <div className="sd-field">
          <label htmlFor="employeeId">Employee</label>
          <select id="employeeId" name="employeeId" defaultValue="" required>
            <option value="" disabled>
              Choose an employee
            </option>
            {employees.map((employee) => (
              <option key={employee.id} value={employee.id}>
                {employee.name}
              </option>
            ))}
          </select>
        </div>
        <div className="sd-field">
          <label htmlFor="date">Date</label>
          <input id="date" type="date" name="date" defaultValue={today} required />
        </div>
        <div className="sd-field">
          <label htmlFor="hoursWorked">Hours worked</label>
          <input id="hoursWorked" type="number" name="hoursWorked" min={0.25} max={24} step={0.25} required />
        </div>
        <div className="sd-field">
          <label htmlFor="notes">Notes</label>
          <input id="notes" type="text" name="notes" placeholder="Optional" />
        </div>
      </div>
      <div className="sd-form-actions">
        <SubmitButton />
        {!state.ok && <p className="sd-action-error" style={{ margin: 0 }}>{state.error}</p>}
      </div>
    </form>
  );
}
