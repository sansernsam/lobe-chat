import { NextRequest, NextResponse } from 'next/server';
import { KnowledgeBaseService } from '@/services/knowledge-base.service';

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const query = searchParams.get('query');
    const storeId = searchParams.get('storeId');

    if (!query) {
      return NextResponse.json(
        { error: 'Query parameter is required' },
        { status: 400 }
      );
    }

    const knowledgeBase = new KnowledgeBaseService();
    const results = await knowledgeBase.searchDocuments(query, storeId || undefined);

    return NextResponse.json({ results });
  } catch (error: any) {
    console.error('Error searching documents:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const { content, metadata, storeId } = await req.json();

    if (!content) {
      return NextResponse.json(
        { error: 'Content is required' },
        { status: 400 }
      );
    }

    const knowledgeBase = new KnowledgeBaseService();
    const result = await knowledgeBase.addDocument(content, metadata || {}, storeId);

    return NextResponse.json({ result });
  } catch (error: any) {
    console.error('Error adding document:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const documentId = searchParams.get('documentId');
    const storeId = searchParams.get('storeId');

    if (!documentId || !storeId) {
      return NextResponse.json(
        { error: 'Both documentId and storeId are required' },
        { status: 400 }
      );
    }

    const knowledgeBase = new KnowledgeBaseService();
    const result = await knowledgeBase.deleteDocument(documentId, storeId);

    return NextResponse.json({ result });
  } catch (error: any) {
    console.error('Error deleting document:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
