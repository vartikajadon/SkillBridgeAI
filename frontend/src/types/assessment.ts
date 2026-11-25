export interface AssessmentCatalogueItem {
  id: string;
  title: string;
  course_id?: string | null;
  course_title?: string | null;
  course_code?: string | null;
  total_marks: number;
  passing_marks: number;
  question_count: number;
  duration_minutes: number;
  competencies_evaluated: string[];
  completed_attempts_count: number;
  last_attempt_score: number | null;
  last_attempt_percentage: number | null;
  last_attempt_passed: boolean | null;
  course_progress_percentage?: number | null;
  course_completed?: boolean;
  is_locked?: boolean;
  lock_reason?: string | null;
}

export interface SanitizedQuestion {
  id: string;
  prompt: string;
  options: string[];
  points: number;
  difficulty_level: number;
  competency_code: string;
}

export interface AssessmentDetailResponse {
  id: string;
  title: string;
  total_marks: number;
  passing_marks: number;
  question_count: number;
  duration_minutes: number;
  questions: SanitizedQuestion[];
}

export interface AssessmentSubmitRequest {
  answers: Record<string, number | null>;
}

export interface EvaluatedQuestionItem {
  question_id: string;
  competency_code: string;
  prompt: string;
  options: string[];
  selected_index: number | null;
  correct_index: number;
  is_correct: boolean;
  points_earned: number;
  max_points: number;
  difficulty_level: number;
  explanation: string | null;
}

export interface CompetencyPerformanceItem {
  competency_code: string;
  competency_name: string;
  earned_points: number;
  total_points: number;
  percentage: number;
  current_level: number;
  target_level: number | null;
  gap_score: number | null;
  criticality: string | null;
  is_strength: boolean;
  is_priority: boolean;
  questions_evaluated: number;
}

export interface AssessmentResultResponse {
  attempt_id: string;
  quiz_id: string;
  quiz_title: string;
  total_score: number;
  max_score: number;
  percentage: number;
  passed: boolean;
  passing_marks: number;
  submitted_at: string;
  questions: EvaluatedQuestionItem[];
  competency_results: CompetencyPerformanceItem[];
  strengths: CompetencyPerformanceItem[];
  priorities: CompetencyPerformanceItem[];
}

export interface AssessmentHistoryItem {
  attempt_id: string;
  quiz_id: string;
  quiz_title: string;
  score: number;
  percentage: number;
  passed: boolean;
  started_at: string;
  completed_at: string | null;
}

export interface SkillGapItem {
  competency_id: string;
  competency_code: string;
  competency_name: string;
  category: string;
  current_level: number | null;
  target_level: number;
  gap_score: number | null;
  criticality: 'Mandatory' | 'Desirable' | string;
  status: 'Strength' | 'Priority' | 'Unassessed' | string;
  last_assessed_at: string | null;
}

export interface SkillGapAnalysisResponse {
  job_role_title: string | null;
  job_role_code: string | null;
  department: string | null;
  total_competencies_tracked: number;
  strengths_count: number;
  priorities_count: number;
  average_gap_score: number;
  competencies: SkillGapItem[];
  strengths: SkillGapItem[];
  priorities: SkillGapItem[];
}
