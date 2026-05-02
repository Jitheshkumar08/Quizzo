import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
(async () => {
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.GEMINI_API_KEY}`);
    const data = await response.json();
    const textModels = data.models.filter((m: any) => m.supportedGenerationMethods?.includes("generateContent") && !m.name.includes("preview"));
    console.log("Active generation models:");
    textModels.forEach((m: any) => console.log(m.name));
  } catch (e) {
    console.error(e);
  }
})();
