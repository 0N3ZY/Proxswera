import Groq from 'groq-sdk';
import { GoogleGenAI } from '@google/genai';

async function runAIHealing(prompt) {
  // 1. Try Groq first (Fast & Free)
  try {
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "user", content: prompt }],
    });
    return completion.choices[0]?.message?.content;
  } catch (groqError) {
    console.warn("Groq failed or rate-limited. Falling back to Gemini...", groqError.message);
  }

  // 2. Fall back to Google AI Studio if Groq fails
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    return response.text;
  } catch (geminiError) {
    console.error("Both AI providers failed:", geminiError.message);
    throw geminiError;
  }
}
