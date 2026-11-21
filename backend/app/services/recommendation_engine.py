"""
Recommendation Engine Service for SkillBridge AI (Phase 5)
Provides deterministic, explainable course recommendations and learning path generation
based on verified competency gaps, statutory criticality, and pedagogical progression.

Ranking Formula:
    For each published course c:
        If learner completed course c: exclude from recommendations.
        For each competency k mapped to course c:
            If learner has gap_k = max(0, target_level_k - current_level_k) > 0:
                CritScore = WEIGHT_MANDATORY (20.0) if Mandatory else WEIGHT_DESIRABLE (10.0)
                GapScore = gap_k * WEIGHT_GAP_PER_POINT (15.0)
                LevelScore = WEIGHT_LEVEL_ALIGNMENT_EXACT (10.0) if achieved >= target else WEIGHT_LEVEL_ALIGNMENT_STEP (5.0)
                CompetencyScore = CritScore + GapScore + LevelScore
        SynergyScore = max(0, (count_matching_gaps - 1) * WEIGHT_MULTI_COMPETENCY_BONUS (5.0))
        TotalScore = Sum(CompetencyScore) + SynergyScore

Tie-Breaking (100% Deterministic):
    1. Relevance Score (descending)
    2. Count of Mandatory competencies addressed (descending)
    3. Sum of gap scores addressed (descending)
    4. Course duration in hours (ascending)
    5. Course code (alphabetical ascending)
"""
import uuid
from typing import Any, Dict, List, Optional, Set, Tuple
from sqlalchemy.orm import Session

from app.models.competency import Competency, LearnerCompetency, RoleCompetency
from app.models.course import Course, CourseCompetency, Enrollment
from app.models.job_role import JobRole
from app.models.user import User
from app.schemas.recommendation import (
    CompetencyAddressedItem,
    CourseRecommendationItem,
    CourseRecommendationsResponse,
    LearningPathResponse,
    LearningPathStepItem,
)

# -----------------------------------------------------------------------------
# Configurable Scoring Weights
# -----------------------------------------------------------------------------
WEIGHT_MANDATORY: float = 20.0
WEIGHT_DESIRABLE: float = 10.0
WEIGHT_NON_ROLE: float = 5.0
WEIGHT_GAP_PER_POINT: float = 15.0
WEIGHT_LEVEL_ALIGNMENT_EXACT: float = 10.0
WEIGHT_LEVEL_ALIGNMENT_STEP: float = 5.0
WEIGHT_MULTI_COMPETENCY_BONUS: float = 5.0
WEIGHT_FOUNDATIONAL_ONBOARDING: float = 12.0


def calculate_course_relevance(
    course: Course,
    gap_map: Dict[uuid.UUID, Dict[str, Any]],
    is_unassessed_learner: bool = False,
) -> Tuple[float, str, str, List[CompetencyAddressedItem]]:
    """Calculates deterministic relevance score, priority classification,
    and plain-language explanation for a course given a learner's gap map.
    """
    total_score: float = 0.0
    addressed_items: List[CompetencyAddressedItem] = []
    reason_clauses: List[str] = []
    mandatory_count: int = 0

    for cc in course.course_competencies:
        comp_id = cc.competency_id
        achieved_level = cc.target_level_achieved
        comp_obj: Competency = cc.competency

        if comp_id in gap_map:
            info = gap_map[comp_id]
            crit = info.get("criticality", "Desirable")
            target = info.get("target_level", achieved_level)
            current = info.get("current_level")
            gap = info.get("gap_score", 0)

            if is_unassessed_learner:
                # Learner has no assessment history. Prioritize foundational role competencies.
                crit_weight = WEIGHT_MANDATORY if crit == "Mandatory" else WEIGHT_DESIRABLE
                comp_score = crit_weight + (achieved_level * 5.0)
                total_score += comp_score
                if crit == "Mandatory":
                    mandatory_count += 1

                addressed_items.append(
                    CompetencyAddressedItem(
                        competency_id=comp_id,
                        code=comp_obj.code,
                        name=comp_obj.name,
                        current_level=None,
                        target_level=target,
                        gap_score=target,
                        target_level_achieved=achieved_level,
                        criticality=crit,
                    )
                )
                reason_clauses.append(
                    f"Builds foundational {crit.lower()} competency in {comp_obj.name} (Delivers Level {achieved_level})"
                )

            elif gap > 0:
                # Assessed learner with verified competency gap
                crit_weight = WEIGHT_MANDATORY if crit == "Mandatory" else WEIGHT_DESIRABLE
                if crit == "Mandatory":
                    mandatory_count += 1

                gap_weight = gap * WEIGHT_GAP_PER_POINT
                level_bonus = (
                    WEIGHT_LEVEL_ALIGNMENT_EXACT
                    if achieved_level >= target
                    else WEIGHT_LEVEL_ALIGNMENT_STEP
                )

                comp_score = crit_weight + gap_weight + level_bonus
                total_score += comp_score

                addressed_items.append(
                    CompetencyAddressedItem(
                        competency_id=comp_id,
                        code=comp_obj.code,
                        name=comp_obj.name,
                        current_level=current,
                        target_level=target,
                        gap_score=gap,
                        target_level_achieved=achieved_level,
                        criticality=crit,
                    )
                )

                alignment_desc = (
                    f"fully meets role target L{target}"
                    if achieved_level >= target
                    else f"advances level to L{achieved_level}"
                )
                reason_clauses.append(
                    f"Addresses {crit} gap in {comp_obj.name} (L{current} → L{target}, Gap {gap}; {alignment_desc})"
                )

    if not addressed_items:
        return 0.0, "Low", "No direct alignment with current competency development priorities.", []

    # Multi-competency synergy bonus
    if len(addressed_items) > 1:
        synergy = (len(addressed_items) - 1) * WEIGHT_MULTI_COMPETENCY_BONUS
        total_score += synergy
        reason_clauses.append(f"High-efficiency module addressing {len(addressed_items)} priorities simultaneously.")

    # Determine priority tier
    if total_score >= 50.0 or mandatory_count >= 1 and total_score >= 40.0:
        priority = "High"
    elif total_score >= 25.0:
        priority = "Medium"
    else:
        priority = "Low"

    explanation = "; ".join(reason_clauses)
    return round(total_score, 1), priority, explanation, addressed_items


def get_personalized_recommendations(
    db: Session,
    learner: User,
) -> CourseRecommendationsResponse:
    """Generates personalized course recommendations for the authenticated learner."""
    # 1. Fetch learner's active enrollments to detect enrolled & completed courses
    enrollments = (
        db.query(Enrollment)
        .filter(Enrollment.user_id == learner.id)
        .all()
    )
    completed_course_ids: Set[uuid.UUID] = {
        e.course_id for e in enrollments if e.status == "completed"
    }
    active_enrollment_map: Dict[uuid.UUID, Enrollment] = {
        e.course_id: e for e in enrollments if e.status != "completed"
    }

    # 2. Fetch learner's verified competency records
    learner_comps = (
        db.query(LearnerCompetency)
        .filter(LearnerCompetency.user_id == learner.id)
        .all()
    )

    # 3. Fetch role benchmarks for the learner's assigned job role
    role_benchmarks: Dict[uuid.UUID, RoleCompetency] = {}
    job_role: Optional[JobRole] = None
    if learner.job_role_id:
        job_role = db.query(JobRole).filter(JobRole.id == learner.job_role_id).first()
        rcs = (
            db.query(RoleCompetency)
            .filter(RoleCompetency.job_role_id == learner.job_role_id)
            .all()
        )
        role_benchmarks = {rc.competency_id: rc for rc in rcs}

    # 4. Build gap map
    gap_map: Dict[uuid.UUID, Dict[str, Any]] = {}
    is_unassessed_learner = len(learner_comps) == 0

    if is_unassessed_learner:
        # Unassessed learner: map all role competencies as target priorities
        for comp_id, rc in role_benchmarks.items():
            gap_map[comp_id] = {
                "target_level": rc.target_level,
                "current_level": None,
                "gap_score": rc.target_level,
                "criticality": rc.criticality,
            }
        summary_reason = (
            f"You have not completed a diagnostic assessment yet. Showing foundational courses "
            f"tailored to core competencies for your role as {job_role.title if job_role else 'Civil Servant'}."
        )
    else:
        # Assessed learner: compute gaps based on verified levels and role targets
        for lc in learner_comps:
            rc = role_benchmarks.get(lc.competency_id)
            target = rc.target_level if rc else lc.target_level
            crit = rc.criticality if rc else "Desirable"
            gap = max(0, target - lc.current_level)

            if gap > 0:
                gap_map[lc.competency_id] = {
                    "target_level": target,
                    "current_level": lc.current_level,
                    "gap_score": gap,
                    "criticality": crit,
                }

        # Include any role competencies that were never assessed as unassessed gaps
        for comp_id, rc in role_benchmarks.items():
            if comp_id not in gap_map and not any(lc.competency_id == comp_id for lc in learner_comps):
                gap_map[comp_id] = {
                    "target_level": rc.target_level,
                    "current_level": 1,
                    "gap_score": rc.target_level - 1,
                    "criticality": rc.criticality,
                }

        if not gap_map:
            summary_reason = (
                "Outstanding achievement! You have met or exceeded all target competency benchmarks "
                "for your current job role. No remedial course interventions are required at this time."
            )
        else:
            summary_reason = (
                f"Identified {len(gap_map)} competency development priorities. "
                f"Courses are ranked by statutory criticality, gap magnitude, and multi-skill efficiency."
            )

    # 5. Fetch all published courses
    published_courses = (
        db.query(Course)
        .filter(Course.status == "published")
        .all()
    )

    # 6. Score and rank courses
    recommendations: List[CourseRecommendationItem] = []

    for course in published_courses:
        # Exclude completed courses
        if course.id in completed_course_ids:
            continue

        score, priority, explanation, addressed = calculate_course_relevance(
            course=course,
            gap_map=gap_map,
            is_unassessed_learner=is_unassessed_learner,
        )

        # Include courses that address at least one priority (score > 0)
        if score > 0:
            enrollment = active_enrollment_map.get(course.id)
            is_enrolled = enrollment is not None
            enroll_status = enrollment.status if enrollment else None
            progress_pct = enrollment.progress_percentage if enrollment else None

            recommendations.append(
                CourseRecommendationItem(
                    course_id=course.id,
                    code=course.code,
                    title=course.title,
                    description=course.description,
                    provider=course.provider,
                    duration_hours=course.duration_hours,
                    status=course.status,
                    relevance_score=score,
                    priority=priority,
                    reason=explanation,
                    competencies_addressed=addressed,
                    is_enrolled=is_enrolled,
                    enrollment_status=enroll_status,
                    progress_percentage=progress_pct,
                )
            )

    # 7. Deterministic sorting:
    # 1. Relevance Score desc
    # 2. Mandatory competencies addressed desc
    # 3. Sum of gap points addressed desc
    # 4. Duration hours asc (faster wins on equal score)
    # 5. Course code asc
    recommendations.sort(
        key=lambda item: (
            -item.relevance_score,
            -sum(1 for c in item.competencies_addressed if c.criticality == "Mandatory"),
            -sum(c.gap_score for c in item.competencies_addressed),
            item.duration_hours,
            item.code,
        )
    )

    return CourseRecommendationsResponse(
        learner_id=learner.id,
        job_role_title=job_role.title if job_role else None,
        total_gaps_identified=len(gap_map),
        recommendations=recommendations,
        summary_reason=summary_reason,
    )


def generate_learning_path(
    db: Session,
    learner: User,
) -> LearningPathResponse:
    """Generates an ordered, pedagogically sequenced learning path from recommendations.
    Orders courses so foundational levels (Level 2) precede advanced levels (Level 4-5),
    with higher-priority and mandatory modules prioritized within each tier.
    """
    rec_response = get_personalized_recommendations(db, learner)
    courses = rec_response.recommendations

    if not courses:
        return LearningPathResponse(
            learner_id=learner.id,
            job_role_title=rec_response.job_role_title,
            total_steps=0,
            total_estimated_hours=0,
            steps=[],
        )

    # Pedagogical sequencing:
    # Group or sort by minimum level delivered (foundational first), then by relevance score desc.
    # Level 2 -> Level 3 -> Level 4 -> Level 5.
    def get_pedagogical_sort_key(item: CourseRecommendationItem) -> Tuple[int, float, int, str]:
        # Lowest target level achieved among competencies addressed
        min_level = (
            min(c.target_level_achieved for c in item.competencies_addressed)
            if item.competencies_addressed
            else 1
        )
        # 1. min_level asc (Tier: Foundational before Advanced)
        # 2. -relevance_score (Highest priority within tier)
        # 3. duration_hours asc
        # 4. code asc
        return (min_level, -item.relevance_score, item.duration_hours, item.code)

    sequenced_courses = sorted(courses, key=get_pedagogical_sort_key)

    steps: List[LearningPathStepItem] = []
    total_hours: int = 0

    for idx, item in enumerate(sequenced_courses, start=1):
        total_hours += item.duration_hours
        max_level_delivered = (
            max(c.target_level_achieved for c in item.competencies_addressed)
            if item.competencies_addressed
            else 1
        )
        comp_codes = [c.code for c in item.competencies_addressed]

        steps.append(
            LearningPathStepItem(
                step_number=idx,
                course_id=item.course_id,
                code=item.code,
                title=item.title,
                provider=item.provider,
                duration_hours=item.duration_hours,
                target_level_achieved=max_level_delivered,
                priority=item.priority,
                relevance_score=item.relevance_score,
                reason=item.reason,
                competencies_addressed=comp_codes,
                is_enrolled=item.is_enrolled,
                enrollment_status=item.enrollment_status,
                progress_percentage=item.progress_percentage,
            )
        )

    return LearningPathResponse(
        learner_id=learner.id,
        job_role_title=rec_response.job_role_title,
        total_steps=len(steps),
        total_estimated_hours=total_hours,
        steps=steps,
    )
