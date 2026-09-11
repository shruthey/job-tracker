"use server";

import {
  parseJobDescription,
  type ParsedJobDescription,
} from "@/lib/ai/parse-jd";

export type ParseState = {
  ok: boolean;
  message?: string;
  data?: ParsedJobDescription;
  /**
   * On success, the qualification bullets the parser extracted — this seeds the
   * form's Job description field. On failure, whatever the user pasted, so the
   * textarea survives a failed parse.
   */
  jdRaw?: string;
};

/**
 * Parses a pasted job description and hands the fields back to the form.
 * Deliberately writes nothing: the user reviews and edits before anything is
 * saved.
 */
export async function parseJdAction(
  _prev: ParseState,
  formData: FormData,
): Promise<ParseState> {
  const jdRaw = String(formData.get("jdText") ?? "");

  const result = await parseJobDescription(jdRaw);

  if (!result.ok) {
    return { ok: false, message: result.error, jdRaw };
  }

  return {
    ok: true,
    data: result.data,
    // The required/preferred qualification points — the full posting is not
    // carried forward.
    jdRaw: result.jdText,
  };
}
