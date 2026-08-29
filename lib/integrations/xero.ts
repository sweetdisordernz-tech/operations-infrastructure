import { put } from "@vercel/blob";
import { prisma } from "@/lib/db";
import { sendXeroExportEmail } from "@/lib/email";
import type { CreatedOrder } from "@/lib/orders/create-order";

/**
 * Xero-format order export (brief Section 6.2). The business's actual
 * process today is "email a spreadsheet to Molly" rather than a live Xero
 * API integration - this generates that spreadsheet in Xero's own
 * "Sales Invoices" bulk-import CSV column format on every order creation,
 * stores a copy in Vercel Blob as the audit trail, and emails it to the
 * OWNER_ADMIN user(s) as the actual delivery mechanism.
 *
 * AccountCode "200" and TaxType "15% GST on Income" are NZ-standard
 * placeholders, NOT a verified match to the business's real Xero chart of
 * accounts - flagged again in the email body, and worth double-checking
 * before anyone relies on the export for real bookkeeping. AU-region
 * orders in particular likely need a different (zero-rated/GST-free) tax
 * type once that's confirmed - this stage applies the same placeholder to
 * every order rather than guessing a second value.
 */

const XERO_CSV_HEADER =
  "*ContactName,EmailAddress,*InvoiceNumber,*InvoiceDate,*DueDate,InventoryItemCode,Description,*Quantity,*UnitAmount,*AccountCode,*TaxType,Currency";

const ACCOUNT_CODE = "200";
const TAX_TYPE = "15% GST on Income";
const DUE_DAYS_AFTER_INVOICE = 14;

function csvField(value: string | number): string {
  const str = String(value);
  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

type XeroLineItem = {
  sku: string | null;
  description: string;
  quantity: number;
  unitAmount: number;
};

export function generateXeroInvoiceCsv(params: {
  contactName: string;
  email: string;
  invoiceNumber: string;
  invoiceDate: Date;
  dueDate: Date;
  currency: string;
  lineItems: XeroLineItem[];
}): string {
  const rows = params.lineItems.map((item) =>
    [
      csvField(params.contactName),
      csvField(params.email),
      csvField(params.invoiceNumber),
      csvField(formatDate(params.invoiceDate)),
      csvField(formatDate(params.dueDate)),
      csvField(item.sku ?? ""),
      csvField(item.description),
      csvField(item.quantity),
      csvField(item.unitAmount.toFixed(2)),
      csvField(ACCOUNT_CODE),
      csvField(TAX_TYPE),
      csvField(params.currency),
    ].join(","),
  );

  return [XERO_CSV_HEADER, ...rows].join("\n");
}

async function logXeroFailure(errorMessage: string, orderNumber: string): Promise<void> {
  try {
    await prisma.integrationSyncLog.create({
      data: {
        integration: "XERO",
        direction: "OUTBOUND",
        status: "FAILURE",
        payloadSummary: `Order ${orderNumber}`,
        errorMessage: errorMessage.slice(0, 1000),
      },
    });
  } catch (err) {
    console.error("Failed to write IntegrationSyncLog for a Xero export failure:", err);
  }
}

/** Uploads the CSV to Vercel Blob for a persistent record. Never throws - returns null and logs on any failure (missing token, network, etc). */
async function uploadXeroCsvToBlob(orderNumber: string, csv: string): Promise<string | null> {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    await logXeroFailure("BLOB_READ_WRITE_TOKEN is not set - Xero CSV not stored in Blob", orderNumber);
    return null;
  }

  try {
    const blob = await put(`xero-exports/${orderNumber}.csv`, csv, {
      access: "public",
      contentType: "text/csv",
    });
    return blob.url;
  } catch (err) {
    await logXeroFailure(err instanceof Error ? err.message : "Unknown error uploading to Vercel Blob", orderNumber);
    return null;
  }
}

/**
 * Generates the CSV, stores it in Blob (best-effort), and emails it to
 * every active OWNER_ADMIN user. Designed to never throw - a failure at
 * any step (missing product data, Blob, or email) is logged/console'd but
 * never blocks the order that triggered it.
 */
export async function exportOrderToXero(order: CreatedOrder): Promise<void> {
  try {
    const productIds = [...new Set(order.lineItems.map((li) => li.productId))];
    const products = await prisma.product.findMany({ where: { id: { in: productIds } } });
    const productById = new Map(products.map((p) => [p.id, p]));

    const customer = order.wholesaleCustomerId
      ? await prisma.wholesaleCustomer.findUnique({ where: { id: order.wholesaleCustomerId } })
      : null;

    const contactName = customer?.companyName ?? `Shopify order ${order.orderNumber}`;
    const email = customer?.email ?? "";

    const dueDate = new Date(order.placedAt);
    dueDate.setDate(dueDate.getDate() + DUE_DAYS_AFTER_INVOICE);

    const csv = generateXeroInvoiceCsv({
      contactName,
      email,
      invoiceNumber: order.orderNumber,
      invoiceDate: order.placedAt,
      dueDate,
      currency: order.currency,
      lineItems: order.lineItems.map((li) => {
        const product = productById.get(li.productId);
        return {
          sku: product?.sku ?? null,
          description: product?.name ?? "Unknown product",
          quantity: li.quantity,
          unitAmount: Number(li.unitPrice),
        };
      }),
    });

    await uploadXeroCsvToBlob(order.orderNumber, csv);

    const admins = await prisma.user.findMany({ where: { role: "OWNER_ADMIN", active: true } });
    const csvBase64 = Buffer.from(csv, "utf8").toString("base64");
    for (const admin of admins) {
      await sendXeroExportEmail(admin.email, order.orderNumber, csvBase64);
    }
  } catch (err) {
    console.error(`Xero export failed for order ${order.orderNumber}:`, err);
    await logXeroFailure(err instanceof Error ? err.message : "Unknown error", order.orderNumber);
  }
}
