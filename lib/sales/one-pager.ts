import { put } from "@vercel/blob";
import { prisma } from "@/lib/db";
import { AdminValidationError } from "@/lib/admin/errors";

/**
 * The business's static corporate one-pager (brief Section 10.6) - hosted
 * in Vercel Blob, a single well-known row rather than a general asset
 * library. Nothing else in this platform generates or edits this file;
 * it's just hosted and linked.
 */

const SINGLETON_ID = "singleton";

export async function getOnePagerUrl(): Promise<string | null> {
  const row = await prisma.corporateOnePager.findUnique({ where: { id: SINGLETON_ID } });
  return row?.blobUrl ?? null;
}

export async function uploadOnePager(file: File): Promise<string> {
  if (file.size === 0) {
    throw new AdminValidationError("Choose a file to upload.");
  }
  if (file.type !== "application/pdf") {
    throw new AdminValidationError("The one-pager must be a PDF.");
  }

  const blob = await put(`corporate/one-pager-${Date.now()}.pdf`, file, { access: "public" });

  await prisma.corporateOnePager.upsert({
    where: { id: SINGLETON_ID },
    update: { blobUrl: blob.url },
    create: { id: SINGLETON_ID, blobUrl: blob.url },
  });

  return blob.url;
}
