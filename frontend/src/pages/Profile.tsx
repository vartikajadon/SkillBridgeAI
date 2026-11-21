import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { User, Shield, Briefcase, Building, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

export const Profile: React.FC = () => {
  const { user, updateProfile } = useAuth();

  const [fullName, setFullName] = useState(user?.full_name || '');
  const [department, setDepartment] = useState(user?.department || '');
  const [designation, setDesignation] = useState(user?.designation || '');

  const [isSaving, setIsSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSuccessMsg(false);
    setErrorMsg(null);

    const { error } = await updateProfile({
      full_name: fullName,
      department: department || undefined,
      designation: designation || undefined,
    });

    if (error) {
      setErrorMsg(error.message);
    } else {
      setSuccessMsg(true);
      setTimeout(() => setSuccessMsg(false), 3000);
    }
    setIsSaving(false);
  };

  if (!user) return null;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6 text-slate-100">
      <div className="border-b border-slate-800 pb-4">
        <h1 className="text-2xl font-bold tracking-tight text-white flex items-center space-x-2">
          <User className="w-6 h-6 text-indigo-400" />
          <span>Civil Servant Profile</span>
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Self-service profile information. Privileged attributes (Role, Employee ID, Job Role) are managed by Administration.
        </p>
      </div>

      {successMsg && (
        <div className="bg-emerald-950/60 border border-emerald-800 p-3 rounded-lg flex items-center space-x-2 text-emerald-300 text-sm">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
          <span>Profile changes updated successfully.</span>
        </div>
      )}

      {errorMsg && (
        <div className="bg-rose-950/60 border border-rose-800 p-3 rounded-lg flex items-center space-x-2 text-rose-300 text-sm">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Read-Only Status Card */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl space-y-4">
          <h3 className="text-sm font-semibold text-slate-300 flex items-center space-x-2">
            <Shield className="w-4 h-4 text-indigo-400" />
            <span>Administrative Badges</span>
          </h3>

          <div className="space-y-3 text-xs">
            <div>
              <div className="text-slate-500">System Role</div>
              <div className="font-semibold text-indigo-300 capitalize">{user.role}</div>
            </div>
            <div>
              <div className="text-slate-500">Official Email</div>
              <div className="font-mono text-slate-300 break-all">{user.email}</div>
            </div>
            <div>
              <div className="text-slate-500">Employee ID</div>
              <div className="font-mono text-slate-300">{user.employee_id || 'Not Assigned'}</div>
            </div>
            <div>
              <div className="text-slate-500">Account Status</div>
              <div className="text-emerald-400 font-semibold">{user.is_active ? 'Active' : 'Deactivated'}</div>
            </div>
          </div>
        </div>

        {/* Editable Allowlist Form */}
        <div className="md:col-span-2 bg-slate-900 border border-slate-800 p-6 rounded-xl">
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-300">Full Name</label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="mt-1 block w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 flex items-center space-x-1">
                <Building className="w-3.5 h-3.5 text-slate-500 mr-1" />
                <span>Ministry / Department</span>
              </label>
              <input
                type="text"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                placeholder="e.g. Ministry of Finance"
                className="mt-1 block w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 flex items-center space-x-1">
                <Briefcase className="w-3.5 h-3.5 text-slate-500 mr-1" />
                <span>Designation</span>
              </label>
              <input
                type="text"
                value={designation}
                onChange={(e) => setDesignation(e.target.value)}
                placeholder="e.g. Section Officer"
                className="mt-1 block w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isSaving}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-xs font-semibold text-white transition disabled:opacity-50"
              >
                {isSaving ? (
                  <span className="flex items-center space-x-1">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Saving...</span>
                  </span>
                ) : (
                  'Save Profile Changes'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
