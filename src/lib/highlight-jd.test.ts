import { describe, expect, it } from "vitest";

import { highlightJd, type Segment } from "./highlight-jd";

/** The emphasized substrings, in order. */
const bolded = (text: string): string[] =>
  highlightJd(text)
    .filter((s) => s.emphasis)
    .map((s) => s.text);

/** Segments must always reassemble into the original text. */
const rejoin = (segments: Segment[]): string =>
  segments.map((s) => s.text).join("");

describe("highlightJd", () => {
  it("returns nothing for empty input", () => {
    expect(highlightJd("")).toEqual([]);
  });

  it("preserves every character", () => {
    const text = "5+ years of Python and Kubernetes, plus some prose.";
    expect(rejoin(highlightJd(text))).toBe(text);
  });

  it("emphasizes years of experience", () => {
    expect(bolded("5+ years of backend experience")).toEqual(["5+ years"]);
    expect(bolded("3-5 years in the role")).toEqual(["3-5 years"]);
    expect(bolded("Two years of experience")).toEqual(["Two years"]);
    expect(bolded("8 yrs preferred")).toEqual(["8 yrs"]);
  });

  it("emphasizes tools and technologies", () => {
    expect(bolded("Strong Python and Go")).toEqual(["Python", "Go"]);
    expect(bolded("Experience with Kubernetes, Terraform")).toEqual([
      "Kubernetes",
      "Terraform",
    ]);
  });

  it("matches technologies case-insensitively", () => {
    expect(bolded("worked with postgres and REDIS")).toEqual([
      "postgres",
      "REDIS",
    ]);
  });

  it("prefers the longest technology at a position", () => {
    expect(bolded("React Native experience")).toEqual(["React Native"]);
    expect(bolded("Node.js services")).toEqual(["Node.js"]);
    expect(bolded("Next.js on the frontend")).toEqual(["Next.js"]);
  });

  it("handles punctuation-heavy names", () => {
    expect(bolded("C++ and C# both count")).toEqual(["C++", "C#"]);
    expect(bolded("scikit-learn in production")).toEqual(["scikit-learn"]);
  });

  it("does not match a technology inside a larger word", () => {
    expect(bolded("Gopher goal Rusty javascripting")).toEqual([]);
    expect(bolded("reactive programming")).toEqual([]);
  });

  it("leaves ordinary prose alone", () => {
    const text = "Collaborate with partner teams and communicate clearly.";
    expect(bolded(text)).toEqual([]);
    expect(highlightJd(text)).toEqual([{ text, emphasis: false }]);
  });

  it("emphasizes experience and technology in the same line", () => {
    expect(bolded("- 5+ years of Python and AWS")).toEqual([
      "5+ years",
      "Python",
      "AWS",
    ]);
  });

  it("never overlaps segments", () => {
    const text = "10 years with Go, Golang, Google Cloud and GCP";
    const segments = highlightJd(text);
    expect(rejoin(segments)).toBe(text);
    // Adjacent segments must not both be emphasized ranges that double-count.
    let offset = 0;
    for (const s of segments) {
      expect(text.slice(offset, offset + s.text.length)).toBe(s.text);
      offset += s.text.length;
    }
    expect(offset).toBe(text.length);
  });

  it("is not affected by a previous call's regex state", () => {
    const text = "Python and Go";
    expect(bolded(text)).toEqual(["Python", "Go"]);
    expect(bolded(text)).toEqual(["Python", "Go"]);
    expect(bolded(text)).toEqual(["Python", "Go"]);
  });

  it("handles a multi-line qualifications summary", () => {
    const text = [
      "Required:",
      "- 5+ years of backend experience",
      "- Strong Python and Go",
      "",
      "Preferred:",
      "- Experience with Kubernetes and Terraform",
    ].join("\n");
    expect(rejoin(highlightJd(text))).toBe(text);
    expect(bolded(text)).toEqual([
      "5+ years",
      "Python",
      "Go",
      "Kubernetes",
      "Terraform",
    ]);
  });
});
