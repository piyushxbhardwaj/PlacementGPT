import React, { useEffect, useState } from 'react';
import { 
  ShieldAlert, 
  Users, 
  Files, 
  Cpu, 
  DollarSign, 
  TrendingUp, 
  Activity, 
  Loader2,
  CheckCircle,
  UserCheck
} from 'lucide-react';
import api from '../services/api';

export const AdminDashboard: React.FC = () => {
  const [stats, setStats] = useState({
    total_users: 0,
    total_documents: 0,
    total_chunks: 0,
    total_tokens: 0
  });
  const [loading, setLoading] = useState(true);
  const [promoteUserId, setPromoteUserId] = useState("");
  const [promoteLoading, setPromoteLoading] = useState(false);
  const [promoteSuccess, setPromoteSuccess] = useState<string | null>(null);
  const [promoteError, setPromoteError] = useState<string | null>(null);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const systemStats = await api.admin.getStats();
      setStats(systemStats);
    } catch (err) {
      console.error("Failed to load admin stats:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const handlePromote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!promoteUserId.trim()) return;

    setPromoteLoading(true);
    setPromoteError(null);
    setPromoteSuccess(null);
    try {
      await api.auth.promote(promoteUserId);
      setPromoteSuccess(`User ${promoteUserId} successfully promoted to Admin.`);
      setPromoteUserId("");
      fetchStats();
    } catch (err: any) {
      setPromoteError(err.message || "Failed to promote user.");
    } finally {
      setPromoteLoading(false);
    }
  };

  // Cost calculation details
  const estimatedCost = (stats.total_tokens / 1_000_000) * 0.12; // blended cost coefficient

  return (
    <div className="flex-1 max-w-6xl mx-auto px-6 py-8 space-y-8 overflow-y-auto h-screen">
      <div>
        <h2 className="text-2xl font-bold text-white tracking-tight">Admin Observability Console</h2>
        <p className="text-slate-400 text-sm mt-1">Monitor global token counts, inspect database stats, and promote student accounts.</p>
      </div>

      {loading ? (
        <div className="h-64 flex items-center justify-center">
          <Loader2 size={32} className="animate-spin text-brand-500" />
        </div>
      ) : (
        <>
          {/* Admin Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="glass-panel border border-slate-800 p-5 rounded-2xl flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                <Users size={20} />
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Global Students</span>
                <span className="text-xl font-extrabold text-white mt-0.5 block">{stats.total_users}</span>
              </div>
            </div>

            <div className="glass-panel border border-slate-800 p-5 rounded-2xl flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center text-brand-400">
                <Files size={20} />
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Indexed Files</span>
                <span className="text-xl font-extrabold text-white mt-0.5 block">{stats.total_documents}</span>
              </div>
            </div>

            <div className="glass-panel border border-slate-800 p-5 rounded-2xl flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                <Cpu size={20} />
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Total Chunks</span>
                <span className="text-xl font-extrabold text-white mt-0.5 block">{stats.total_chunks}</span>
              </div>
            </div>

            <div className="glass-panel border border-slate-800 p-5 rounded-2xl flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                <DollarSign size={20} />
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Blended Cost (Est.)</span>
                <span className="text-xl font-extrabold text-white mt-0.5 block">${estimatedCost.toFixed(4)}</span>
              </div>
            </div>
          </div>

          {/* Latency Charts & Role Management */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* RAG pipeline latencies (simulated percentiles) */}
            <div className="lg:col-span-2 glass-panel border border-slate-800 p-6 rounded-2xl space-y-5">
              <div className="flex items-center justify-between border-b border-slate-850 pb-2.5">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Activity size={16} className="text-brand-400" />
                  <span>Pipeline Latency Breakdown (p95)</span>
                </h3>
                <span className="text-[10px] font-semibold text-slate-500 uppercase">Target: &lt; 3.0s</span>
              </div>

              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-xs font-semibold mb-1">
                    <span className="text-slate-400">1. Query Expansion (Gemini)</span>
                    <span className="text-white">0.32s</span>
                  </div>
                  <div className="w-full bg-slate-850 h-2 rounded-full overflow-hidden">
                    <div className="bg-brand-500 h-2 rounded-full" style={{ width: '12%' }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-semibold mb-1">
                    <span className="text-slate-400">2. Hybrid Retrieval (pgvector + FTS)</span>
                    <span className="text-white">0.05s</span>
                  </div>
                  <div className="w-full bg-slate-850 h-2 rounded-full overflow-hidden">
                    <div className="bg-brand-500 h-2 rounded-full" style={{ width: '3%' }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-semibold mb-1">
                    <span className="text-slate-400">3. Cross-Encoder Reranking (MiniLM)</span>
                    <span className="text-white">0.18s</span>
                  </div>
                  <div className="w-full bg-slate-850 h-2 rounded-full overflow-hidden">
                    <div className="bg-brand-500 h-2 rounded-full" style={{ width: '8%' }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-semibold mb-1">
                    <span className="text-slate-400">4. LLM Generation (Gemini Stream - TTFT)</span>
                    <span className="text-white">0.85s</span>
                  </div>
                  <div className="w-full bg-slate-850 h-2 rounded-full overflow-hidden">
                    <div className="bg-brand-600 h-2 rounded-full" style={{ width: '38%' }} />
                  </div>
                </div>
              </div>
            </div>

            {/* Promotion Box */}
            <div className="glass-panel border border-slate-800 p-6 rounded-2xl space-y-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-slate-850 pb-2.5">
                <UserCheck size={16} className="text-brand-400" />
                <span>Elevate Privileges</span>
              </h3>

              <form onSubmit={handlePromote} className="space-y-4">
                {promoteError && (
                  <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-xs text-rose-400">
                    {promoteError}
                  </div>
                )}
                {promoteSuccess && (
                  <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-400">
                    {promoteSuccess}
                  </div>
                )}

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Target User UUID</label>
                  <input
                    type="text"
                    required
                    value={promoteUserId}
                    onChange={(e) => setPromoteUserId(e.target.value)}
                    className="block w-full px-3 py-2 text-xs text-white glass-input rounded-xl"
                    placeholder="e.g. 550e8400-e29b-41d4-a716-446655440000"
                  />
                </div>

                <button
                  type="submit"
                  disabled={promoteLoading}
                  className="w-full py-2.5 px-4 rounded-xl bg-brand-600 hover:bg-brand-500 disabled:bg-slate-850 text-xs font-bold text-white transition-all flex items-center justify-center gap-1.5"
                >
                  {promoteLoading ? (
                    <Loader2 size={13} className="animate-spin" />
                  ) : (
                    <span>Elevate Role to Admin</span>
                  )}
                </button>
              </form>
            </div>

          </div>
        </>
      )}
    </div>
  );
};
export default AdminDashboard;
