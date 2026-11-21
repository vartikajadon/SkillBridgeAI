import React from 'react';
import { HelpCircle, ShieldCheck, X } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const RecommendationExplanation: React.FC<Props> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 sm:p-7 space-y-6 shadow-2xl overflow-y-auto max-h-[90vh]">
        <div className="flex items-start justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center space-x-2.5 text-indigo-400">
            <ShieldCheck className="w-5 h-5" />
            <h3 className="font-bold text-white text-base">
              Transparent Recommendation Ranking Architecture
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition p-1 rounded-lg hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4 text-xs text-slate-300 leading-relaxed">
          <p>
            SkillBridge AI calculates course relevance using a strictly deterministic, explainable mathematical rubric.
            Recommendations prioritize statutory public-sector mandates and personalized competency gaps without black-box bias.
          </p>

          <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3 font-mono text-[11px]">
            <span className="text-indigo-400 font-bold block uppercase tracking-wider">
              Scoring Weight Hierarchy
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-300">
              <div className="p-2 rounded bg-slate-900/60 border border-slate-800">
                <span className="text-emerald-400 font-bold block">Mandatory Criticality</span>
                <span>+20.0 pts (vs +10.0 for Desirable)</span>
              </div>
              <div className="p-2 rounded bg-slate-900/60 border border-slate-800">
                <span className="text-indigo-400 font-bold block">Gap Magnitude</span>
                <span>+15.0 pts per competency gap level</span>
              </div>
              <div className="p-2 rounded bg-slate-900/60 border border-slate-800">
                <span className="text-cyan-400 font-bold block">Exact Target Delivery</span>
                <span>+10.0 pts (delivers full target level)</span>
              </div>
              <div className="p-2 rounded bg-slate-900/60 border border-slate-800">
                <span className="text-amber-400 font-bold block">Multi-Skill Synergy</span>
                <span>+5.0 pts per additional gap addressed</span>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <h4 className="font-semibold text-white text-xs">Deterministic Tie-Breaking Protocol</h4>
            <ol className="list-decimal list-inside space-y-1 text-slate-400 text-[11px]">
              <li>Total Relevance Score (descending)</li>
              <li>Number of Mandatory competencies addressed (descending)</li>
              <li>Cumulative sum of skill-gap points addressed (descending)</li>
              <li>Course duration in hours (ascending - faster completion prioritized on equal relevance)</li>
              <li>Course catalogue code (alphabetical ascending for absolute reproducibility)</li>
            </ol>
          </div>

          <div className="p-3 bg-indigo-950/40 border border-indigo-900/60 rounded-xl flex items-start space-x-2 text-indigo-300">
            <HelpCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span className="text-[11px]">
              <strong>Pedagogical Sequencing:</strong> Learning paths automatically organize courses so foundational modules (Level 2) are completed before advanced coursework (Levels 4–5).
            </span>
          </div>
        </div>

        <div className="flex justify-end pt-2 border-t border-slate-800">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-semibold transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
