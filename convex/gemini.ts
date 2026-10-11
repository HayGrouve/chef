import { ConvexError } from "convex/values";

// Single place to change the Gemini model used across the app.
export const GEMINI_MODEL = "gemini-3.8-flash";
// Give up on a stuck request well before the action's own time limit
const GEMINI_TIMEOUT_MS = 60_000;

async function callGemini(apiKey: string, parts: GeminiPart[]) {
  let response: Response;
  try {
    response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts }],
          generationConfig: { responseMimeType: "application/json" },
        }),
        signal: AbortSignal.timeout(GEMINI_TIMEOUT_MS),
      }
    );
  } catch (error) {
    console.error("Gemini request failed:", error);
    throw new ConvexError("The AI service didn't respond. Try again in a minute.");
  }
  if (!response.ok) {
    // The body can include quota or project details: log it, don't show it
    console.error("Gemini API Error:", response.status, await response.text());
    throw new ConvexError("The AI service is unavailable right now. Try again in a minute.");
  }
  const data = await response.json();
  return data?.candidates?.[0]?.content?.parts?.[0]?.text;
}

/**
 * Calls Gemini asking for a JSON response and returns the parsed value.
 * Only usable from actions (it performs a network request).
 */
export async function generateJson<T = unknown>(prompt: string): Promise<T> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new ConvexError(
      "GEMINI_API_KEY environment variable not set. Please add it to your Convex dashboard."
    );
  }

  const text = await callGemini(apiKey, [{ text: prompt }]);
  try {
    return JSON.parse(text) as T;
  } catch (error) {
    console.error("Failed to parse Gemini response:", text, error);
    throw new ConvexError("The AI returned something we couldn't read. Try again.");
  }
}

export type GeminiPart =
  | { text: string }
  | { inline_data: { mime_type: string; data: string } };

/**
 * Like `generateJson`, but accepts several parts so an image
 * can be sent alongside the prompt.
 */
export async function generateJsonFromParts<T = unknown>(
  parts: GeminiPart[]
): Promise<T> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new ConvexError("GEMINI_API_KEY environment variable not set.");
  }

  const text = await callGemini(apiKey, parts);
  try {
    return JSON.parse(text) as T;
  } catch {
    console.error("Failed to parse Gemini response:", text);
    throw new ConvexError("The AI returned something we couldn't read. Try again.");
  }
}

export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}
