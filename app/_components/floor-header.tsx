import { SwitchAppLink } from "@/app/_components/switch-app-link";

/**
 * Shared by the station picker and all three task screens - previously
 * each page hand-duplicated this markup with only the heading text
 * differing. Centralizing it here is also what makes "Switch app" show up
 * on every floor screen from one place instead of four.
 */
export function FloorHeader({ title }: { title: string }) {
  return (
    <div className="sd-floor-header">
      <div className="sd-floor-header-top">
        <img className="sd-floor-logo" src="/sweet-disorder-logo.png" alt="Sweet Disorder" />
        <SwitchAppLink />
      </div>
      <h1>{title}</h1>
    </div>
  );
}
