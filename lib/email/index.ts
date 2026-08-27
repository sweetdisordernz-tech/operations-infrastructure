/**
 * Transactional email. Brevo integration lands in a later stage - for now
 * every "send" just logs to the console so magic-link auth is testable
 * end-to-end without real email delivery.
 */

type SendEmailInput = {
  to: string;
  subject: string;
  text: string;
};

export async function sendEmail({ to, subject, text }: SendEmailInput): Promise<void> {
  // TODO(stage: Brevo integration): call the Brevo transactional email API
  // here using BREVO_API_KEY / BREVO_SENDER_EMAIL from lib/integrations.
  console.log(
    `\n--- [email:not-yet-wired-up] ---\nTo: ${to}\nSubject: ${subject}\n\n${text}\n---------------------------------\n`,
  );
}

export function sendMagicLinkEmail(to: string, magicLinkUrl: string) {
  return sendEmail({
    to,
    subject: "Your Sweet Disorder sign-in link",
    text: `Click to sign in: ${magicLinkUrl}\n\nThis link expires in 15 minutes. If you didn't request this, you can ignore it.`,
  });
}
