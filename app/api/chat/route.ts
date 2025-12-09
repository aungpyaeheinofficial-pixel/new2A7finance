
import { NextRequest, NextResponse } from 'next/server';
import { ChatGroq } from '@langchain/groq';
import { ChatGoogleGenerativeAI, GoogleGenerativeAIEmbeddings } from '@langchain/google-genai';
import { SupabaseVectorStore } from '@langchain/community/vectorstores/supabase';
import { createClient } from '@supabase/supabase-js';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';

export const runtime = 'edge'; // Optional: Use edge runtime for speed if supported by deps

export async function POST(req: NextRequest) {
  try {
    const { message, history, useComplexModel, image } = await req.json();

    // 1. Initialize Supabase for RAG
    const client = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_PRIVATE_KEY!
    );

    // 2. Initialize Embeddings (Gemini text-embedding-004)
    const embeddings = new GoogleGenerativeAIEmbeddings({
      modelName: "text-embedding-004",
      apiKey: process.env.GOOGLE_API_KEY,
      taskType: "RETRIEVAL_DOCUMENT",
    });

    const vectorStore = new SupabaseVectorStore(embeddings, {
      client,
      tableName: 'documents',
      queryName: 'match_documents',
    });

    // 3. Retrieve Context (RAG)
    // We search for context based on the user's latest message
    const searchResults = await vectorStore.similaritySearch(message, 3);
    const contextText = searchResults.map(doc => doc.pageContent).join('\n\n');

    console.log(`[RAG] Retrieved ${searchResults.length} docs for query: "${message}"`);

    // 4. Construct System Prompt
    const systemInstruction = `You are a Senior Financial Analyst for the Myanmar market.
    Use the provided CONTEXT from the database to answer questions accurately.
    If the context is irrelevant, use your general knowledge but mention the lack of specific internal data.
    
    CONTEXT:
    ${contextText}
    `;

    // 5. Route Request
    let responseText = '';
    let providerName = '';

    if (image || useComplexModel) {
      // --- GEMINI PATH (Vision / Deep Reasoning) ---
      providerName = 'Gemini 2.5 Flash';
      const model = new ChatGoogleGenerativeAI({
        modelName: "gemini-2.5-flash",
        apiKey: process.env.GOOGLE_API_KEY,
        temperature: 0.3, // Lower temp for analysis
        maxOutputTokens: 2048,
      });

      // Construct Multimodal Message
      const contentParts: any[] = [{ type: 'text', text: message }];
      
      if (image) {
        // Ensure strictly base64 data without prefixes if SDK expects it, 
        // or format as data URL. LangChain/Google integration handles data URLs.
        contentParts.push({
          type: 'image_url',
          image_url: image, // Assumes data:image/jpeg;base64,... format
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
        model: "llama-3.3-70b-versatile",
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
      { text: "Error connecting to AI backend.", provider: 'System' },
      { status: 500 }
    );
  }
}
