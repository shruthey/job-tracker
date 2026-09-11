import { describe, expect, it } from "vitest";

import { documentKey, hashContent } from "@/lib/storage";

describe("hashContent", () => {
  it("is stable for identical bytes", () => {
    const a = hashContent(new TextEncoder().encode("resume"));
    const b = hashContent(new TextEncoder().encode("resume"));
    expect(a).toBe(b);
  });

  it("differs for different bytes", () => {
    const a = hashContent(new TextEncoder().encode("resume v1"));
    const b = hashContent(new TextEncoder().encode("resume v2"));
    expect(a).not.toBe(b);
  });
});

describe("documentKey", () => {
  it("is content-addressed under the application", () => {
    const key = documentKey("app-1", "abc123def456ghi789", "resume.pdf");
    expect(key).toBe("resumes/app-1/abc123def456ghi7-resume.pdf");
  });

  it("sanitises filenames that could escape the prefix", () => {
    const key = documentKey("app-1", "0".repeat(64), "../../etc/passwd");
    expect(key).not.toContain("..");
    expect(key.startsWith("resumes/app-1/")).toBe(true);
  });

  it("gives the same key for the same file uploaded twice", () => {
    const hash = hashContent(new TextEncoder().encode("same"));
    expect(documentKey("a", hash, "cv.pdf")).toBe(documentKey("a", hash, "cv.pdf"));
  });
});
