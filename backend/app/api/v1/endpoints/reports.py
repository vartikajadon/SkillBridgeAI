"""
Reporting & Export Endpoints (Phase 8)
Streams verified ReportLab PDF documents and UTF-8 CSV tabular exports with strict RBAC,
IDOR prevention, trainer data isolation, and immutable audit ledger tracking.
"""
import io
import uuid
from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from fastapi.responses import StreamingResponse
from sqlalchemy import distinct, func
from sqlalchemy.orm import Session

from app.api.deps import require_roles
from app.db.session import get_db
from app.models.audit import AuditLog
from app.models.competency import Competency, LearnerCompetency, RoleCompetency
from app.models.course import Course, CourseCompetency, Enrollment
from app.models.document import TrainingDocument
from app.models.job_role import JobRole
from app.models.quiz import Quiz, QuizAttempt
from app.models.user import User
from app.services.report_generator import get_report_service

router = APIRouter()


def log_report_export(
    db: Session,
    actor: User,
    report_type: str,
    export_format: str,
    record_count: int,
    filters: Optional[dict] = None,
):
    """Emits an immutable audit log entry for every exported government report."""
    audit = AuditLog(
        actor_id=actor.id,
        action="REPORT_EXPORT_GENERATED",
        entity_type="reports",
        entity_id=report_type,
        details={
            "report_type": report_type,
            "export_format": export_format,
            "record_count": record_count,
            "actor_email": actor.email,
            "actor_role": actor.role,
            "filters": filters or {},
        },
    )
    db.add(audit)
    db.commit()


def stream_report_response(
    report_name: str,
    export_format: str,
    headers: List[str],
    rows: List[List[str]],
    title: str,
    subtitle: str,
    requested_by: str,
    department_filter: Optional[str] = None,
    col_widths: Optional[List[float]] = None,
) -> Response:
    """Builds and returns a StreamingResponse with appropriate MIME type and Content-Disposition."""
    svc = get_report_service()
    timestamp_str = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")

    if export_format == "pdf":
        pdf_bytes = svc.generate_pdf(
            title=title,
            subtitle=subtitle,
            headers=headers,
            data_rows=rows,
            requested_by=requested_by,
            department_filter=department_filter,
            col_widths=col_widths,
        )
        filename = f"{report_name}_{timestamp_str}.pdf"
        return StreamingResponse(
            io.BytesIO(pdf_bytes),
            media_type="application/pdf",
            headers={"Content-Disposition": f'attachment; filename="{filename}"'},
        )
    else:
        csv_text = svc.generate_csv(headers=headers, data_rows=rows)
        filename = f"{report_name}_{timestamp_str}.csv"
        return StreamingResponse(
            io.StringIO(csv_text),
            media_type="text/csv; charset=utf-8",
            headers={"Content-Disposition": f'attachment; filename="{filename}"'},
        )


@router.get(
    "/platform-overview",
    summary="Export National Governance & Capacity Building Overview",
    description="Admin-only executive report detailing platform capacity, course completions, and assessment pass rates.",
)
def export_platform_overview(
    format: str = Query("csv", pattern="^(csv|pdf)$"),
    current_user: User = Depends(require_roles("admin")),
    db: Session = Depends(get_db),
):
    # 1. Fetch Summary Data
    courses = db.query(Course).order_by(Course.code).all()
    headers = ["Course Code", "Title", "Provider", "Duration (Hrs)", "Status", "Total Enrolled", "Completed Count"]
    rows = []

    for c in courses:
        total_enrolled = db.query(func.count(Enrollment.id)).filter(Enrollment.course_id == c.id).scalar() or 0
        completed_count = db.query(func.count(Enrollment.id)).filter(
            Enrollment.course_id == c.id, Enrollment.status == "completed"
        ).scalar() or 0
        rows.append([
            c.code,
            c.title,
            c.provider,
            str(c.duration_hours),
            c.status.capitalize(),
            str(total_enrolled),
            str(completed_count),
        ])

    log_report_export(db, current_user, "platform-overview", format, len(rows))
    return stream_report_response(
        report_name="platform_overview",
        export_format=format,
        headers=headers,
        rows=rows,
        title="National Capacity Building Executive Overview",
        subtitle="Comprehensive platform training capacity, course metrics, and completion indicators",
        requested_by=f"{current_user.full_name} ({current_user.email})",
        col_widths=[75, 175, 90, 50, 50, 50, 50] if format == "pdf" else None,
    )


@router.get(
    "/department-summary",
    summary="Export Departmental Competency & Training Status",
    description="Department breakdown of civil service learners, assessment coverage, and skill gap indices.",
)
def export_department_summary(
    department: Optional[str] = Query(None, description="Optional department filter"),
    format: str = Query("csv", pattern="^(csv|pdf)$"),
    current_user: User = Depends(require_roles("admin")),
    db: Session = Depends(get_db),
):
    query = (
        db.query(User.department)
        .filter(User.role == "learner", User.department.isnot(None), User.department != "")
        .distinct()
    )
    if department:
        query = query.filter(User.department == department)

    dept_rows = query.all()
    headers = [
        "Department / Ministry",
        "Total Learners",
        "Active Accounts",
        "Assessed Officers",
        "Assessment Coverage",
        "Avg Gap Score",
        "Avg Assessment Score",
    ]
    rows = []

    for (dept_name,) in dept_rows:
        total_learners = db.query(func.count(User.id)).filter(User.role == "learner", User.department == dept_name).scalar() or 0
        active_learners = db.query(func.count(User.id)).filter(User.role == "learner", User.department == dept_name, User.is_active.is_(True)).scalar() or 0
        assessed_users = db.query(func.count(distinct(QuizAttempt.user_id))).join(User, QuizAttempt.user_id == User.id).filter(
            User.department == dept_name, QuizAttempt.completed_at.isnot(None)
        ).scalar() or 0

        coverage = f"{round((assessed_users / total_learners) * 100.0, 1)}%" if total_learners > 0 else "0.0%"
        avg_gap = db.query(func.avg(LearnerCompetency.gap_score)).join(User, LearnerCompetency.user_id == User.id).filter(
            User.department == dept_name, LearnerCompetency.last_assessed_at.isnot(None)
        ).scalar()
        avg_score = db.query(func.avg(QuizAttempt.percentage)).join(User, QuizAttempt.user_id == User.id).filter(
            User.department == dept_name, QuizAttempt.completed_at.isnot(None)
        ).scalar()

        rows.append([
            dept_name,
            str(total_learners),
            str(active_learners),
            str(assessed_users),
            coverage,
            f"{round(float(avg_gap or 0.0), 2)}",
            f"{round(float(avg_score or 0.0), 1)}%",
        ])

    log_report_export(db, current_user, "department-summary", format, len(rows), {"department": department})
    return stream_report_response(
        report_name="department_summary",
        export_format=format,
        headers=headers,
        rows=rows,
        title="Departmental Training & Competency Audit",
        subtitle="Headcount, diagnostic assessment coverage, and skill gap indices across government ministries",
        requested_by=f"{current_user.full_name} ({current_user.email})",
        department_filter=department,
        col_widths=[150, 65, 65, 65, 65, 65, 65] if format == "pdf" else None,
    )


@router.get(
    "/competency-gaps",
    summary="Export Civil Service Competency Gap Analysis Report",
    description="Itemized report of all 12 national competencies, category distribution, and workforce gap severity.",
)
def export_competency_gaps(
    competency_id: Optional[uuid.UUID] = Query(None, description="Optional competency filter"),
    format: str = Query("csv", pattern="^(csv|pdf)$"),
    current_user: User = Depends(require_roles("admin", "trainer")),
    db: Session = Depends(get_db),
):
    query = db.query(Competency).order_by(Competency.category, Competency.name)
    if competency_id:
        query = query.filter(Competency.id == competency_id)

    comps = query.all()
    headers = [
        "Competency Code",
        "Competency Name",
        "Category",
        "Assessed Officers",
        "Avg Gap Score",
        "Officers with Deficit (Gap > 0)",
        "Benchmark Satisfied (Gap = 0)",
    ]
    rows = []

    for c in comps:
        assessed_records = db.query(LearnerCompetency).filter(
            LearnerCompetency.competency_id == c.id,
            LearnerCompetency.last_assessed_at.isnot(None),
        ).all()
        assessed_count = len(assessed_records)
        avg_gap = round(sum(r.gap_score for r in assessed_records) / assessed_count, 2) if assessed_count > 0 else 0.0
        deficit_count = sum(1 for r in assessed_records if r.gap_score > 0)
        satisfied_count = sum(1 for r in assessed_records if r.gap_score == 0)

        rows.append([
            c.code,
            c.name,
            c.category,
            str(assessed_count),
            str(avg_gap),
            str(deficit_count),
            str(satisfied_count),
        ])

    log_report_export(db, current_user, "competency-gaps", format, len(rows), {"competency_id": str(competency_id) if competency_id else None})
    return stream_report_response(
        report_name="competency_gaps",
        export_format=format,
        headers=headers,
        rows=rows,
        title="Civil Service National Competency Gap Audit",
        subtitle="Workforce skill deficiency analysis across Technical, Behavioral, and Domain competencies",
        requested_by=f"{current_user.full_name} ({current_user.email})",
        col_widths=[85, 145, 65, 55, 55, 70, 65] if format == "pdf" else None,
    )


@router.get(
    "/learner-transcript",
    summary="Export Official Civil Service Learning Transcript",
    description="Official transcript detailing verified competency levels, course completions, and assessment scores.",
)
def export_learner_transcript(
    user_id: Optional[uuid.UUID] = Query(None, description="Target learner UUID (Admin only; learners restricted to self)"),
    format: str = Query("csv", pattern="^(csv|pdf)$"),
    current_user: User = Depends(require_roles("learner", "admin")),
    db: Session = Depends(get_db),
):
    # IDOR Protection: Learners cannot query any user_id other than their own
    if current_user.role == "learner" and user_id is not None and user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Learners are only authorized to export their own learning transcript."
        )
    target_id = current_user.id if current_user.role == "learner" else (user_id or current_user.id)
    target_user = db.query(User).filter(User.id == target_id).first()
    if not target_user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Target learner not found")

    # Fetch learner's competencies
    learner_comps = (
        db.query(LearnerCompetency, Competency)
        .join(Competency, LearnerCompetency.competency_id == Competency.id)
        .filter(LearnerCompetency.user_id == target_id)
        .order_by(Competency.category, Competency.name)
        .all()
    )

    headers = [
        "Competency Code",
        "Competency Name",
        "Category",
        "Current Verified Level",
        "Role Target Level",
        "Remaining Gap",
        "Status",
        "Last Assessed At",
    ]
    rows = []

    for lc, comp in learner_comps:
        if lc.last_assessed_at is None:
            eval_status = "Unassessed"
            last_dt = "Pending"
        elif lc.gap_score == 0:
            eval_status = "Proficient"
            last_dt = lc.last_assessed_at.strftime("%Y-%m-%d")
        else:
            eval_status = "Deficit"
            last_dt = lc.last_assessed_at.strftime("%Y-%m-%d")

        rows.append([
            comp.code,
            comp.name,
            comp.category,
            f"Level {lc.current_level}",
            f"Level {lc.target_level}",
            str(lc.gap_score),
            eval_status,
            last_dt,
        ])

    log_report_export(db, current_user, "learner-transcript", format, len(rows), {"target_user_id": str(target_id)})
    return stream_report_response(
        report_name=f"transcript_{target_user.employee_id or target_user.id}",
        export_format=format,
        headers=headers,
        rows=rows,
        title=f"Official Civil Service Learning Transcript: {target_user.full_name}",
        subtitle=f"Employee ID: {target_user.employee_id or 'N/A'} • Dept: {target_user.department or 'General'} • Designation: {target_user.designation or 'Officer'}",
        requested_by=f"{current_user.full_name} ({current_user.email})",
        department_filter=target_user.department,
        col_widths=[75, 140, 65, 55, 55, 45, 55, 50] if format == "pdf" else None,
    )


@router.get(
    "/assessment-performance",
    summary="Export Assessment Telemetry & Quiz Pass Rate Audit",
    description="Itemized attempt records and passing metrics. Scoped strictly to trainer's authored quizzes.",
)
def export_assessment_performance(
    quiz_id: Optional[uuid.UUID] = Query(None, description="Optional quiz filter"),
    format: str = Query("csv", pattern="^(csv|pdf)$"),
    current_user: User = Depends(require_roles("trainer", "admin")),
    db: Session = Depends(get_db),
):
    query = (
        db.query(QuizAttempt, Quiz, User)
        .join(Quiz, QuizAttempt.quiz_id == Quiz.id)
        .join(User, QuizAttempt.user_id == User.id)
        .filter(QuizAttempt.completed_at.isnot(None))  # Exclude incomplete attempts!
    )

    # Trainer Data Isolation: Trainers can ONLY view telemetry on their own authored quizzes
    if current_user.role == "trainer":
        query = query.filter(Quiz.created_by == current_user.id)

    if quiz_id:
        query = query.filter(Quiz.id == quiz_id)

    attempts = query.order_by(QuizAttempt.completed_at.desc()).limit(1000).all()

    headers = [
        "Assessment Title",
        "Officer Name",
        "Department",
        "Score Obtained",
        "Total Marks",
        "Percentage",
        "Result",
        "Completion Date",
    ]
    rows = []

    for att, q, u in attempts:
        rows.append([
            q.title,
            u.full_name,
            u.department or "General",
            str(att.score),
            str(q.total_marks),
            f"{round(att.percentage, 1)}%",
            "PASSED" if att.passed else "NEEDS IMPROVEMENT",
            att.completed_at.strftime("%Y-%m-%d %H:%M") if att.completed_at else "-",
        ])

    log_report_export(db, current_user, "assessment-performance", format, len(rows), {"quiz_id": str(quiz_id) if quiz_id else None})
    return stream_report_response(
        report_name="assessment_performance",
        export_format=format,
        headers=headers,
        rows=rows,
        title="Assessment Telemetry & Passing Audit",
        subtitle="Itemized civil service diagnostic attempt evaluation and pass rate ledger",
        requested_by=f"{current_user.full_name} ({current_user.email})",
        col_widths=[140, 85, 85, 45, 45, 45, 55, 40] if format == "pdf" else None,
    )


# -----------------------------------------------------------------------------
# 7. Course Certification & Certificate Generation (Requirement 4)
# -----------------------------------------------------------------------------

@router.get(
    "/enrollments",
    summary="List all course enrollments for administrative certification",
    description="Returns all learner enrollments with course details, progress, and certification status.",
)
def list_enrollments_for_certification(
    current_user: User = Depends(require_roles("admin")),
    db: Session = Depends(get_db),
):
    enrollments = (
        db.query(Enrollment, User, Course)
        .join(User, Enrollment.user_id == User.id)
        .join(Course, Enrollment.course_id == Course.id)
        .order_by(Enrollment.enrolled_at.desc())
        .all()
    )
    results = []
    for enr, u, c in enrollments:
        cert_id = f"CERT-{enr.id.hex[:10].upper()}" if enr.status == "completed" else None
        results.append({
            "enrollment_id": str(enr.id),
            "user_id": str(u.id),
            "learner_name": u.full_name,
            "learner_email": u.email,
            "employee_id": u.employee_id,
            "department": u.department or "Public Administration",
            "designation": u.designation or "Officer",
            "course_id": str(c.id),
            "course_code": c.code,
            "course_title": c.title,
            "provider": c.provider,
            "status": enr.status,
            "progress_percentage": enr.progress_percentage,
            "enrolled_at": enr.enrolled_at.isoformat() if enr.enrolled_at else None,
            "completed_at": enr.completed_at.isoformat() if enr.completed_at else None,
            "is_certified": enr.status == "completed",
            "certificate_id": cert_id,
        })
    return results


@router.post(
    "/enrollments/{enrollment_id}/certify",
    summary="Certify learner course completion and generate official certificate",
    description="Sets enrollment status to completed, awards competencies to learner ledger, and registers certificate.",
)
def certify_course_completion(
    enrollment_id: uuid.UUID,
    current_user: User = Depends(require_roles("admin")),
    db: Session = Depends(get_db),
):
    enr = db.query(Enrollment).filter(Enrollment.id == enrollment_id).first()
    if not enr:
        raise HTTPException(status_code=404, detail="Enrollment record not found")

    user = db.query(User).filter(User.id == enr.user_id).first()
    course = db.query(Course).filter(Course.id == enr.course_id).first()
    if not user or not course:
        raise HTTPException(status_code=404, detail="Associated user or course not found")

    now_utc = datetime.now(timezone.utc)
    enr.status = "completed"
    enr.progress_percentage = 100
    if not enr.completed_at:
        enr.completed_at = now_utc

    # Elevate learner competencies based on course competencies
    course_comps = db.query(CourseCompetency).filter(CourseCompetency.course_id == course.id).all()
    for cc in course_comps:
        l_comp = db.query(LearnerCompetency).filter(
            LearnerCompetency.user_id == user.id,
            LearnerCompetency.competency_id == cc.competency_id,
        ).first()
        if l_comp:
            if l_comp.current_level < cc.target_level_achieved:
                l_comp.current_level = cc.target_level_achieved
                l_comp.gap_score = max(0, l_comp.target_level - l_comp.current_level)
                l_comp.last_assessed_at = now_utc
        else:
            db.add(
                LearnerCompetency(
                    id=uuid.uuid4(),
                    user_id=user.id,
                    competency_id=cc.competency_id,
                    current_level=cc.target_level_achieved,
                    target_level=cc.target_level_achieved,
                    gap_score=0,
                    last_assessed_at=now_utc,
                )
            )

    cert_id = f"CERT-{enr.id.hex[:10].upper()}"
    audit = AuditLog(
        actor_id=current_user.id,
        action="COURSE_COMPLETION_CERTIFIED",
        entity_type="enrollment",
        entity_id=str(enr.id),
        details={
            "learner_id": str(user.id),
            "learner_name": user.full_name,
            "course_id": str(course.id),
            "course_code": course.code,
            "course_title": course.title,
            "certificate_id": cert_id,
        },
    )
    db.add(audit)
    db.commit()

    return {
        "success": True,
        "message": f"Successfully certified {user.full_name} for '{course.title}'",
        "certificate_id": cert_id,
        "status": enr.status,
        "progress_percentage": enr.progress_percentage,
        "completed_at": enr.completed_at.isoformat(),
    }


@router.get(
    "/enrollments/{enrollment_id}/certificate",
    summary="Download verified course completion certificate PDF",
    description="Generates and streams the official PDF certificate for a completed course enrollment.",
)
def download_course_certificate(
    enrollment_id: uuid.UUID,
    current_user: User = Depends(require_roles("admin", "learner")),
    db: Session = Depends(get_db),
):
    enr = db.query(Enrollment).filter(Enrollment.id == enrollment_id).first()
    if not enr:
        raise HTTPException(status_code=404, detail="Enrollment record not found")

    if current_user.role != "admin" and enr.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied: Cannot access certificate of another learner")

    if enr.status != "completed":
        raise HTTPException(status_code=400, detail="Course enrollment is not completed yet; cannot issue certificate")

    user = db.query(User).filter(User.id == enr.user_id).first()
    course = db.query(Course).filter(Course.id == enr.course_id).first()
    if not user or not course:
        raise HTTPException(status_code=404, detail="Associated user or course not found")

    svc = get_report_service()
    cert_id = f"CERT-{enr.id.hex[:10].upper()}"
    completion_date_str = (
        enr.completed_at.strftime("%d %B %Y")
        if enr.completed_at
        else datetime.now(timezone.utc).strftime("%d %B %Y")
    )

    pdf_bytes = svc.generate_course_certificate_pdf(
        learner_name=user.full_name,
        employee_id=user.employee_id or "GOV-IN",
        department=user.department or "Public Administration",
        designation=user.designation or "Officer",
        course_title=course.title,
        course_code=course.code,
        provider=course.provider,
        completion_date=completion_date_str,
        certificate_id=cert_id,
    )

    clean_code = course.code.replace(" ", "_").replace("-", "_")
    clean_name = user.full_name.replace(" ", "_")
    filename = f"Certificate_{clean_code}_{clean_name}.pdf"

    log_report_export(
        db,
        current_user,
        "course-certificate",
        "pdf",
        1,
        {"enrollment_id": str(enr.id), "certificate_id": cert_id},
    )

    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
