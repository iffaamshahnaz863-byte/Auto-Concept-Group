
import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

export const getCarRecommendation = async (userPreference: string) => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Suggest the best car type based on this user preference: "${userPreference}". 
      Respond in JSON format with fields: 'suggestedCategory', 'reasoning', and 'keyFeatures'.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            suggestedCategory: { type: Type.STRING },
            reasoning: { type: Type.STRING },
            keyFeatures: { type: Type.ARRAY, items: { type: Type.STRING } }
          },
          required: ['suggestedCategory', 'reasoning', 'keyFeatures']
        }
      }
    });
    return JSON.parse(response.text);
  } catch (error) {
    console.error("AI Recommendation Error:", error);
    return null;
  }
};
