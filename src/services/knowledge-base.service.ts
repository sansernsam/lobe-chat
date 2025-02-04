import { initSupabase, embeddings, VECTOR_STORE_CONFIG } from '../config/knowledge-base.config';

export class KnowledgeBaseService {
  private supabase;

  constructor() {
    this.supabase = initSupabase();
  }

  async addDocument(content: string, metadata: any = {}) {
    try {
      const embedding = await embeddings.embedQuery(content);
      
      const { data, error } = await this.supabase
        .from('documents')
        .insert([
          {
            content,
            metadata,
            embedding,
          },
        ])
        .select();

      if (error) throw error;
      return data[0];
    } catch (error) {
      console.error('Error adding document:', error);
      throw error;
    }
  }

  async searchSimilarDocuments(query: string) {
    try {
      const queryEmbedding = await embeddings.embedQuery(query);
      
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
      console.error('Error searching documents:', error);
      throw error;
    }
  }

  async deleteDocument(id: number) {
    try {
      const { error } = await this.supabase
        .from('documents')
        .delete()
        .match({ id });

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error deleting document:', error);
      throw error;
    }
  }
}
