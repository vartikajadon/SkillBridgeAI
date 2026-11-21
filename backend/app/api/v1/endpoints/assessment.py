"""
Assessment & Skill Gap Analysis Endpoints (Phase 4)
Provides role-tailored diagnostic assessments, secure submission grading,
competency ledger updates, historical attempts, and skill-gap ledgers for learners.
"""
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.api.deps import require_roles
from app.db.session import get_db
from app.models.competency import Competency, LearnerCompetency, RoleCompetency
from app.models.job_role import JobRole
from app.models.quiz import Quiz, QuizAttempt
from app.models.user import User
from app.schemas.assessment import (
    AssessmentCatalogueItem,
    AssessmentDetailResponse,
    AssessmentHistoryItem,
    AssessmentResultResponse,
    AssessmentSubmitRequest,
    CompetencyPerformanceItem,
    EvaluatedQuestionItem,
    SanitizedQuestion,
    SkillGapAnalysisResponse,
    SkillGapItem,
)
from app.services.assessment_engine import (
    evaluate_assessment,
    prioritize_gap_items,
    sanitize_questions_for_client,
)

router = APIRouter()


# -----------------------------------------------------------------------------
# 1. Assessment Catalogue (Role-Relevant)
# -----------------------------------------------------------------------------

@router.get(
    "/catalogue",
    response_model=List[AssessmentCatalogueItem],
    summary="List available diagnostic assessments relevant to learner's role",
    description="Returns published assessments tailored to the learner's assigned job role benchmarks.",
)
def get_assessment_catalogue(
    current_user: User = Depends(require_roles("learner")),
    db: Session = Depends(get_db),
) -> List[AssessmentCatalogueItem]:
    quizzes = (
        db.query(Quiz)
        .filter(Quiz.status == "published")
        .order_by(Quiz.created_at.desc())
        .all()
    )
    all_roles = db.query(JobRole).all()

    # Determine role-relevant competency codes if learner has an assigned job role
    role_comp_codes = set()
    role_keywords = set()
    if current_user.job_role_id:
        rc_codes = (
            db.query(Competency.code)
            .join(RoleCompetency, Competency.id == RoleCompetency.competency_id)
            .filter(RoleCompetency.job_role_id == current_user.job_role_id)
            .all()
        )
        role_comp_codes = {r[0] for r in rc_codes}

        job_role = db.query(JobRole).filter(JobRole.id == current_user.job_role_id).first()
        if job_role:
            role_keywords = {
                job_role.code.lower().replace("_", " "),
                job_role.title.lower(),
            }

    # Fetch learner's prior attempts
    user_attempts = (
        db.query(QuizAttempt)
        .filter(QuizAttempt.user_id == current_user.id)
        .order_by(QuizAttempt.started_at.desc())
        .all()
    )
    attempts_by_quiz: Dict[uuid.UUID, List[QuizAttempt]] = {}
    for att in user_attempts:
        attempts_by_quiz.setdefault(att.quiz_id, []).append(att)

    catalogue_items: List[AssessmentCatalogueItem] = []

    for quiz in quizzes:
        q_list = quiz.questions if isinstance(quiz.questions, list) else []
        quiz_comp_codes = list({q.get("competency_code") for q in q_list if q.get("competency_code")})

        title_lower = quiz.title.lower()

        # Check if quiz specifically targets a known job role in its title
        targeted_roles = [
            r for r in all_roles
            if r.title.lower() in title_lower or r.code.lower().replace("_", " ") in title_lower
        ]

        if targeted_roles:
            # Quiz explicitly designates a role: only show if learner has that role
            if not any(r.id == current_user.job_role_id for r in targeted_roles):
                continue
        elif current_user.job_role_id and role_comp_codes:
            # Fall back to competency matching
            has_matching_comp = any(c in role_comp_codes for c in quiz_comp_codes)
            if not has_matching_comp:
                continue

        prior_attempts = attempts_by_quiz.get(quiz.id, [])
        attempts_count = len(prior_attempts)
        last_attempt = prior_attempts[0] if prior_attempts else None

        q_count = len(q_list)
        duration_est = max(10, q_count * 2)

        catalogue_items.append(
            AssessmentCatalogueItem(
                id=quiz.id,
                title=quiz.title,
                total_marks=quiz.total_marks,
                passing_marks=quiz.passing_marks,
                question_count=q_count,
                duration_minutes=duration_est,
                competencies_evaluated=quiz_comp_codes,
                completed_attempts_count=attempts_count,
                last_attempt_score=last_attempt.score if last_attempt else None,
                last_attempt_percentage=last_attempt.percentage if last_attempt else None,
                last_attempt_passed=last_attempt.passed if last_attempt else None,
            )
        )

    return catalogue_items


# -----------------------------------------------------------------------------
# 2. Assessment History
# -----------------------------------------------------------------------------

@router.get(
    "/history",
    response_model=List[AssessmentHistoryItem],
    summary="List chronological assessment attempts taken by the learner",
    description="Returns previous assessment attempts, evaluated scores, pass status, and timestamps.",
)
def get_assessment_history(
    current_user: User = Depends(require_roles("learner")),
    db: Session = Depends(get_db),
) -> List[AssessmentHistoryItem]:
    attempts = (
        db.query(QuizAttempt, Quiz)
        .join(Quiz, QuizAttempt.quiz_id == Quiz.id)
        .filter(QuizAttempt.user_id == current_user.id)
        .order_by(QuizAttempt.started_at.desc())
        .all()
    )

    return [
        AssessmentHistoryItem(
            attempt_id=att.id,
            quiz_id=quiz.id,
            quiz_title=quiz.title,
            score=att.score,
            percentage=round(att.percentage, 1),
            passed=att.passed,
            started_at=att.started_at,
            completed_at=att.completed_at,
        )
        for att, quiz in attempts
    ]


# -----------------------------------------------------------------------------
# 3. Skill Gap Analysis
# -----------------------------------------------------------------------------

@router.get(
    "/gap-analysis",
    response_model=SkillGapAnalysisResponse,
    summary="Retrieve comprehensive skill gap analysis for learner's job role",
    description="Compares verified competency proficiency levels with role benchmarks, highlighting strengths and priority gaps.",
)
def get_skill_gap_analysis(
    current_user: User = Depends(require_roles("learner")),
    db: Session = Depends(get_db),
) -> SkillGapAnalysisResponse:
    job_role = (
        db.query(JobRole).filter(JobRole.id == current_user.job_role_id).first()
        if current_user.job_role_id
        else None
    )

    if not job_role:
        return SkillGapAnalysisResponse(
            job_role_title=None,
            job_role_code=None,
            department=current_user.department,
            total_competencies_tracked=0,
            strengths_count=0,
            priorities_count=0,
            average_gap_score=0.0,
            competencies=[],
            strengths=[],
            priorities=[],
        )

    # Fetch role benchmark targets
    role_comps = (
        db.query(RoleCompetency, Competency)
        .join(Competency, RoleCompetency.competency_id == Competency.id)
        .filter(RoleCompetency.job_role_id == job_role.id)
        .all()
    )

    # Fetch existing learner competency records
    learner_comps = (
        db.query(LearnerCompetency)
        .filter(LearnerCompetency.user_id == current_user.id)
        .all()
    )
    lc_map = {lc.competency_id: lc for lc in learner_comps}

    gap_items: List[SkillGapItem] = []
    assessed_gap_scores: List[int] = []

    for rc, comp in role_comps:
        lc = lc_map.get(comp.id)
        if lc and lc.last_assessed_at is not None:
            curr_lvl = lc.current_level
            gap = max(0, rc.target_level - curr_lvl)
            assessed_gap_scores.append(gap)
            status_label = "Strength" if gap == 0 else "Priority"
            last_assessed = lc.last_assessed_at
        else:
            curr_lvl = None
            gap = None
            status_label = "Unassessed"
            last_assessed = None

        gap_items.append(
            SkillGapItem(
                competency_id=comp.id,
                competency_code=comp.code,
                competency_name=comp.name,
                category=comp.category,
                current_level=curr_lvl,
                target_level=rc.target_level,
                gap_score=gap,
                criticality=rc.criticality,
                status=status_label,
                last_assessed_at=last_assessed,
            )
        )

    strengths = [item for item in gap_items if item.status == "Strength"]

    # Priority sorting: Mandatory before Desirable, then largest gap
    def priority_sort_key(item: SkillGapItem):
        crit_rank = 0 if item.criticality == "Mandatory" else 1
        gap_val = item.gap_score if item.gap_score is not None else -1
        return (crit_rank, -gap_val, item.competency_code)

    priorities = sorted(
        [item for item in gap_items if item.status == "Priority"],
        key=priority_sort_key,
    )

    avg_gap = (
        round(sum(assessed_gap_scores) / len(assessed_gap_scores), 1)
        if assessed_gap_scores
        else 0.0
    )

    return SkillGapAnalysisResponse(
        job_role_title=job_role.title,
        job_role_code=job_role.code,
        department=job_role.department,
        total_competencies_tracked=len(gap_items),
        strengths_count=len(strengths),
        priorities_count=len(priorities),
        average_gap_score=avg_gap,
        competencies=gap_items,
        strengths=strengths,
        priorities=priorities,
    )


# -----------------------------------------------------------------------------
# 4. Assessment Intake / Question Delivery (Sanitized)
# -----------------------------------------------------------------------------

@router.get(
    "/{quiz_id}",
    response_model=AssessmentDetailResponse,
    summary="Fetch sanitized assessment questions for intake",
    description="Delivers question prompts and options without answer keys or grading rubrics.",
)
def get_assessment_details(
    quiz_id: uuid.UUID,
    current_user: User = Depends(require_roles("learner")),
    db: Session = Depends(get_db),
) -> AssessmentDetailResponse:
    quiz = db.query(Quiz).filter(Quiz.id == quiz_id, Quiz.status == "published").first()
    if not quiz:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Assessment with ID '{quiz_id}' was not found or is not published.",
        )

    try:
        sanitized = sanitize_questions_for_client(quiz.questions)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Malformed assessment question bank: {str(e)}",
        )

    q_count = len(sanitized)
    return AssessmentDetailResponse(
        id=quiz.id,
        title=quiz.title,
        total_marks=quiz.total_marks,
        passing_marks=quiz.passing_marks,
        question_count=q_count,
        duration_minutes=max(10, q_count * 2),
        questions=[SanitizedQuestion(**q) for q in sanitized],
    )


# -----------------------------------------------------------------------------
# 5. Assessment Submission & Evaluation
# -----------------------------------------------------------------------------

@router.post(
    "/{quiz_id}/submit",
    response_model=AssessmentResultResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Submit assessment answers, grade results, and update competency ledger",
    description="Evaluates submitted responses on backend, preserves attempt record, and updates learner competencies.",
)
def submit_assessment(
    quiz_id: uuid.UUID,
    submission: AssessmentSubmitRequest,
    current_user: User = Depends(require_roles("learner")),
    db: Session = Depends(get_db),
) -> AssessmentResultResponse:
    quiz = db.query(Quiz).filter(Quiz.id == quiz_id, Quiz.status == "published").first()
    if not quiz:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Assessment with ID '{quiz_id}' was not found or is not published.",
        )

    # 1. Fetch benchmark targets for learner's job role
    role_benchmarks: Dict[str, Dict[str, Any]] = {}
    if current_user.job_role_id:
        rc_rows = (
            db.query(RoleCompetency, Competency)
            .join(Competency, RoleCompetency.competency_id == Competency.id)
            .filter(RoleCompetency.job_role_id == current_user.job_role_id)
            .all()
        )
        for rc, comp in rc_rows:
            role_benchmarks[comp.code] = {
                "target_level": rc.target_level,
                "criticality": rc.criticality,
                "competency_id": comp.id,
                "competency_name": comp.name,
            }

    # 2. Grade submission using centralized assessment engine
    try:
        result = evaluate_assessment(
            questions=quiz.questions,
            learner_answers=submission.answers,
            passing_marks=float(quiz.passing_marks),
            role_benchmarks=role_benchmarks,
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )

    now = datetime.now(timezone.utc)

    # 3. Transactional persistence: QuizAttempt + LearnerCompetency ledger
    try:
        # Create immutable attempt record
        attempt = QuizAttempt(
            id=uuid.uuid4(),
            quiz_id=quiz.id,
            user_id=current_user.id,
            score=int(result.total_score),
            percentage=result.percentage,
            passed=result.passed,
            answers={
                "submitted_answers": submission.answers,
                "total_score": result.total_score,
                "max_score": result.max_score,
                "percentage": result.percentage,
                "passed": result.passed,
                "competency_breakdown": {
                    c_code: {
                        "percentage": c_eval.percentage,
                        "current_level": c_eval.current_level,
                        "target_level": c_eval.target_level,
                        "gap_score": c_eval.gap_score,
                    }
                    for c_code, c_eval in result.competency_results.items()
                },
            },
            started_at=now,
            completed_at=now,
        )
        db.add(attempt)

        # Update LearnerCompetency ONLY for competencies evaluated in this assessment
        tested_codes = list(result.competency_results.keys())
        comp_records = db.query(Competency).filter(Competency.code.in_(tested_codes)).all()
        comp_map = {c.code: c for c in comp_records}

        for c_code, c_eval in result.competency_results.items():
            comp_obj = comp_map.get(c_code)
            if not comp_obj:
                continue

            l_comp = (
                db.query(LearnerCompetency)
                .filter(
                    LearnerCompetency.user_id == current_user.id,
                    LearnerCompetency.competency_id == comp_obj.id,
                )
                .first()
            )

            bench = role_benchmarks.get(c_code)
            target_lvl = bench["target_level"] if bench else (l_comp.target_level if l_comp else 1)
            gap = max(0, target_lvl - c_eval.current_level)

            if l_comp:
                l_comp.current_level = c_eval.current_level
                l_comp.target_level = target_lvl
                l_comp.gap_score = gap
                l_comp.last_assessed_at = now
            else:
                l_comp = LearnerCompetency(
                    id=uuid.uuid4(),
                    user_id=current_user.id,
                    competency_id=comp_obj.id,
                    current_level=c_eval.current_level,
                    target_level=target_lvl,
                    gap_score=gap,
                    last_assessed_at=now,
                )
                db.add(l_comp)

        db.commit()
        db.refresh(attempt)

    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to persist assessment attempt and competency updates. Transaction rolled back.",
        )

    # 4. Construct comprehensive result response
    evaluated_questions = [
        EvaluatedQuestionItem(
            question_id=q.question_id,
            competency_code=q.competency_code,
            prompt=q.prompt,
            options=q.options,
            selected_index=q.selected_index,
            correct_index=q.correct_index,
            is_correct=q.is_correct,
            points_earned=q.points_earned,
            max_points=q.max_points,
            difficulty_level=q.difficulty_level,
            explanation=q.explanation,
        )
        for q in result.questions
    ]

    competency_perf_items = []
    for c_code, c_eval in result.competency_results.items():
        comp_obj = comp_map.get(c_code)
        c_name = comp_obj.name if comp_obj else c_code
        competency_perf_items.append(
            CompetencyPerformanceItem(
                competency_code=c_code,
                competency_name=c_name,
                earned_points=c_eval.earned_points,
                total_points=c_eval.total_points,
                percentage=c_eval.percentage,
                current_level=c_eval.current_level,
                target_level=c_eval.target_level,
                gap_score=c_eval.gap_score,
                criticality=c_eval.criticality,
                is_strength=c_eval.is_strength,
                is_priority=c_eval.is_priority,
                questions_evaluated=c_eval.questions_evaluated,
            )
        )

    strength_items = [c for c in competency_perf_items if c.is_strength]
    priority_items = [c for c in competency_perf_items if c.is_priority]

    return AssessmentResultResponse(
        attempt_id=attempt.id,
        quiz_id=quiz.id,
        quiz_title=quiz.title,
        total_score=result.total_score,
        max_score=result.max_score,
        percentage=result.percentage,
        passed=result.passed,
        passing_marks=result.passing_marks,
        submitted_at=now,
        questions=evaluated_questions,
        competency_results=competency_perf_items,
        strengths=strength_items,
        priorities=priority_items,
    )
