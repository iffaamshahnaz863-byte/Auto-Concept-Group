
import { GoogleGenAI, Type } from "@google/genai";

// Fix: Initializing GoogleGenAI exclusively with process.env.API_KEY as per guidelines
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

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
    // Fix: Accessing .text property directly and handling potential undefined value
    const jsonStr = response.text?.trim();
    return jsonStr ? JSON.parse(jsonStr) : null;
  } catch (error) {
    console.error("AI Recommendation Error:", error);
    return null;
  }
};
