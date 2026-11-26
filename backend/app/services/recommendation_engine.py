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
    CourseVideoModuleItem,
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


COURSE_VIDEO_MODULES_CATALOG: Dict[str, List[Dict[str, Any]]] = {
    "CRS-IGOT-DA01": [
        {
            "module_number": 1,
            "title": "Module 1: Introduction to NDAP & Public Data Governance",
            "duration_minutes": 18,
            "description": "Architectural overview of the National Data & Analytics Platform (NDAP), open government data APIs, interoperability protocols, and statutory data handling standards across central and state ministries.",
            "video_url": "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
            "content": """### Module 1: Introduction to NDAP & Public Data Governance

#### 1. Executive Overview & Scope
The National Data & Analytics Platform (NDAP), developed by NITI Aayog, is India's premier public infrastructure for standardizing, analyzing, and disseminating government datasets. This module equips civil servants with the knowledge required to navigate NDAP, understand data schema interoperability, and apply statutory governance policies in administrative decision-making.

#### 2. Key Concepts & Definitions
- **Open Government Data (OGD):** Machine-readable administrative records made available for public and inter-agency utility without proprietary restrictions.
- **Data Harmonization:** The process of aligning disparate departmental schemas, district code naming variations, and temporal frequencies into standardized, queryable relational formats.
- **Interoperability Standards:** Adherence to National Data Sharing and Accessibility Policy (NDSAP) protocols ensuring that state datasets seamlessly integrate with central portals.

#### 3. Statutory & Administrative Frameworks
- **NDSAP Guidelines:** Classification of government datasets into Open, Registered, and Restricted access tiers.
- **MeitY Metadata Standards:** Mandatory tagging of administrative datasets with source ministry, publication timestamp, temporal granularity, and spatial coordinates.
- **Audit Trails:** Maintaining immutable logs of data ingestion and sanitization for official records.

#### 4. Operational Step-by-Step Procedure
1. Accessing authorized datasets via official government single sign-on (Parichay/Jan Parichay).
2. Verifying dataset provenance and cross-referencing published figures against Gazette releases.
3. Exporting normalized tabular formats (CSV, Parquet) for econometric and statistical modeling.
4. Ensuring personally identifiable information (PII) is completely redacted prior to inter-departmental publication.

#### 5. Civil Service Case Study
*Case:* A state planning department utilized NDAP normalized district indicators to identify nutrition delivery gaps across 112 aspirational blocks, reducing data synthesis time from 4 weeks to 3 hours.

#### 6. Key Takeaways & Practical Checklist
- Always verify the vintage and temporal coverage of administrative data before citing in official cabinet briefs.
- Apply standard LGD (Local Government Directory) codes for state, district, and sub-district identifiers.
- Ensure compliance with data minimization principles under the DPDP Act.""",
        },
        {
            "module_number": 2,
            "title": "Module 2: Descriptive & Inferential Statistics for Policy Design",
            "duration_minutes": 24,
            "description": "Applied probability distributions, hypothesis formulation, p-value interpretation, and variance analysis using National Sample Survey (NSS) and Census indicators for public policy interventions.",
            "video_url": "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4",
            "content": """### Module 2: Descriptive & Inferential Statistics for Policy Design

#### 1. What is Statistics in Public Governance?
**Statistics** is the mathematical discipline concerning the collection, organization, analysis, interpretation, and presentation of data. In public administration, statistics serves as the scientific foundation for evidence-based policymaking, replacing intuition with measurable empirical evidence.

#### 2. Descriptive vs. Inferential Statistics
- **Descriptive Statistics:** Summarizes administrative data from a census or departmental registry without extrapolating beyond the collected observations.
  - *Measures of Central Tendency:* Mean (arithmetic average), Median (50th percentile, resilient to extreme wealth/landholding outliers), Mode (most frequent category).
  - *Measures of Dispersion:* Standard deviation, interquartile range (IQR), and Gini coefficient for inequality assessment.
- **Inferential Statistics:** Draws conclusions about a broader population from a representative sample (e.g., National Sample Survey or NFHS survey).
  - *Hypothesis Testing:* Formulating the Null Hypothesis ($H_0$: no policy effect) against the Alternative Hypothesis ($H_1$: statistically significant intervention effect).
  - *P-Value & Significance:* The probability of observing results as extreme as the sample data assuming $H_0$ is true. A threshold of $p < 0.05$ indicates statistical significance.
  - *Confidence Intervals (95% CI):* The estimated range within which the true population parameter is expected to fall 95% of the time.

#### 3. Administrative Methodologies & Policy Applications
- **Sampling Techniques:** Stratified random sampling and multi-stage cluster sampling used in national household consumption surveys.
- **T-Tests & ANOVA:** Comparing baseline vs. endline welfare indicators across treatment and control districts in pilot scheme rollouts.
- **Correlation vs. Causation:** Ensuring confounding variables (e.g., urbanization, literacy) are controlled for using multivariate regression.

#### 4. Practical Civil Service Checklist
- Never rely solely on arithmetic mean when analyzing household income or landholding data; always inspect the median and interquartile spread.
- In policy evaluations, report sample size ($N$), standard errors, and confidence intervals alongside point estimates.
- Validate that sample weights are correctly applied when computing state-level aggregates from survey microdata.""",
        },
        {
            "module_number": 3,
            "title": "Module 3: Econometric Projections & Macro Time-Series Modeling",
            "duration_minutes": 32,
            "description": "Hands-on ARIMA time-series modeling, CPI/WPI inflation forecasting, longitudinal trend analysis, and econometric impact estimation for state planning commissions.",
            "video_url": "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
            "content": """### Module 3: Econometric Projections & Macro Time-Series Modeling

#### 1. Overview & Strategic Relevance
Accurate forward projections of economic indicators—such as tax revenues, inflation indices, food grain requirements, and power consumption—are essential for state budget formulation and medium-term fiscal plans. This module covers econometric time-series modeling techniques tailored for finance and planning secretariats.

#### 2. Core Concepts
- **Time-Series Decomposition:** Breaking down observed temporal data into four constituent components: secular trend ($T$), seasonal variation ($S$), cyclical fluctuations ($C$), and irregular/random residual ($I$).
- **Stationarity:** A statistical property where the mean, variance, and autocorrelation structure remain constant over time, tested using the Augmented Dickey-Fuller (ADF) test.
- **ARIMA $(p, d, q)$ Models:**
  - $p$: Autoregressive order (lags of dependent variable).
  - $d$: Degree of differencing required for stationarity.
  - $q$: Moving average order (lags of forecast error).

#### 3. Government Workflow for Fiscal Forecasting
1. Extract historical monthly tax revenues or inflation indices across a minimum 5-year longitudinal window.
2. Adjust for statutory anomalies, policy revisions, or pandemic shocks using intervention analysis.
3. Test for stationarity and apply first or second-order differencing if trend non-stationarity is present.
4. Estimate candidate models using AIC/BIC minimization criteria and perform residual diagnostic checks.
5. Generate baseline, conservative, and optimistic projection scenarios for budget committees.

#### 4. Case Study
*Application:* A State Finance Department projected GST collections using an ARIMA $(1, 1, 1)$ model with seasonal adjustment, predicting year-end collections within a 1.8% error margin, preventing mid-year fiscal slippage.

#### 5. Takeaways
- Always cross-validate statistical projections against prevailing macroeconomic headwinds and policy shifts.
- Clearly state underlying assumptions and scenario bands when presenting forecasts to cabinet sub-committees.""",
        },
        {
            "module_number": 4,
            "title": "Module 4: Data Quality Audits & MoSPI Compliance Standards",
            "duration_minutes": 22,
            "description": "Rigorous data cleaning rubrics, statistical outlier management, missing-at-random imputation techniques, and ensuring adherence to MoSPI official statistical frameworks.",
            "video_url": "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4",
            "content": """### Module 4: Data Quality Audits & MoSPI Compliance Standards

#### 1. Principles of Official Data Integrity
The Ministry of Statistics and Programme Implementation (MoSPI) and National Statistical Commission (NSC) prescribe strict rubrics for official statistics. High-stakes public schemes require vetted, tamper-proof, and auditable data streams.

#### 2. The Four Pillars of Public Data Quality
1. **Completeness:** Absence of unrecorded administrative units or missing survey blocks.
2. **Accuracy:** Close agreement between reported values and ground reality, verified through spot checks.
3. **Timeliness:** Minimizing publication latency so data informs contemporary rather than retrospective policies.
4. **Consistency:** Harmonized definitions across consecutive reporting cycles.

#### 3. Outlier Management & Imputation Rubrics
- **Statistical Outliers:** Identification via Tukey's IQR rule ($Q1 - 1.5 \\times IQR$, $Q3 + 1.5 \\times IQR$) or $Z$-score exceeding $|3|$.
- **Missing Data Treatment:**
  - *Missing Completely at Random (MCAR):* Verified via Little's MCAR test.
  - *Imputation Techniques:* Hot-deck imputation, iterative multivariate imputation, or domain-boundary interpolation.
  - *Rule:* Raw un-imputed values must always be preserved in archival tables alongside imputed values.

#### 4. Official Audit Protocol
- Establish checksum hashes (SHA-256) for finalized public statistical tables.
- Document every transformation, imputation rule, and outlier adjustment in an official methodological annexure.
- Maintain data reconciliation certificates signed by designated departmental statistical officers.""",
        },
        {
            "module_number": 5,
            "title": "Module 5: Evidence-Based Executive Briefings & Policy Dashboards",
            "duration_minutes": 28,
            "description": "Synthesizing complex multi-dimensional analytics into executive cabinet notes, policy whitepapers, and interactive KPI scorecards for Joint Secretaries.",
            "video_url": "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4",
            "content": """### Module 5: Evidence-Based Executive Briefings & Policy Dashboards

#### 1. Strategic Role in Cabinet Governance
Analytical findings only create real-world impact when communicated concisely, convincingly, and actionable to senior executive leadership. This module details the formulation of evidence-based policy notes and executive dashboard monitors for senior civil servants.

#### 2. Structure of an Evidence-Based Cabinet Note
1. **Context & Problem Statement:** Clear delineation of the public policy challenge with quantitative baselines.
2. **Empirical Evidence & Findings:** High-level summary of statistical analysis, sample size, and verified outcomes.
3. **Policy Options Analysis:** Three comparative alternatives evaluated on financial cost, implementation feasibility, and expected welfare impact.
4. **Financial Implications:** Expenditure breakdown under relevant budget heads for the current and subsequent fiscal years.
5. **Monitoring & Evaluation Plan:** Pre-defined quarterly key performance indicators (KPIs) and statutory audit milestones.

#### 3. Principles of Executive KPI Dashboard Design
- **Top-Level Scorecards:** Display high-level composite index scores with color-coded status badges (Green = on track, Amber = attention required, Red = critical deviation).
- **Executive Summary View:** Designed for rapid review within 60 seconds by Ministers and Chief Secretaries.
- **Drill-Down Capability:** Ability to inspect from state level down to district, block, and facility records.

#### 4. Best Practices for Answering Parliamentary Questions
- Provide exact official figures sourced directly from verified statistical registries.
- Clearly annotate the reporting period and source agency in every table submitted to the legislative secretariat.
- Avoid ambiguous projections when statutory facts are demanded.""",
        },
    ],
    "CRS-IGOT-DA02": [
        {
            "module_number": 1,
            "title": "Module 1: Visual Analytics Principles & Cognitive Design for Governance",
            "duration_minutes": 16,
            "description": "Foundational visual grammar, chart typography, accessibility compliance, and decluttering data visualizations for senior government administrative decision-makers.",
            "video_url": "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
            "content": """### Module 1: Visual Analytics Principles & Cognitive Design for Governance

#### 1. Core Principles of Public Sector Visual Design
Data visualization in government must prioritize clarity, precision, and cognitive accessibility over decorative complexity. Senior administrative officers need immediate, accurate comprehension of public welfare trends.

#### 2. Key Concepts & Rules
- **Data-to-Ink Ratio:** Maximizing the proportion of ink used to present actual data while removing decorative borders, 3D effects, and non-essential gridlines.
- **Pre-attentive Visual Attributes:** Using position, length, and deliberate color contrast to direct attention to administrative anomalies or critical deficits.
- **Accessibility & Inclusion:** Ensuring visualizations comply with WCAG 2.1 standards, using colorblind-safe palettes and legible typography.

#### 3. Selecting the Correct Visual Form
- *Categorical Comparisons:* Horizontal bar charts with clean zero-baselines.
- *Temporal Trends:* Continuous line graphs with clearly labeled axes and milestone markers.
- *Proportions & Parts of a Whole:* Waffle charts or stacked bar charts (avoid 3D pie charts with more than 4 slices).
- *Performance vs. Target:* Bullet graphs showing actual achievement against benchmark thresholds.

#### 4. Practical Checklist
- Always begin vertical and horizontal numerical axes at zero unless explicitly communicating narrow index fluctuations.
- Ensure all chart titles state the key takeaway directly (e.g., 'District Infant Immunization Increased by 14% in Q3') rather than generic descriptions.""",
        },
        {
            "module_number": 2,
            "title": "Module 2: District Administration KPI Scorecards & Performance Tracking",
            "duration_minutes": 25,
            "description": "Designing real-time KPI scorecards for District Magistrates, tracking health, education, and water sanitation indicators with threshold triggers and alerts.",
            "video_url": "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4",
            "content": """### Module 2: District Administration KPI Scorecards & Performance Tracking

#### 1. Operational Overview
District Magistrates (DMs) and Collectors supervise dozens of disparate sectoral schemes simultaneously. An effective KPI scorecard consolidates cross-departmental operations into an actionable executive cockpit.

#### 2. Key Frameworks: Aspirational Districts Programme (ADP)
- **Composite Index Methodology:** Aggregating 49 key indicators across Health & Nutrition, Education, Agriculture & Water Resources, Financial Inclusion, and Basic Infrastructure.
- **Normalization:** Standardizing indicators with varying scales using Min-Max scaling to compute composite index scores between 0 and 100.
- **Delta Rankings:** Measuring month-on-month incremental progress rather than punishing historically disadvantaged baseline regions.

#### 3. Designing Automated Alert Triggers
- **Red Thresholds:** Automatically trigger alert memos to Block Development Officers (BDOs) when routine institutional deliveries or school attendance drop below 80% of quarterly targets.
- **Early Warning Indicators:** Identifying seasonal disease outbreaks (dengue, malaria) through fever surveillance telemetry before hospital bed capacity is strained.

#### 4. Practical Implementation Steps
1. Connect directly to departmental MIS backends (e.g., HMIS, UDISE+, Jal Jeevan Mission portal).
2. Configure automated weekly data validation routines to flag duplicate entries.
3. Generate weekly 1-page executive scorecard summaries ahead of district review meetings.""",
        },
        {
            "module_number": 3,
            "title": "Module 3: Geospatial GIS Thematic Mapping with Bhuvan & BharatMaps",
            "duration_minutes": 30,
            "description": "Integrating village and block shapefiles, rendering multi-layered thematic choropleth maps, and performing spatial gap analysis using ISRO Bhuvan and NIC BharatMaps APIs.",
            "video_url": "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
            "content": """### Module 3: Geospatial GIS Thematic Mapping with Bhuvan & BharatMaps

#### 1. The Role of GIS in Public Administration
Geographic Information Systems (GIS) allow administrators to link statistical welfare data directly to physical geography, revealing spatial inequality, infrastructure gaps, and environmental vulnerabilities.

#### 2. Core Concepts & Geospatial Standards
- **Shapefiles & GeoJSON:** Standard vector data formats containing geographic coordinates (points, lines, polygons) combined with tabular attribute data.
- **Coordinate Reference Systems (CRS):** Adopting EPSG:4326 (WGS 84) for GPS latitude/longitude and EPSG:3857 for web map tile projections.
- **Choropleth Mapping:** Shading administrative polygons with color gradations proportional to statistical values (e.g., percentage of households with tap water).

#### 3. National Spatial Platforms
- **ISRO Bhuvan:** India's national geo-platform providing high-resolution multi-spectral satellite imagery and thematic datasets.
- **NIC BharatMaps:** Unified map service providing validated administrative boundaries from state down to census village and cadastral parcel levels.

#### 4. Practical Spatial Gap Analysis
1. Load district village boundary shapefiles from verified Survey of India / BharatMaps repositories.
2. Join demographic census data and Primary Health Centre (PHC) location point layers.
3. Compute 5-kilometer buffer zones around health facilities to identify underserved rural habitations.
4. Export thematic geospatial heatmaps for district infrastructure master plans.""",
        },
        {
            "module_number": 4,
            "title": "Module 4: Multi-Department Secretariat Command Dashboards",
            "duration_minutes": 26,
            "description": "Constructing cross-departmental executive views, linking finance, social welfare, and revenue collections into unified secretariat command and control portals.",
            "video_url": "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4",
            "content": """### Module 4: Multi-Department Secretariat Command Dashboards

#### 1. Strategic Architecture
State and Union secretariats require holistic visibility across departmental silos. Integrated command dashboards harmonize data streams from Treasury, Social Welfare, Revenue, Law & Order, and Infrastructure into a centralized command view.

#### 2. Key Architectural Components
- **Data Ingestion Gateways:** Automated ETL (Extract, Transform, Load) microservices pulling nightly dumps from individual departmental servers via secure APIs.
- **Single Source of Truth:** Establishing standardized master tables for administrative jurisdictions, employee IDs, and scheme codes.
- **Role-Based Views (RBAC):** Providing customized dashboard interfaces tailored to the functional mandates of Cabinet Ministers, Chief Secretaries, and Line Directors.

#### 3. Monitoring Citizen Grievance Turnaround
- Real-time telemetry connecting state grievance portals with CPGRAMS.
- Tracking disposal rates, average resolution duration, and repeat grievance spikes.
- Visualizing officer-wise pendency escalations to maintain accountability.

#### 4. Civil Service Implementation Guide
- Ensure data latency does not exceed 24 hours for operational metrics and 7 days for financial reconciliations.
- Build resilient failover modes so dashboards function effectively during peak crisis coordination (flood, cyclone, or public health emergencies).""",
        },
        {
            "module_number": 5,
            "title": "Module 5: Automated Export Pipelines & Citizen-Facing Transparency Portals",
            "duration_minutes": 20,
            "description": "Configuring automated PDF report exports, RTI-compliant public views, role-based redaction, and official digital watermarking for publication.",
            "video_url": "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4",
            "content": """### Module 5: Automated Export Pipelines & Citizen-Facing Transparency Portals

#### 1. Transparency & Statutory Compliance
Section 4(1)(b) of the Right to Information (RTI) Act mandates proactive disclosure of administrative programs, budgets, and beneficiary allocations. Digital transparency portals operationalize this statutory mandate.

#### 2. Key Components
- **Automated Report Generation:** Python and headless browser pipelines that automatically render, sign, and distribute weekly PDF review books to senior officers.
- **Digital Watermarking & Cryptographic Signing:** Applying visible official watermarks and SHA-256 digital signatures to prevent tampering or unauthorized circulation.
- **Automated Redaction:** Programmatically masking Aadhaar numbers, bank account details, and sensitive contact numbers before public release.

#### 3. Best Practices for Public Citizen Portals
- Support bilingual and multilingual interfaces (English + Official State Language).
- Optimize page payload to under 1.5 MB for rapid loading on 3G/4G rural mobile connections.
- Ensure all public tables can be downloaded in open, non-proprietary formats (CSV/ODS).""",
        },
    ],
    "CRS-IGOT-BA01": [
        {
            "module_number": 1,
            "title": "Module 1: Fundamentals of Government Process Re-engineering (GPR)",
            "duration_minutes": 20,
            "description": "Core tenets of public sector business process re-engineering, eliminating redundant vetting hierarchies, and transitioning from paper files to digital workflows.",
            "video_url": "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
            "content": """### Module 1: Fundamentals of Government Process Re-engineering (GPR)

#### 1. What is Government Process Re-engineering?
**Government Process Re-engineering (GPR)** is the fundamental rethinking and radical redesign of public administrative processes to achieve dramatic improvements in critical measures of performance such as cost, quality, service delivery speed, and citizen satisfaction.

#### 2. Principles of GPR in the Public Sector
- **Questioning Legacy Assumptions:** Challenging historical administrative procedures originally designed for physical paper records and physical ledger verifications.
- **Simplification before Automation:** Automating an inefficient manual process merely results in an automated inefficient process. GPR simplifies, eliminates redundant steps, and re-orders workflows before software implementation.
- **Compression of Hierarchies:** Collapsing multi-level bureaucratic vetting chains (often 7 to 9 handoffs) into streamlined 2-to-3 level authorization matrices.

#### 3. The 5-Phase GPR Methodology
1. **Process Identification & Scope:** Selecting high-volume, citizen-facing services (e.g., caste certificates, building permits, trade licenses).
2. **As-Is Documentation:** Detailed mapping of the existing workflow, identifying time bottlenecks and approval loops.
3. **To-Be Workflow Redesign:** Designing an optimized, digitized citizen journey with single-point submissions and parallel processing.
4. **Pilot Deployment & User Feedback:** Testing in a subset of tehsils or districts with rigorous monitoring of SLA adherence.
5. **Regulatory & Institutional Rollout:** Amending relevant rules, issuing circulars, and institutionalizing new SOPs across all offices.

#### 4. Civil Service Checklist
- Identify and eliminate steps that do not add value or legal protection to the public service delivery outcome.
- Transition from sequential physical file routing to concurrent digital vetting.""",
        },
        {
            "module_number": 2,
            "title": "Module 2: As-Is vs To-Be Process Modeling with BPMN 2.0",
            "duration_minutes": 28,
            "description": "Mapping departmental approval workflows using BPMN 2.0 swimlane diagrams, identifying operational choke points, and designing lean To-Be state diagrams.",
            "video_url": "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4",
            "content": """### Module 2: As-Is vs To-Be Process Modeling with BPMN 2.0

#### 1. Introduction to BPMN 2.0 in Administration
Business Process Model and Notation (BPMN 2.0) is the global standard for visualizing organizational workflows. For government business analysts, BPMN bridges the communication gap between administrative officers and technical software engineers.

#### 2. Essential BPMN 2.0 Elements
- **Swimlanes & Pools:** Distinct rows representing organizational departments, roles (Citizen, Desk Officer, Under Secretary, Joint Secretary).
- **Events:** Start Events (green circle, e.g., 'Citizen Application Submitted'), Intermediate Events, and End Events (red thick circle).
- **Activities & Tasks:** Rounded rectangles describing specific work (e.g., 'Verify Land Title in Cadastral Registry').
- **Gateways (Diamonds):** Decision branches:
  - *Exclusive Gateway (XOR):* Exactly one path taken (Approved OR Rejected).
  - *Parallel Gateway (AND):* Simultaneous paths executed concurrently (e.g., parallel police and revenue verification).

#### 3. Analyzing As-Is Bottlenecks
- Compute **Process Cycle Efficiency (PCE)**:
  $$\\text{PCE} = \\frac{\\text{Value-Added Processing Time}}{\\text{Total Elapsed Turnaround Time}} \\times 100$$
- In traditional physical file workflows, PCE is often below 5%, with 95% of time spent waiting in transit or inbox queues.

#### 4. Practical Modeling Exercise
1. Map the As-Is workflow of an arms license or pension grant from application to sanction.
2. Highlight all non-value-adding approval steps and redundant document attestations.
3. Redesign into an optimized To-Be workflow utilizing parallel gateways and automated API validation.""",
        },
        {
            "module_number": 3,
            "title": "Module 3: e-Office Workflow Optimization & Central Secretariat Guidelines",
            "duration_minutes": 24,
            "description": "Operationalizing CSMOP procedures in e-Office, setting up parallel file movements, automated reminders, and digital cryptographic signoffs.",
            "video_url": "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
            "content": """### Module 3: e-Office Workflow Optimization & Central Secretariat Guidelines

#### 1. The Central Secretariat Manual of Office Procedure (CSMOP)
The CSMOP, issued by the Department of Administrative Reforms and Public Grievances (DARPG), governs the handling, processing, and preservation of official government files. e-Office translates these statutory procedures into an electronic workflow.

#### 2. Key Electronic File Components
- **Electronic File (e-File):** Comprises the Notesheet (left pane for official observations and decisions) and the Correspondence / Annexure folder (right pane for reference materials).
- **e-Dak Lifecycle:** Inward receipt of physical and electronic communications, diarization, tagging, and assignment to relevant files.
- **Referencing & PPO:** Referencing previous papers and cross-referencing related files electronically with instant hyperlink jumping.

#### 3. Security, Authenticity & Digital Signatures
- **Digital Signature Certificates (DSC):** Class 3 cryptographic tokens ensuring non-repudiation of official approvals.
- **e-Sign via Aadhaar:** Legally recognized under the Information Technology Act 2000 for internal office note signoffs.
- **Audit Trails:** Immutable, tamper-evident recording of every view, edit, noting entry, and file movement timestamp.

#### 4. Best Practices for File Processing
- Ensure all observations on the electronic notesheet are concise, objective, and reference relevant rule citations.
- Configure automated pendency reminders when files remain unattended at any desk for more than 48 hours.""",
        },
        {
            "module_number": 4,
            "title": "Module 4: Citizens' Charter SLAs & Grievance Feedback Loops",
            "duration_minutes": 22,
            "description": "Drafting enforceable service-level agreements (SLAs), integrating automated escalation paths, and connecting CPGRAMS public grievance redressal streams.",
            "video_url": "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4",
            "content": """### Module 4: Citizens' Charter SLAs & Grievance Feedback Loops

#### 1. Concept of the Citizens' Charter
A Citizens' Charter represents a commitment by public authorities towards standard, quality, time-frame, transparency, and accountability of services delivered to citizens.

#### 2. Structuring Enforceable Service Level Agreements (SLAs)
- **Service Timelines:** Establishing mandatory statutory delivery windows under State Public Service Delivery Acts (e.g., caste certificate within 7 days, water connection within 15 days).
- **Automated Escalation Matrices:** When an application is not cleared by the designated Public Grievance Officer within the SLA, the workflow automatically escalates to the first appellate authority.
- **Deemed Approval:** Statutory mechanisms where failure to take action within the SLA results in automatic provisional approval by the portal.

#### 3. CPGRAMS Integration & Systemic Improvements
- Synchronizing departmental grievance desks with the Centralized Public Grievance Redress and Monitoring System (CPGRAMS).
- Conducting root-cause failure mode analysis (FMEA) to identify whether delays stem from procedural ambiguity, staffing shortages, or software errors.
- Transforming grievance resolution from individual firefighting into structural process updates.""",
        },
        {
            "module_number": 5,
            "title": "Module 5: Change Management & Capacity Building across Departments",
            "duration_minutes": 25,
            "description": "Strategic change management models, stakeholder empathy mapping, pilot rollout methodologies, and departmental digital transformation leadership.",
            "video_url": "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4",
            "content": """### Module 5: Change Management & Capacity Building across Departments

#### 1. The Human Element in Digital Transformation
Digital modernization initiatives fail when organizational change management is neglected. Public servants across all seniority tiers must be supported with adequate training, empathy, and change leadership.

#### 2. Models of Organizational Change
- **Kotter's 8-Step Framework for Public Governance:**
  1. Establish urgency through demonstrable backlog data.
  2. Form a powerful guiding coalition of reform champions.
  3. Create a clear vision of simplified citizen service delivery.
  4. Communicate the vision across all field offices.
  5. Empower staff by removing procedural barriers.
  6. Generate and celebrate short-term wins (e.g., 50% delay reduction in Pilot Tehsil).
  7. Consolidate gains and produce more change.
  8. Anchor new digital workflows in departmental culture.

#### 3. Capacity Building via iGOT Karmayogi
- Designing role-based competency learning pathways aligned to the FRAC framework.
- Providing continuous micro-learning modules rather than one-time episodic workshops.
- Establishing departmental peer-support helpdesks to address day-to-day user queries.""",
        },
    ],
    "CRS-IGOT-BA02": [
        {
            "module_number": 1,
            "title": "Module 1: India Stack & Citizen Digital Public Infrastructure (DPI)",
            "duration_minutes": 22,
            "description": "Deep dive into India's Digital Public Infrastructure, including Aadhaar authentication APIs, DigiLocker integration, UPI rails, and account aggregator frameworks.",
            "video_url": "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
            "content": """### Module 1: India Stack & Citizen Digital Public Infrastructure (DPI)

#### 1. What is Digital Public Infrastructure (DPI)?
**Digital Public Infrastructure (DPI)** refers to open, interoperable, and scalable digital network platforms that provide foundational societal functions—such as digital identity, payment rails, and data exchange—serving as the foundational backbone for government and commercial innovations alike.

#### 2. The Three Layers of India Stack
1. **Identity Layer (Presenceless):**
   - *Aadhaar Ecosystem:* Unique 12-digit biometric identity providing real-time online authentication (e-KYC) via biometric or OTP modes.
   - *Virtual ID (VID) & Tokenization:* Protecting demographic privacy by masking the primary UID.
2. **Payment Layer (Cashless):**
   - *Unified Payments Interface (UPI):* Immediate mobile payments interoperable across all banks and payment service providers.
   - *Direct Benefit Transfer (DBT):* Electronic subsidy delivery directly into beneficiary accounts via the Aadhaar Payment Bridge (APB).
3. **Data Exchange Layer (Paperless):**
   - *DigiLocker:* Platform for issuance and verification of documents and certificates in a digital way, eliminating physical paperwork under Rule 9A of IT Rules 2016.
   - *Account Aggregator (AA):* Consent-based financial data sharing framework.

#### 3. Administrative Takeaways
- Always design citizen services to leverage existing DPI rails rather than creating proprietary identity or payment silos.
- Adhere to the principles of open APIs, vendor neutrality, and sovereign data governance.""",
        },
        {
            "module_number": 2,
            "title": "Module 2: Citizen User Research & Grassroots Persona Development",
            "duration_minutes": 20,
            "description": "Conducting user research across rural, semi-urban, and multilingual citizens, identifying usability barriers, and ensuring universal digital inclusion.",
            "video_url": "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4",
            "content": """### Module 2: Citizen User Research & Grassroots Persona Development

#### 1. Designing for Universal Public Inclusion
Government portals are not consumer apps with selective target audiences; they must serve every citizen regardless of literacy, physical ability, linguistic background, or device quality.

#### 2. User Research Methodologies for Civil Servants
- **Field Contextual Inquiries:** Observing citizens interact with public service kiosks at Common Service Centers (CSCs) and Gram Panchayat offices.
- **Digital Literacy Spectrum:** Recognizing user archetypes ranging from smartphone-native youth to elderly pensioners requiring assisted access via Village Level Entrepreneurs (VLEs).
- **Multilingual Vernacular Research:** Testing terminology comprehension in regional languages to avoid confusing direct literal translations.

#### 3. Structuring Inclusive Citizen Personas
- *Persona Archetype 1 (Assisted Citizen):* Rural farmer, feature phone user, dependent on CSC kiosks for subsidy application status checks.
- *Persona Archetype 2 (Independent Mobile Citizen):* Urban blue-collar worker, low-cost Android phone, intermittent 4G connectivity, prefers vernacular voice prompts.
- *Persona Archetype 3 (Administrative Operator):* Data entry clerk at Block Development Office processing 200 applications per day requiring rapid keyboard navigation.

#### 4. Design Guidelines
- Provide multi-modal interaction: Text, visual iconography, and conversational voice interfaces.
- Design forms to auto-populate existing data from DigiLocker and Aadhaar to minimize manual typing.""",
        },
        {
            "module_number": 3,
            "title": "Module 3: Functional Specifications (SRS) & G2C API Contracts",
            "duration_minutes": 30,
            "description": "Authoring comprehensive Software Requirement Specifications (SRS), OpenAPI contracts, data exchange schemas, and government-to-citizen (G2C) process flows.",
            "video_url": "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
            "content": """### Module 3: Functional Specifications (SRS) & G2C API Contracts

#### 1. Role of the Software Requirement Specification (SRS)
An SRS is the authoritative contract between government administrative departments and IT solution vendors. Incomplete or ambiguous SRS documents are the single largest cause of project cost overruns and delays in public e-governance.

#### 2. Structure of an IEEE 830 / Public Sector SRS
1. **Scope & Statutory Objective:** Legislative mandate and targeted citizen benefits.
2. **User Roles & Authorization Matrix:** Precise definition of citizen, verifying official, sanctioning officer, and system administrator privileges.
3. **Functional Requirements:** Granular, testable statements describing system behavior (e.g., 'System shall validate Land Record Khasra number against State Land Registry API within 2.0 seconds').
4. **Non-Functional Requirements:**
   - *Scalability:* Concurrent user capacity during peak application windows (e.g., 50,000 simultaneous users).
   - *Availability:* 99.9% uptime with defined RPO (Recovery Point Objective < 15 mins) and RTO (Recovery Time Objective < 1 hour).
   - *Security:* Mandatory TLS 1.3 encryption, STQC audit clearance, and OWASP Top 10 mitigation.

#### 3. OpenAPI Contracts & Data Schemas
- Documenting REST endpoints using OpenAPI 3.0 specifications.
- Defining strict JSON request and response validation schemas.
- Documenting error codes, rate limits, and authentication token lifecycles.""",
        },
        {
            "module_number": 4,
            "title": "Module 4: Compliance with the Digital Personal Data Protection (DPDP) Act",
            "duration_minutes": 25,
            "description": "Statutory requirements under DPDP Act 2023, consent management architecture, notice templates, data principal rights, and privacy-by-design standards.",
            "video_url": "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4",
            "content": """### Module 4: Compliance with the Digital Personal Data Protection (DPDP) Act

#### 1. Overview of the DPDP Act 2023
The Digital Personal Data Protection Act (DPDP Act 2023) establishes strict statutory obligations for all entities processing digital personal data, including government departments acting as **Data Fiduciaries**.

#### 2. Key Legal Concepts
- **Data Principal:** The citizen whose personal data is collected and processed.
- **Data Fiduciary:** The government department or entity that determines the purpose and means of data processing.
- **Consent Manager:** Interoperable platforms through which citizens can give, review, and withdraw consent for data sharing.
- **Certain Legitimate Uses:** Grounds under which the government may process personal data without explicit consent (e.g., for direct benefit subsidy disbursement, national security, or responding to medical emergencies).

#### 3. Operational Obligations for Government Systems
- **Purpose Limitation:** Data collected for one scheme (e.g., fertilizer subsidy) cannot be repurposed for unrelated programs without lawful authorization.
- **Data Minimization:** Portals must collect only the minimum data strictly necessary to deliver the specific public service.
- **Breach Notification:** Mandatory duty to notify the Data Protection Board of India and affected citizens in the event of any data breach.
- **Rights of Citizens:** Right to access information on processed data, right to correction and erasure, and right to grievance redressal.""",
        },
        {
            "module_number": 5,
            "title": "Module 5: Acceptance Testing, Security Audits (STQC) & Pilot Launch",
            "duration_minutes": 24,
            "description": "Structuring User Acceptance Testing (UAT) test matrices, coordinating STQC cybersecurity clearance audits, and managing staged production rollout.",
            "video_url": "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4",
            "content": """### Module 5: Acceptance Testing, Security Audits (STQC) & Pilot Launch

#### 1. The Quality Gate before Go-Live
No government portal or software application may be deployed into production without rigorous acceptance verification and cybersecurity clearance. This module outlines the formal release protocol.

#### 2. User Acceptance Testing (UAT)
- **Role of the Business Analyst:** Organizing UAT sessions with actual end-users (citizens, field inspectors, dealing assistants).
- **Test Traceability Matrix:** Verifying that 100% of functional requirements defined in the SRS have passed positive and negative test cases.
- **Defect Severity Tiers:** Classification into Critical (blocker), Major, and Minor bugs, requiring formal signoff before deployment.

#### 3. Cybersecurity Clearance: STQC & CERT-In
- **Safe-to-Host Certification:** Mandatory security testing by CERT-In empanelled auditors or Standardization Testing and Quality Certification (STQC) Directorate.
- Testing scopes: Vulnerability Assessment and Penetration Testing (VAPT), SQL injection prevention, cross-site scripting (XSS), and session hijacking protection.

#### 4. Staged Pilot Rollout Strategy
1. **Internal Sandbox:** Testing with simulated synthetic data.
2. **Pilot Launch:** Deployment across 1 or 2 pilot districts for 30 days.
3. **Statewide / Pan-India Go-Live:** Gradual traffic migration accompanied by media release and helpdesk activation.""",
        },
    ],
    "CRS-IGOT-FA01": [
        {
            "module_number": 1,
            "title": "Module 1: General Financial Rules (GFR 2017) & Principles of Financial Propriety",
            "duration_minutes": 25,
            "description": "Mandatory statutory requirements of GFR 2017, delegations of financial powers, canon of financial propriety, and constitutional budget authorization mechanisms.",
            "video_url": "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
            "content": """### Module 1: General Financial Rules (GFR 2017) & Principles of Financial Propriety

#### 1. What are the General Financial Rules (GFR 2017)?
The **General Financial Rules (GFR)** are statutory executive instructions issued by the Ministry of Finance, Department of Expenditure, regulating public financial management, budgeting, procurement of goods and services, and grants-in-aid across all central ministries and subordinate offices.

#### 2. The Canons of Financial Propriety (Rule 21)
Every government officer authorized to spend public funds must observe the highest standards of financial integrity:
1. The expenditure should not be prima facie more than the occasion demands.
2. Every public officer is expected to exercise the same vigilance in respect of expenditure incurred from public funds as a person of ordinary prudence would exercise in respect of expenditure of his own money.
3. No authority should exercise its powers of sanctioning expenditure to pass an order which will directly or indirectly accrue to its own advantage.
4. Public moneys should not be utilized for the benefit of a particular person or section of the community, unless the amount of expenditure involved is insignificant or a claim for the amount could be enforced in a Court of Law.

#### 3. Constitutional Architecture of Public Funds
- **Consolidated Fund of India (Article 266(1)):** All revenues received, loans raised, and moneys received in repayment of loans. No expenditure can be withdrawn without parliamentary appropriation.
- **Contingency Fund of India (Article 267(1)):** An imprest placed at the disposal of the President for unforeseen urgent expenditures pending parliamentary sanction.
- **Public Account of India (Article 266(2)):** Moneys held in trust by the government (provident funds, small savings, judicial deposits).

#### 4. Key Rules for Civil Servants
- Expenditure cannot be incurred unless funds have been provided in the approved budget estimates or supplementary demands for grants.
- Never split purchase requirements to evade the necessity of obtaining sanctions from higher authorities.""",
        },
        {
            "module_number": 2,
            "title": "Module 2: Public Financial Management System (PFMS) & Electronic Bill Flows",
            "duration_minutes": 32,
            "description": "Comprehensive operational training on PFMS, bill generation, DDO scrutiny, PAO authorization, and Direct Benefit Transfer (DBT) payment cycles.",
            "video_url": "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4",
            "content": """### Module 2: Public Financial Management System (PFMS) & Electronic Bill Flows

#### 1. Architecture of PFMS
Administered by the Controller General of Accounts (CGA), Ministry of Finance, the **Public Financial Management System (PFMS)** is a web-based financial management platform linking Central Ministries, State Treasuries, and commercial banks into a real-time expenditure management network.

#### 2. End-to-End Electronic Bill Processing
1. **Maker (Data Entry Operator):** Prepares the sanction order, inputs expenditure head, vendor/beneficiary bank details, and attaches electronic bills.
2. **Checker / Verifier (Drawing & Disbursing Officer - DDO):** Scrutinizes invoice authenticity, verifies budget availability under the specific Object Head, and digitally signs the bill.
3. **Pay & Accounts Office (PAO):** Performs pre-audit checks, verifies compliance with delegation of financial powers, applies deductions (TDS, GST-TDS, recovery), and approves the payment.
4. **Electronic Payment Advice (e-PA):** Digitally signed payment file transmitted directly to the Reserve Bank of India (RBI) or accredited commercial bank via secure SFTP.

#### 3. Direct Benefit Transfer (DBT) Reconciliation
- Validation of beneficiary Aadhaar and bank account through NPCI's Aadhaar Mapper.
- Real-time tracking of failed transactions and automated re-processing protocols.
- Elimination of ghost beneficiaries and systemic leakages in welfare subsidies.

#### 4. Practical Checklist
- Verify that expenditure is booked under the correct 15-digit accounting classification (Major Head, Minor Head, Sub-Head, Detailed Head, Object Head).
- Reconcile monthly expenditure statements with the PAO ledger by the 10th of every month.""",
        },
        {
            "module_number": 3,
            "title": "Module 3: Government e-Marketplace (GeM) Procurement Rules & Bidding",
            "duration_minutes": 28,
            "description": "Rule 149 of GFR, direct purchase thresholds, L1 comparison algorithms, proprietary article certificates (PAC), custom bids, and reverse auctions on GeM.",
            "video_url": "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
            "content": """### Module 3: Government e-Marketplace (GeM) Procurement Rules & Bidding

#### 1. Statutory Mandate: Rule 149 of GFR 2017
Rule 149 of GFR 2017 establishes that procurement of common use goods and services by all Ministries and Departments of the Government of India is **mandatory** through the Government e-Marketplace (GeM).

#### 2. GeM Procurement Thresholds & Procedures
- **Direct Purchase (Up to Rs. 25,000):**
  - Permissible through any available seller on GeM meeting required quality, specification, and delivery period.
  - Officer must certify price reasonableness.
- **L1 Comparison (Rs. 25,000 to Rs. 5,00,000):**
  - Mandatory online comparison of products from at least three different manufacturers/sellers.
  - The contract must be awarded to the lowest evaluated bidder (L1) meeting technical specifications.
- **Bidding / Reverse Auction (Above Rs. 5,00,000):**
  - Mandatory electronic bidding or reverse auction on the GeM portal with a minimum 10-day bid submission window.
  - Automated technical evaluation followed by commercial opening.
- **Proprietary Article Certificate (PAC) Buying:**
  - Permissible only when specific brand/model is technically essential, accompanied by mandatory statutory certificate from the competent authority under Rule 166.

#### 3. Post-Contract Management & Payment Obligations
- **Consignee Receipt and Acceptance Certificate (CRAC):** Must be issued within 10 days of physical receipt and verification of goods.
- **Mandatory Payment Timeline:** Payments to vendors must be released within 10 days of CRAC generation, with interest penalties for unjustified delays.

#### 4. Common Audit Pitfalls
- Never split tenders to stay below the Rs. 25,000 or Rs. 5,00,000 thresholds.
- Always preserve downloaded comparison sheets as formal audit attachments in the procurement file.""",
        },
        {
            "module_number": 4,
            "title": "Module 4: Internal Vigilance, Audit Inspection & Statutory CAG Compliance",
            "duration_minutes": 26,
            "description": "Internal accounting controls, answering draft CAG audit paras, Public Accounts Committee (PAC) action-taken notes, and expenditure scrutiny.",
            "video_url": "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4",
            "content": """### Module 4: Internal Vigilance, Audit Inspection & Statutory CAG Compliance

#### 1. The Statutory Audit Architecture
The Comptroller and Auditor General of India (CAG), appointed under Article 148 of the Constitution, conducts statutory audits of all receipts and expenditures of the Union and State governments.

#### 2. Types of Government Audits
- **Compliance / Regularity Audit:** Verifying whether public expenditures comply with relevant laws, GFR rules, and financial sanctions.
- **Financial Audit:** Certifying the accuracy and completeness of annual Financial Statements and Appropriation Accounts.
- **Performance Audit:** Evaluating scheme economy, efficiency, and effectiveness in achieving targeted societal outcomes.

#### 3. Handling CAG Audit Inspections & Audit Paras
1. **Half-Margin Memoranda:** Initial queries raised during field inspection. Provide prompt, factually accurate documentation within 24 to 48 hours.
2. **Draft Inspection Report (IR):** Preliminary audit findings submitted to the Head of Office. Formulate point-by-point replies with verified vouchers.
3. **Draft Audit Paragraph:** Serious irregularities elevated to Ministry level. Prepare comprehensive Action Taken Notes (ATN) approved at Joint Secretary level.
4. **Public Accounts Committee (PAC):** Parliamentary committee scrutiny of tabled CAG reports. Prepare detailed evidence briefs for Secretary appearances.

#### 4. Internal Vigilance & Fraud Prevention
- Segregation of duties: The official creating a sanction order must never be the sole authorizer of payment release.
- Surprise cash counts and mandatory annual physical verification of departmental fixed assets.""",
        },
        {
            "module_number": 5,
            "title": "Module 5: Year-End Financial Closing, Reappropriations & Reconciliation",
            "duration_minutes": 24,
            "description": "Procedures for financial year-end accounts closing, surrender of unspent savings, reappropriation orders, and Treasury-PFMS balance reconciliation.",
            "video_url": "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4",
            "content": """### Module 5: Year-End Financial Closing, Reappropriations & Reconciliation

#### 1. Avoiding the 'March Rush'
Rule 62(3) of GFR strictly prohibits the rush of expenditure in the closing month of the financial year. Spending must be evenly distributed across quarters:
- Maximum 33% of budget in the fourth quarter.
- Maximum 15% in the month of March.

#### 2. Surrender of Unspent Savings
- All unspent budget allocations lapse at the close of the financial year on March 31st (Rule 63).
- Departments must systematically identify savings and formally surrender them to the Ministry of Finance by the prescribed cutoff dates (usually February) to enable re-allocation to deficit sectors.

#### 3. Reappropriation of Funds
- Transfer of funds from one budget unit to another within the same grant.
- Conditions: Reappropriations cannot be made between different Grants, cannot exceed delegated financial powers, and cannot fund new services without parliamentary approval.

#### 4. Year-End Reconciliation Protocol
- Reconcile departmental expenditure figures with the monthly compilation statement issued by the Principal Accounts Office.
- Ensure all Abstract Contingent (AC) bills are settled with Detailed Contingent (DC) bills with supporting sub-vouchers within 30 days.
- Close unspent bank balances in Single Nodal Agency (SNA) accounts under Centrally Sponsored Schemes.""",
        },
    ],
}


def get_course_video_modules(
    course: Course,
    progress_pct: Optional[int] = None,
    db: Optional[Session] = None,
) -> List[CourseVideoModuleItem]:
    """Returns at least 5 structured video modules with descriptions and durations for a course,
    plus any custom learning modules published by trainers."""
    code = (course.code or "").strip().upper()
    raw_modules = COURSE_VIDEO_MODULES_CATALOG.get(code)

    if not raw_modules:
        # Generate 5 rich domain modules dynamically for custom courses
        title = course.title or "Public Administration Training"
        raw_modules = [
            {
                "module_number": 1,
                "title": f"Module 1: Orientation & Frameworks of {title}",
                "duration_minutes": 18,
                "description": f"Comprehensive introduction to administrative guidelines, operational policies, and key public service standards in {title}.",
                "video_url": "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
                "content": f"### Module 1: Orientation & Frameworks of {title}\n\n#### 1. Executive Summary\nThis module introduces the governance principles, administrative scope, and statutory responsibilities governing {title}.\n\n#### 2. Key Concepts & Statutory Frameworks\n- Foundational rules and mandate of the department under official Business Allocation Rules.\n- Integration with public digital infrastructure, citizen charter commitments, and accountability standards.\n\n#### 3. Practical Civil Service Guide\n- Adhere to standard secretariat operating procedures and maintain auditable records for all administrative decisions.",
                "skills_covered": [],
                "is_custom": False,
            },
            {
                "module_number": 2,
                "title": f"Module 2: Practical Implementation & Tools for {title}",
                "duration_minutes": 24,
                "description": f"Hands-on walkthrough of standard operating procedures, essential software tools, and workflow systems applied in {title}.",
                "video_url": "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4",
                "content": f"### Module 2: Practical Implementation & Tools for {title}\n\n#### 1. Core Operating Systems\nWalkthrough of digital registries, file tracking modules, and departmental reporting dashboards used in {title}.\n\n#### 2. Standard Operating Procedures (SOPs)\n- Scrutiny checklist for incoming departmental files and citizen submissions.\n- Automated validation protocols and verification checkpoints.",
                "skills_covered": [],
                "is_custom": False,
            },
            {
                "module_number": 3,
                "title": f"Module 3: Case Studies & Government Best Practices",
                "duration_minutes": 28,
                "description": f"Real-world governance case studies, district-level problem solving, and inter-departmental collaboration models in {title}.",
                "video_url": "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
                "content": f"### Module 3: Case Studies & Government Best Practices\n\n#### 1. Field Case Study\nAnalysis of successful district-level project execution, bottleneck resolution, and inter-agency coordination.\n\n#### 2. Lessons Learned\n- Importance of early stakeholder alignment and continuous monitoring against baseline indicators.",
                "skills_covered": [],
                "is_custom": False,
            },
            {
                "module_number": 4,
                "title": f"Module 4: Statutory Compliance, Ethics & Quality Assurance",
                "duration_minutes": 22,
                "description": f"Statutory regulations, audit trail maintenance, security protocols, and ethical governance standards for {title}.",
                "video_url": "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4",
                "content": f"### Module 4: Statutory Compliance, Ethics & Quality Assurance\n\n#### 1. Ethical Governance & Vigilance\n- Code of conduct for civil servants and adherence to public accountability canons.\n- Regular internal audit inspections and risk mitigation strategies.\n\n#### 2. Data Security & Citizen Privacy\n- Proper storage and encryption of public records and citizen data.",
                "skills_covered": [],
                "is_custom": False,
            },
            {
                "module_number": 5,
                "title": f"Module 5: Executive Synthesis, Assessment & Practical Application",
                "duration_minutes": 26,
                "description": f"Executive summary preparation, final project synthesis, competency assessment review, and field deployment roadmaps.",
                "video_url": "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4",
                "content": f"### Module 5: Executive Synthesis, Assessment & Practical Application\n\n#### 1. Synthesis & Action Roadmaps\n- Formulating policy briefs, administrative notes, and implementation plans for senior ministry leadership.\n- Post-training field application and continuous professional development under the FRAC framework.",
                "skills_covered": [],
                "is_custom": False,
            },
        ]
    else:
        # Create a copy so we don't mutate the global catalog dict
        raw_modules = [dict(m) for m in raw_modules]

    # Append custom modules added and published by trainers
    custom_modules = None
    if db is not None:
        try:
            from app.models.course import CourseModule
            custom_modules = (
                db.query(CourseModule)
                .filter(
                    CourseModule.course_id == course.id,
                    CourseModule.is_published == True,
                )
                .order_by(CourseModule.module_number.asc())
                .all()
            )
        except Exception:
            pass

    if custom_modules is None:
        custom_modules = getattr(course, "modules", [])

    if custom_modules:
        next_num = len(raw_modules) + 1
        for cm in custom_modules:
            if getattr(cm, "is_published", True):
                raw_modules.append({
                    "module_number": next_num,
                    "title": cm.title,
                    "duration_minutes": cm.duration_minutes or 20,
                    "description": cm.description or "",
                    "video_url": cm.video_url,
                    "content": cm.content or "",
                    "skills_covered": cm.skills_covered or [],
                    "is_custom": True,
                })
                next_num += 1

    pct = progress_pct or 0
    total_mods = len(raw_modules)
    completed_mods_count = int(round((pct / 100.0) * total_mods))

    items: List[CourseVideoModuleItem] = []
    for idx, mod in enumerate(raw_modules, start=1):
        is_completed = idx <= completed_mods_count
        items.append(
            CourseVideoModuleItem(
                id=f"{course.id}-mod-{idx}",
                module_number=mod["module_number"],
                title=mod["title"],
                duration_minutes=mod["duration_minutes"],
                description=mod["description"],
                video_url=mod.get("video_url"),
                is_completed=is_completed,
                content=mod.get("content"),
                skills_covered=mod.get("skills_covered"),
                is_custom=mod.get("is_custom", False),
            )
        )
    return items


def course_matches_learner_domain(course: Course, job_role: Optional[JobRole]) -> bool:
    """Strictly matches courses to the learner's domain.
    E.g. Data Analyst -> Data Analyst courses (CRS-IGOT-DA*).
    Business Analyst -> Business Analyst courses (CRS-IGOT-BA*).
    Finance Assistant -> Finance Assistant courses (CRS-IGOT-FA*).
    """
    if not job_role:
        return True

    role_code = (job_role.code or "").upper()
    role_title = (job_role.title or "").upper()
    c_code = (course.code or "").upper()
    c_title = (course.title or "").upper()
    c_desc = (course.description or "").upper()

    is_da_course = "-DA" in c_code
    is_ba_course = "-BA" in c_code
    is_fa_course = "-FA" in c_code

    if "DATA" in role_code or "DATA" in role_title:
        return is_da_course
    elif "BUSINESS" in role_code or "BUSINESS" in role_title:
        return is_ba_course
    elif "FINANCE" in role_code or "FINANCE" in role_title:
        return is_fa_course
    else:
        # Fallback for generic roles (e.g. Survey Officer in testing)
        return True


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

    learner_skill_ids: Set[uuid.UUID] = set(role_benchmarks.keys()) | {
        lc.competency_id for lc in learner_comps
    }

    # 6. Score and rank courses
    recommendations: List[CourseRecommendationItem] = []

    for course in published_courses:
        # Exclude completed courses
        if course.id in completed_course_ids:
            continue

        # Requirement 1: Only show courses that match the skill set / role of the learner
        course_comp_ids = {cc.competency_id for cc in course.course_competencies}
        if learner_skill_ids and not (learner_skill_ids & course_comp_ids):
            continue

        # Requirement 1 Domain Filter: Show only user domain-specific courses
        if not course_matches_learner_domain(course, job_role):
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
                    modules=get_course_video_modules(course, progress_pct, db=db),
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
                modules=item.modules,
            )
        )

    return LearningPathResponse(
        learner_id=learner.id,
        job_role_title=rec_response.job_role_title,
        total_steps=len(steps),
        total_estimated_hours=total_hours,
        steps=steps,
    )
