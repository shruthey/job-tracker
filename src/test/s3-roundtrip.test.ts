import { describe, expect, it } from "vitest";

import { documentKey, hashContent, presignDownload, putDocument } from "@/lib/storage";

/** Integration: requires LocalStack on AWS_ENDPOINT_URL. */
describe("S3 round trip against LocalStack", () => {
  it("uploads, presigns, and downloads the same bytes", async () => {
    const body = new TextEncoder().encode(`resume ${Date.now()}`);
    const hash = hashContent(body);
    const key = documentKey(crypto.randomUUID(), hash, "resume.txt");

    await putDocument({ key, body, contentType: "text/plain" });

    const url = await presignDownload(key, "resume.txt");
    expect(url).toContain(key);

    const response = await fetch(url);
    expect(response.status).toBe(200);
    expect(new Uint8Array(await response.arrayBuffer())).toEqual(body);
  });
});
