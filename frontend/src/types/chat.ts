export interface SourceCitation {
  citation_id: string;
  document_id: string;
  document_title: string;
  chunk_id: string;
  chunk_index: number;
  page_number?: number | null;
  excerpt: string;
  similarity_score: number;
}

export interface ChatAnswerResponse {
  answer: string;
  citations: SourceCitation[];
  is_grounded: boolean;
  refusal_reason?: string | null;
  retrieved_chunk_count: number;
}

export interface SourcePassageResponse {
  chunk_id: string;
  document_id: string;
  document_title: string;
  chunk_index: number;
  token_count: number;
  content: string;
  metadata: Record<string, unknown>;
}

export interface ChatCourseItem {
  id: string;
  code: string;
  title: string;
  provider: string;
  description?: string | null;
  competencies?: string[];
}

export interface ChatQueryRequest {
  question: string;
  conversation_id?: string;
  course_id?: string;
  competency_id?: string;
  document_id?: string;
  top_k?: number;
}

export interface ChatMessageItem {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  citations?: SourceCitation[];
  isGrounded?: boolean;
  refusalReason?: string | null;
  loading?: boolean;
}
