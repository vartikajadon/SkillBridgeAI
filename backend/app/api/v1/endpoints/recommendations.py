"""
Personalized Course Recommendations & Learning Path Endpoints (Phase 5)
Provides learner-tailored course rankings, pedagogical learning path generation,
and one-click course enrollment.
"""
import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import require_roles
from app.db.session import get_db
from app.models.course import Course, Enrollment
from app.models.user import User
from app.schemas.recommendation import (
    CourseRecommendationsResponse,
    CourseVideoModuleItem,
    EnrollmentCreateResponse,
    LearningPathResponse,
    ModuleCompleteResponse,
)
from app.services.recommendation_engine import (
    generate_learning_path,
    get_course_video_modules,
    get_personalized_recommendations,
)

router = APIRouter()


# -----------------------------------------------------------------------------
# 1. Personalized Recommendations
# -----------------------------------------------------------------------------

@router.get(
    "/",
    response_model=CourseRecommendationsResponse,
    summary="Get personalized course recommendations",
    description="Returns ranked course recommendations addressing the authenticated learner's verified competency gaps.",
)
def get_recommendations(
    current_user: User = Depends(require_roles("learner")),
    db: Session = Depends(get_db),
) -> CourseRecommendationsResponse:
    """Computes transparent, deterministic course recommendations based on
    competency gaps, statutory criticality, and multi-skill synergy.
    """
    return get_personalized_recommendations(db=db, learner=current_user)


# -----------------------------------------------------------------------------
# 2. Pedagogical Learning Path
# -----------------------------------------------------------------------------

@router.get(
    "/learning-path",
    response_model=LearningPathResponse,
    summary="Get sequenced learning path roadmap",
    description="Returns an ordered learning path sequenced so foundational modules precede advanced coursework.",
)
def get_learning_path(
    current_user: User = Depends(require_roles("learner")),
    db: Session = Depends(get_db),
) -> LearningPathResponse:
    """Generates an ordered step-by-step learning path for the authenticated learner."""
    return generate_learning_path(db=db, learner=current_user)


# -----------------------------------------------------------------------------
# 3. Course Video Modules
# -----------------------------------------------------------------------------

@router.get(
    "/{course_id}/modules",
    response_model=list[CourseVideoModuleItem],
    summary="Get video modules for a course",
    description="Returns all video modules with descriptions and durations for the specified course.",
)
def get_course_modules(
    course_id: uuid.UUID,
    current_user: User = Depends(require_roles("learner")),
    db: Session = Depends(get_db),
) -> list[CourseVideoModuleItem]:
    """Fetches at least 5 structured video modules with descriptions and duration."""
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Course with ID '{course_id}' not found.",
        )
    enrollment = db.query(Enrollment).filter(
        Enrollment.user_id == current_user.id,
        Enrollment.course_id == course_id,
    ).first()
    progress_pct = enrollment.progress_percentage if enrollment else None
    return get_course_video_modules(course, progress_pct, db=db)


@router.post(
    "/{course_id}/modules/{module_number}/complete",
    response_model=ModuleCompleteResponse,
    summary="Mark course module as complete and update progress",
    description="Marks a module complete for the authenticated learner. If all modules are complete, marks course 100% completed.",
)
def complete_course_module(
    course_id: uuid.UUID,
    module_number: int,
    current_user: User = Depends(require_roles("learner")),
    db: Session = Depends(get_db),
) -> ModuleCompleteResponse:
    """Marks a specific module as complete, increments course progress percentage,
    and updates course status to 'completed' (100%) when all 5 modules are done.
    """
    course = (
        db.query(Course)
        .filter(Course.id == course_id, Course.status == "published")
        .first()
    )
    if not course:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Course with ID '{course_id}' not found.",
        )

    enrollment = (
        db.query(Enrollment)
        .filter(
            Enrollment.user_id == current_user.id,
            Enrollment.course_id == course_id,
        )
        .first()
    )

    # Auto-enroll if not enrolled yet
    if not enrollment:
        enrollment = Enrollment(
            user_id=current_user.id,
            course_id=course.id,
            status="in_progress",
            progress_percentage=0,
            enrolled_at=datetime.now(timezone.utc),
        )
        db.add(enrollment)
        db.commit()
        db.refresh(enrollment)

    # Get modules count
    all_modules = get_course_video_modules(course, enrollment.progress_percentage, db=db)
    total_modules = len(all_modules) or 5

    # Each module is worth (100 / total_modules) %
    # When completing module_number, progress is at least (module_number / total_modules) * 100
    current_completed_count = int(round((enrollment.progress_percentage / 100.0) * total_modules))
    new_completed_count = max(current_completed_count, module_number)
    new_pct = int(round((new_completed_count / float(total_modules)) * 100))
    new_pct = min(100, max(0, new_pct))

    enrollment.progress_percentage = new_pct
    if new_pct >= 100:
        enrollment.status = "completed"
        enrollment.completed_at = datetime.now(timezone.utc)
    else:
        enrollment.status = "in_progress"

    db.commit()
    db.refresh(enrollment)

    return ModuleCompleteResponse(
        course_id=course.id,
        module_number=module_number,
        is_completed=True,
        completed_modules_count=new_completed_count,
        total_modules_count=total_modules,
        progress_percentage=enrollment.progress_percentage,
        course_status=enrollment.status,
        message=(
            f"Congratulations! You have completed Module {module_number}. "
            f"{'Course 100% completed!' if new_pct >= 100 else f'Course progress updated to {new_pct}%.'}"
        ),
    )


# -----------------------------------------------------------------------------
# 4. Course Enrollment Action
# -----------------------------------------------------------------------------

@router.post(
    "/{course_id}/enroll",
    response_model=EnrollmentCreateResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Enroll authenticated learner in a course",
    description="Enrolls the current learner in the specified course. Prevents duplicate active enrollments.",
)
def enroll_in_course(
    course_id: uuid.UUID,
    current_user: User = Depends(require_roles("learner")),
    db: Session = Depends(get_db),
) -> EnrollmentCreateResponse:
    """Enrolls learner in a recommended course after validating course existence
    and preventing duplicate active or completed enrollments.
    """
    # 1. Validate course exists and is published
    course = (
        db.query(Course)
        .filter(Course.id == course_id, Course.status == "published")
        .first()
    )
    if not course:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Course with ID '{course_id}' not found or not published.",
        )

    # 2. Check for existing enrollment
    existing_enrollment = (
        db.query(Enrollment)
        .filter(
            Enrollment.user_id == current_user.id,
            Enrollment.course_id == course_id,
        )
        .first()
    )
    if existing_enrollment:
        if existing_enrollment.status in ("enrolled", "in_progress"):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"You are already actively enrolled in '{course.title}' (Status: {existing_enrollment.status}).",
            )
        elif existing_enrollment.status == "completed":
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"You have already completed '{course.title}'.",
            )

    # 3. Create new enrollment
    new_enrollment = Enrollment(
        user_id=current_user.id,
        course_id=course.id,
        status="enrolled",
        progress_percentage=0,
        enrolled_at=datetime.now(timezone.utc),
    )
    db.add(new_enrollment)
    db.commit()
    db.refresh(new_enrollment)

    return EnrollmentCreateResponse(
        enrollment_id=new_enrollment.id,
        course_id=course.id,
        course_title=course.title,
        status=new_enrollment.status,
        progress_percentage=new_enrollment.progress_percentage,
        enrolled_at=new_enrollment.enrolled_at,
        message=f"Successfully enrolled in '{course.title}'.",
    )
