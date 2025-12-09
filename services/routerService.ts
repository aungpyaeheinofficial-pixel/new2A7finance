
import { RouterRequest, RouterResponse, ModelProvider } from "../types";

/**
 * Frontend Bridge to the Next.js Hybrid AI Backend.
 * All logic (RAG, Model Selection) now happens server-side in /app/api/chat/route.ts
 */
export const routeChatRequest = async (request: RouterRequest): Promise<RouterResponse> => {
  const { message, history, useComplexModel, image } = request;

  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message,
        history, // We pass history for context (backend can implement full history window)
        useComplexModel,
        image
      }),
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.statusText}`);
    }

    const data = await response.json();

    return {
      text: data.text,
      provider: data.provider as ModelProvider
    };

  } catch (error) {
    console.error("Router Service Error:", error);
    // Fallback if API fails
    return {
      text: "I'm having trouble connecting to the server. Please check your connection.",
      provider: ModelProvider.GEMINI
    };
  }
};
