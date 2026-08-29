import { requireAdminPageUser } from "@/lib/admin/require-page-user";
import { getLabourLog, getActiveEmployees, summarizeByEmployeeAndDay } from "@/lib/admin/employees";
import { AddLabourLogForm } from "@/app/_components/admin/add-labour-log-form";

export default async function EmployeesPage() {
  await requireAdminPageUser();

  const [logs, employees] = await Promise.all([getLabourLog(), getActiveEmployees()]);
  const dailyTotals = summarizeByEmployeeAndDay(logs);

  return (
    <>
      <div className="sd-admin-header">
        <div>
          <h1 className="sd-page-title">Employee Productivity</h1>
          <p>Logged labour hours per employee per day.</p>
        </div>
      </div>

      <div className="sd-panel">
        <div className="sd-panel-header">
          <h2 className="sd-section-heading">Log an entry</h2>
        </div>
        <AddLabourLogForm employees={employees} />
      </div>

      <div className="sd-panel">
        <div className="sd-panel-header">
          <h2 className="sd-section-heading">Daily totals</h2>
        </div>
        {dailyTotals.length === 0 ? (
          <p className="sd-empty-state">No labour logged yet.</p>
        ) : (
          <div className="sd-table-wrap">
            <table className="sd-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Employee</th>
                  <th>Total hours</th>
                </tr>
              </thead>
              <tbody>
                {dailyTotals.map((row) => (
                  <tr key={`${row.employeeId}:${row.date.toISOString()}`}>
                    <td>{row.date.toLocaleDateString("en-NZ", { day: "numeric", month: "short", year: "numeric" })}</td>
                    <td className="sd-table-name">{row.employeeName}</td>
                    <td>{row.totalHours.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="sd-panel">
        <div className="sd-panel-header">
          <h2 className="sd-section-heading">All entries</h2>
        </div>
        {logs.length === 0 ? (
          <p className="sd-empty-state">No labour logged yet.</p>
        ) : (
          <div className="sd-table-wrap">
            <table className="sd-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Employee</th>
                  <th>Hours</th>
                  <th>Task stage</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id}>
                    <td>{log.date.toLocaleDateString("en-NZ", { day: "numeric", month: "short", year: "numeric" })}</td>
                    <td className="sd-table-name">{log.employeeName}</td>
                    <td>{log.hoursWorked.toFixed(2)}</td>
                    <td>{log.orderTaskStage ?? "-"}</td>
                    <td className="sd-table-sub">{log.notes ?? "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
