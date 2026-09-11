#!/bin/bash
# Runs once LocalStack is ready. Creates the bucket the app writes documents to.
set -euo pipefail

BUCKET="${S3_BUCKET:-job-tracker-docs}"

awslocal s3 mb "s3://${BUCKET}" 2>/dev/null || echo "bucket ${BUCKET} already exists"

# CORS so a browser can PUT/GET directly against a presigned URL during development.
awslocal s3api put-bucket-cors --bucket "${BUCKET}" --cors-configuration '{
  "CORSRules": [{
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET", "PUT", "HEAD"],
    "AllowedOrigins": ["*"],
    "ExposeHeaders": ["ETag"]
  }]
}'

echo "localstack init complete: s3://${BUCKET}"
