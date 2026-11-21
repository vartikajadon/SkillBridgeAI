"""
Deterministic Database Seed Script for SkillBridge AI (Phase 1)
Seeds:
- 2 Job Roles: Data Analyst, Survey Officer
- 8 Core Competencies (Technical, Domain, Behavioral)
- Role-specific target levels and criticality weights
- 16 Realistic public sector courses
- Course-to-competency mappings
- 3 Seed accounts representing application roles: learner, trainer, admin

IDEMPOTENT: Safe to run repeatedly without causing duplicate key errors or data inflation.
"""
import sys
import uuid
from typing import Optional
from sqlalchemy.orm import Session
from app.db.session import SessionLocal, engine
from app.models.base import Base
from app.models.user import User
from app.models.job_role import JobRole
from app.models.competency import Competency, RoleCompetency, LearnerCompetency
from app.models.course import Course, CourseCompetency
from app.models.audit import AuditLog

# Fixed UUIDs for deterministic idempotent seeding
ROLE_DATA_ANALYST_ID = uuid.UUID("11111111-1111-1111-1111-111111111101")
ROLE_SURVEY_OFFICER_ID = uuid.UUID("11111111-1111-1111-1111-111111111102")

USER_ADMIN_ID = uuid.UUID("22222222-2222-2222-2222-222222222201")
USER_TRAINER_ID = uuid.UUID("22222222-2222-2222-2222-222222222202")
USER_LEARNER_ID = uuid.UUID("22222222-2222-2222-2222-222222222203")


def seed_database(db: Optional[Session] = None) -> None:
    owns_session = False
    if db is None:
        db = SessionLocal()
        owns_session = True

    try:
        print("[SEED] Starting deterministic database seeding...")

        # ----------------------------------------------------------------------
        # 1. Job Roles
        # ----------------------------------------------------------------------
        job_roles_data = [
            {
                "id": ROLE_DATA_ANALYST_ID,
                "code": "DATA_ANALYST",
                "title": "Data Analyst",
                "department": "Ministry of Statistics & Programme Implementation",
                "description": (
                    "Responsible for official data curation, statistical modeling, survey data "
                    "processing, public indicators analysis, and dashboard reporting for policy makers."
                ),
            },
            {
                "id": ROLE_SURVEY_OFFICER_ID,
                "code": "SURVEY_OFFICER",
                "title": "Survey Officer",
                "department": "National Sample Survey Office (NSSO)",
                "description": (
                    "Leads primary field enumerations, multi-stage stratified sampling, field staff "
                    "supervision, digital data validation, and district-level administrative compliance."
                ),
            },
        ]

        roles_by_code = {}
        for r_data in job_roles_data:
            role = db.query(JobRole).filter(JobRole.code == r_data["code"]).first()
            if not role:
                role = JobRole(**r_data)
                db.add(role)
                db.flush()
                print(f"  [+] Created JobRole: {role.title} ({role.code})")
            else:
                role.title = r_data["title"]
                role.department = r_data["department"]
                role.description = r_data["description"]
            roles_by_code[role.code] = role

        # ----------------------------------------------------------------------
        # 2. Competencies (8 standardized skills)
        # ----------------------------------------------------------------------
        competencies_data = [
            {
                "code": "STAT_ANALYSIS",
                "name": "Statistical Data Analysis",
                "category": "Technical",
                "description": "Proficiency in descriptive & inferential statistics, time-series, hypothesis testing, and statistical software.",
            },
            {
                "code": "DATA_VIZ",
                "name": "Public Data Visualization & Dashboards",
                "category": "Technical",
                "description": "Designing clear, accessible executive dashboards, KPI monitors, and geographical GIS data maps.",
            },
            {
                "code": "SURVEY_METHOD",
                "name": "Field Survey Methodology & Sampling",
                "category": "Domain",
                "description": "Designing survey schedules, probability proportional to size (PPS) sampling, and field enumeration protocols.",
            },
            {
                "code": "GOV_COMPLIANCE",
                "name": "Government Data Ethics & Compliance",
                "category": "Domain",
                "description": "Adherence to Digital Personal Data Protection (DPDP) Act, RTI, data security guidelines, and official secrets protocols.",
            },
            {
                "code": "SQL_DATABASE",
                "name": "Relational Database & SQL Querying",
                "category": "Technical",
                "description": "Writing performant SQL queries, data extraction from state portals, data cleaning, and relational joins.",
            },
            {
                "code": "POLICY_WRITING",
                "name": "Briefing Note & Policy Report Writing",
                "category": "Behavioral",
                "description": "Drafting precise cabinet notes, policy briefing papers, parliamentary replies, and executive summaries.",
            },
            {
                "code": "AI_GOVERNANCE",
                "name": "AI Literacy & Public Sector Automation",
                "category": "Technical",
                "description": "Understanding generative AI capabilities, RAG retrieval workflows, algorithmic fairness, and automated citizen services.",
            },
            {
                "code": "STAKEHOLDER_MGMT",
                "name": "Inter-Departmental Stakeholder Coordination",
                "category": "Behavioral",
                "description": "Leading multi-department working groups, consensus building, district administration liaison, and vendor coordination.",
            },
        ]

        comps_by_code = {}
        for c_data in competencies_data:
            comp = db.query(Competency).filter(Competency.code == c_data["code"]).first()
            if not comp:
                comp = Competency(**c_data)
                db.add(comp)
                db.flush()
                print(f"  [+] Created Competency: {comp.name} [{comp.category}]")
            else:
                comp.name = c_data["name"]
                comp.category = c_data["category"]
                comp.description = c_data["description"]
            comps_by_code[comp.code] = comp

        # ----------------------------------------------------------------------
        # 3. Role-Competency Targets (Benchmarks)
        # ----------------------------------------------------------------------
        role_targets = [
            # Data Analyst Targets
            {"role_code": "DATA_ANALYST", "comp_code": "STAT_ANALYSIS", "target": 4, "crit": "Mandatory"},
            {"role_code": "DATA_ANALYST", "comp_code": "SQL_DATABASE", "target": 4, "crit": "Mandatory"},
            {"role_code": "DATA_ANALYST", "comp_code": "DATA_VIZ", "target": 4, "crit": "Mandatory"},
            {"role_code": "DATA_ANALYST", "comp_code": "GOV_COMPLIANCE", "target": 3, "crit": "Mandatory"},
            {"role_code": "DATA_ANALYST", "comp_code": "POLICY_WRITING", "target": 3, "crit": "Mandatory"},
            {"role_code": "DATA_ANALYST", "comp_code": "AI_GOVERNANCE", "target": 3, "crit": "Desirable"},
            # Survey Officer Targets
            {"role_code": "SURVEY_OFFICER", "comp_code": "SURVEY_METHOD", "target": 5, "crit": "Mandatory"},
            {"role_code": "SURVEY_OFFICER", "comp_code": "GOV_COMPLIANCE", "target": 4, "crit": "Mandatory"},
            {"role_code": "SURVEY_OFFICER", "comp_code": "STAKEHOLDER_MGMT", "target": 4, "crit": "Mandatory"},
            {"role_code": "SURVEY_OFFICER", "comp_code": "STAT_ANALYSIS", "target": 3, "crit": "Mandatory"},
            {"role_code": "SURVEY_OFFICER", "comp_code": "POLICY_WRITING", "target": 3, "crit": "Mandatory"},
            {"role_code": "SURVEY_OFFICER", "comp_code": "DATA_VIZ", "target": 2, "crit": "Desirable"},
        ]

        for rt in role_targets:
            role_obj = roles_by_code[rt["role_code"]]
            comp_obj = comps_by_code[rt["comp_code"]]
            mapping = db.query(RoleCompetency).filter(
                RoleCompetency.job_role_id == role_obj.id,
                RoleCompetency.competency_id == comp_obj.id,
            ).first()

            if not mapping:
                mapping = RoleCompetency(
                    job_role_id=role_obj.id,
                    competency_id=comp_obj.id,
                    target_level=rt["target"],
                    criticality=rt["crit"],
                )
                db.add(mapping)
                print(f"  [+] Mapped Target: {rt['role_code']} -> {rt['comp_code']} = Level {rt['target']} ({rt['crit']})")
            else:
                mapping.target_level = rt["target"]
                mapping.criticality = rt["crit"]

        # ----------------------------------------------------------------------
        # 4. Realistic Course Catalog (16 Courses)
        # ----------------------------------------------------------------------
        courses_data = [
            {
                "code": "CRS-STAT-101",
                "title": "Foundations of Official Statistics in Governance",
                "provider": "iGOT Karmayogi",
                "duration_hours": 6,
                "description": "Core concepts in public sector statistics, central statistical organizations, and data collection standards.",
                "mappings": [("STAT_ANALYSIS", 2)],
            },
            {
                "code": "CRS-STAT-201",
                "title": "Applied Inferential Statistics for Policy Analysis",
                "provider": "National Statistical Systems Training Academy (NSSTA)",
                "duration_hours": 12,
                "description": "Regression models, causal inference, and multivariate techniques applied to census and socio-economic datasets.",
                "mappings": [("STAT_ANALYSIS", 4)],
            },
            {
                "code": "CRS-SQL-101",
                "title": "Relational Data Querying & SQL for Civil Servants",
                "provider": "National Informatics Centre (NIC)",
                "duration_hours": 8,
                "description": "Hands-on SQL basics: SELECT, WHERE, GROUP BY, aggregations, and subqueries on administrative databases.",
                "mappings": [("SQL_DATABASE", 2)],
            },
            {
                "code": "CRS-SQL-201",
                "title": "Advanced SQL & Database Analytics for Public Registries",
                "provider": "NIC",
                "duration_hours": 10,
                "description": "Window functions, Common Table Expressions (CTEs), query optimization, and schema design for state registries.",
                "mappings": [("SQL_DATABASE", 4)],
            },
            {
                "code": "CRS-VIZ-101",
                "title": "Designing Intuitive District Dashboards with Modern BI",
                "provider": "iGOT Karmayogi",
                "duration_hours": 8,
                "description": "Principles of executive data storytelling, chart selection, and KPI dashboarding for district administration.",
                "mappings": [("DATA_VIZ", 3)],
            },
            {
                "code": "CRS-VIZ-201",
                "title": "Geospatial Data Mapping & GIS for Monitoring Welfare Schemes",
                "provider": "ISRO / NITI Aayog",
                "duration_hours": 14,
                "description": "GIS mapping, shapefiles, Bhuvan integration, and spatial discrepancy identification in welfare delivery.",
                "mappings": [("DATA_VIZ", 4)],
            },
            {
                "code": "CRS-SRV-101",
                "title": "National Sample Survey: Field Protocols & Primary Enumeration",
                "provider": "NSSO",
                "duration_hours": 15,
                "description": "Conducting household surveys, primary sampling units (PSU), listing schedules, and digital field tablet entry.",
                "mappings": [("SURVEY_METHOD", 3)],
            },
            {
                "code": "CRS-SRV-201",
                "title": "Advanced Sampling Frameworks & Quality Control in Field Surveys",
                "provider": "NSSTA",
                "duration_hours": 18,
                "description": "Multi-stage stratified sampling, non-sampling error minimization, imputation, and field supervisory audit rubrics.",
                "mappings": [("SURVEY_METHOD", 5)],
            },
            {
                "code": "CRS-ETH-101",
                "title": "Digital Personal Data Protection (DPDP) Act Compliance in Government",
                "provider": "Institute of Secretariat Training and Management (ISTM)",
                "duration_hours": 6,
                "description": "Statutory requirements of DPDP Act 2023, data fiduciary obligations, consent mechanisms, and citizen privacy.",
                "mappings": [("GOV_COMPLIANCE", 3)],
            },
            {
                "code": "CRS-ETH-201",
                "title": "Data Governance, RTI Transparency & Cyber Security Protocols",
                "provider": "ISTM",
                "duration_hours": 8,
                "description": "Managing classified documents, RTI handling procedures, official data sanitization, and cybersecurity hygiene.",
                "mappings": [("GOV_COMPLIANCE", 4)],
            },
            {
                "code": "CRS-POL-101",
                "title": "Mastering Cabinet Notes & Parliamentary Q&A Preparation",
                "provider": "ISTM",
                "duration_hours": 10,
                "description": "Procedural guidelines for drafting clear cabinet notes, inter-ministerial comments, and starred/unstarred replies.",
                "mappings": [("POLICY_WRITING", 3)],
            },
            {
                "code": "CRS-POL-201",
                "title": "Strategic Evidence-Based Policy Formulation & Evaluation",
                "provider": "Lal Bahadur Shastri National Academy of Administration (LBSNAA)",
                "duration_hours": 16,
                "description": "Frameworks for program evaluation, randomized evaluation insights, cost-benefit analysis, and policy briefs.",
                "mappings": [("POLICY_WRITING", 4)],
            },
            {
                "code": "CRS-AI-101",
                "title": "Artificial Intelligence & Automation Fundamentals in Governance",
                "provider": "iGOT Karmayogi",
                "duration_hours": 6,
                "description": "Demystifying LLMs, RAG, prompt engineering, and automated citizen grievance triage.",
                "mappings": [("AI_GOVERNANCE", 2)],
            },
            {
                "code": "CRS-AI-201",
                "title": "Responsible AI Deployment & Risk Mitigation in Public Services",
                "provider": "MeitY / NITI Aayog",
                "duration_hours": 12,
                "description": "Auditing AI models for bias, public safety, human-in-the-loop validation, and ethics in AI welfare systems.",
                "mappings": [("AI_GOVERNANCE", 4)],
            },
            {
                "code": "CRS-LDR-101",
                "title": "Inter-Departmental Collaboration & Consensus Building",
                "provider": "ISTM",
                "duration_hours": 8,
                "description": "Strategies for breaking departmental silos, coordinating joint schemes, and managing cross-agency committees.",
                "mappings": [("STAKEHOLDER_MGMT", 3)],
            },
            {
                "code": "CRS-LDR-201",
                "title": "Crisis Leadership & District Grievance Resolution",
                "provider": "LBSNAA",
                "duration_hours": 14,
                "description": "District-level conflict resolution, media handling during crisis, disaster coordination, and public diplomacy.",
                "mappings": [("STAKEHOLDER_MGMT", 4)],
            },
        ]

        for c_data in courses_data:
            course = db.query(Course).filter(Course.code == c_data["code"]).first()
            if not course:
                course = Course(
                    code=c_data["code"],
                    title=c_data["title"],
                    provider=c_data["provider"],
                    duration_hours=c_data["duration_hours"],
                    description=c_data["description"],
                    status="published",
                )
                db.add(course)
                db.flush()
                print(f"  [+] Created Course: {course.title} ({course.code})")
            else:
                course.title = c_data["title"]
                course.provider = c_data["provider"]
                course.duration_hours = c_data["duration_hours"]
                course.description = c_data["description"]

            # Map competencies
            for comp_code, achieved_level in c_data["mappings"]:
                comp_obj = comps_by_code[comp_code]
                mapping = db.query(CourseCompetency).filter(
                    CourseCompetency.course_id == course.id,
                    CourseCompetency.competency_id == comp_obj.id,
                ).first()
                if not mapping:
                    mapping = CourseCompetency(
                        course_id=course.id,
                        competency_id=comp_obj.id,
                        target_level_achieved=achieved_level,
                    )
                    db.add(mapping)

        # ----------------------------------------------------------------------
        # 5. Seed Users (Admin, Trainer, Learner)
        # ----------------------------------------------------------------------
        users_data = [
            {
                "id": USER_ADMIN_ID,
                "email": "admin@skillbridge.gov.in",
                "full_name": "Rajesh Kumar (System Administrator)",
                "role": "admin",
                "department": "Department of Personnel and Training (DoPT)",
                "designation": "Director (Capacity Building)",
                "employee_id": "DOPT-ADM-001",
                "job_role_id": None,
            },
            {
                "id": USER_TRAINER_ID,
                "email": "trainer.sharma@skillbridge.gov.in",
                "full_name": "Dr. Sunita Sharma (Master Trainer)",
                "role": "trainer",
                "department": "National Statistical Systems Training Academy",
                "designation": "Senior Faculty Member",
                "employee_id": "NSSTA-TRN-004",
                "job_role_id": None,
            },
            {
                "id": USER_LEARNER_ID,
                "email": "learner.patel@skillbridge.gov.in",
                "full_name": "Amit Patel (Statistical Assistant)",
                "role": "learner",
                "department": "Ministry of Statistics & Programme Implementation",
                "designation": "Assistant Director (Data Analytics)",
                "employee_id": "MOSPI-AST-042",
                "job_role_id": ROLE_DATA_ANALYST_ID,
            },
        ]

        for u_data in users_data:
            user = db.query(User).filter(User.email == u_data["email"]).first()
            if not user:
                user = User(**u_data)
                db.add(user)
                db.flush()
                print(f"  [+] Created User: {user.full_name} [{user.role}]")
            else:
                user.full_name = u_data["full_name"]
                user.role = u_data["role"]
                user.department = u_data["department"]
                user.designation = u_data["designation"]
                user.employee_id = u_data["employee_id"]
                user.job_role_id = u_data["job_role_id"]

        # ----------------------------------------------------------------------
        # 6. Seed Learner Baseline Skill Gaps for Amit Patel
        # ----------------------------------------------------------------------
        learner_skills_data = [
            {"comp_code": "STAT_ANALYSIS", "current": 2, "target": 4}, # Gap: +2
            {"comp_code": "SQL_DATABASE", "current": 2, "target": 4},  # Gap: +2
            {"comp_code": "DATA_VIZ", "current": 3, "target": 4},      # Gap: +1
            {"comp_code": "GOV_COMPLIANCE", "current": 2, "target": 3},# Gap: +1
            {"comp_code": "POLICY_WRITING", "current": 3, "target": 3},# Gap: 0 (Proficient)
            {"comp_code": "AI_GOVERNANCE", "current": 1, "target": 3}, # Gap: +2
        ]

        for ls in learner_skills_data:
            comp_obj = comps_by_code[ls["comp_code"]]
            l_comp = db.query(LearnerCompetency).filter(
                LearnerCompetency.user_id == USER_LEARNER_ID,
                LearnerCompetency.competency_id == comp_obj.id,
            ).first()

            gap = max(0, ls["target"] - ls["current"])
            if not l_comp:
                l_comp = LearnerCompetency(
                    user_id=USER_LEARNER_ID,
                    competency_id=comp_obj.id,
                    current_level=ls["current"],
                    target_level=ls["target"],
                    gap_score=gap,
                )
                db.add(l_comp)
                print(f"  [+] Learner Skill Gap: Amit Patel -> {ls['comp_code']}: current={ls['current']}, target={ls['target']}, gap={gap}")
            else:
                l_comp.current_level = ls["current"]
                l_comp.target_level = ls["target"]
                l_comp.gap_score = gap

        # ----------------------------------------------------------------------
        # 7. Seed Audit Log Event
        # ----------------------------------------------------------------------
        audit_exists = db.query(AuditLog).filter(AuditLog.action == "INITIAL_SYSTEM_SEED").first()
        if not audit_exists:
            audit = AuditLog(
                actor_id=USER_ADMIN_ID,
                action="INITIAL_SYSTEM_SEED",
                entity_type="system",
                entity_id="phase_1_baseline",
                details={
                    "status": "success",
                    "roles_seeded": len(job_roles_data),
                    "competencies_seeded": len(competencies_data),
                    "courses_seeded": len(courses_data),
                    "users_seeded": len(users_data),
                },
                ip_address="127.0.0.1",
            )
            db.add(audit)
            print("  [+] Recorded INITIAL_SYSTEM_SEED in audit_logs.")

        db.commit()
        print("[SEED] Deterministic seeding successfully completed! All records persisted.")

    except Exception as e:
        db.rollback()
        print(f"[SEED ERROR] Seeding aborted: {e}")
        raise
    finally:
        if owns_session:
            db.close()


if __name__ == "__main__":
    seed_database()
