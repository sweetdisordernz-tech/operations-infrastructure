/**
 * Uniform return shape for Server Actions bound to a `<form action={...}>`.
 * Actions should catch their own errors and return this instead of
 * throwing - an uncaught throw from a Server Action surfaces as a raw
 * Next.js runtime error page (e.g. double-clicking "Mark all done" on an
 * already-completed task threw an unhandled TaskGatingError). Returning a
 * value instead lets the calling client component (via useActionState)
 * show a small inline message and just... not be broken.
 *
 * Deliberately dependency-free (no imports) - client components that only
 * need the type/initial value (e.g. TaskActionForm) import this file, and
 * must not pull in server-only code (auth, Prisma) by doing so. The actual
 * error-mapping logic lives in lib/to-action-result.ts, imported only by
 * "use server" action files.
 */
export type ActionResult = { ok: true } | { ok: false; error: string };

export const INITIAL_ACTION_RESULT: ActionResult = { ok: true };
