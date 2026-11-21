export interface AdminExecutiveMetrics {
  total_learners: number;
  active_learner_accounts: number;
  total_trainers: number;
  total_admins: number;
  total_courses: number;
  published_courses: number;
  total_documents: number;
  published_documents: number;
  total_quizzes: number;
  published_quizzes: number;
  total_quiz_attempts: number;
  completed_quiz_attempts: number;
  average_assessment_score: number;
  quiz_pass_rate: number;
  course_completion_rate: number;
  overall_enrollments: number;
  document_publication_ratio: number;
}

export interface MonthlyTrendPoint {
  month: string;
  registrations: number;
  monthly_active_learners: number;
  course_completions: number;
  quiz_attempts: number;
}

export interface DepartmentCompetencyMetric {
  department: string;
  total_learners: number;
  active_learners: number;
  assessed_learners: number;
  assessment_coverage_pct: number;
  average_gap_score: number;
  average_assessment_score: number;
  top_deficit_competency?: string | null;
}

export interface CourseCatalogItem {
  id: string;
  code: string;
  title: string;
  provider: string;
  duration_hours: number;
  status: string;
}

export interface CompetencyCatalogItem {
  id: string;
  code: string;
  name: string;
  category: string;
  description?: string | null;
}

export interface JobRoleCatalogItem {
  id: string;
  code: string;
  title: string;
  department: string;
  description?: string | null;
}
