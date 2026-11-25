export interface TrainerCompetencyItem {
  id: string;
  code: string;
  name: string;
  category: string;
  description?: string | null;
}

export interface TrainerDocumentItem {
  id: string;
  title: string;
  file_name: string;
  file_size_bytes: number;
  mime_type: string;
  status: 'pending' | 'processed' | 'failed' | string;
  chunk_count: number;
  is_published?: boolean;
  competency_id?: string | null;
  competency_code?: string | null;
  competency_name?: string | null;
  created_at: string;
}

export interface DocumentUploadResponse {
  id: string;
  title: string;
  file_name: string;
  file_size_bytes: number;
  mime_type: string;
  status: string;
  chunk_count: number;
  is_published?: boolean;
  competency_id?: string | null;
  competency_code?: string | null;
  competency_name?: string | null;
  created_at: string;
}

export interface QuizQuestion {
  id: string;
  prompt: string;
  competency_code: string;
  options: string[];
  correct_index: number;
  points: number;
  difficulty_level: number;
  explanation?: string;
  source_document_id?: string;
  source_chunk_index?: number;
  generator_mode?: string;
}

export interface TrainerQuizDetailResponse {
  id: string;
  title: string;
  status: 'draft' | 'published' | 'archived' | string;
  competency_id: string | null;
  competency_code: string | null;
  total_marks: number;
  passing_marks: number;
  question_count: number;
  created_at: string;
  updated_at: string;
  questions: QuizQuestion[];
  attempts_count: number;
}

export interface TrainerQuizListItem {
  id: string;
  title: string;
  status: 'draft' | 'published' | 'archived' | string;
  competency_code: string | null;
  total_marks: number;
  passing_marks: number;
  question_count: number;
  attempts_count: number;
  pass_rate: number;
  created_at: string;
  updated_at: string;
}

export interface TrainerSummaryMetrics {
  total_documents_uploaded: number;
  processed_documents_count: number;
  total_quizzes_created: number;
  total_attempts_received: number;
  average_pass_rate: number;
}

export interface TrainerLearnerAttemptItem {
  id: string;
  quiz_id: string;
  quiz_title: string;
  learner_name: string;
  learner_email: string;
  score: number;
  percentage: number;
  passed: boolean;
  completed_at: string | null;
}

export interface TrainerCourseItem {
  id: string;
  code: string;
  title: string;
  description: string | null;
  provider: string;
  duration_hours: number;
  status: 'draft' | 'published' | 'archived' | string;
  target_role?: string | null;
  competencies: string[];
  enrollments_count: number;
  created_at: string;
  updated_at: string;
}

export interface TrainerCourseModuleItem {
  id: string;
  course_id: string;
  course_code: string;
  course_title: string;
  module_number: number;
  title: string;
  description?: string | null;
  duration_minutes: number;
  video_url?: string | null;
  content?: string | null;
  document_id?: string | null;
  document_title?: string | null;
  skills_covered: string[];
  is_published: boolean;
  created_at: string;
}

export interface TrainerDashboardResponse {
  summary: TrainerSummaryMetrics;
  documents: TrainerDocumentItem[];
  quizzes: TrainerQuizListItem[];
  recent_attempts: TrainerLearnerAttemptItem[];
}

