"""
Centralized Assessment Scoring & Competency Gap Analysis Engine (Phase 4)

Pure algorithmic service independent of FastAPI and database sessions:
- Server-side question and option validation (rejects invalid IDs/indices).
- Objective MCQ grading with zero trust for client-submitted scores.
- Competency-wise score aggregation and proficiency level mapping (Levels 1-5).
- Skill gap analysis: gap = max(0, target_level - current_level).
- Prioritization of skill gaps (Mandatory > Desirable, then largest gap).
- Question sanitization helper (strips answer keys before client intake).
"""
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional


@dataclass
class QuestionEvaluation:
    question_id: str
    competency_code: str
    prompt: str
    options: List[str]
    selected_index: Optional[int]
    correct_index: int
    is_correct: bool
    points_earned: float
    max_points: float
    difficulty_level: int
    explanation: Optional[str] = None


@dataclass
class CompetencyEvaluation:
    competency_code: str
    earned_points: float
    total_points: float
    percentage: float
    current_level: int
    target_level: Optional[int] = None
    gap_score: Optional[int] = None
    criticality: Optional[str] = None
    is_strength: bool = False
    is_priority: bool = False
    questions_evaluated: int = 0


@dataclass
class AssessmentResult:
    total_score: float
    max_score: float
    percentage: float
    passed: bool
    passing_marks: float
    questions: List[QuestionEvaluation] = field(default_factory=list)
    competency_results: Dict[str, CompetencyEvaluation] = field(default_factory=dict)
    strengths: List[CompetencyEvaluation] = field(default_factory=list)
    priorities: List[CompetencyEvaluation] = field(default_factory=list)


def validate_quiz_definition(questions: List[Dict[str, Any]]) -> None:
    """Validates structure and integrity of a quiz/assessment question bank.
    Raises ValueError if any question definition is malformed.
    """
    if not isinstance(questions, list) or len(questions) == 0:
        raise ValueError("Assessment definition must contain a non-empty list of questions.")

    seen_ids = set()
    for idx, q in enumerate(questions):
        if not isinstance(q, dict):
            raise ValueError(f"Question at index {idx} must be a dictionary.")

        q_id = q.get("id")
        if not q_id or not isinstance(q_id, str):
            raise ValueError(f"Question at index {idx} missing valid 'id' string.")
        if q_id in seen_ids:
            raise ValueError(f"Duplicate question ID '{q_id}' detected at index {idx}.")
        seen_ids.add(q_id)

        prompt = q.get("prompt")
        if not prompt or not isinstance(prompt, str) or not prompt.strip():
            raise ValueError(f"Question '{q_id}' missing non-empty 'prompt'.")

        comp_code = q.get("competency_code")
        if not comp_code or not isinstance(comp_code, str) or not comp_code.strip():
            raise ValueError(f"Question '{q_id}' missing valid 'competency_code'.")

        options = q.get("options")
        if not isinstance(options, list) or len(options) < 2:
            raise ValueError(f"Question '{q_id}' must provide at least 2 options.")
        for opt_idx, opt in enumerate(options):
            if not isinstance(opt, str) or not opt.strip():
                raise ValueError(f"Question '{q_id}' has invalid empty option at index {opt_idx}.")

        correct_idx = q.get("correct_index")
        if not isinstance(correct_idx, int) or correct_idx < 0 or correct_idx >= len(options):
            raise ValueError(
                f"Question '{q_id}' has invalid 'correct_index' ({correct_idx}). "
                f"Must be integer between 0 and {len(options) - 1}."
            )

        points = q.get("points")
        if not isinstance(points, (int, float)) or points <= 0:
            raise ValueError(f"Question '{q_id}' must define 'points' greater than 0.")

        diff = q.get("difficulty_level", 1)
        if not isinstance(diff, int) or diff < 1 or diff > 5:
            raise ValueError(f"Question '{q_id}' 'difficulty_level' must be an integer between 1 and 5.")


def sanitize_questions_for_client(questions: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Strips correct answer indices and explanations before serving questions to learners."""
    validate_quiz_definition(questions)
    sanitized = []
    for q in questions:
        sanitized.append({
            "id": q["id"],
            "competency_code": q["competency_code"],
            "difficulty_level": q.get("difficulty_level", 1),
            "points": q["points"],
            "prompt": q["prompt"],
            "options": list(q["options"]),
        })
    return sanitized


def map_percentage_to_level(percentage: float) -> int:
    """Translates a competency percentage score into a verified 1-5 proficiency level:
    - Below 40% = Level 1 (Novice)
    - 40% to 59.9% = Level 2 (Foundational)
    - 60% to 74.9% = Level 3 (Competent)
    - 75% to 89.9% = Level 4 (Proficient)
    - 90% and above = Level 5 (Expert)
    """
    if percentage < 0.0:
        pct = 0.0
    elif percentage > 100.0:
        pct = 100.0
    else:
        pct = percentage

    if pct < 40.0:
        return 1
    elif pct < 60.0:
        return 2
    elif pct < 75.0:
        return 3
    elif pct < 90.0:
        return 4
    else:
        return 5


def calculate_skill_gap(current_level: int, target_level: int) -> int:
    """Calculates skill gap score clamped at zero: gap = max(0, target_level - current_level)."""
    return max(0, target_level - current_level)


def prioritize_gap_items(competencies: List[CompetencyEvaluation]) -> List[CompetencyEvaluation]:
    """Sorts identified skill gaps for targeted capacity building:
    1. Criticality: 'Mandatory' before 'Desirable'
    2. Gap Size: descending (larger skill gap first)
    3. Competency Code: alphabetical tie-breaker
    """
    def sort_key(item: CompetencyEvaluation):
        crit_rank = 0 if item.criticality == "Mandatory" else (1 if item.criticality == "Desirable" else 2)
        gap = item.gap_score if item.gap_score is not None else 0
        return (crit_rank, -gap, item.competency_code)

    gaps = [c for c in competencies if (c.gap_score or 0) > 0]
    return sorted(gaps, key=sort_key)


def evaluate_assessment(
    questions: List[Dict[str, Any]],
    learner_answers: Dict[str, Any],
    passing_marks: float = 60.0,
    role_benchmarks: Optional[Dict[str, Dict[str, Any]]] = None,
) -> AssessmentResult:
    """Core evaluation engine:
    1. Validates quiz schema and learner response keys/indices.
    2. Computes question-level correctness and marks.
    3. Aggregates earned vs. possible marks per competency.
    4. Evaluates verified proficiency levels (1-5).
    5. Computes skill gaps against role benchmarks.
    6. Identifies strengths and prioritized improvement areas.
    """
    # 1. Validate server-side quiz definition
    validate_quiz_definition(questions)

    if not isinstance(learner_answers, dict):
        raise ValueError("Learner answers must be provided as a dictionary mapping question IDs to option indices.")

    question_map = {q["id"]: q for q in questions}

    # 2. Validate client answer keys (reject unknown questions)
    for q_id, selected_idx in learner_answers.items():
        if q_id not in question_map:
            raise ValueError(f"Unknown question ID '{q_id}' found in submission.")
        target_q = question_map[q_id]
        if selected_idx is not None:
            if not isinstance(selected_idx, int) or selected_idx < 0 or selected_idx >= len(target_q["options"]):
                raise ValueError(
                    f"Invalid option index ({selected_idx}) for question '{q_id}'. "
                    f"Must be between 0 and {len(target_q['options']) - 1}."
                )

    # 3. Grade each question
    evaluated_questions: List[QuestionEvaluation] = []
    comp_points_earned: Dict[str, float] = {}
    comp_points_total: Dict[str, float] = {}
    comp_question_counts: Dict[str, int] = {}

    for q in questions:
        q_id = q["id"]
        comp_code = q["competency_code"]
        max_pts = float(q["points"])
        correct_idx = q["correct_index"]
        diff = q.get("difficulty_level", 1)
        explanation = q.get("explanation")

        selected_idx = learner_answers.get(q_id)
        if selected_idx is not None and selected_idx == correct_idx:
            pts_earned = max_pts
            is_corr = True
        else:
            pts_earned = 0.0
            is_corr = False

        evaluated_questions.append(
            QuestionEvaluation(
                question_id=q_id,
                competency_code=comp_code,
                prompt=q["prompt"],
                options=list(q["options"]),
                selected_index=selected_idx,
                correct_index=correct_idx,
                is_correct=is_corr,
                points_earned=pts_earned,
                max_points=max_pts,
                difficulty_level=diff,
                explanation=explanation,
            )
        )

        # Track per-competency tallies
        comp_points_earned[comp_code] = comp_points_earned.get(comp_code, 0.0) + pts_earned
        comp_points_total[comp_code] = comp_points_total.get(comp_code, 0.0) + max_pts
        comp_question_counts[comp_code] = comp_question_counts.get(comp_code, 0) + 1

    # 4. Total score & pass/fail
    total_score = round(sum(q.points_earned for q in evaluated_questions), 2)
    max_score = round(sum(q.max_points for q in evaluated_questions), 2)
    overall_percentage = round((total_score / max_score) * 100.0, 2) if max_score > 0 else 0.0
    passed = total_score >= passing_marks

    # 5. Evaluate competencies actually tested
    competency_results: Dict[str, CompetencyEvaluation] = {}
    strengths: List[CompetencyEvaluation] = []
    priorities_raw: List[CompetencyEvaluation] = []

    role_benchmarks = role_benchmarks or {}

    for comp_code, total_pts in comp_points_total.items():
        earned_pts = comp_points_earned.get(comp_code, 0.0)
        pct = round((earned_pts / total_pts) * 100.0, 2) if total_pts > 0 else 0.0
        current_lvl = map_percentage_to_level(pct)

        bench = role_benchmarks.get(comp_code)
        if bench:
            target_lvl = bench.get("target_level")
            crit = bench.get("criticality")
            gap = calculate_skill_gap(current_lvl, target_lvl) if target_lvl is not None else None
            is_str = (gap == 0)
            is_prio = (gap or 0) > 0
        else:
            target_lvl = None
            crit = None
            gap = None
            is_str = (current_lvl >= 4)
            is_prio = (current_lvl <= 2)

        comp_eval = CompetencyEvaluation(
            competency_code=comp_code,
            earned_points=round(earned_pts, 2),
            total_points=round(total_pts, 2),
            percentage=pct,
            current_level=current_lvl,
            target_level=target_lvl,
            gap_score=gap,
            criticality=crit,
            is_strength=is_str,
            is_priority=is_prio,
            questions_evaluated=comp_question_counts.get(comp_code, 0),
        )

        competency_results[comp_code] = comp_eval
        if is_str:
            strengths.append(comp_eval)
        if is_prio:
            priorities_raw.append(comp_eval)

    # 6. Prioritize development items
    prioritized_list = prioritize_gap_items(priorities_raw) if role_benchmarks else priorities_raw

    return AssessmentResult(
        total_score=total_score,
        max_score=max_score,
        percentage=overall_percentage,
        passed=passed,
        passing_marks=passing_marks,
        questions=evaluated_questions,
        competency_results=competency_results,
        strengths=strengths,
        priorities=prioritized_list,
    )
