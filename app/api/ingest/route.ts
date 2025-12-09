
import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAIEmbeddings } from '@langchain/google-genai';
import { SupabaseVectorStore } from '@langchain/community/vectorstores/supabase';
import { createClient } from '@supabase/supabase-js';
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';

export async function POST(req: NextRequest) {
  try {
    const { text, password } = await req.json();

    // Basic server-side auth check
    if (password !== "admin123") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!text) {
      return NextResponse.json({ error: "No text provided" }, { status: 400 });
    }

    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_PRIVATE_KEY || !process.env.GOOGLE_API_KEY) {
      return NextResponse.json({ error: "Server misconfiguration (missing env vars)" }, { status: 500 });
    }

    const client = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_PRIVATE_KEY
    );

    const embeddings = new GoogleGenerativeAIEmbeddings({
      modelName: "text-embedding-004",
      apiKey: process.env.GOOGLE_API_KEY,
      taskType: "RETRIEVAL_DOCUMENT" as any,
    });

    const vectorStore = new SupabaseVectorStore(embeddings, {
      client,
      tableName: 'documents',
      queryName: 'match_documents',
    });

    // Split text
    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1000,
      chunkOverlap: 200,
    });

    const docs = await splitter.createDocuments([text]);
    console.log(`[Ingest] Split into ${docs.length} chunks`);

    // Upload with rate limiting (processing sequentially)
    let uploadedCount = 0;
    for (const doc of docs) {
       await vectorStore.addDocuments([doc]);
       uploadedCount++;
       // Slight delay to be respectful of rate limits
       await new Promise(resolve => setTimeout(resolve, 500)); 
    }

    return NextResponse.json({ 
      success: true, 
      message: `Successfully processed and uploaded ${uploadedCount} chunks to the Knowledge Base.` 
    });

  } catch (error: any) {
    console.error("Ingest API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
