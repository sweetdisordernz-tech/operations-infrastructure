import { SwitchAppLink } from "@/app/_components/switch-app-link";

export function PortalFooter() {
  return (
    <footer className="sd-portal-footer">
      <img className="sd-portal-footer-brand" src="/sweet-disorder-logo.png" alt="Sweet Disorder" />
      <p className="sd-portal-footer-contact">
        Questions about your order? Contact us at <a href="mailto:[support email]">[support email]</a>
      </p>
      <p className="sd-portal-footer-contact">
        <SwitchAppLink />
      </p>
    </footer>
  );
}
