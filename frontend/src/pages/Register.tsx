import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Cpu, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';

export const Register: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [department, setDepartment] = useState('');
  const [designation, setDesignation] = useState('');
  const [employeeId, setEmployeeId] = useState('');

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [emailNotice, setEmailNotice] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { signup } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsSubmitting(true);

    try {
      const { error, emailConfirmationRequired } = await signup(email, password, {
        full_name: fullName,
        department: department || undefined,
        designation: designation || undefined,
        employee_id: employeeId || undefined,
      });

      if (error) {
        setErrorMsg(error.message);
      } else if (emailConfirmationRequired) {
        setEmailNotice(true);
      } else {
        navigate('/learner', { replace: true });
      }
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Registration failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 text-slate-100">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <Link to="/" className="inline-flex items-center space-x-2">
          <div className="h-10 w-10 rounded-lg bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Cpu className="h-6 w-6 text-white" />
          </div>
          <span className="text-2xl font-bold tracking-tight text-white">
            SkillBridge <span className="text-indigo-400">AI</span>
          </span>
        </Link>
        <h2 className="mt-4 text-2xl font-bold tracking-tight text-white">Register Learner Account</h2>
        <p className="mt-1 text-xs text-slate-400">
          Public registration strictly creates <strong className="text-indigo-300">Learner</strong> accounts. Trainer & Admin accounts are provisioned administratively.
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

          {emailNotice ? (
            <div className="space-y-4 text-center py-4">
              <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto" />
              <h3 className="text-lg font-semibold text-white">Confirmation Link Sent</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Please check your inbox at <span className="text-indigo-300 font-mono">{email}</span> and click the confirmation link to complete registration.
              </p>
              <Link to="/login" className="inline-block mt-2 text-xs font-medium text-indigo-400 hover:text-indigo-300">
                Back to Sign In
              </Link>
            </div>
          ) : (
            <form className="space-y-4" onSubmit={handleSubmit}>
              <div>
                <label className="block text-xs font-medium text-slate-300">Full Name *</label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Shri Rajesh Kumar"
                  className="mt-1 block w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300">Official Email *</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="r.kumar@gov.in"
                  className="mt-1 block w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300">Password *</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimum 6 characters"
                  className="mt-1 block w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300">Department</label>
                  <input
                    type="text"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    placeholder="e.g. MoSPI"
                    className="mt-1 block w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300">Designation</label>
                  <input
                    type="text"
                    value={designation}
                    onChange={(e) => setDesignation(e.target.value)}
                    placeholder="e.g. Statistical Officer"
                    className="mt-1 block w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300">Civil Service Employee ID (Optional)</label>
                <input
                  type="text"
                  value={employeeId}
                  onChange={(e) => setEmployeeId(e.target.value)}
                  placeholder="e.g. DOPT-AST-104"
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
                    <span>Creating profile...</span>
                  </span>
                ) : (
                  'Create Learner Account'
                )}
              </button>
            </form>
          )}

          <div className="mt-5 text-center text-xs text-slate-400">
            <span>Already have an account? </span>
            <Link to="/login" className="font-medium text-indigo-400 hover:text-indigo-300">
              Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
