"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import { documents } from "@/db/schema";
import {
  deleteDocument,
  documentKey,
  hashContent,
  presignDownload,
  putDocument,
} from "@/lib/storage";
import type { ActionState } from "@/lib/validation";

const MAX_BYTES = 10 * 1024 * 1024;

const ALLOWED_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
  "text/markdown",
]);

const uploadSchema = z.object({
  applicationId: z.string().uuid(),
  kind: z.enum(["resume", "cover_letter"]),
});

export async function uploadDocument(
  applicationId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = uploadSchema.safeParse({
    applicationId,
    kind: formData.get("kind"),
  });
  if (!parsed.success) {
    return { ok: false, message: "Pick a document type." };
  }

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, message: "Choose a file to upload." };
  }
  if (file.size > MAX_BYTES) {
    return { ok: false, message: "Files must be 10 MB or smaller." };
  }
  if (file.type && !ALLOWED_TYPES.has(file.type)) {
    return { ok: false, message: `Unsupported file type: ${file.type}` };
  }

  try {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const contentHash = hashContent(bytes);
    const key = documentKey(applicationId, contentHash, file.name);

    await putDocument({ key, body: bytes, contentType: file.type });

    // Same bytes on the same application: refresh the row, add no duplicate.
    await db
      .insert(documents)
      .values({
        applicationId,
        kind: parsed.data.kind,
        s3Key: key,
        filename: file.name,
        contentType: file.type || null,
        sizeBytes: file.size,
        contentHash,
      })
      .onConflictDoUpdate({
        target: [documents.applicationId, documents.contentHash],
        set: { kind: parsed.data.kind, filename: file.name, s3Key: key },
      });
  } catch (error) {
    console.error("uploadDocument failed", error);
    return { ok: false, message: "Upload failed." };
  }

  revalidatePath(`/applications/${applicationId}`);
  return { ok: true, message: "Uploaded." };
}

/** Presign on demand so links in the page never go stale in the HTML. */
export async function getDownloadUrl(documentId: string): Promise<string | null> {
  const [doc] = await db
    .select({ s3Key: documents.s3Key, filename: documents.filename })
    .from(documents)
    .where(eq(documents.id, documentId));

  if (!doc) return null;

  try {
    return await presignDownload(doc.s3Key, doc.filename);
  } catch (error) {
    console.error("presign failed", error);
    return null;
  }
}

export async function removeDocument(documentId: string): Promise<void> {
  const [doc] = await db
    .select({
      s3Key: documents.s3Key,
      applicationId: documents.applicationId,
    })
    .from(documents)
    .where(eq(documents.id, documentId));

  if (!doc) return;

  await db.delete(documents).where(eq(documents.id, documentId));

  // Best effort: a leaked object is better than a dangling row.
  try {
    await deleteDocument(doc.s3Key);
  } catch (error) {
    console.error("could not delete object", error);
  }

  revalidatePath(`/applications/${doc.applicationId}`);
}
