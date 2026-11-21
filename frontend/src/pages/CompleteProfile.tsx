import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { AlertCircle, Loader2, UserCheck } from 'lucide-react';

export const CompleteProfile: React.FC = () => {
  const { completeProfile, supabaseUser, logout } = useAuth();
  const [fullName, setFullName] = useState('');
  const [department, setDepartment] = useState('');
  const [designation, setDesignation] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsSubmitting(true);

    try {
      const { error } = await completeProfile({
        full_name: fullName,
        department: department || undefined,
        designation: designation || undefined,
        employee_id: employeeId || undefined,
      });

      if (error) {
        setErrorMsg(error.message);
      } else {
        navigate('/learner', { replace: true });
      }
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Profile creation failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 text-slate-100">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <UserCheck className="w-10 h-10 text-indigo-400 mx-auto" />
        <h2 className="mt-3 text-2xl font-bold tracking-tight text-white">Complete Civil Service Profile</h2>
        <p className="mt-1 text-xs text-slate-400">
          Your account is authenticated for <span className="text-indigo-300 font-mono">{supabaseUser?.email}</span>. Please complete your baseline profile to activate your learning portal.
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-slate-900 border border-slate-800 py-8 px-6 shadow-2xl rounded-xl sm:px-10">
          {errorMsg && (
            <div className="mb-4 bg-rose-950/60 border border-rose-800/80 p-3 rounded-lg flex items-start space-x-2 text-rose-300 text-sm">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="block text-xs font-medium text-slate-300">Full Name *</label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Full official name"
                className="mt-1 block w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300">Ministry / Department</label>
              <input
                type="text"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                placeholder="e.g. Department of Personnel and Training"
                className="mt-1 block w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300">Designation</label>
              <input
                type="text"
                value={designation}
                onChange={(e) => setDesignation(e.target.value)}
                placeholder="e.g. Under Secretary"
                className="mt-1 block w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300">Civil Service Employee ID</label>
              <input
                type="text"
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
                placeholder="Unique Employee Number"
                className="mt-1 block w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full mt-2 flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition disabled:opacity-50"
            >
              {isSubmitting ? (
                <span className="flex items-center space-x-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saving profile...</span>
                </span>
              ) : (
                'Activate Portal'
              )}
            </button>
          </form>

          <div className="mt-4 text-center">
            <button
              onClick={() => logout()}
              className="text-xs text-slate-500 hover:text-slate-400 underline"
            >
              Cancel and sign out
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
