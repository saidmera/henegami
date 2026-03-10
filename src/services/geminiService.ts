import { GoogleGenAI, Type } from "@google/genai";

const apiKey = process.env.GEMINI_API_KEY;

export const chatWithGemini = async (message: string, history: { role: string; parts: { text: string }[] }[]) => {
  if (!apiKey) throw new Error("GEMINI_API_KEY is not set");
  const ai = new GoogleGenAI({ apiKey });
  
  const response = await ai.models.generateContent({
    model: "gemini-3.1-pro-preview",
    contents: [...history.map(h => ({ role: h.role as any, parts: h.parts })), { role: "user", parts: [{ text: message }] }],
  });

  return response.text;
};

export const analyzeImageWithGemini = async (base64Image: string, prompt: string) => {
  if (!apiKey) throw new Error("GEMINI_API_KEY is not set");
  const ai = new GoogleGenAI({ apiKey });

  const response = await ai.models.generateContent({
    model: "gemini-3.1-pro-preview",
    contents: [
      {
        role: "user",
        parts: [
          { text: prompt },
          {
            inlineData: {
              mimeType: "image/jpeg",
              data: base64Image.split(",")[1],
            },
          },
        ],
      },
    ],
  });
  return response.text;
};
