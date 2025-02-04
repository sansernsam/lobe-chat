import axios from 'axios';
import { FLOWISE_CONFIG } from '../config/knowledge-base.config';

export interface FlowiseDocumentStore {
  id: string;
  name: string;
  description: string;
  loaders: string;
  whereUsed: string;
  status: 'EMPTY' | 'SYNC' | 'SYNCING' | 'STALE' | 'NEW' | 'UPSERTING' | 'UPSERTED';
  vectorStoreConfig: string;
  embeddingConfig: string;
  recordManagerConfig: string;
  createdDate: string;
  updatedDate: string;
}

export interface UpsertDocumentParams {
  docId?: string;
  metadata?: Record<string, any>;
  replaceExisting?: boolean;
  createNewDocStore?: boolean;
  docStore?: {
    name: string;
    description: string;
  };
  loader?: {
    name: string;
    config: Record<string, any>;
  };
  splitter?: {
    name: string;
    config: Record<string, any>;
  };
  embedding?: {
    name: string;
    config: Record<string, any>;
  };
  vectorStore?: {
    name: string;
    config: Record<string, any>;
  };
  recordManager?: {
    name: string;
    config: Record<string, any>;
  };
}

export class FlowiseService {
  private baseUrl: string;
  private headers: Record<string, string>;

  constructor() {
    if (!FLOWISE_CONFIG.apiUrl || !FLOWISE_CONFIG.apiKey) {
      throw new Error('Missing Flowise configuration');
    }

    this.baseUrl = FLOWISE_CONFIG.apiUrl;
    this.headers = {
      'Authorization': `Bearer ${FLOWISE_CONFIG.apiKey}`,
      'Content-Type': 'application/json',
    };
  }

  async getAllDocumentStores(): Promise<FlowiseDocumentStore[]> {
    const response = await axios.get(`${this.baseUrl}/document-store/store`, {
      headers: this.headers,
    });
    return response.data;
  }

  async getDocumentStore(id: string): Promise<FlowiseDocumentStore> {
    const response = await axios.get(`${this.baseUrl}/document-store/store/${id}`, {
      headers: this.headers,
    });
    return response.data;
  }

  async upsertDocument(storeId: string, params: UpsertDocumentParams) {
    const response = await axios.post(
      `${this.baseUrl}/document-store/upsert/${storeId}`,
      params,
      { headers: this.headers }
    );
    return response.data;
  }

  async queryVectorStore(storeId: string, query: string) {
    const response = await axios.post(
      `${this.baseUrl}/document-store/vectorstore/query`,
      {
        storeId,
        query,
      },
      { headers: this.headers }
    );
    return response.data;
  }

  async deleteDocumentLoader(storeId: string, loaderId: string) {
    const response = await axios.delete(
      `${this.baseUrl}/document-store/loader/${storeId}/${loaderId}`,
      { headers: this.headers }
    );
    return response.data;
  }

  async getChunks(storeId: string, loaderId: string, pageNo: number) {
    const response = await axios.get(
      `${this.baseUrl}/document-store/chunks/${storeId}/${loaderId}/${pageNo}`,
      { headers: this.headers }
    );
    return response.data;
  }

  async updateChunk(storeId: string, loaderId: string, chunkId: string, pageContent: string, metadata: Record<string, any>) {
    const response = await axios.put(
      `${this.baseUrl}/document-store/chunks/${storeId}/${loaderId}/${chunkId}`,
      { pageContent, metadata },
      { headers: this.headers }
    );
    return response.data;
  }

  async deleteChunk(storeId: string, loaderId: string, chunkId: string) {
    const response = await axios.delete(
      `${this.baseUrl}/document-store/chunks/${storeId}/${loaderId}/${chunkId}`,
      { headers: this.headers }
    );
    return response.data;
  }
}
