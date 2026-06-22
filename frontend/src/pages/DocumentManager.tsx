import React, { useEffect, useState, useRef } from 'react';
import { 
  UploadCloud, 
  Trash2, 
  Clock, 
  CheckCircle, 
  AlertTriangle, 
  Globe, 
  Lock, 
  Loader2,
  FileText,
  HelpCircle
} from 'lucide-react';
import api from '../services/api';

export interface DocumentInfo {
  id: string;
  filename: string;
  file_type: string;
  status: 'uploaded' | 'processing' | 'indexed' | 'failed';
  is_public: boolean;
  created_at: string;
  updated_at: string;
}

export const DocumentManager: React.FC = () => {
  const [documents, setDocuments] = useState<DocumentInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Upload States
  const [file, setFile] = useState<File | null>(null);
  const [isPublic, setIsPublic] = useState(false);
  const [uploading, setUploading] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchDocuments = async () => {
    setLoading(true);
    try {
      const docList = await api.documents.list();
      setDocuments(docList);
      setError(null);
    } catch (err: any) {
      setError(err.message || "Failed to load documents.");
    } finally {
      setLoading(false);
    }
  };

  // Poll for processing document updates
  useEffect(() => {
    fetchDocuments();
    
    const interval = setInterval(async () => {
      // If any document is still processing/uploading, poll for updates
      const hasProcessing = documents.some(
        doc => doc.status === 'uploaded' || doc.status === 'processing'
      );
      
      if (hasProcessing || uploading) {
        try {
          const docList = await api.documents.list();
          setDocuments(docList);
        } catch {
          // Ignore background errors
        }
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [documents.length, uploading]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    setUploading(true);
    setError(null);
    try {
      await api.documents.upload(file, isPublic);
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      // Refresh documents
      const docList = await api.documents.list();
      setDocuments(docList);
    } catch (err: any) {
      setError(err.message || "Failed to upload document.");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (docId: string) => {
    if (!confirm("Are you sure you want to delete this document? All vector indexes and chunks will be permanently removed.")) return;
    try {
      await api.documents.delete(docId);
      setDocuments(documents.filter(d => d.id !== docId));
    } catch (err: any) {
      setError(err.message || "Failed to delete document.");
    }
  };

  // Status mapping to CSS badges
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'indexed':
        return (
          <span className="flex items-center gap-1.5 text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full uppercase tracking-wider">
            <CheckCircle size={10} />
            Ready
          </span>
        );
      case 'processing':
        return (
          <span className="flex items-center gap-1.5 text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded-full uppercase tracking-wider animate-pulse">
            <Clock size={10} />
            Parsing
          </span>
        );
      case 'failed':
        return (
          <span className="flex items-center gap-1.5 text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20 px-2 py-0.5 rounded-full uppercase tracking-wider">
            <AlertTriangle size={10} />
            Failed
          </span>
        );
      default:
        return (
          <span className="flex items-center gap-1.5 text-[10px] font-bold bg-slate-800 text-slate-400 border border-slate-700/60 px-2 py-0.5 rounded-full uppercase tracking-wider">
            <Loader2 size={10} className="animate-spin" />
            Queued
          </span>
        );
    }
  };

  return (
    <div className="flex-1 max-w-6xl mx-auto px-6 py-8 space-y-8 overflow-y-auto h-screen">
      <div>
        <h2 className="text-2xl font-bold text-white tracking-tight">Document Management</h2>
        <p className="text-slate-400 text-sm mt-1">Upload job descriptions, resume guidelines, and interview transcripts to anchor your AI context.</p>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/25 text-sm text-rose-400 flex items-center gap-3">
          <AlertTriangle size={16} />
          <span>{error}</span>
        </div>
      )}

      {/* Upload Zone & Guide Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Upload Form */}
        <div className="lg:col-span-2 glass-panel border border-slate-800 p-6 rounded-2xl flex flex-col justify-between">
          <h3 className="text-base font-bold text-white mb-4">Ingest Placement Files</h3>
          
          <form onSubmit={handleUpload} className="space-y-4">
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-800 hover:border-brand-500/40 rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer transition-all bg-dark-900/10 hover:bg-brand-500/5 group"
            >
              <UploadCloud size={36} className="text-slate-500 group-hover:text-brand-400 transition-colors mb-2.5" />
              <p className="text-sm font-semibold text-slate-200">
                {file ? file.name : "Choose a file or drag & drop"}
              </p>
              <p className="text-xs text-slate-500 mt-1">PDF, DOCX, TXT up to 10MB</p>
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange}
                accept=".pdf,.docx,.txt,.md"
                className="hidden" 
              />
            </div>

            {/* Sharing toggle */}
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-dark-900/30 border border-slate-800/80">
              <div className="flex items-center gap-3">
                {isPublic ? <Globe size={18} className="text-brand-400" /> : <Lock size={18} className="text-slate-400" />}
                <div>
                  <p className="text-sm font-semibold text-slate-200">Global Shareable Document</p>
                  <p className="text-xs text-slate-500">Make this JD or guide visible to other students.</p>
                </div>
              </div>
              <input 
                type="checkbox"
                checked={isPublic}
                onChange={(e) => setIsPublic(e.target.checked)}
                className="w-4 h-4 rounded text-brand-600 focus:ring-brand-500 border-slate-700 bg-slate-800"
              />
            </div>

            <button
              type="submit"
              disabled={!file || uploading}
              className="w-full py-3 px-4 rounded-xl bg-brand-600 hover:bg-brand-500 disabled:bg-slate-800 disabled:text-slate-500 text-sm font-bold text-white shadow-glass-brand transition-all flex items-center justify-center gap-2"
            >
              {uploading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Processing Vectors...</span>
                </>
              ) : (
                <span>Upload & Index Document</span>
              )}
            </button>
          </form>
        </div>

        {/* Technical Guide */}
        <div className="glass-panel border border-slate-800 p-6 rounded-2xl space-y-4">
          <div className="flex items-center gap-2 text-brand-400">
            <HelpCircle size={18} />
            <h4 className="text-sm font-bold text-white">How Ingestion Works</h4>
          </div>
          
          <ul className="space-y-3.5 text-xs text-slate-400 leading-relaxed list-none pl-0">
            <li className="flex items-start gap-2.5">
              <span className="w-1.5 h-1.5 rounded-full bg-brand-500 mt-1.5"></span>
              <span><strong>Parsing:</strong> Text content is parsed page-by-page. For DOCX, paragraphs and table headers are extracted.</span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="w-1.5 h-1.5 rounded-full bg-brand-500 mt-1.5"></span>
              <span><strong>Recursive Token Chunking:</strong> Files are split into chunks of maximum <strong>800 tokens</strong> with a <strong>150 token overlap</strong> to preserve surrounding semantic context.</span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="w-1.5 h-1.5 rounded-full bg-brand-500 mt-1.5"></span>
              <span><strong>Local Embeddings:</strong> SentenceTransformers computes vector mappings, saved in a PostgreSQL <strong>pgvector</strong> schema.</span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="w-1.5 h-1.5 rounded-full bg-brand-500 mt-1.5"></span>
              <span><strong>FTS Indexing:</strong> Chunks are converted to TSVectors for sparse hybrid keyword search.</span>
            </li>
          </ul>
        </div>
      </div>

      {/* Documents Table */}
      <div className="glass-panel border border-slate-800 rounded-2xl overflow-hidden shadow-glass">
        <div className="px-6 py-4 border-b border-slate-800/80">
          <h3 className="text-base font-bold text-white">Ingested Document Repository</h3>
        </div>
        
        {loading && documents.length === 0 ? (
          <div className="p-12 text-center text-slate-500 flex flex-col items-center gap-3">
            <Loader2 size={32} className="animate-spin text-brand-500" />
            <p className="text-sm">Retrieving repository files...</p>
          </div>
        ) : documents.length === 0 ? (
          <div className="p-12 text-center text-slate-500 flex flex-col items-center gap-3">
            <FileText size={40} className="stroke-[1.5]" />
            <p className="text-sm">No files uploaded. Start by importing a company JD or guide above.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-850">
              <thead className="bg-dark-900/30">
                <tr>
                  <th className="px-6 py-3.5 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Document Name</th>
                  <th className="px-6 py-3.5 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Type</th>
                  <th className="px-6 py-3.5 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Indexing Status</th>
                  <th className="px-6 py-3.5 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Sharing</th>
                  <th className="px-6 py-3.5 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Created At</th>
                  <th className="px-6 py-3.5 text-right text-xs font-bold text-slate-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-850/60 bg-dark-950/20">
                {documents.map((doc) => (
                  <tr key={doc.id} className="hover:bg-slate-850/10 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-slate-200">
                      {doc.filename}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-400 uppercase font-mono">
                      {doc.file_type}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(doc.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-400">
                      {doc.is_public ? (
                        <span className="flex items-center gap-1 text-brand-400">
                          <Globe size={12} /> Public
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-slate-500">
                          <Lock size={12} /> Workspace
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-500">
                      {new Date(doc.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                      <button 
                        onClick={() => handleDelete(doc.id)}
                        className="text-slate-500 hover:text-rose-400 p-1.5 rounded-lg hover:bg-rose-500/5 border border-transparent hover:border-rose-500/10 transition-all inline-flex items-center"
                      >
                        <Trash2 size={15} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
export default DocumentManager;
