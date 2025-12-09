
import { NextRequest, NextResponse } from 'next/server';
import { ChatGroq } from '@langchain/groq';
import { ChatGoogleGenerativeAI, GoogleGenerativeAIEmbeddings } from '@langchain/google-genai';
import { SupabaseVectorStore } from '@langchain/community/vectorstores/supabase';
import { createClient } from '@supabase/supabase-js';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';

// Use Edge Runtime for lower latency
export const runtime = 'edge';

export async function POST(req: NextRequest) {
  try {
    const { message, history, useComplexModel, image } = await req.json();

    // 1. Initialize Supabase Client
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_PRIVATE_KEY) {
      throw new Error("Missing Supabase credentials");
    }
    
    const client = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_PRIVATE_KEY
    );

    // 2. Initialize Embeddings (Gemini text-embedding-004)
    // We use this to convert the user's query into a vector for searching
    const embeddings = new GoogleGenerativeAIEmbeddings({
      modelName: "text-embedding-004",
      apiKey: process.env.GOOGLE_API_KEY,
      // Fix: Cast string to any to avoid strict Enum type mismatch for TaskType
      taskType: "RETRIEVAL_DOCUMENT" as any,
    });

    const vectorStore = new SupabaseVectorStore(embeddings, {
      client,
      tableName: 'documents',
      queryName: 'match_documents',
    });

    // 3. RAG: Retrieve Context
    // Search for the 3 most relevant documents
    let contextText = "";
    try {
      const searchResults = await vectorStore.similaritySearch(message, 3);
      contextText = searchResults.map(doc => doc.pageContent).join('\n\n');
      console.log(`[RAG] Retrieved ${searchResults.length} docs`);
    } catch (e) {
      console.warn("[RAG] Retrieval failed, proceeding without context:", e);
    }

    // 4. Construct System Prompt
    const systemInstruction = `You are a Senior Financial Analyst for the Myanmar market.
    Use the provided CONTEXT from the database to answer questions accurately.
    If the context is irrelevant, use your general knowledge but mention the lack of specific internal data.
    
    CONTEXT:
    ${contextText}
    `;

    // 5. Smart Routing Logic
    // If Image is present OR Deep Think mode is enabled -> Use Gemini 2.5
    // Otherwise -> Use Groq (Llama 3.3) for speed
    
    let responseText = '';
    let providerName = '';

    if (image || useComplexModel) {
      // --- GEMINI PATH (Vision / Deep Reasoning) ---
      providerName = 'Gemini 2.5 Flash';
      
      const model = new ChatGoogleGenerativeAI({
        modelName: "gemini-2.5-flash", // Fixed: 'model' -> 'modelName' for @langchain/google-genai ^0.0.12
        apiKey: process.env.GOOGLE_API_KEY,
        temperature: 0.3, // Analytical
        maxOutputTokens: 4096,
      });

      // Construct Multimodal Message
      const contentParts: any[] = [{ type: 'text', text: message }];
      
      if (image) {
        // LangChain accepts data URLs directly in image_url
        contentParts.push({
          type: 'image_url',
          image_url: image, 
        });
      }

      const response = await model.invoke([
        new SystemMessage(systemInstruction),
        new HumanMessage({ content: contentParts })
      ]);
      
      responseText = typeof response.content === 'string' 
        ? response.content 
        : JSON.stringify(response.content);

    } else {
      // --- GROQ PATH (Speed / Llama 3.3) ---
      providerName = 'Groq (Llama 3.3)';
      
      const model = new ChatGroq({
        apiKey: process.env.GROQ_API_KEY,
        modelName: "llama-3.3-70b-versatile", // Fixed: 'model' -> 'modelName' for @langchain/groq ^0.0.6
        temperature: 0.5,
      });

      const response = await model.invoke([
        new SystemMessage(systemInstruction),
        new HumanMessage(message)
      ]);

      responseText = typeof response.content === 'string' 
        ? response.content 
        : JSON.stringify(response.content);
    }

    return NextResponse.json({
      text: responseText,
      provider: providerName
    });

  } catch (error: any) {
    console.error("Hybrid AI Backend Error:", error);
    return NextResponse.json(
      { text: `System Error: ${error.message}`, provider: 'System' },
      { status: 500 }
    );
  }
}
