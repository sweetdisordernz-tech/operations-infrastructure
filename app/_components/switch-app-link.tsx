/**
 * The one, single way back to the four-surface picker from inside any
 * surface - used identically in all four (Portal footer, admin/ops
 * topbars, the floor header), not reimplemented per surface. A plain <a>,
 * not next/link: this needs a full page load so middleware.ts sees the
 * request fresh and clears the sd-surface cookie via its /switch-app
 * handling, the same reasoning as every other cross-surface link in this
 * app.
 */
export function SwitchAppLink() {
  return (
    <a href="/switch-app" className="sd-switch-app-link">
      Switch app
    </a>
  );
}
