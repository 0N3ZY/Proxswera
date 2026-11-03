import fs from 'fs';
import Groq from 'groq-sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';

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
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-3.8-flash' });
const result = await model.generateContent(prompt);
const responseText = result.response.text();
    });
    return response.text;
  } catch (geminiError) {
    console.error("Both AI providers failed:", geminiError.message);
    throw geminiError;
  }
}
