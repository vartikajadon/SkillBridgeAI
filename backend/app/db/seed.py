"""
Deterministic Database Seed Script for SkillBridge AI (Phase 1 & Phase 4)
Seeds:
- 2 Job Roles: Data Analyst, Survey Officer
- 12 Public Sector Competencies (Technical, Domain, Behavioral) covering all 10 target domains
- Role-specific target levels and criticality weights
- 20 Realistic simulated government training courses (tagged with [SOURCE: SIMULATED_IGOT_MOCK])
- Course-to-competency mappings
- 2 Baseline diagnostic MCQ assessments for Data Analyst and Survey Officer
- 3 Seed accounts representing application roles: learner, trainer, admin
- Baseline learner competency ledger for demonstration account

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
from app.models.course import Course, CourseCompetency, Enrollment
from app.models.document import DocumentChunk, TrainingDocument
from app.models.quiz import Quiz
from app.models.audit import AuditLog

# Fixed UUIDs for deterministic idempotent seeding
ROLE_DATA_ANALYST_ID = uuid.UUID("11111111-1111-1111-1111-111111111101")
ROLE_SURVEY_OFFICER_ID = uuid.UUID("11111111-1111-1111-1111-111111111102")
ROLE_BUSINESS_ANALYST_ID = uuid.UUID("11111111-1111-1111-1111-111111111103")
ROLE_FINANCE_ASSISTANT_ID = uuid.UUID("11111111-1111-1111-1111-111111111104")

USER_ADMIN_ID = uuid.UUID("22222222-2222-2222-2222-222222222201")
USER_TRAINER_ID = uuid.UUID("22222222-2222-2222-2222-222222222202")
USER_LEARNER_ID = uuid.UUID("22222222-2222-2222-2222-222222222203")

QUIZ_DATA_ANALYST_DIAG_ID = uuid.UUID("33333333-3333-3333-3333-333333333301")
QUIZ_SURVEY_OFFICER_DIAG_ID = uuid.UUID("33333333-3333-3333-3333-333333333302")
SEED_DOCUMENT_ID = uuid.UUID("44444444-4444-4444-4444-444444444401")
SEED_DOCUMENT_BA_ID = uuid.UUID("44444444-4444-4444-4444-444444444402")
SEED_DOCUMENT_DA_ID = uuid.UUID("44444444-4444-4444-4444-444444444403")


def seed_database(db: Optional[Session] = None) -> None:
    owns_session = False
    if db is None:
        # Only auto-create tables for local SQLite development/testing databases.
        # In PostgreSQL / Supabase, Alembic migrations ('alembic upgrade head') are the
        # sole authoritative production schema mechanism to prevent version drift.
        if engine.dialect.name == "sqlite":
            Base.metadata.create_all(bind=engine)
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
            {
                "id": ROLE_BUSINESS_ANALYST_ID,
                "code": "BUSINESS_ANALYST",
                "title": "Business Analyst",
                "department": "National e-Governance Division (NeGD) / MeitY",
                "description": (
                    "Analyzes citizen service delivery workflows, drafts functional specifications for digital e-governance "
                    "systems, maps administrative business processes, and coordinates digital public infrastructure implementation."
                ),
            },
            {
                "id": ROLE_FINANCE_ASSISTANT_ID,
                "code": "FINANCE_ASSISTANT",
                "title": "Finance Assistant",
                "department": "Department of Expenditure / Ministry of Finance",
                "description": (
                    "Executes public financial accounting, General Financial Rules (GFR 2017) compliance, Public Financial "
                    "Management System (PFMS) bill sanctions, GeM procurement tenders, and departmental audit verification."
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
        # 2. Competencies (12 standardized skills covering all 10 core domains)
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
            {
                "code": "DIGITAL_LITERACY",
                "name": "Digital Workplace Tools & E-Office Systems",
                "category": "Technical",
                "description": "Operating national digital portals, e-Office electronic file processing, digital signatures, and cloud document collaboration.",
            },
            {
                "code": "CYBERSECURITY",
                "name": "Cybersecurity Awareness & Public Data Protection",
                "category": "Technical",
                "description": "Identifying phishing, secure credential hygiene, endpoint security adherence, and incident escalation protocols under CERT-In guidelines.",
            },
            {
                "code": "COMMUNICATION",
                "name": "Civil Service Communication & Citizen Engagement",
                "category": "Behavioral",
                "description": "Transparent public communication, citizen grievance handling, press brief coordination, and empathetic service delivery.",
            },
            {
                "code": "LEADERSHIP",
                "name": "Public Sector Leadership & Strategic Decision Making",
                "category": "Behavioral",
                "description": "Administrative delegation, change management, crisis coordination, institutional capacity building, and ethical leadership.",
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
            {"role_code": "DATA_ANALYST", "comp_code": "DIGITAL_LITERACY", "target": 3, "crit": "Mandatory"},
            {"role_code": "DATA_ANALYST", "comp_code": "CYBERSECURITY", "target": 3, "crit": "Desirable"},

            # Survey Officer Targets
            {"role_code": "SURVEY_OFFICER", "comp_code": "SURVEY_METHOD", "target": 5, "crit": "Mandatory"},
            {"role_code": "SURVEY_OFFICER", "comp_code": "GOV_COMPLIANCE", "target": 4, "crit": "Mandatory"},
            {"role_code": "SURVEY_OFFICER", "comp_code": "STAKEHOLDER_MGMT", "target": 4, "crit": "Mandatory"},
            {"role_code": "SURVEY_OFFICER", "comp_code": "COMMUNICATION", "target": 4, "crit": "Mandatory"},
            {"role_code": "SURVEY_OFFICER", "comp_code": "STAT_ANALYSIS", "target": 3, "crit": "Mandatory"},
            {"role_code": "SURVEY_OFFICER", "comp_code": "POLICY_WRITING", "target": 3, "crit": "Mandatory"},
            {"role_code": "SURVEY_OFFICER", "comp_code": "DIGITAL_LITERACY", "target": 3, "crit": "Mandatory"},
            {"role_code": "SURVEY_OFFICER", "comp_code": "DATA_VIZ", "target": 2, "crit": "Desirable"},

            # Business Analyst Targets
            {"role_code": "BUSINESS_ANALYST", "comp_code": "STAKEHOLDER_MGMT", "target": 4, "crit": "Mandatory"},
            {"role_code": "BUSINESS_ANALYST", "comp_code": "POLICY_WRITING", "target": 4, "crit": "Mandatory"},
            {"role_code": "BUSINESS_ANALYST", "comp_code": "DIGITAL_LITERACY", "target": 4, "crit": "Mandatory"},
            {"role_code": "BUSINESS_ANALYST", "comp_code": "AI_GOVERNANCE", "target": 3, "crit": "Mandatory"},
            {"role_code": "BUSINESS_ANALYST", "comp_code": "COMMUNICATION", "target": 4, "crit": "Mandatory"},
            {"role_code": "BUSINESS_ANALYST", "comp_code": "GOV_COMPLIANCE", "target": 3, "crit": "Desirable"},

            # Finance Assistant Targets
            {"role_code": "FINANCE_ASSISTANT", "comp_code": "GOV_COMPLIANCE", "target": 5, "crit": "Mandatory"},
            {"role_code": "FINANCE_ASSISTANT", "comp_code": "POLICY_WRITING", "target": 4, "crit": "Mandatory"},
            {"role_code": "FINANCE_ASSISTANT", "comp_code": "DIGITAL_LITERACY", "target": 4, "crit": "Mandatory"},
            {"role_code": "FINANCE_ASSISTANT", "comp_code": "SQL_DATABASE", "target": 3, "crit": "Desirable"},
            {"role_code": "FINANCE_ASSISTANT", "comp_code": "COMMUNICATION", "target": 3, "crit": "Mandatory"},
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
        # 4. Realistic Simulated Course Catalog (20 Courses)
        # ----------------------------------------------------------------------
        courses_data = [
            # ------------------------------------------------------------------
            # 5 Flagship iGOT Karmayogi Courses across 3 Government Employee Roles
            # ------------------------------------------------------------------
            # 1. Data Analyst (Course 1)
            {
                "code": "CRS-IGOT-DA01",
                "title": "iGOT: Data-Driven Governance & Official Statistics",
                "provider": "iGOT Karmayogi (MoSPI / DoPT)",
                "duration_hours": 14,
                "description": (
                    "[iGOT Karmayogi Official Course]\n"
                    "Target Role: Data Analyst | Framework: FRAC Technical Competency | Level: Practitioner (Level 4)\n"
                    "Comprehensive training on leveraging public sector datasets from National Data & Analytics Platform (NDAP), "
                    "applying inferential statistics, time-series projections, and socio-economic econometric modeling for evidence-based policymaking."
                ),
                "mappings": [("STAT_ANALYSIS", 4), ("SQL_DATABASE", 3), ("DATA_VIZ", 3)],
            },
            # 2. Data Analyst (Course 2)
            {
                "code": "CRS-IGOT-DA02",
                "title": "iGOT: Public Sector Data Visualization & District KPI Dashboards",
                "provider": "iGOT Karmayogi (NIC / NITI Aayog)",
                "duration_hours": 10,
                "description": (
                    "[iGOT Karmayogi Official Course]\n"
                    "Target Role: Data Analyst | Framework: FRAC Technical Competency | Level: Intermediate (Level 3)\n"
                    "Hands-on masterclass in building responsive executive KPI monitors, choropleth GIS geospatial maps (Bhuvan/BharatMaps), "
                    "and district administrative dashboards for Collectors and Ministry Secretaries using modern BI tools."
                ),
                "mappings": [("DATA_VIZ", 4), ("DIGITAL_LITERACY", 3)],
            },
            # 3. Business Analyst (Course 3)
            {
                "code": "CRS-IGOT-BA01",
                "title": "iGOT: Government Process Re-engineering (GPR) & Workflow Modernization",
                "provider": "iGOT Karmayogi (NeGD / MeitY)",
                "duration_hours": 12,
                "description": (
                    "[iGOT Karmayogi Official Course]\n"
                    "Target Role: Business Analyst | Framework: FRAC Domain Competency | Level: Practitioner (Level 4)\n"
                    "Systematic methodology for auditing legacy administrative procedures, eliminating bureaucratic bottlenecks, "
                    "and designing citizen-centric e-District and state service delivery workflows under Digital India guidelines."
                ),
                "mappings": [("STAKEHOLDER_MGMT", 4), ("POLICY_WRITING", 4), ("DIGITAL_LITERACY", 3)],
            },
            # 4. Business Analyst (Course 4)
            {
                "code": "CRS-IGOT-BA02",
                "title": "iGOT: Citizen Requirements Engineering & Public Digital Infrastructure (DPI)",
                "provider": "iGOT Karmayogi (National e-Governance Division)",
                "duration_hours": 8,
                "description": (
                    "[iGOT Karmayogi Official Course]\n"
                    "Target Role: Business Analyst | Framework: FRAC Technical & Behavioral | Level: Intermediate (Level 3)\n"
                    "Translating complex legislative and cabinet mandates into functional requirement specifications (FRS), "
                    "agile user stories, and API integration specifications for India Stack (Aadhaar, DigiLocker, UPI, e-Sign)."
                ),
                "mappings": [("AI_GOVERNANCE", 3), ("COMMUNICATION", 4), ("STAKEHOLDER_MGMT", 3)],
            },
            # 5. Finance Assistant (Course 5)
            {
                "code": "CRS-IGOT-FA01",
                "title": "iGOT: Public Financial Management System (PFMS), GFR 2017 & GeM Operations",
                "provider": "iGOT Karmayogi (NIFM / Ministry of Finance)",
                "duration_hours": 16,
                "description": (
                    "[iGOT Karmayogi Official Course]\n"
                    "Target Role: Finance Assistant | Framework: FRAC Domain & Compliance | Level: Advanced (Level 4)\n"
                    "Operational mastery of Treasury Rules, General Financial Rules (GFR 2017), electronic bill processing in PFMS, "
                    "expenditure sanction workflows, and Government e-Marketplace (GeM) direct purchase, bid, and reverse auction rules."
                ),
                "mappings": [("GOV_COMPLIANCE", 4), ("POLICY_WRITING", 3), ("DIGITAL_LITERACY", 4)],
            },
        ]

        # Clean up any obsolete/old courses not in the new 5 iGOT courses
        new_course_codes = {c['code'] for c in courses_data}
        obsolete_courses = db.query(Course).filter(~Course.code.in_(new_course_codes)).all()
        for oc in obsolete_courses:
            db.query(CourseCompetency).filter(CourseCompetency.course_id == oc.id).delete()
            db.query(Enrollment).filter(Enrollment.course_id == oc.id).delete()
            db.delete(oc)
            print(f"  [-] Removed Obsolete Course: {oc.title} ({oc.code})")
        db.flush()

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
                else:
                    mapping.target_level_achieved = achieved_level

        # ----------------------------------------------------------------------
        # 5. Baseline Diagnostic MCQ Assessments
        # ----------------------------------------------------------------------
        course_da = db.query(Course).filter(Course.code == "CRS-IGOT-DA01").first()
        diagnostic_quizzes_data = [
            {
                "id": QUIZ_DATA_ANALYST_DIAG_ID,
                "title": "Data Analyst Baseline Competency Diagnostic",
                "course_id": course_da.id if course_da else None,
                "competency_id": None,
                "created_by": USER_TRAINER_ID,
                "total_marks": 100,
                "passing_marks": 60,
                "questions": [
                    {
                        "id": "da_q01",
                        "competency_code": "STAT_ANALYSIS",
                        "difficulty_level": 2,
                        "points": 10,
                        "prompt": "When evaluating socio-economic household income data with extreme positive skewness, which measure of central tendency provides the most representative metric for policy planning?",
                        "options": ["Mean", "Median", "Mode", "Geometric Mean"],
                        "correct_index": 1,
                        "explanation": "Median is robust against extreme outliers and provides a reliable central point for positively skewed distributions.",
                    },
                    {
                        "id": "da_q02",
                        "competency_code": "STAT_ANALYSIS",
                        "difficulty_level": 4,
                        "points": 10,
                        "prompt": "In an observational study assessing a cash-transfer program's impact on child nutrition, what statistical technique is most suitable to mitigate overt selection bias when randomized control is unfeasible?",
                        "options": ["Simple OLS Regression without covariates", "Propensity Score Matching (PSM)", "K-Means Clustering", "Principal Component Analysis (PCA)"],
                        "correct_index": 1,
                        "explanation": "Propensity Score Matching balances observable baseline covariates between treatment and control cohorts to reduce selection bias.",
                    },
                    {
                        "id": "da_q03",
                        "competency_code": "SQL_DATABASE",
                        "difficulty_level": 2,
                        "points": 10,
                        "prompt": "Which SQL clause is used to filter aggregated groups after a GROUP BY operation on district welfare expenditure records?",
                        "options": ["WHERE", "HAVING", "ORDER BY", "QUALIFY"],
                        "correct_index": 1,
                        "explanation": "HAVING filters aggregated summary rows after grouping, whereas WHERE filters individual input rows prior to grouping.",
                    },
                    {
                        "id": "da_q04",
                        "competency_code": "SQL_DATABASE",
                        "difficulty_level": 4,
                        "points": 10,
                        "prompt": "Which SQL window function allows ranking of districts by enrollment figures such that tied values receive the same rank and subsequent ranks are not skipped (e.g., 1, 2, 2, 3)?",
                        "options": ["ROW_NUMBER()", "RANK()", "DENSE_RANK()", "NTILE(4)"],
                        "correct_index": 2,
                        "explanation": "DENSE_RANK() assigns consecutive rankings without gaps when duplicate values occur.",
                    },
                    {
                        "id": "da_q05",
                        "competency_code": "DATA_VIZ",
                        "difficulty_level": 2,
                        "points": 10,
                        "prompt": "When designing an executive dashboard for monitoring the district-wise sex ratio across 36 states and union territories, which visual display is most readable?",
                        "options": ["3D Exploded Pie Chart", "Horizontal Ordered Bar Chart", "Multi-layered Radar Chart", "Word Cloud"],
                        "correct_index": 1,
                        "explanation": "Horizontal ordered bar charts allow clear label readability and instant comparative length judgment across many entities.",
                    },
                    {
                        "id": "da_q06",
                        "competency_code": "DATA_VIZ",
                        "difficulty_level": 4,
                        "points": 10,
                        "prompt": "When visualizing geographic disparities in maternal mortality across districts of varying geographical surface area, why is a normalized choropleth map preferred over a raw absolute count map?",
                        "options": ["It reduces map file storage size", "Raw counts disproportionately highlight large geographical areas rather than population risk density", "Choropleth maps automatically eliminate survey sampling error", "Colors appear brighter on GIS screens"],
                        "correct_index": 1,
                        "explanation": "Normalizing counts by target population (e.g. maternal deaths per 100,000 live births) prevents large but sparsely populated districts from distorting visual analysis.",
                    },
                    {
                        "id": "da_q07",
                        "competency_code": "GOV_COMPLIANCE",
                        "difficulty_level": 2,
                        "points": 10,
                        "prompt": "Under the Digital Personal Data Protection (DPDP) Act 2023, what is the primary role of a government department when collecting citizen biometric data for welfare distribution?",
                        "options": ["Data Principal", "Data Fiduciary", "Data Processor exclusively", "Data Consent Auditor"],
                        "correct_index": 1,
                        "explanation": "A Data Fiduciary is any entity that determines the purpose and means of processing personal data.",
                    },
                    {
                        "id": "da_q08",
                        "competency_code": "GOV_COMPLIANCE",
                        "difficulty_level": 3,
                        "points": 10,
                        "prompt": "When publishing district administrative datasets on Open Government Data (data.gov.in), which procedure is legally mandatory regarding Personally Identifiable Information (PII)?",
                        "options": ["Include full citizen names with partial Aadhaar numbers", "De-identify and anonymize all indirect identifiers using k-anonymity or suppression", "Store PII in password-protected ZIP attachments", "Require citizen signature before every download"],
                        "correct_index": 1,
                        "explanation": "Proactive open data disclosure requires robust de-identification and masking to prevent citizen re-identification and privacy violations.",
                    },
                    {
                        "id": "da_q09",
                        "competency_code": "AI_GOVERNANCE",
                        "difficulty_level": 2,
                        "points": 10,
                        "prompt": "What is the primary advantage of employing Retrieval-Augmented Generation (RAG) over vanilla Large Language Models when generating administrative replies based on official gazette notifications?",
                        "options": ["It completely eliminates the need for computing infrastructure", "It grounds responses in verified institutional documents and provides source citations to reduce hallucination", "It guarantees 100% processing speedup", "It automatically translates responses into 50 languages"],
                        "correct_index": 1,
                        "explanation": "RAG retrieves specific context passages from authoritative government repositories, grounding LLM synthesis in verifiable circulars and reducing factual hallucinations.",
                    },
                    {
                        "id": "da_q10",
                        "competency_code": "AI_GOVERNANCE",
                        "difficulty_level": 3,
                        "points": 10,
                        "prompt": "In an AI-assisted automated triage system for citizen pension grievances, what governance safeguard is mandatory prior to issuing a final rejection of benefits?",
                        "options": ["No safeguard is needed if model accuracy exceeds 95%", "Human-in-the-Loop (HITL) review by an authorized designated officer", "Re-running the AI model three times to check consistency", "Publishing the model weights to the public portal"],
                        "correct_index": 1,
                        "explanation": "Administrative law requires human-in-the-loop review by an accountable officer before any adverse decision impacting citizen rights or benefits is finalized.",
                    },
                ],
            },
            {
                "id": QUIZ_SURVEY_OFFICER_DIAG_ID,
                "title": "Survey Officer Baseline Competency Diagnostic",
                "course_id": None,
                "competency_id": None,
                "created_by": USER_TRAINER_ID,
                "total_marks": 100,
                "passing_marks": 60,
                "questions": [
                    {
                        "id": "so_q01",
                        "competency_code": "SURVEY_METHOD",
                        "difficulty_level": 2,
                        "points": 10,
                        "prompt": "In large-scale socio-economic surveys conducted by NSSO, why is stratified multi-stage sampling preferred over simple random sampling across rural villages?",
                        "options": ["It guarantees zero sampling variance", "It accommodates administrative geographical hierarchies and lowers field enumeration logistical costs", "It does not require any frame of primary sampling units", "It allows investigators to select any convenient household"],
                        "correct_index": 1,
                        "explanation": "Stratified multi-stage sampling balances administrative representation and logistical feasibility across vast geographical terrains.",
                    },
                    {
                        "id": "so_q02",
                        "competency_code": "SURVEY_METHOD",
                        "difficulty_level": 4,
                        "points": 10,
                        "prompt": "During primary household listing in a selected sample village, an enumerator encounters locked houses during two consecutive visits. What is the standard protocol to maintain sampling frame validity?",
                        "options": ["Immediately substitute with the nearest cooperative neighbor", "Conduct a mandatory third revisit at an alternate time of day and record detailed non-response status if still unavailable", "Mark the household as completed with synthetic values", "Discard the entire Primary Sampling Unit"],
                        "correct_index": 1,
                        "explanation": "Survey protocols require structured repeat visits at varied hours before classifying non-response to avoid non-random selection bias.",
                    },
                    {
                        "id": "so_q03",
                        "competency_code": "GOV_COMPLIANCE",
                        "difficulty_level": 2,
                        "points": 10,
                        "prompt": "Under the Collection of Statistics Act 2008, what legal obligation applies to informants residing in a designated sample enumeration area?",
                        "options": ["They are legally obliged to provide truthful factual information to designated statistics officers", "They can demand financial compensation prior to answering", "They may only answer if authorized by village sarpanch", "The Act only applies to private commercial corporations"],
                        "correct_index": 0,
                        "explanation": "The Collection of Statistics Act empowers authorized statistical officers to collect accurate data and obligates informants to furnish truthful information.",
                    },
                    {
                        "id": "so_q04",
                        "competency_code": "GOV_COMPLIANCE",
                        "difficulty_level": 4,
                        "points": 10,
                        "prompt": "A third-party commercial firm requests raw, un-anonymized household survey records under the Right to Information (RTI) Act. What is the correct statutory response?",
                        "options": ["Release the unmasked data within 30 days upon receiving the standard application fee", "Deny disclosure citing Section 8(1)(j) of RTI Act and statistical confidentiality provisions protecting individual citizen privacy", "Auction the dataset to the highest bidder", "Consult the local district magistrate for discretionary approval"],
                        "correct_index": 1,
                        "explanation": "Section 8(1)(j) of RTI Act and statistical confidentiality frameworks strictly prohibit disclosure of individual personal information that causes unwarranted invasion of privacy.",
                    },
                    {
                        "id": "so_q05",
                        "competency_code": "STAKEHOLDER_MGMT",
                        "difficulty_level": 2,
                        "points": 10,
                        "prompt": "Before entering a remote tribal block for a rural consumption survey, what first step should a Survey Officer take to ensure field cooperation and safety?",
                        "options": ["Begin unannounced interviews at sunrise", "Liaison with the District Magistrate, Block Development Officer, and local Gram Panchayat representatives", "Hire a private security agency", "Issue legal summons to all village residents"],
                        "correct_index": 1,
                        "explanation": "Engaging district administration and grassroots local leaders builds community trust and facilitates smooth field enumeration.",
                    },
                    {
                        "id": "so_q06",
                        "competency_code": "STAKEHOLDER_MGMT",
                        "difficulty_level": 4,
                        "points": 10,
                        "prompt": "During a contentious field survey on agricultural landholding, local community groups threaten a survey boycott suspecting land acquisition motives. How should the Supervisory Officer de-escalate?",
                        "options": ["Threaten legal prosecution under statutory statistical acts immediately", "Organize a transparent Gram Sabha briefing with village elders to clearly clarify statistical-only research purpose and demonstrate data protection safeguards", "Abandon the survey permanently without informing headquarters", "Offer discretionary monetary incentives to community leaders"],
                        "correct_index": 1,
                        "explanation": "Empathetic, transparent community stakeholder consultation addressing underlying misconceptions is the established method for resolving field impasses.",
                    },
                    {
                        "id": "so_q07",
                        "competency_code": "STAT_ANALYSIS",
                        "difficulty_level": 2,
                        "points": 10,
                        "prompt": "If a field survey records household consumer expenditure across 1,000 households with a sample mean of ₹12,000 and standard deviation of ₹3,000, what happens to the standard error of the mean if the sample size is quadrupled to 4,000?",
                        "options": ["It is halved", "It is doubled", "It remains unchanged", "It is quadrupled"],
                        "correct_index": 0,
                        "explanation": "Standard error of the mean is SE = sigma / sqrt(N). Quadrupling sample size N doubles the denominator, halving the standard error.",
                    },
                    {
                        "id": "so_q08",
                        "competency_code": "STAT_ANALYSIS",
                        "difficulty_level": 3,
                        "points": 10,
                        "prompt": "In an official field sample inspection, an auditor notices that 95% of recorded survey interviews took exactly 12 minutes according to digital tablet timestamps. What statistical anomaly does this indicate?",
                        "options": ["Exceptional enumerator efficiency", "Suspicion of data fabrication or kerbside interviewing without genuine householder engagement", "Optimal normal distribution", "High statistical confidence"],
                        "correct_index": 1,
                        "explanation": "Near-zero variance in survey completion duration across diverse households strongly points to data fabrication or perfunctory enumeration.",
                    },
                    {
                        "id": "so_q09",
                        "competency_code": "POLICY_WRITING",
                        "difficulty_level": 2,
                        "points": 10,
                        "prompt": "What is the primary structural requirement when preparing an executive summary for a National Sample Survey district field report?",
                        "options": ["Include full transcripts of every interview conducted", "Highlight key statistical findings, methodology limitations, and immediate operational implications upfront in concise paragraphs", "Omit all numbers and focus on personal opinions", "Write in conversational social media terminology"],
                        "correct_index": 1,
                        "explanation": "Executive summaries must provide senior decision-makers with key findings, data constraints, and actionable policy implications concisely.",
                    },
                    {
                        "id": "so_q10",
                        "competency_code": "POLICY_WRITING",
                        "difficulty_level": 3,
                        "points": 10,
                        "prompt": "When drafting an official discrepancy note regarding field enumeration irregularities for the Zonal Additional Director, what tone and documentation standard is required?",
                        "options": ["Emotional, accusatory prose based on rumor", "Objective, factual reporting supported by timestamped log data, supervisor inspection sheets, and sample unit IDs", "Casual conversational email without references", "Cryptic verbal brief with no written paper trail"],
                        "correct_index": 1,
                        "explanation": "Administrative discrepancy documentation must be objective, factual, precise, and accompanied by verifiable audit trails.",
                    },
                ],
            },
        ]

        for q_data in diagnostic_quizzes_data:
            quiz = db.query(Quiz).filter(Quiz.id == q_data["id"]).first()
            if not quiz:
                quiz = Quiz(status="published", **q_data)
                db.add(quiz)
                db.flush()
                print(f"  [+] Created Baseline Diagnostic Quiz: {quiz.title} (10 MCQs, {quiz.total_marks} Marks)")
            else:
                quiz.title = q_data["title"]
                quiz.total_marks = q_data["total_marks"]
                quiz.passing_marks = q_data["passing_marks"]
                quiz.questions = q_data["questions"]
                quiz.created_by = q_data["created_by"]
                quiz.course_id = q_data.get("course_id")
                quiz.status = "published"

        # ----------------------------------------------------------------------
        # 6. Seed Users (Admin, Trainer, Learner)
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
        # 7. Seed Learner Baseline Skill Gaps for Amit Patel
        # ----------------------------------------------------------------------
        learner_skills_data = [
            {"comp_code": "STAT_ANALYSIS", "current": 2, "target": 4},   # Gap: +2
            {"comp_code": "SQL_DATABASE", "current": 2, "target": 4},    # Gap: +2
            {"comp_code": "DATA_VIZ", "current": 3, "target": 4},        # Gap: +1
            {"comp_code": "GOV_COMPLIANCE", "current": 2, "target": 3},  # Gap: +1
            {"comp_code": "POLICY_WRITING", "current": 3, "target": 3},  # Gap: 0 (Proficient)
            {"comp_code": "AI_GOVERNANCE", "current": 1, "target": 3},   # Gap: +2
            {"comp_code": "DIGITAL_LITERACY", "current": 2, "target": 3},# Gap: +1
            {"comp_code": "CYBERSECURITY", "current": 1, "target": 3},   # Gap: +2
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

        # Active Enrollment in CRS-IGOT-DA01 for Amit Patel
        if course_da:
            learner_enrollment = db.query(Enrollment).filter(
                Enrollment.user_id == USER_LEARNER_ID,
                Enrollment.course_id == course_da.id,
            ).first()
            if not learner_enrollment:
                learner_enrollment = Enrollment(
                    id=uuid.uuid4(),
                    user_id=USER_LEARNER_ID,
                    course_id=course_da.id,
                    status="in_progress",
                    progress_percentage=45,
                )
                db.add(learner_enrollment)
                print(f"  [+] Enrolled Amit Patel into {course_da.title}")

        # ----------------------------------------------------------------------
        # 8. Seed Baseline Published Training Document & Chunks for RAG Assistant
        # ----------------------------------------------------------------------
        doc = db.query(TrainingDocument).filter(TrainingDocument.id == SEED_DOCUMENT_ID).first()
        if not doc:
            doc = TrainingDocument(
                id=SEED_DOCUMENT_ID,
                title="Government e-Marketplace (GeM) Procurement Manual & GFR 149 Protocols",
                file_name="gem_procurement_sop_2024.pdf",
                file_path="storage/documents/seed_gem_procurement_sop_2024.pdf",
                file_size_bytes=42500,
                mime_type="application/pdf",
                status="processed",
                is_published=True,
                competency_id=comps_by_code["GOV_COMPLIANCE"].id if "GOV_COMPLIANCE" in comps_by_code else None,
                uploaded_by=USER_TRAINER_ID,
                embedding_model="mock-embedding-v1",
                embedding_dim=1536,
            )
            db.add(doc)
            db.flush()
            print(f"  [+] Created Published Training Document: {doc.title}")

            chunks_data = [
                (
                    0,
                    "General Financial Rules (GFR) Rule 149 mandates public procurement of common use goods "
                    "and services through the Government e-Marketplace (GeM) portal. Direct purchase is permissible "
                    "for goods valuing up to Rs. 25,000 through any available supplier on GeM meeting quality and "
                    "specification requirements. Purchases between Rs. 25,000 and Rs. 5,00,000 mandate obtaining "
                    "comparative quotes from at least three different manufacturers or sellers on the platform.",
                    120,
                ),
                (
                    1,
                    "For procurement contracts exceeding Rs. 5,00,000, Government e-Marketplace requires mandatory "
                    "bidding or reverse auction (RA) among all registered vendors. Bids must remain open for a "
                    "minimum mandatory period of 10 days. The Consignee Receipt and Acceptance Certificate (CRAC) "
                    "must be digitally generated by the receiving officer within 10 days of consignment arrival, "
                    "failing which the goods are deemed accepted under automated administrative regulations.",
                    135,
                ),
                (
                    2,
                    "Timely payment release to GeM sellers is strictly monitored under central administrative oversight. "
                    "The procuring department is mandated to issue payment within 10 calendar days of CRAC generation. "
                    "Failure to disburse payments within this timeline triggers a penal interest levy of 1% per month "
                    "on the delayed amount, recoverable from the administrative budget of the defaulting ministry.",
                    110,
                ),
            ]

            from app.services.document_embedding import serialize_vector_for_db
            from app.services.embedding_service import get_embedding_service
            emb_svc = get_embedding_service()
            dialect_name = db.bind.dialect.name if db.bind else "sqlite"

            for c_idx, c_text, t_count in chunks_data:
                vec = emb_svc.embed_query(c_text)
                c_obj = DocumentChunk(
                    id=uuid.uuid4(),
                    document_id=doc.id,
                    chunk_index=c_idx,
                    chunk_text=c_text,
                    token_count=t_count,
                    metadata_json={
                        "document_id": str(doc.id),
                        "document_title": doc.title,
                        "chunk_index": c_idx,
                        "section": f"GFR 149 Clause {c_idx + 1}",
                        "page_number": c_idx + 1,
                    },
                    embedding=serialize_vector_for_db(vec, dialect_name),
                )
                db.add(c_obj)
            print(f"  [+] Seeded {len(chunks_data)} embedded chunks for RAG Assistant.")
        else:
            doc.is_published = True

        # Business Analyst Document
        doc_ba = db.query(TrainingDocument).filter(TrainingDocument.id == SEED_DOCUMENT_BA_ID).first()
        if not doc_ba:
            doc_ba = TrainingDocument(
                id=SEED_DOCUMENT_BA_ID,
                title="NeGD Government Process Re-engineering (GPR) & Citizen Service Manual",
                file_name="negd_gpr_service_manual_2024.pdf",
                file_path="storage/documents/negd_gpr_service_manual_2024.pdf",
                file_size_bytes=38200,
                mime_type="application/pdf",
                status="processed",
                is_published=True,
                competency_id=comps_by_code["STAKEHOLDER_MGMT"].id if "STAKEHOLDER_MGMT" in comps_by_code else None,
                uploaded_by=USER_TRAINER_ID,
                embedding_model="mock-embedding-v1",
                embedding_dim=1536,
            )
            db.add(doc_ba)
            db.flush()

            ba_chunks = [
                (
                    0,
                    "Government Process Re-engineering (GPR) requires analyzing end-to-end citizen service journeys "
                    "to eliminate unnecessary bureaucratic approvals, attestations, and physical document submissions. "
                    "Under Digital India mandates, services must transition from physical paper files to e-Office workflows "
                    "with single-window digital verification and transparent SLA turnaround tracking.",
                    125,
                ),
                (
                    1,
                    "In citizen-facing e-governance systems, Business Analysts must define precise Functional Requirement "
                    "Specifications (FRS) adhering to India Stack integration standards. Mandatory integration points "
                    "include Aadhaar-based authentication, DigiLocker digital credential fetching, and Bharat Bill Payment "
                    "System (BBPS) or e-Treasury for seamless electronic fee collection without cash handling.",
                    130,
                ),
            ]
            from app.services.document_embedding import serialize_vector_for_db
            from app.services.embedding_service import get_embedding_service
            emb_svc = get_embedding_service()
            dialect_name = db.bind.dialect.name if db.bind else "sqlite"
            for c_idx, c_text, t_count in ba_chunks:
                vec = emb_svc.embed_query(c_text)
                db.add(DocumentChunk(
                    id=uuid.uuid4(),
                    document_id=doc_ba.id,
                    chunk_index=c_idx,
                    chunk_text=c_text,
                    token_count=t_count,
                    metadata_json={"document_id": str(doc_ba.id), "document_title": doc_ba.title, "page_number": c_idx + 1},
                    embedding=serialize_vector_for_db(vec, dialect_name),
                ))
            print(f"  [+] Created Published Training Document: {doc_ba.title}")

        # Data Analyst Document
        doc_da = db.query(TrainingDocument).filter(TrainingDocument.id == SEED_DOCUMENT_DA_ID).first()
        if not doc_da:
            doc_da = TrainingDocument(
                id=SEED_DOCUMENT_DA_ID,
                title="MoSPI Official Data Quality, National Indicator Framework & Analytics Guidelines",
                file_name="mospi_nif_analytics_guidelines_2024.pdf",
                file_path="storage/documents/mospi_nif_analytics_guidelines_2024.pdf",
                file_size_bytes=45100,
                mime_type="application/pdf",
                status="processed",
                is_published=True,
                competency_id=comps_by_code["STAT_ANALYSIS"].id if "STAT_ANALYSIS" in comps_by_code else None,
                uploaded_by=USER_TRAINER_ID,
                embedding_model="mock-embedding-v1",
                embedding_dim=1536,
            )
            db.add(doc_da)
            db.flush()

            da_chunks = [
                (
                    0,
                    "The Ministry of Statistics & Programme Implementation (MoSPI) National Indicator Framework (NIF) "
                    "provides standard metadata definitions and data quality assessment rubrics for tracking national "
                    "development targets. Official statistical datasets must undergo completeness, consistency, and "
                    "spatial plausibility validation before publishing on the National Data & Analytics Platform (NDAP).",
                    120,
                ),
                (
                    1,
                    "District-level administrative dashboards must employ standardized visual encodings to prevent deceptive "
                    "scaling. Time-series trends must clearly identify baseline years and statistical revisions. "
                    "Predictive models utilized for welfare resource allocation must implement cross-validation across "
                    "socio-economic strata and provide transparent error margins for executive decision makers.",
                    125,
                ),
            ]
            for c_idx, c_text, t_count in da_chunks:
                vec = emb_svc.embed_query(c_text)
                db.add(DocumentChunk(
                    id=uuid.uuid4(),
                    document_id=doc_da.id,
                    chunk_index=c_idx,
                    chunk_text=c_text,
                    token_count=t_count,
                    metadata_json={"document_id": str(doc_da.id), "document_title": doc_da.title, "page_number": c_idx + 1},
                    embedding=serialize_vector_for_db(vec, dialect_name),
                ))
            print(f"  [+] Created Published Training Document: {doc_da.title}")

        # ----------------------------------------------------------------------
        # 9. Seed Audit Log Event
        # ----------------------------------------------------------------------
        audit_exists = db.query(AuditLog).filter(AuditLog.action == "INITIAL_SYSTEM_SEED").first()
        if not audit_exists:
            audit = AuditLog(
                actor_id=USER_ADMIN_ID,
                action="INITIAL_SYSTEM_SEED",
                entity_type="system",
                entity_id="phase_4_baseline",
                details={
                    "status": "success",
                    "roles_seeded": len(job_roles_data),
                    "competencies_seeded": len(competencies_data),
                    "courses_seeded": len(courses_data),
                    "quizzes_seeded": len(diagnostic_quizzes_data),
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
