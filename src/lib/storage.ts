import "server-only";

import { createHash } from "node:crypto";

import {
  GetObjectCommand,
  PutObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import { s3, S3_BUCKET } from "@/lib/aws";

export function hashContent(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

/**
 * Content-addressed key. Re-uploading identical bytes to the same application
 * overwrites the same object, and the hash makes it obvious at a glance which
 * applications share a resume version.
 */
export function documentKey(
  applicationId: string,
  contentHash: string,
  filename: string,
): string {
  // Collapse anything outside a safe set, then neutralise leading dots and
  // any remaining `..` so the key cannot read as a traversal.
  const safe = filename
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .replace(/\.{2,}/g, "_")
    .replace(/^\.+/, "")
    .slice(0, 120) || "document";
  return `resumes/${applicationId}/${contentHash.slice(0, 16)}-${safe}`;
}

export async function putDocument(params: {
  key: string;
  body: Uint8Array;
  contentType?: string;
}): Promise<void> {
  await s3.send(
    new PutObjectCommand({
      Bucket: S3_BUCKET,
      Key: params.key,
      Body: params.body,
      ContentType: params.contentType ?? "application/octet-stream",
    }),
  );
}

/** Short-lived download link. Phase 2 serves the same call against real S3. */
export async function presignDownload(
  key: string,
  filename?: string,
  expiresIn = 300,
): Promise<string> {
  return getSignedUrl(
    s3,
    new GetObjectCommand({
      Bucket: S3_BUCKET,
      Key: key,
      ...(filename
        ? { ResponseContentDisposition: `attachment; filename="${filename}"` }
        : {}),
    }),
    { expiresIn },
  );
}

export async function deleteDocument(key: string): Promise<void> {
  await s3.send(new DeleteObjectCommand({ Bucket: S3_BUCKET, Key: key }));
}
