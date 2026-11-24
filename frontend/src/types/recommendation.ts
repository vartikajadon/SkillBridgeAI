export interface CompetencyAddressedItem {
  competency_id: string;
  code: string;
  name: string;
  current_level: number | null;
  target_level: number;
  gap_score: number;
  target_level_achieved: number;
  criticality: string;
}

export interface CourseVideoModuleItem {
  id: string;
  module_number: number;
  title: string;
  duration_minutes: number;
  description: string;
  video_url?: string | null;
  is_completed?: boolean;
  content?: string | null;
}

export interface CourseRecommendationItem {
  course_id: string;
  code: string;
  title: string;
  description: string | null;
  provider: string;
  duration_hours: number;
  status: string;
  relevance_score: number;
  priority: 'High' | 'Medium' | 'Low' | string;
  reason: string;
  competencies_addressed: CompetencyAddressedItem[];
  is_enrolled: boolean;
  enrollment_status: string | null;
  progress_percentage: number | null;
  modules?: CourseVideoModuleItem[];
}

export interface CourseRecommendationsResponse {
  learner_id: string;
  job_role_title: string | null;
  total_gaps_identified: number;
  recommendations: CourseRecommendationItem[];
  summary_reason: string;
}

export interface LearningPathStepItem {
  step_number: number;
  course_id: string;
  code: string;
  title: string;
  provider: string;
  duration_hours: number;
  target_level_achieved: number;
  priority: string;
  relevance_score: number;
  reason: string;
  competencies_addressed: string[];
  is_enrolled: boolean;
  enrollment_status: string | null;
  progress_percentage: number | null;
  modules?: CourseVideoModuleItem[];
}

export interface LearningPathResponse {
  learner_id: string;
  job_role_title: string | null;
  total_steps: number;
  total_estimated_hours: number;
  steps: LearningPathStepItem[];
}

export interface EnrollmentCreateResponse {
  enrollment_id: string;
  course_id: string;
  course_title: string;
  status: string;
  progress_percentage: number;
  enrolled_at: string;
  message: string;
}
