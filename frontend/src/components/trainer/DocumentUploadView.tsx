import React, { useEffect, useState } from 'react';
import { DocumentUploadResponse, TrainerCompetencyItem, TrainerDocumentItem } from '../../types/trainer';
import {
  AlertTriangle,
  Award,
  FileCheck,
  FileText,
  FileUp,
  Loader2,
  RefreshCw,
  Sparkles,
  Trash2,
  Upload,
} from 'lucide-react';

interface Props {
  sessionToken: string;
  onSelectForQuizGeneration?: (documentId: string) => void;
}

export const DocumentUploadView: React.FC<Props> = ({
  sessionToken,
  onSelectForQuizGeneration,
}) => {
  const [documents, setDocuments] = useState<TrainerDocumentItem[]>([]);
  const [competencies, setCompetencies] = useState<TrainerCompetencyItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [title, setTitle] = useState<string>('');
  const [selectedCompetency, setSelectedCompetency] = useState<string>('');
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);

  const fetchCompetencies = async () => {
    try {
      const res = await fetch('/api/v1/trainer/competencies', {
        headers: {
          Authorization: `Bearer ${sessionToken}`,
        },
      });
      if (res.ok) {
        const data: TrainerCompetencyItem[] = await res.json();
        setCompetencies(data);
      }
    } catch {
      // Non-blocking
    }
  };

  const fetchDocuments = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/v1/trainer/documents', {
        headers: {
          Authorization: `Bearer ${sessionToken}`,
        },
      });
      if (!res.ok) {
        throw new Error(`Failed to load training documents (${res.status})`);
      }
      const data: TrainerDocumentItem[] = await res.json();
      setDocuments(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error fetching documents');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
    fetchCompetencies();
  }, [sessionToken]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      if (!title) {
        setTitle(file.name.replace(/\.[^/.]+$/, '').replace(/_/g, ' '));
      }
      setUploadError(null);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      setUploadError('Please select a PDF, TXT, or Markdown document to upload.');
      return;
    }

    setIsUploading(true);
    setUploadError(null);
    setUploadSuccess(null);

    const formData = new FormData();
    formData.append('file', selectedFile);
    if (title.trim()) {
      formData.append('title', title.trim());
    }
    if (selectedCompetency) {
      formData.append('competency_id', selectedCompetency);
    }

    try {
      const res = await fetch('/api/v1/trainer/documents/upload', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${sessionToken}`,
        },
        body: formData,
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        throw new Error(errorData?.detail || `Upload failed with status ${res.status}`);
      }

      const newDoc: DocumentUploadResponse = await res.json();
      setUploadSuccess(`Successfully ingested '${newDoc.title}' (${newDoc.chunk_count} chunks extracted).`);
      setSelectedFile(null);
      setTitle('');
      setSelectedCompetency('');
      fetchDocuments();
    } catch (err: unknown) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (docId: string, docTitle: string) => {
    if (!window.confirm(`Are you sure you want to delete '${docTitle}' and all extracted chunks?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/v1/trainer/documents/${docId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${sessionToken}`,
        },
      });
      if (!res.ok) {
        throw new Error('Failed to delete document');
      }
      setDocuments((prev) => prev.filter((d) => d.id !== docId));
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Error deleting document');
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-8">
      {/* Upload Box */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-7 shadow-sm space-y-5">
        <div className="border-b border-slate-200 dark:border-slate-800 pb-3">
          <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center space-x-2">
            <FileUp className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
            <span>Ingest Training Documents & Circulars</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Upload public sector guidelines, manuals, or SOPs (PDF, TXT, MD up to 15MB). The engine automatically chunks content for AI quiz generation.
          </p>
        </div>

        <form onSubmit={handleUpload} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Document File (PDF, TXT, MD) *
              </label>
              <input
                type="file"
                accept=".pdf,.txt,.md"
                onChange={handleFileChange}
                disabled={isUploading}
                className="w-full text-xs text-slate-700 dark:text-slate-300 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-cyan-100 file:text-cyan-800 dark:file:bg-cyan-950 dark:file:text-cyan-300 hover:file:bg-cyan-200 dark:hover:file:bg-cyan-900 file:cursor-pointer bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl p-2 cursor-pointer transition"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Descriptive Title
              </label>
              <input
                type="text"
                placeholder="e.g. GeM Procurement Manual 2026"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={isUploading}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Target Skill / Competency
              </label>
              <select
                value={selectedCompetency}
                onChange={(e) => setSelectedCompetency(e.target.value)}
                disabled={isUploading}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500 transition"
              >
                <option value="">-- Optional: Link to Skill --</option>
                {competencies.map((c) => (
                  <option key={c.id} value={c.id}>
                    [{c.code}] {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {uploadError && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 rounded-xl text-rose-800 dark:text-rose-200 text-xs flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400" />
              <span>{uploadError}</span>
            </div>
          )}

          {uploadSuccess && (
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 rounded-xl text-emerald-800 dark:text-emerald-200 text-xs flex items-center space-x-2">
              <FileCheck className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
              <span>{uploadSuccess}</span>
            </div>
          )}

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={isUploading || !selectedFile}
              className="px-5 py-2.5 bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-200 dark:disabled:bg-slate-800 disabled:text-slate-400 dark:disabled:text-slate-500 text-white rounded-xl text-xs font-semibold shadow transition flex items-center space-x-2"
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Ingesting & Chunking...</span>
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  <span>Upload & Ingest</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Documents List Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center space-x-2">
            <FileText className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
            <span>Uploaded Knowledge Base Documents</span>
          </h3>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {documents.length} {documents.length === 1 ? 'Document' : 'Documents'}
          </span>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center p-12 text-slate-400 space-y-3">
            <RefreshCw className="w-6 h-6 animate-spin text-cyan-500" />
            <p className="text-xs">Loading training documents...</p>
          </div>
        ) : error ? (
          <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl text-rose-800 dark:text-rose-200 text-xs">
            {error}
          </div>
        ) : documents.length === 0 ? (
          <p className="text-xs text-slate-500 dark:text-slate-400 italic py-6 text-center">
            No documents uploaded yet. Upload a circular or manual above to begin.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
              <thead className="bg-slate-100 dark:bg-slate-950 text-slate-600 dark:text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-4 py-3">Document Title</th>
                  <th className="px-3 py-3">Size</th>
                  <th className="px-3 py-3">Format</th>
                  <th className="px-3 py-3">Status</th>
                  <th className="px-3 py-3">Chunks</th>
                  <th className="px-3 py-3">Uploaded</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800/80">
                {documents.map((doc) => (
                  <tr key={doc.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                    <td className="px-4 py-3.5 font-medium text-slate-900 dark:text-white flex items-center space-x-2">
                      <FileText className="w-4 h-4 text-cyan-600 dark:text-cyan-400 shrink-0" />
                      <div>
                        <span className="block">{doc.title}</span>
                        <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                          <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">{doc.file_name}</span>
                          {doc.competency_name && (
                            <span className="inline-flex items-center space-x-1 text-[10px] font-semibold text-cyan-800 dark:text-cyan-200 bg-cyan-50 dark:bg-cyan-950/80 border border-cyan-200 dark:border-cyan-800 px-1.5 py-0.5 rounded">
                              <Award className="w-2.5 h-2.5 text-cyan-600 dark:text-cyan-400" />
                              <span>{doc.competency_code ? `${doc.competency_code}: ` : ''}{doc.competency_name}</span>
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3.5 text-slate-500 dark:text-slate-400">
                      {formatFileSize(doc.file_size_bytes)}
                    </td>
                    <td className="px-3 py-3.5">
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono">
                        {doc.mime_type.split('/').pop()}
                      </span>
                    </td>
                    <td className="px-3 py-3.5">
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border ${doc.status === 'processed'
                          ? 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800'
                          : doc.status === 'pending'
                            ? 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800'
                            : 'bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950 dark:text-rose-300 dark:border-rose-800'
                          }`}
                      >
                        {doc.status}
                      </span>
                    </td>
                    <td className="px-3 py-3.5 font-bold text-slate-900 dark:text-white">
                      {doc.chunk_count}
                    </td>
                    <td className="px-3 py-3.5 text-slate-500 dark:text-slate-400 text-[11px]">
                      {new Date(doc.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3.5 text-right space-x-2">
                      {doc.status === 'processed' && onSelectForQuizGeneration && (
                        <button
                          onClick={() => onSelectForQuizGeneration(doc.id)}
                          className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-[11px] font-semibold transition inline-flex items-center space-x-1"
                        >
                          <Sparkles className="w-3 h-3" />
                          <span>Generate Quiz</span>
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(doc.id, doc.title)}
                        className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded transition"
                        title="Delete Document"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
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
