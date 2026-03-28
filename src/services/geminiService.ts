import { GoogleGenAI } from "@google/genai";
import { Shipment, Disruption, AIRecommendation } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export const analyzeSupplyChainRisks = async (
  shipments: Shipment[],
  disruptions: Disruption[]
): Promise<string> => {
  const prompt = `
    Analyze the following supply chain data and provide a high-level executive summary of critical risks.
    Focus on shipments that are 'at-risk' or 'delayed' due to active disruptions.
    
    Shipments: ${JSON.stringify(shipments)}
    Active Disruptions: ${JSON.stringify(disruptions)}
    
    Format your response in Markdown. Use a professional, technical tone.
    If you use tables, ensure they are properly formatted with newlines between rows.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
    });
    return response.text || "No risk analysis available.";
  } catch (error) {
    console.error("AI Analysis Error:", error);
    return "Failed to generate risk analysis.";
  }
};

export const getRouteOptimization = async (
  shipment: Shipment,
  disruption: Disruption
): Promise<AIRecommendation> => {
  const prompt = `
    Optimize the route for shipment ${shipment.id} which is currently impacted by a ${disruption.type} disruption.
    
    Shipment Details: ${JSON.stringify(shipment)}
    Disruption Details: ${JSON.stringify(disruption)}
    
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
      },
    });
    return JSON.parse(response.text || "{}");
  } catch (error) {
    console.error("Route Optimization Error:", error);
    throw error;
  }
};

export const startSupplyChainChat = (shipments: Shipment[], disruptions: Disruption[]) => {
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
        Be concise, technical, and professional. Use Markdown for formatting.
        If you use tables, ensure they are properly formatted with newlines between rows.
      `,
    },
  });
  return chat;
};
