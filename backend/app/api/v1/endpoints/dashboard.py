"""
Role-Based Dashboard Endpoints (Phase 3)
Provides dedicated, role-isolated telemetry feeds for Learner, Trainer, and Admin portals.
"""
from datetime import datetime, timedelta, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy import case, distinct, func, text
from sqlalchemy.orm import Session

from app.api.deps import require_roles
from app.db.session import get_db
from app.models.audit import AuditLog
from app.models.competency import Competency, LearnerCompetency
from app.models.course import Course, Enrollment
from app.models.document import TrainingDocument
from app.models.quiz import Quiz, QuizAttempt
from app.models.user import User
from app.schemas.analytics import (
    AdminExecutiveMetricsResponse,
    DepartmentCompetencyMetric,
    MonthlyTrendPoint,
)
from app.schemas.dashboard import (
    AdminAuditLogItem,
    AdminDashboardResponse,
    AdminSummaryMetrics,
    DepartmentUserCount,
    EnrolledCourseItem,
    LearnerCompetencyItem,
    LearnerDashboardResponse,
    LearnerQuizAttemptItem,
    LearnerSummaryMetrics,
    SystemHealth,
    TrainerDashboardResponse,
    TrainerDocumentItem,
    TrainerLearnerAttemptItem,
    TrainerQuizItem,
    TrainerSummaryMetrics,
)

router = APIRouter()


# -----------------------------------------------------------------------------
# 1. Learner Dashboard
# -----------------------------------------------------------------------------

@router.get(
    "/learner",
    response_model=LearnerDashboardResponse,
    summary="Retrieve personalized Learner Dashboard telemetry",
    description="Returns enrolled courses, verified competency levels, skill gaps, and recent quiz attempts.",
)
def get_learner_dashboard(
    current_user: User = Depends(require_roles("learner")),
    db: Session = Depends(get_db),
) -> LearnerDashboardResponse:
    # 1. Enrolled Courses
    enrollment_rows = (
        db.query(Enrollment, Course)
        .join(Course, Enrollment.course_id == Course.id)
        .filter(Enrollment.user_id == current_user.id)
        .order_by(Enrollment.enrolled_at.desc())
        .all()
    )

    enrolled_courses = [
        EnrolledCourseItem(
            id=enrollment.id,
            course_id=course.id,
            title=course.title,
            code=course.code,
            provider=course.provider,
            duration_hours=course.duration_hours,
            status=enrollment.status,
            progress_percentage=enrollment.progress_percentage,
            enrolled_at=enrollment.enrolled_at,
            completed_at=enrollment.completed_at,
        )
        for enrollment, course in enrollment_rows
    ]

    enrolled_count = len(enrolled_courses)
    completed_count = sum(1 for e in enrolled_courses if e.status == "completed")
    in_progress_count = sum(1 for e in enrolled_courses if e.status == "in_progress")
    avg_progress = (
        round(sum(e.progress_percentage for e in enrolled_courses) / enrolled_count, 1)
        if enrolled_count > 0
        else 0.0
    )

    # 2. Competencies & Dynamic Skill Gap Calculation
    comp_rows = (
        db.query(LearnerCompetency, Competency)
        .join(Competency, LearnerCompetency.competency_id == Competency.id)
        .filter(LearnerCompetency.user_id == current_user.id)
        .order_by(Competency.name.asc())
        .all()
    )

    competencies = [
        LearnerCompetencyItem(
            id=lc.id,
            competency_id=comp.id,
            name=comp.name,
            code=comp.code,
            category=comp.category,
            current_level=lc.current_level,
            target_level=lc.target_level,
            gap_score=max(0, lc.target_level - lc.current_level),
            last_assessed_at=lc.last_assessed_at,
        )
        for lc, comp in comp_rows
    ]

    comp_count = len(competencies)
    avg_gap = (
        round(sum(c.gap_score for c in competencies) / comp_count, 1)
        if comp_count > 0
        else 0.0
    )

    # 3. Quiz Attempts
    attempt_rows = (
        db.query(QuizAttempt, Quiz)
        .join(Quiz, QuizAttempt.quiz_id == Quiz.id)
        .filter(QuizAttempt.user_id == current_user.id)
        .order_by(QuizAttempt.started_at.desc())
        .limit(10)
        .all()
    )

    recent_attempts = [
        LearnerQuizAttemptItem(
            id=attempt.id,
            quiz_id=quiz.id,
            quiz_title=quiz.title,
            score=attempt.score,
            percentage=round(attempt.percentage, 1),
            passed=attempt.passed,
            completed_at=attempt.completed_at,
        )
        for attempt, quiz in attempt_rows
    ]

    total_quizzes = (
        db.query(func.count(QuizAttempt.id))
        .filter(QuizAttempt.user_id == current_user.id)
        .scalar()
        or 0
    )
    avg_score_val = (
        db.query(func.avg(QuizAttempt.percentage))
        .filter(QuizAttempt.user_id == current_user.id)
        .scalar()
    )
    avg_score = round(float(avg_score_val), 1) if avg_score_val is not None else 0.0

    return LearnerDashboardResponse(
        summary=LearnerSummaryMetrics(
            enrolled_courses_count=enrolled_count,
            completed_courses_count=completed_count,
            in_progress_courses_count=in_progress_count,
            average_progress=avg_progress,
            total_quizzes_taken=total_quizzes,
            average_quiz_score=avg_score,
            competencies_assessed_count=comp_count,
            average_gap_score=avg_gap,
        ),
        enrolled_courses=enrolled_courses,
        competencies=competencies,
        recent_quiz_attempts=recent_attempts,
    )


# -----------------------------------------------------------------------------
# 2. Trainer Dashboard
# -----------------------------------------------------------------------------

@router.get(
    "/trainer",
    response_model=TrainerDashboardResponse,
    summary="Retrieve Trainer Dashboard telemetry",
    description="Returns training documents, authored quizzes, cohort completion metrics, and learner attempts.",
)
def get_trainer_dashboard(
    current_user: User = Depends(require_roles("trainer")),
    db: Session = Depends(get_db),
) -> TrainerDashboardResponse:
    # 1. Training Documents uploaded by this trainer
    doc_rows = (
        db.query(TrainingDocument)
        .filter(TrainingDocument.uploaded_by == current_user.id)
        .order_by(TrainingDocument.created_at.desc())
        .all()
    )

    documents = [
        TrainerDocumentItem(
            id=doc.id,
            title=doc.title,
            file_name=doc.file_name,
            file_size_bytes=doc.file_size_bytes,
            mime_type=doc.mime_type,
            status=doc.status,
            created_at=doc.created_at,
        )
        for doc in doc_rows
    ]
    total_docs = len(documents)
    processed_docs = sum(1 for d in documents if d.status == "processed")

    # 2. Quizzes created by this trainer with performance statistics
    quiz_rows = (
        db.query(Quiz, Course.title, Competency.name)
        .outerjoin(Course, Quiz.course_id == Course.id)
        .outerjoin(Competency, Quiz.competency_id == Competency.id)
        .filter(Quiz.created_by == current_user.id)
        .order_by(Quiz.created_at.desc())
        .all()
    )

    # Aggregate attempt stats per quiz
    quiz_stats_rows = (
        db.query(
            QuizAttempt.quiz_id,
            func.count(QuizAttempt.id).label("attempt_count"),
            func.sum(case((QuizAttempt.passed.is_(True), 1), else_=0)).label("passed_count"),
            func.avg(QuizAttempt.percentage).label("avg_percentage"),
        )
        .join(Quiz, QuizAttempt.quiz_id == Quiz.id)
        .filter(Quiz.created_by == current_user.id)
        .group_by(QuizAttempt.quiz_id)
        .all()
    )
    stats_by_quiz = {row.quiz_id: row for row in quiz_stats_rows}

    quizzes = []
    total_attempts_received = 0
    total_passed_attempts = 0

    for quiz, course_title, comp_name in quiz_rows:
        stat = stats_by_quiz.get(quiz.id)
        att_count = stat.attempt_count if stat else 0
        passed_count = int(stat.passed_count or 0) if stat else 0
        avg_pct = round(float(stat.avg_percentage or 0.0), 1) if stat else 0.0
        pass_rate = round((passed_count / att_count) * 100.0, 1) if att_count > 0 else 0.0
        q_count = len(quiz.questions) if isinstance(quiz.questions, list) else 0

        total_attempts_received += att_count
        total_passed_attempts += passed_count

        quizzes.append(
            TrainerQuizItem(
                id=quiz.id,
                title=quiz.title,
                course_title=course_title,
                competency_name=comp_name,
                total_marks=quiz.total_marks,
                passing_marks=quiz.passing_marks,
                question_count=q_count,
                attempts_count=att_count,
                pass_rate=pass_rate,
                average_score=avg_pct,
                created_at=quiz.created_at,
            )
        )

    overall_pass_rate = (
        round((total_passed_attempts / total_attempts_received) * 100.0, 1)
        if total_attempts_received > 0
        else 0.0
    )

    # 3. Recent Learner Attempts on this trainer's quizzes
    recent_attempts_raw = (
        db.query(QuizAttempt, Quiz, User)
        .join(Quiz, QuizAttempt.quiz_id == Quiz.id)
        .join(User, QuizAttempt.user_id == User.id)
        .filter(Quiz.created_by == current_user.id)
        .order_by(QuizAttempt.started_at.desc())
        .limit(10)
        .all()
    )

    recent_attempts = [
        TrainerLearnerAttemptItem(
            id=attempt.id,
            quiz_id=quiz.id,
            quiz_title=quiz.title,
            learner_name=user.full_name,
            learner_email=user.email,
            score=attempt.score,
            percentage=round(attempt.percentage, 1),
            passed=attempt.passed,
            completed_at=attempt.completed_at,
        )
        for attempt, quiz, user in recent_attempts_raw
    ]

    return TrainerDashboardResponse(
        summary=TrainerSummaryMetrics(
            total_documents_uploaded=total_docs,
            processed_documents_count=processed_docs,
            total_quizzes_created=len(quizzes),
            total_attempts_received=total_attempts_received,
            average_pass_rate=overall_pass_rate,
        ),
        documents=documents,
        quizzes=quizzes,
        recent_attempts=recent_attempts,
    )


# -----------------------------------------------------------------------------
# 3. Admin Dashboard
# -----------------------------------------------------------------------------

@router.get(
    "/admin",
    response_model=AdminDashboardResponse,
    summary="Retrieve Admin Dashboard telemetry",
    description="Returns platform-wide user metrics, database health status, department breakdown, and audit logs.",
)
def get_admin_dashboard(
    current_user: User = Depends(require_roles("admin")),
    db: Session = Depends(get_db),
) -> AdminDashboardResponse:
    # 1. Database Health Check (genuine ping)
    try:
        db.execute(text("SELECT 1"))
        db_status = "connected"
    except Exception:
        db_status = "disconnected"

    health = SystemHealth(
        database_status=db_status,
        server_time=datetime.now(timezone.utc),
    )

    # 2. Platform Summary Metrics
    user_counts = db.query(
        func.count(User.id).label("total"),
        func.sum(case((User.role == "learner", 1), else_=0)).label("learners"),
        func.sum(case((User.role == "trainer", 1), else_=0)).label("trainers"),
        func.sum(case((User.role == "admin", 1), else_=0)).label("admins"),
        func.sum(case((User.is_active.is_(True), 1), else_=0)).label("active"),
    ).first()

    total_courses = db.query(func.count(Course.id)).scalar() or 0
    total_quizzes = db.query(func.count(Quiz.id)).scalar() or 0
    total_documents = db.query(func.count(TrainingDocument.id)).scalar() or 0
    total_enrollments = db.query(func.count(Enrollment.id)).scalar() or 0

    summary = AdminSummaryMetrics(
        total_users=int(user_counts.total or 0) if user_counts else 0,
        learners_count=int(user_counts.learners or 0) if user_counts else 0,
        trainers_count=int(user_counts.trainers or 0) if user_counts else 0,
        admins_count=int(user_counts.admins or 0) if user_counts else 0,
        active_users_count=int(user_counts.active or 0) if user_counts else 0,
        total_courses=total_courses,
        total_quizzes=total_quizzes,
        total_documents=total_documents,
        total_enrollments=total_enrollments,
    )

    # 3. Department Breakdown
    dept_rows = (
        db.query(User.department, func.count(User.id))
        .filter(User.department.isnot(None), User.department != "")
        .group_by(User.department)
        .order_by(func.count(User.id).desc())
        .limit(10)
        .all()
    )
    departments = [
        DepartmentUserCount(department=dept, user_count=count)
        for dept, count in dept_rows
    ]

    # 4. Recent Audit Logs
    audit_rows = (
        db.query(AuditLog, User)
        .outerjoin(User, AuditLog.actor_id == User.id)
        .order_by(AuditLog.created_at.desc())
        .limit(15)
        .all()
    )

    recent_audit_logs = [
        AdminAuditLogItem(
            id=log.id,
            actor_id=log.actor_id,
            actor_name=user.full_name if user else "System",
            action=log.action,
            entity_type=log.entity_type,
            entity_id=log.entity_id,
            ip_address=log.ip_address,
            created_at=log.created_at,
        )
        for log, user in audit_rows
    ]

    return AdminDashboardResponse(
        summary=summary,
        health=health,
        departments=departments,
        recent_audit_logs=recent_audit_logs,
    )


# -----------------------------------------------------------------------------
# 4. Extended Phase 8 Analytics Endpoints
# -----------------------------------------------------------------------------

@router.get(
    "/admin/analytics",
    response_model=AdminExecutiveMetricsResponse,
    summary="Retrieve verified executive system metrics",
    description="Calculates verified platform indicators strictly excluding abandoned assessment attempts and unassessed records.",
)
def get_admin_analytics_metrics(
    current_user: User = Depends(require_roles("admin")),
    db: Session = Depends(get_db),
) -> AdminExecutiveMetricsResponse:
    # 1. User Capacity Metrics
    total_learners = db.query(func.count(User.id)).filter(User.role == "learner").scalar() or 0
    active_learners = db.query(func.count(User.id)).filter(User.role == "learner", User.is_active.is_(True)).scalar() or 0
    total_trainers = db.query(func.count(User.id)).filter(User.role == "trainer").scalar() or 0
    total_admins = db.query(func.count(User.id)).filter(User.role == "admin").scalar() or 0

    # 2. Content & Assessment Capacities
    total_courses = db.query(func.count(Course.id)).scalar() or 0
    published_courses = db.query(func.count(Course.id)).filter(Course.status == "published").scalar() or 0

    total_documents = db.query(func.count(TrainingDocument.id)).scalar() or 0
    published_documents = db.query(func.count(TrainingDocument.id)).filter(TrainingDocument.is_published.is_(True)).scalar() or 0
    processed_documents = db.query(func.count(TrainingDocument.id)).filter(TrainingDocument.status == "processed").scalar() or 0
    doc_pub_ratio = round((published_documents / processed_documents) * 100.0, 1) if processed_documents > 0 else 0.0

    total_quizzes = db.query(func.count(Quiz.id)).scalar() or 0
    published_quizzes = db.query(func.count(Quiz.id)).filter(Quiz.status == "published").scalar() or 0

    # 3. Assessment Performance (Completed Attempts Only)
    total_attempts = db.query(func.count(QuizAttempt.id)).scalar() or 0
    completed_attempts = db.query(func.count(QuizAttempt.id)).filter(QuizAttempt.completed_at.isnot(None)).scalar() or 0
    avg_score = float(db.query(func.avg(QuizAttempt.percentage)).filter(QuizAttempt.completed_at.isnot(None)).scalar() or 0.0)
    passed_attempts = db.query(func.count(QuizAttempt.id)).filter(
        QuizAttempt.completed_at.isnot(None),
        QuizAttempt.passed.is_(True),
    ).scalar() or 0
    pass_rate = round((passed_attempts / completed_attempts) * 100.0, 1) if completed_attempts > 0 else 0.0

    # 4. Enrollment & Completion Metrics
    overall_enrollments = db.query(func.count(Enrollment.id)).scalar() or 0
    commenced_enrollments = db.query(func.count(Enrollment.id)).filter(
        Enrollment.status.in_(["completed", "in_progress", "dropped"])
    ).scalar() or 0
    completed_enrollments = db.query(func.count(Enrollment.id)).filter(
        Enrollment.status == "completed"
    ).scalar() or 0
    completion_rate = round((completed_enrollments / commenced_enrollments) * 100.0, 1) if commenced_enrollments > 0 else 0.0

    return AdminExecutiveMetricsResponse(
        total_learners=total_learners,
        active_learner_accounts=active_learners,
        total_trainers=total_trainers,
        total_admins=total_admins,
        total_courses=total_courses,
        published_courses=published_courses,
        total_documents=total_documents,
        published_documents=published_documents,
        total_quizzes=total_quizzes,
        published_quizzes=published_quizzes,
        total_quiz_attempts=total_attempts,
        completed_quiz_attempts=completed_attempts,
        average_assessment_score=round(avg_score, 1),
        quiz_pass_rate=pass_rate,
        course_completion_rate=completion_rate,
        overall_enrollments=overall_enrollments,
        document_publication_ratio=doc_pub_ratio,
    )


@router.get(
    "/admin/trends/time-series",
    response_model=List[MonthlyTrendPoint],
    summary="Retrieve monthly time-series analytics for Recharts",
    description="Returns registrations, monthly active learners (MAL), course completions, and assessment submissions by calendar month.",
)
def get_admin_monthly_trends(
    months: int = Query(6, ge=1, le=24, description="Number of historical months to return"),
    current_user: User = Depends(require_roles("admin")),
    db: Session = Depends(get_db),
) -> List[MonthlyTrendPoint]:
    now = datetime.now(timezone.utc)
    results: List[MonthlyTrendPoint] = []

    for i in range(months - 1, -1, -1):
        # Calculate start and end of month i
        year = now.year
        month = now.month - i
        while month <= 0:
            month += 12
            year -= 1

        start_dt = datetime(year, month, 1, 0, 0, 0, tzinfo=timezone.utc)
        if month == 12:
            end_dt = datetime(year + 1, 1, 1, 0, 0, 0, tzinfo=timezone.utc)
        else:
            end_dt = datetime(year, month + 1, 1, 0, 0, 0, tzinfo=timezone.utc)

        month_label = start_dt.strftime("%Y-%m")

        # 1. Registrations in month
        reg_count = db.query(func.count(User.id)).filter(
            User.role == "learner",
            User.created_at >= start_dt,
            User.created_at < end_dt,
        ).scalar() or 0

        # 2. Course completions in month
        comp_count = db.query(func.count(Enrollment.id)).filter(
            Enrollment.status == "completed",
            Enrollment.completed_at >= start_dt,
            Enrollment.completed_at < end_dt,
        ).scalar() or 0

        # 3. Completed quiz attempts in month
        attempt_count = db.query(func.count(QuizAttempt.id)).filter(
            QuizAttempt.completed_at.isnot(None),
            QuizAttempt.completed_at >= start_dt,
            QuizAttempt.completed_at < end_dt,
        ).scalar() or 0

        # 4. Monthly Active Learners (MAL): Distinct active learners with quiz or course completion
        quiz_users = set(
            u[0] for u in db.query(QuizAttempt.user_id)
            .join(User, QuizAttempt.user_id == User.id)
            .filter(
                User.role == "learner",
                User.is_active.is_(True),
                QuizAttempt.started_at >= start_dt,
                QuizAttempt.started_at < end_dt,
            ).all()
        )
        comp_users = set(
            u[0] for u in db.query(Enrollment.user_id)
            .join(User, Enrollment.user_id == User.id)
            .filter(
                User.role == "learner",
                User.is_active.is_(True),
                Enrollment.completed_at >= start_dt,
                Enrollment.completed_at < end_dt,
            ).all()
        )
        mal_count = len(quiz_users.union(comp_users))

        results.append(
            MonthlyTrendPoint(
                month=month_label,
                registrations=reg_count,
                monthly_active_learners=mal_count,
                course_completions=comp_count,
                quiz_attempts=attempt_count,
            )
        )

    return results


@router.get(
    "/admin/trends/departments",
    response_model=List[DepartmentCompetencyMetric],
    summary="Retrieve departmental competency and gap telemetry",
    description="Returns headcount, assessment coverage, verified average gap score, and deficit indicators per department.",
)
def get_admin_department_trends(
    current_user: User = Depends(require_roles("admin")),
    db: Session = Depends(get_db),
) -> List[DepartmentCompetencyMetric]:
    # Distinct departments with active learners
    dept_rows = (
        db.query(User.department)
        .filter(
            User.role == "learner",
            User.department.isnot(None),
            User.department != "",
        )
        .distinct()
        .all()
    )

    results: List[DepartmentCompetencyMetric] = []

    for (dept_name,) in dept_rows:
        if not dept_name:
            continue

        # 1. Total and Active Learners
        total_dept_learners = db.query(func.count(User.id)).filter(
            User.role == "learner",
            User.department == dept_name,
        ).scalar() or 0

        active_dept_learners = db.query(func.count(User.id)).filter(
            User.role == "learner",
            User.department == dept_name,
            User.is_active.is_(True),
        ).scalar() or 0

        # 2. Assessed Learners: distinct learners who have completed at least one quiz attempt
        assessed_users_count = db.query(func.count(distinct(QuizAttempt.user_id))).join(
            User, QuizAttempt.user_id == User.id
        ).filter(
            User.department == dept_name,
            QuizAttempt.completed_at.isnot(None),
        ).scalar() or 0

        coverage_pct = (
            round((assessed_users_count / total_dept_learners) * 100.0, 1)
            if total_dept_learners > 0
            else 0.0
        )

        # 3. Average Gap Score (Excluding Unassessed records: last_assessed_at IS NOT NULL)
        avg_gap = db.query(func.avg(LearnerCompetency.gap_score)).join(
            User, LearnerCompetency.user_id == User.id
        ).filter(
            User.department == dept_name,
            LearnerCompetency.last_assessed_at.isnot(None),
        ).scalar()

        avg_gap_score = round(float(avg_gap or 0.0), 2)

        # 4. Average Assessment Score (Completed Attempts Only)
        avg_score = db.query(func.avg(QuizAttempt.percentage)).join(
            User, QuizAttempt.user_id == User.id
        ).filter(
            User.department == dept_name,
            QuizAttempt.completed_at.isnot(None),
        ).scalar()

        avg_assessment_score = round(float(avg_score or 0.0), 1)

        # 5. Top Deficit Competency (Largest aggregate gap among assessed records)
        top_deficit_row = (
            db.query(Competency.code, func.sum(LearnerCompetency.gap_score).label("total_gap"))
            .join(LearnerCompetency, Competency.id == LearnerCompetency.competency_id)
            .join(User, LearnerCompetency.user_id == User.id)
            .filter(
                User.department == dept_name,
                LearnerCompetency.last_assessed_at.isnot(None),
                LearnerCompetency.gap_score > 0,
            )
            .group_by(Competency.code)
            .order_by(func.sum(LearnerCompetency.gap_score).desc())
            .first()
        )
        top_deficit = top_deficit_row[0] if top_deficit_row else None

        results.append(
            DepartmentCompetencyMetric(
                department=dept_name,
                total_learners=total_dept_learners,
                active_learners=active_dept_learners,
                assessed_learners=assessed_users_count,
                assessment_coverage_pct=coverage_pct,
                average_gap_score=avg_gap_score,
                average_assessment_score=avg_assessment_score,
                top_deficit_competency=top_deficit,
            )
        )

    # Sort departments by total learners descending
    results.sort(key=lambda x: x.total_learners, reverse=True)
    return results
