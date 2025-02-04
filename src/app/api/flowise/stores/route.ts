import { NextRequest, NextResponse } from 'next/server';
import { KnowledgeBaseService } from '@/services/knowledge-base.service';

export async function GET(req: NextRequest) {
  try {
    const knowledgeBase = new KnowledgeBaseService();
    const stores = await knowledgeBase.listDocumentStores();
    return NextResponse.json({ stores });
  } catch (error: any) {
    console.error('Error listing document stores:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const { storeId } = await req.json();
    
    if (!storeId) {
      return NextResponse.json(
        { error: 'Store ID is required' },
        { status: 400 }
      );
    }

    const knowledgeBase = new KnowledgeBaseService();
    const store = await knowledgeBase.getDocumentStore(storeId);
    
    return NextResponse.json({ store });
  } catch (error: any) {
    console.error('Error getting document store:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
