import { ConvexError } from "convex/values";

// Single place to change the Gemini model used across the app.
export const GEMINI_MODEL = "gemini-3.8-flash";

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

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: "application/json" },
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Gemini API Error:", errorText);
    throw new ConvexError(`Gemini API Error: ${errorText}`);
  }

  const data = await response.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;

  try {
    return JSON.parse(text) as T;
  } catch (error) {
    console.error("Failed to parse Gemini response:", text, error);
    throw new ConvexError(
      `Received invalid format from AI: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}
