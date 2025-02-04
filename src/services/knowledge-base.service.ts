import { initSupabase, initPinecone, embeddings, VECTOR_STORE_CONFIG, FLOWISE_CONFIG, KnowledgeBaseSource } from '../config/knowledge-base.config';
import { FlowiseService, FlowiseDocumentStore, UpsertDocumentParams } from './flowise.service';
import axios from 'axios';

export class KnowledgeBaseService {
  private supabase;
  private pinecone;
  private flowise: FlowiseService;
  private initialized = false;

  constructor() {
    this.supabase = initSupabase();
    this.flowise = new FlowiseService();
  }

  async initialize() {
    if (!this.initialized) {
      this.pinecone = await initPinecone();
      this.initialized = true;
    }
  }

  async importFromFlowise(flowiseStoreId: string) {
    try {
      // Get all documents from Flowise
      const chunks = await this.flowise.getChunks(flowiseStoreId, 'all', 1);
      
      // Import each chunk into our knowledge base
      for (const chunk of chunks.chunks) {
        await this.addDocument(
          chunk.pageContent,
          chunk.metadata,
          KnowledgeBaseSource.SUPABASE // Store in Supabase for faster access
        );
      }

      return {
        success: true,
        importedCount: chunks.chunks.length
      };
    } catch (error) {
      console.error('Error importing from Flowise:', error);
      throw error;
    }
  }

  async addDocument(content: string, metadata: any = {}, source: KnowledgeBaseSource = KnowledgeBaseSource.SUPABASE) {
    await this.initialize();
    const embedding = await embeddings.embedQuery(content);

    switch (source) {
      case KnowledgeBaseSource.SUPABASE:
        return this.addToSupabase(content, metadata, embedding);
      case KnowledgeBaseSource.PINECONE:
        return this.addToPinecone(content, metadata, embedding);
      case KnowledgeBaseSource.FLOWISE:
        return this.addToFlowise(content, metadata);
      default:
        throw new Error('Unsupported knowledge base source');
    }
  }

  private async addToSupabase(content: string, metadata: any, embedding: number[]) {
    try {
      const { data, error } = await this.supabase
        .from('documents')
        .insert([{ content, metadata, embedding }])
        .select();

      if (error) throw error;
      return data[0];
    } catch (error) {
      console.error('Error adding document to Supabase:', error);
      throw error;
    }
  }

  private async addToPinecone(content: string, metadata: any, embedding: number[]) {
    try {
      const index = this.pinecone.Index('your-index-name');
      await index.upsert({
        upsertRequest: {
          vectors: [{
            id: `doc_${Date.now()}`,
            values: embedding,
            metadata: { ...metadata, content }
          }]
        }
      });
      return { content, metadata };
    } catch (error) {
      console.error('Error adding document to Pinecone:', error);
      throw error;
    }
  }

  private async addToFlowise(content: string, metadata: any) {
    const params: UpsertDocumentParams = {
      metadata,
      docStore: {
        name: 'LobeChat Import',
        description: 'Imported from LobeChat'
      },
      loader: {
        name: 'text',
        config: { text: content }
      },
      splitter: {
        name: 'recursiveCharacterTextSplitter',
        config: {}
      },
      embedding: {
        name: 'openAIEmbeddings',
        config: {
          openAIApiKey: process.env.OPENAI_API_KEY
        }
      },
      vectorStore: {
        name: 'pinecone',
        config: {
          pineconeApiKey: process.env.PINECONE_API_KEY,
          pineconeEnvironment: process.env.PINECONE_ENVIRONMENT
        }
      }
    };

    try {
      const result = await this.flowise.upsertDocument('default', params);
      return result;
    } catch (error) {
      console.error('Error adding document to Flowise:', error);
      throw error;
    }
  }

  async searchSimilarDocuments(query: string, sources: KnowledgeBaseSource[] = [KnowledgeBaseSource.SUPABASE]) {
    await this.initialize();
    const queryEmbedding = await embeddings.embedQuery(query);
    
    const results = await Promise.all(
      sources.map(source => this.searchInSource(query, queryEmbedding, source))
    );

    // Combine and sort results by similarity
    return results.flat().sort((a, b) => b.similarity - a.similarity);
  }

  private async searchInSource(query: string, queryEmbedding: number[], source: KnowledgeBaseSource) {
    switch (source) {
      case KnowledgeBaseSource.SUPABASE:
        return this.searchInSupabase(queryEmbedding);
      case KnowledgeBaseSource.PINECONE:
        return this.searchInPinecone(queryEmbedding);
      case KnowledgeBaseSource.FLOWISE:
        return this.searchInFlowise(query);
      default:
        return [];
    }
  }

  private async searchInSupabase(queryEmbedding: number[]) {
    try {
      const { data: documents, error } = await this.supabase.rpc(
        'match_documents',
        {
          query_embedding: queryEmbedding,
          match_threshold: VECTOR_STORE_CONFIG.matchThreshold,
          match_count: VECTOR_STORE_CONFIG.matchCount,
        }
      );

      if (error) throw error;
      return documents;
    } catch (error) {
      console.error('Error searching in Supabase:', error);
      return [];
    }
  }

  private async searchInPinecone(queryEmbedding: number[]) {
    try {
      const index = this.pinecone.Index('your-index-name');
      const queryResponse = await index.query({
        queryRequest: {
          vector: queryEmbedding,
          topK: VECTOR_STORE_CONFIG.matchCount,
          includeMetadata: true
        }
      });
      
      return queryResponse.matches?.map(match => ({
        content: match.metadata?.content,
        metadata: match.metadata,
        similarity: match.score
      })) || [];
    } catch (error) {
      console.error('Error searching in Pinecone:', error);
      return [];
    }
  }

  private async searchInFlowise(query: string) {
    try {
      const response = await this.flowise.queryVectorStore('default', query);
      return response.docs.map((doc: any) => ({
        content: doc.pageContent,
        metadata: doc.metadata,
        similarity: 1 // Flowise doesn't return similarity scores
      }));
    } catch (error) {
      console.error('Error searching in Flowise:', error);
      return [];
    }
  }

  async importAllFlowiseDocuments() {
    try {
      // Get all document stores from Flowise
      const stores = await this.flowise.getAllDocumentStores();
      
      const results = [];
      for (const store of stores) {
        const result = await this.importFromFlowise(store.id);
        results.push({
          storeId: store.id,
          storeName: store.name,
          ...result
        });
      }
      
      return results;
    } catch (error) {
      console.error('Error importing all Flowise documents:', error);
      throw error;
    }
  }

  async deleteDocument(id: number, source: KnowledgeBaseSource = KnowledgeBaseSource.SUPABASE) {
    await this.initialize();
    
    switch (source) {
      case KnowledgeBaseSource.SUPABASE:
        return this.deleteFromSupabase(id);
      case KnowledgeBaseSource.PINECONE:
        return this.deleteFromPinecone(id);
      default:
        throw new Error('Unsupported delete operation for this source');
    }
  }

  private async deleteFromSupabase(id: number) {
    try {
      const { error } = await this.supabase
        .from('documents')
        .delete()
        .match({ id });

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error deleting from Supabase:', error);
      throw error;
    }
  }

  private async deleteFromPinecone(id: number) {
    try {
      const index = this.pinecone.Index('your-index-name');
      await index.delete1({
        ids: [`doc_${id}`]
      });
      return true;
    } catch (error) {
      console.error('Error deleting from Pinecone:', error);
      throw error;
    }
  }
}
