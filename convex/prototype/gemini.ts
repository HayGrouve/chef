// PROTOTYPE — experimental code for /prototype routes. Not used by the main app.
import { ConvexError } from "convex/values";
import { GEMINI_MODEL } from "../gemini";

export type GeminiPart =
  | { text: string }
  | { inline_data: { mime_type: string; data: string } };

/**
 * Like `generateJson` in ../gemini.ts, but accepts several parts so an image
 * can be sent alongside the prompt.
 */
export async function generateJsonFromParts<T = unknown>(
  parts: GeminiPart[]
): Promise<T> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new ConvexError("GEMINI_API_KEY environment variable not set.");
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts }],
        generationConfig: { responseMimeType: "application/json" },
      }),
    }
  );

  if (!response.ok) {
    console.error("Gemini API Error:", await response.text());
    throw new ConvexError("The AI service is unavailable right now. Try again in a minute.");
  }

  const data = await response.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
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
