export interface EnrolledCourseItem {
  id: string;
  course_id: string;
  title: string;
  code: string;
  provider: string;
  duration_hours: number;
  status: string;
  progress_percentage: number;
  enrolled_at: string;
  completed_at: string | null;
}

export interface LearnerCompetencyItem {
  id: string;
  competency_id: string;
  name: string;
  code: string;
  category: string;
  current_level: number;
  target_level: number;
  gap_score: number;
  last_assessed_at: string | null;
}

export interface LearnerQuizAttemptItem {
  id: string;
  quiz_id: string;
  quiz_title: string;
  score: number;
  percentage: number;
  passed: boolean;
  completed_at: string | null;
}

export interface LearnerSummaryMetrics {
  enrolled_courses_count: number;
  completed_courses_count: number;
  in_progress_courses_count: number;
  average_progress: number;
  total_quizzes_taken: number;
  average_quiz_score: number;
  competencies_assessed_count: number;
  average_gap_score: number;
}

export interface LearnerDashboardResponse {
  summary: LearnerSummaryMetrics;
  enrolled_courses: EnrolledCourseItem[];
  competencies: LearnerCompetencyItem[];
  recent_quiz_attempts: LearnerQuizAttemptItem[];
}
