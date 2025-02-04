import { createClient } from '@supabase/supabase-js';
import { OpenAIEmbeddings } from 'langchain/embeddings/openai';
import { PineconeClient } from '@pinecone-database/pinecone';

// Initialize Supabase client
export const initSupabase = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase credentials');
  }
  
  return createClient(supabaseUrl, supabaseKey);
};

// Initialize Pinecone client
export const initPinecone = async () => {
  const pinecone = new PineconeClient();
  await pinecone.init({
    environment: process.env.PINECONE_ENVIRONMENT || '',
    apiKey: process.env.PINECONE_API_KEY || '',
  });
  return pinecone;
};

// Initialize OpenAI embeddings
export const embeddings = new OpenAIEmbeddings({
  openAIApiKey: process.env.OPENAI_API_KEY,
});

// Constants for vector search
export const VECTOR_STORE_CONFIG = {
  matchThreshold: 0.78,
  matchCount: 5,
};

// Flowise API configuration
export const FLOWISE_CONFIG = {
  apiUrl: process.env.FLOWISE_API_URL,
  apiKey: process.env.FLOWISE_API_KEY,
};

// Knowledge base sources
export enum KnowledgeBaseSource {
  SUPABASE = 'supabase',
  PINECONE = 'pinecone',
  FLOWISE = 'flowise',
}
