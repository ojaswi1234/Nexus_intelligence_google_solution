import { GoogleGenAI } from "@google/genai";
import { Shipment, Disruption, AIRecommendation } from "../types";

const getAI = () => {
  const customKey = sessionStorage.getItem('CUSTOM_GEMINI_API_KEY');
  return new GoogleGenAI({ apiKey: customKey || process.env.GEMINI_API_KEY });
};

export const analyzeSupplyChainRisks = async (
  shipments: Shipment[],
  disruptions: Disruption[]
): Promise<{ text: string; groundingChunks?: any[] }> => {
  const ai = getAI();
  const prompt = `
    Analyze the following supply chain data and provide a high-level executive summary of critical risks.
    Focus on shipments that are 'at-risk' or 'delayed' due to active disruptions.
    
    Shipments: ${JSON.stringify(shipments)}
    Active Disruptions: ${JSON.stringify(disruptions)}
    
    Use Google Search to find any real-world global events (weather, strikes, geopolitical issues) that might further impact these specific routes or locations.
    
    Format your response in Markdown. Use a professional, technical tone.
    If you use tables, ensure they are properly formatted with newlines between rows.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
      },
    });
    return {
      text: response.text || "No risk analysis available.",
      groundingChunks: response.candidates?.[0]?.groundingMetadata?.groundingChunks
    };
  } catch (error) {
    console.error("AI Analysis Error:", error);
    return { text: "Failed to generate risk analysis." };
  }
};

export const getRouteOptimization = async (
  shipment: Shipment,
  disruption: Disruption
): Promise<AIRecommendation> => {
  const ai = getAI();
  const prompt = `
    Optimize the route for shipment ${shipment.id} which is currently impacted by a ${disruption.type} disruption.
    
    Shipment Details: ${JSON.stringify(shipment)}
    Disruption Details: ${JSON.stringify(disruption)}
    
    Use Google Search and Google Maps to identify the best alternative ports or routes based on real-time traffic, port congestion, and weather conditions.
    
    Provide a recommendation including:
    1. A clear reason for the change.
    2. A list of intermediate waypoints (name, lat, lng) for the new route.
    3. Estimated time savings compared to waiting out the disruption.
    
    Return the response in JSON format matching this schema:
    {
      "shipmentId": string,
      "reason": string,
      "suggestedRoute": [{ "id": string, "name": string, "lat": number, "lng": number }],
      "estimatedTimeSavings": string
    }
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        tools: [{ googleSearch: {} }, { googleMaps: {} }],
      },
    });
    return JSON.parse(response.text || "{}");
  } catch (error) {
    console.error("Route Optimization Error:", error);
    throw error;
  }
};

export const startSupplyChainChat = (shipments: Shipment[], disruptions: Disruption[]) => {
  const ai = getAI();
  const chat = ai.chats.create({
    model: "gemini-3-flash-preview",
    config: {
      systemInstruction: `
        You are the Nexus AI Command Assistant for a global supply chain.
        You have real-time access to the following data:
        Shipments: ${JSON.stringify(shipments)}
        Disruptions: ${JSON.stringify(disruptions)}
        
        Your goal is to help the user manage logistics, answer questions about specific shipments, 
        and provide insights on how disruptions might impact the network.
        
        You MUST use Google Search and Google Maps tools to provide the most accurate and up-to-date information regarding global events, port conditions, and geographic details.
        
        Be concise, technical, and professional. Use Markdown for formatting.
        If you use tables, ensure they are properly formatted with newlines between rows.
      `,
      tools: [{ googleSearch: {} }, { googleMaps: {} }],
    },
  });
  return chat;
};
