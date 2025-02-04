import { embeddings, VECTOR_STORE_CONFIG, KnowledgeBaseSource } from '../config/knowledge-base.config';
import { FlowiseService } from './flowise.service';

export class KnowledgeBaseService {
  private flowise: FlowiseService;

  constructor() {
    this.flowise = new FlowiseService();
  }

  async listDocumentStores() {
    try {
      const stores = await this.flowise.getAllDocumentStores();
      return stores.map(store => ({
        id: store.id,
        name: store.name,
        description: store.description || '',
        documentCount: store.documentCount || 0,
      }));
    } catch (error) {
      console.error('Error listing document stores:', error);
      throw error;
    }
  }

  async getDocumentStore(storeId: string) {
    try {
      return await this.flowise.getDocumentStore(storeId);
    } catch (error) {
      console.error('Error getting document store:', error);
      throw error;
    }
  }

  async getDocumentChunks(storeId: string, documentId?: string) {
    try {
      const chunks = await this.flowise.getChunks(storeId, documentId || 'all', 1);
      return chunks.chunks.map(chunk => ({
        content: chunk.pageContent,
        metadata: chunk.metadata,
      }));
    } catch (error) {
      console.error('Error getting document chunks:', error);
      throw error;
    }
  }

  async searchDocuments(query: string, storeId?: string) {
    try {
      if (storeId) {
        // Search in specific store
        const response = await this.flowise.queryVectorStore(storeId, query);
        return response.docs.map(doc => ({
          content: doc.pageContent,
          metadata: doc.metadata,
          storeId,
        }));
      } else {
        // Search across all stores
        const stores = await this.flowise.getAllDocumentStores();
        const results = await Promise.all(
          stores.map(async store => {
            try {
              const response = await this.flowise.queryVectorStore(store.id, query);
              return response.docs.map(doc => ({
                content: doc.pageContent,
                metadata: doc.metadata,
                storeId: store.id,
                storeName: store.name,
              }));
            } catch (error) {
              console.error(`Error searching store ${store.id}:`, error);
              return [];
            }
          })
        );
        return results.flat();
      }
    } catch (error) {
      console.error('Error searching documents:', error);
      throw error;
    }
  }

  async addDocument(content: string, metadata: any = {}, storeId?: string) {
    try {
      const stores = storeId ? [storeId] : (await this.flowise.getAllDocumentStores()).map(s => s.id);
      const results = await Promise.all(
        stores.map(async id => {
          try {
            await this.flowise.upsertDocument(id, {
              metadata,
              docStore: {
                name: metadata.title || 'LobeChat Document',
                description: metadata.description || '',
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
              }
            });
            return { storeId: id, status: 'success' };
          } catch (error) {
            console.error(`Error adding document to store ${id}:`, error);
            return { storeId: id, status: 'error', error };
          }
        })
      );
      return results;
    } catch (error) {
      console.error('Error adding document:', error);
      throw error;
    }
  }

  async deleteDocument(documentId: string, storeId: string) {
    try {
      await this.flowise.deleteDocument(storeId, documentId);
      return { success: true };
    } catch (error) {
      console.error('Error deleting document:', error);
      throw error;
    }
  }
}
