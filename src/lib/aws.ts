import "server-only";

import { S3Client } from "@aws-sdk/client-s3";

/**
 * The one place that knows whether we are talking to LocalStack or real AWS.
 *
 * `AWS_ENDPOINT_URL` set  -> LocalStack (Phase 1). Path-style addressing is
 *                            required because `bucket.localhost` does not resolve.
 * `AWS_ENDPOINT_URL` unset -> the SDK's normal resolution chain (Phase 2), where
 *                            credentials come from the ECS task role.
 *
 * Phase 2 is therefore a config change, not a code change.
 */
const endpoint = process.env.AWS_ENDPOINT_URL;

const globalForAws = globalThis as unknown as { __s3?: S3Client };

export const s3 =
  globalForAws.__s3 ??
  new S3Client({
    region: process.env.AWS_REGION ?? "us-east-1",
    ...(endpoint
      ? {
          endpoint,
          forcePathStyle: true,
          credentials: {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID ?? "test",
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ?? "test",
          },
        }
      : {}),
  });

if (process.env.NODE_ENV !== "production") {
  globalForAws.__s3 = s3;
}

export const S3_BUCKET = process.env.S3_BUCKET ?? "job-tracker-docs";
