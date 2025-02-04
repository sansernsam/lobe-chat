import { createClient } from '@supabase/supabase-js';
import { OpenAIEmbeddings } from 'langchain/embeddings/openai';

// Initialize OpenAI embeddings
export const embeddings = new OpenAIEmbeddings({
  openAIApiKey: process.env.OPENAI_API_KEY,
});

// Flowise API configuration
export const FLOWISE_CONFIG = {
  apiUrl: process.env.FLOWISE_API_URL,
  apiKey: process.env.FLOWISE_API_KEY,
};

// Knowledge base sources
export enum KnowledgeBaseSource {
  FLOWISE = 'flowise',
}

// Vector store configuration
export const VECTOR_STORE_CONFIG = {
  matchThreshold: 0.78,
  matchCount: 5,
};
