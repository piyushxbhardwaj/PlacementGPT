import React, { useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { 
  User, 
  Key, 
  Copy, 
  Check, 
  Calendar, 
  Shield, 
  Terminal
} from 'lucide-react';

export const Profile: React.FC = () => {
  const { user, token } = useAuthStore();
  const [copied, setCopied] = useState(false);

  const handleCopyToken = () => {
    if (!token) return;
    navigator.clipboard.writeText(token);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!user) {
    return (
      <div className="flex-1 flex items-center justify-center bg-dark-950">
        <span className="text-slate-500">Profile loading...</span>
      </div>
    );
  }

  return (
    <div className="flex-1 max-w-4xl mx-auto px-6 py-8 space-y-8 overflow-y-auto h-screen">
      <div>
        <h2 className="text-2xl font-bold text-white tracking-tight">Student Profile</h2>
        <p className="text-slate-400 text-sm mt-1">Manage your credentials, roles, and API testing access keys.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Profile Card Info */}
        <div className="lg:col-span-1 glass-panel border border-slate-800 p-6 rounded-2xl flex flex-col items-center text-center space-y-4">
          <div className="w-20 h-20 rounded-full bg-brand-500/10 border border-brand-500/30 flex items-center justify-center text-brand-400 text-3xl font-bold shadow-glass-brand">
            {user.email.charAt(0).toUpperCase()}
          </div>
          <div>
            <h3 className="text-lg font-bold text-white truncate max-w-[200px]">{user.email}</h3>
            <span className="text-xs text-slate-500">{user.id}</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-500/15 border border-brand-500/25 text-xs text-brand-400 font-bold uppercase tracking-wider">
            <Shield size={12} />
            <span>{user.role} Account</span>
          </div>
        </div>

        {/* Account Details & API Access */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Metadata Section */}
          <div className="glass-panel border border-slate-800 p-6 rounded-2xl space-y-4">
            <h4 className="text-sm font-bold text-white border-b border-slate-850 pb-2.5">Workspace Settings</h4>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div className="space-y-1">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Registration Date</span>
                <p className="text-slate-200 flex items-center gap-2 font-medium">
                  <Calendar size={14} className="text-brand-400" />
                  {new Date(user.created_at).toLocaleDateString()}
                </p>
              </div>
              <div className="space-y-1">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Access Permissions</span>
                <p className="text-slate-200 flex items-center gap-2 font-medium">
                  <Shield size={14} className="text-brand-400" />
                  {user.role === 'admin' ? 'Full Read/Write/Admin Privilege' : 'Standard Read/Write Isolation'}
                </p>
              </div>
            </div>
          </div>

          {/* JWT testing tokens */}
          <div className="glass-panel border border-slate-800 p-6 rounded-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-850 pb-2.5">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <Key size={16} className="text-brand-400" />
                <span>API Bearer Token (JWT)</span>
              </h4>
              <button
                onClick={handleCopyToken}
                className="flex items-center gap-1.5 text-xs font-bold text-brand-400 hover:text-brand-350 transition-colors border border-brand-500/20 hover:border-brand-500/40 bg-brand-500/5 px-3 py-1.5 rounded-lg"
              >
                {copied ? (
                  <>
                    <Check size={13} className="text-emerald-400" />
                    <span className="text-emerald-400">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy size={13} />
                    <span>Copy Token</span>
                  </>
                )}
              </button>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              Use this JSON Web Token to authenticate direct API requests in terminal queries, curl scripts, or testing frameworks.
            </p>

            <div className="p-3 rounded-xl bg-dark-900/60 border border-slate-850 font-mono text-[10px] sm:text-xs text-slate-400 break-all select-all leading-normal max-h-24 overflow-y-auto">
              {token}
            </div>

            <div className="space-y-2 pt-2">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Example curl endpoint query</span>
              <div className="p-3 rounded-xl bg-dark-950 border border-slate-900 font-mono text-[10px] sm:text-xs text-brand-400 flex items-center gap-2 overflow-x-auto">
                <Terminal size={14} className="text-slate-500 shrink-0" />
                <span className="text-slate-300">curl -H &ldquo;Authorization: Bearer &lt;TOKEN&gt;&rdquo; http://localhost:8000/api/documents</span>
              </div>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
export default Profile;
