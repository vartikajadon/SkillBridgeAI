import React, { useState } from 'react';
import { Award, BookOpen, Briefcase } from 'lucide-react';

const SEEDED_COMPETENCIES = [
  { code: 'STAT_ANALYSIS', name: 'Statistical Data Analysis', category: 'Technical', desc: 'Descriptive & inferential statistics, time-series, hypothesis testing, and statistical software.' },
  { code: 'DATA_VIZ', name: 'Public Data Visualization & Dashboards', category: 'Technical', desc: 'Designing clear, accessible executive dashboards, KPI monitors, and geographical GIS data maps.' },
  { code: 'SURVEY_METHOD', name: 'Field Survey Methodology & Sampling', category: 'Domain', desc: 'Designing survey schedules, probability proportional to size (PPS) sampling, and field enumeration.' },
  { code: 'GOV_COMPLIANCE', name: 'Government Data Ethics & Compliance', category: 'Domain', desc: 'Adherence to Digital Personal Data Protection (DPDP) Act, RTI, and data security guidelines.' },
  { code: 'SQL_DATABASE', name: 'Relational Database & SQL Querying', category: 'Technical', desc: 'Performant SQL queries, data extraction from state registries, data cleaning, and relational joins.' },
  { code: 'POLICY_WRITING', name: 'Briefing Note & Policy Report Writing', category: 'Behavioral', desc: 'Drafting cabinet notes, policy briefing papers, parliamentary replies, and executive summaries.' },
  { code: 'AI_GOVERNANCE', name: 'AI Literacy & Public Sector Automation', category: 'Technical', desc: 'Understanding generative AI capabilities, RAG retrieval workflows, algorithmic fairness, and automation.' },
  { code: 'STAKEHOLDER_MGMT', name: 'Inter-Departmental Stakeholder Coordination', category: 'Behavioral', desc: 'Leading multi-department working groups, consensus building, district liaison, and vendor management.' },
  { code: 'DIGITAL_LITERACY', name: 'Digital Workplace Tools & E-Office Systems', category: 'Technical', desc: 'Operating national digital portals, e-Office electronic file processing, and digital signatures.' },
  { code: 'CYBERSECURITY', name: 'Cybersecurity Awareness & Public Data Protection', category: 'Technical', desc: 'Phishing prevention, secure credential hygiene, endpoint security adherence under CERT-In guidelines.' },
  { code: 'COMMUNICATION', name: 'Civil Service Communication & Citizen Engagement', category: 'Behavioral', desc: 'Transparent public communication, citizen grievance handling, and empathetic public service.' },
  { code: 'LEADERSHIP', name: 'Public Sector Leadership & Strategic Decision Making', category: 'Behavioral', desc: 'Administrative delegation, change management, crisis coordination, and institutional capacity building.' },
];

const SEEDED_ROLES = [
  {
    code: 'DATA_ANALYST',
    title: 'Data Analyst',
    department: 'Ministry of Statistics & Programme Implementation',
    desc: 'Official data curation, statistical modeling, public indicators analysis, and dashboard reporting for policy makers.',
  },
  {
    code: 'SURVEY_OFFICER',
    title: 'Survey Officer',
    department: 'National Sample Survey Office (NSSO)',
    desc: 'Primary field enumerations, multi-stage stratified sampling, field staff supervision, and district administrative compliance.',
  },
];

const SEEDED_COURSES = [
  { code: 'CRS-STAT-101', title: 'Foundations of Official Statistics in Governance', provider: 'iGOT Karmayogi', duration: 4, status: 'Published' },
  { code: 'CRS-STAT-201', title: 'Applied Inferential Statistics for Policy Analysis', provider: 'ISTM New Delhi', duration: 6, status: 'Published' },
  { code: 'CRS-SQL-101', title: 'Relational Data Querying & SQL for Civil Servants', provider: 'NIC Training Division', duration: 5, status: 'Published' },
  { code: 'CRS-SQL-201', title: 'Advanced SQL & Database Analytics for Public Registries', provider: 'NIC Training Division', duration: 8, status: 'Published' },
  { code: 'CRS-VIZ-101', title: 'Designing Intuitive District Dashboards with Modern BI', provider: 'iGOT Karmayogi', duration: 4, status: 'Published' },
  { code: 'CRS-VIZ-201', title: 'Geospatial Data Mapping & GIS for Welfare Schemes', provider: 'NSSO Academy', duration: 7, status: 'Published' },
  { code: 'CRS-SRV-101', title: 'National Sample Survey: Field Protocols & Primary Enumeration', provider: 'NSSO Academy', duration: 6, status: 'Published' },
  { code: 'CRS-SRV-201', title: 'Advanced Sampling Frameworks & Quality Control in Field Surveys', provider: 'NSSO Academy', duration: 8, status: 'Published' },
  { code: 'CRS-ETH-101', title: 'Digital Personal Data Protection (DPDP) Act Compliance', provider: 'MeitY / iGOT', duration: 4, status: 'Published' },
  { code: 'CRS-ETH-201', title: 'Data Governance, RTI Transparency & Cyber Security Protocols', provider: 'ISTM New Delhi', duration: 5, status: 'Published' },
  { code: 'CRS-POL-101', title: 'Mastering Cabinet Notes & Parliamentary Q&A Preparation', provider: 'ISTM New Delhi', duration: 6, status: 'Published' },
  { code: 'CRS-AI-101', title: 'Artificial Intelligence & Automation Fundamentals in Governance', provider: 'Digital India Bhashini', duration: 5, status: 'Published' },
];

export const AdminCatalogueViewer: React.FC = () => {
  const [subTab, setSubTab] = useState<'competencies' | 'courses' | 'roles'>('competencies');

  return (
    <div className="space-y-6">
      {/* Subtab Selector */}
      <div className="flex border-b border-slate-800 space-x-4">
        <button
          onClick={() => setSubTab('competencies')}
          className={`pb-3 text-xs font-semibold flex items-center gap-1.5 transition border-b-2 ${
            subTab === 'competencies'
              ? 'border-indigo-500 text-indigo-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Award className="w-4 h-4" />
          <span>National Competency Framework (12 Standardized Skills)</span>
        </button>

        <button
          onClick={() => setSubTab('courses')}
          className={`pb-3 text-xs font-semibold flex items-center gap-1.5 transition border-b-2 ${
            subTab === 'courses'
              ? 'border-indigo-500 text-indigo-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>Curriculum & Courses Catalogue (Read-Only)</span>
        </button>

        <button
          onClick={() => setSubTab('roles')}
          className={`pb-3 text-xs font-semibold flex items-center gap-1.5 transition border-b-2 ${
            subTab === 'roles'
              ? 'border-indigo-500 text-indigo-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Briefcase className="w-4 h-4" />
          <span>Standardized Public Sector Roles</span>
        </button>
      </div>

      {/* Subtab Content */}
      {subTab === 'competencies' && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
          <div className="p-4 bg-slate-950/60 border-b border-slate-800 flex justify-between items-center text-xs text-slate-400">
            <span>Verified 12 National Civil Service Competencies (Technical, Domain & Behavioral)</span>
            <span className="font-mono text-[11px] text-indigo-400">Read-Only Governance Catalogue</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="text-[11px] uppercase bg-slate-950 text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Code</th>
                  <th className="py-3 px-4">Competency Name</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Curriculum Description & Proficiency Rubric</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-sans">
                {SEEDED_COMPETENCIES.map((c) => (
                  <tr key={c.code} className="hover:bg-slate-800/40 transition">
                    <td className="py-3 px-4 font-mono font-semibold text-indigo-300">{c.code}</td>
                    <td className="py-3 px-4 font-medium text-slate-100">{c.name}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider ${
                        c.category === 'Technical'
                          ? 'bg-blue-950 text-blue-300 border border-blue-800'
                          : c.category === 'Domain'
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                          : 'bg-purple-950 text-purple-300 border border-purple-800'
                      }`}>
                        {c.category}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-300 text-[11px] leading-relaxed max-w-md">
                      {c.desc}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {subTab === 'courses' && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
          <div className="p-4 bg-slate-950/60 border-b border-slate-800 flex justify-between items-center text-xs text-slate-400">
            <span>Official Training Courses & Capacity Building Modules</span>
            <span className="font-mono text-[11px] text-indigo-400">Read-Only Course Registry</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="text-[11px] uppercase bg-slate-950 text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Course Code</th>
                  <th className="py-3 px-4">Course Title</th>
                  <th className="py-3 px-4">Provider Agency</th>
                  <th className="py-3 px-4">Duration</th>
                  <th className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-sans">
                {SEEDED_COURSES.map((course) => (
                  <tr key={course.code} className="hover:bg-slate-800/40 transition">
                    <td className="py-3 px-4 font-mono font-semibold text-emerald-300">{course.code}</td>
                    <td className="py-3 px-4 font-medium text-slate-100">{course.title}</td>
                    <td className="py-3 px-4 text-slate-300">{course.provider}</td>
                    <td className="py-3 px-4 font-mono">{course.duration} Hours</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider bg-emerald-950 text-emerald-400 border border-emerald-800">
                        {course.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {subTab === 'roles' && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
          <div className="p-4 bg-slate-950/60 border-b border-slate-800 flex justify-between items-center text-xs text-slate-400">
            <span>Standardized Civil Service Role Tracks & Benchmark Mappings</span>
            <span className="font-mono text-[11px] text-indigo-400">Read-Only Role Hierarchy</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="text-[11px] uppercase bg-slate-950 text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Role Code</th>
                  <th className="py-3 px-4">Designation Track</th>
                  <th className="py-3 px-4">Responsible Ministry / Department</th>
                  <th className="py-3 px-4">Mandate & Responsibilities</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-sans">
                {SEEDED_ROLES.map((r) => (
                  <tr key={r.code} className="hover:bg-slate-800/40 transition">
                    <td className="py-3 px-4 font-mono font-semibold text-purple-300">{r.code}</td>
                    <td className="py-3 px-4 font-medium text-slate-100">{r.title}</td>
                    <td className="py-3 px-4 text-slate-300">{r.department}</td>
                    <td className="py-3 px-4 text-slate-300 text-[11px] leading-relaxed max-w-md">{r.desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
