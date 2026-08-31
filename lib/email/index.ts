import { prisma } from "@/lib/db";

/**
 * Transactional email via Brevo's HTTP API (plain fetch, no SDK - brief
 * Section 6.4). Every function here is designed to NEVER throw: an order,
 * a stage completion, or a compliance edit must always succeed even if the
 * email fails to send. Missing config or a failed API call falls back to
 * the original console-log behaviour and writes a FAILURE row to
 * IntegrationSyncLog (integration: BREVO) so the failure is visible in
 * Master Connect's integration health page, instead of silently vanishing.
 */

const BREVO_API_URL = "https://api.brevo.com/v3/smtp/email";
const SENDER_NAME = "Sweet Disorder";

type SendEmailInput = {
  to: string;
  subject: string;
  text: string;
  /** Base64-encoded file content, for the Xero CSV export. */
  attachment?: { name: string; contentBase64: string };
};

function consoleLogFallback(to: string, subject: string, text: string): void {
  console.log(
    `\n--- [email:not-sent] ---\nTo: ${to}\nSubject: ${subject}\n\n${text}\n---------------------------------\n`,
  );
}

async function logBrevoFailure(errorMessage: string, to: string, subject: string): Promise<void> {
  try {
    await prisma.integrationSyncLog.create({
      data: {
        integration: "BREVO",
        direction: "OUTBOUND",
        status: "FAILURE",
        payloadSummary: `To: ${to} | Subject: ${subject}`,
        errorMessage: errorMessage.slice(0, 1000),
      },
    });
  } catch (err) {
    // Logging the failure failed too (e.g. DB unreachable) - console is the
    // last resort, but this must still never throw into the caller.
    console.error("Failed to write IntegrationSyncLog for a Brevo failure:", err);
  }
}

export async function sendEmail({ to, subject, text, attachment }: SendEmailInput): Promise<void> {
  const apiKey = process.env.BREVO_API_KEY;
  const senderEmail = process.env.BREVO_SENDER_EMAIL;

  if (!apiKey || !senderEmail) {
    consoleLogFallback(to, subject, text);
    await logBrevoFailure("BREVO_API_KEY or BREVO_SENDER_EMAIL is not set - email not sent", to, subject);
    return;
  }

  try {
    const response = await fetch(BREVO_API_URL, {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
        "api-key": apiKey,
      },
      body: JSON.stringify({
        sender: { email: senderEmail, name: SENDER_NAME },
        to: [{ email: to }],
        subject,
        textContent: text,
        ...(attachment
          ? { attachment: [{ name: attachment.name, content: attachment.contentBase64 }] }
          : {}),
      }),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      consoleLogFallback(to, subject, text);
      await logBrevoFailure(`Brevo API returned ${response.status}: ${body.slice(0, 500)}`, to, subject);
      return;
    }
  } catch (err) {
    consoleLogFallback(to, subject, text);
    await logBrevoFailure(err instanceof Error ? err.message : "Unknown error calling Brevo", to, subject);
  }
}

export function sendMagicLinkEmail(to: string, magicLinkUrl: string) {
  return sendEmail({
    to,
    subject: "Your Sweet Disorder sign-in link",
    text: `Click to sign in: ${magicLinkUrl}\n\nThis link expires in 15 minutes. If you didn't request this, you can ignore it.`,
  });
}

export function sendOrderConfirmationEmail(
  to: string,
  contactName: string,
  orders: Array<{ orderNumber: string; region: string; currency: string; totalAmount: number }>,
) {
  const lines = orders.map(
    (order) => `  Order ${order.orderNumber} (${order.region}): ${order.currency} ${order.totalAmount.toFixed(2)}`,
  );
  return sendEmail({
    to,
    subject:
      orders.length > 1 ? "Your Sweet Disorder orders are confirmed" : `Order confirmed - ${orders[0].orderNumber}`,
    text: `Hi ${contactName},\n\nThanks for your order! Here's what we've got:\n\n${lines.join("\n")}\n\nWe'll be in touch with an invoice shortly.\n\n- Sweet Disorder`,
  });
}

export function sendDispatchConfirmationEmail(
  to: string,
  contactName: string,
  order: { orderNumber: string; region: string; currency: string; totalAmount: number },
) {
  return sendEmail({
    to,
    subject: `Order ${order.orderNumber} has been dispatched`,
    text: `Hi ${contactName},\n\nYour order ${order.orderNumber} (${order.region}, ${order.currency} ${order.totalAmount.toFixed(2)}) has just been dispatched.\n\nThanks for your business!\n\n- Sweet Disorder`,
  });
}

export type ReorderAlertProductItem = { name: string; sku: string | null; quantityOnHand: number; reorderThreshold: number };
export type ReorderAlertFillingItem = { name: string; quantityOnHand: number; reorderThreshold: number };

export function sendLowStockAlertEmail(
  to: string,
  products: ReorderAlertProductItem[],
  fillings: ReorderAlertFillingItem[],
) {
  const productLines = products.map(
    (p) => `  - ${p.name} (${p.sku ?? "no SKU yet"}): ${p.quantityOnHand} on hand, reorder threshold ${p.reorderThreshold}`,
  );
  const fillingLines = fillings.map(
    (f) => `  - ${f.name}: ${f.quantityOnHand} on hand, reorder threshold ${f.reorderThreshold}`,
  );

  const sections = [
    products.length > 0 ? `Products:\n${productLines.join("\n")}` : null,
    fillings.length > 0 ? `Fillings:\n${fillingLines.join("\n")}` : null,
  ].filter((s): s is string => s !== null);

  return sendEmail({
    to,
    subject: "Sweet Disorder: stock needs reordering",
    text: `Hi,\n\nAn order just took the following at or below their reorder threshold:\n\n${sections.join("\n\n")}\n\nCheck Master Connect's Inventory & Filling page for the full picture.\n\n- Sweet Disorder Ops`,
  });
}

export function sendLabelComplianceAlertEmail(
  to: string,
  record: { sku: string | null; productName: string; whatsWrong: string; labelsInStock: number | null },
) {
  return sendEmail({
    to,
    subject: `Top priority: label compliance issue on ${record.productName}`,
    text: `Hi,\n\n${record.productName} (${record.sku ?? "no SKU yet"}) has just been flagged TOP_PRIORITY_URGENT for label compliance.\n\nWhat's wrong: ${record.whatsWrong}\nLabels currently in stock: ${record.labelsInStock ?? "unknown"}\n\nCheck Master Connect's Label Compliance page for full details.\n\n- Sweet Disorder Ops`,
  });
}

export function sendXeroExportEmail(to: string, orderNumber: string, csvBase64: string) {
  return sendEmail({
    to,
    subject: `Xero export - order ${orderNumber}`,
    text: `Hi,\n\nAttached is the Xero-format sales invoice CSV for order ${orderNumber}, ready to import via Xero's bulk-import Sales Invoices flow.\n\nAccount code (200) and tax type (15% GST on Income for NZ orders, Zero Rated for AU orders) are unverified placeholders - please confirm all three against the real chart of accounts before relying on them.\n\n- Sweet Disorder Ops`,
    attachment: { name: `${orderNumber}.csv`, contentBase64: csvBase64 },
  });
}
