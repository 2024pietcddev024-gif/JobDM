import React, { useState } from 'react';
import { parseResumeFile } from '../services/resumeParser';
import { UploadCloud, FileText, CheckCircle, Sparkles, X, Code, Briefcase } from 'lucide-react';

export default function ResumeUploader({ onResumeParsed, currentResume }) {
  const [isDragging, setIsDragging] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [resumeData, setResumeData] = useState(currentResume || null);

  const handleFile = async (file) => {
    if (!file) return;
    setIsParsing(true);
    try {
      const parsed = await parseResumeFile(file);
      setResumeData(parsed);
      if (onResumeParsed) onResumeParsed(parsed);
    } catch (err) {
      console.error('Error parsing resume:', err);
    } finally {
      setIsParsing(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  return (
    <div className="space-y-4">
      {!resumeData ? (
        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          className={`relative border-2 border-dashed rounded-3xl p-6 text-center transition-all cursor-pointer ${
            isDragging 
              ? 'border-indigo-500 bg-indigo-500/10 scale-[1.01]' 
              : 'border-white/15 bg-white/5 hover:border-indigo-400/50 hover:bg-white/10'
          }`}
        >
          <input
            type="file"
            accept=".pdf,.doc,.docx,.txt"
            onChange={handleFileChange}
            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
          />

          <div className="flex flex-col items-center justify-center space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-indigo-500/20 flex items-center justify-center border border-indigo-500/30">
              <UploadCloud className="w-7 h-7 text-indigo-400" />
            </div>
            <div>
              <p className="font-semibold text-white text-base">
                {isParsing ? 'Parsing Resume Intelligence...' : 'Upload PDF Resume'}
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Drag & drop your PDF/TXT resume to get personalized project & skill questions
              </p>
            </div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-300 text-xs font-medium border border-indigo-500/20">
              <Sparkles className="w-3.5 h-3.5" /> AI Resume Personalization
            </span>
          </div>
        </div>
      ) : (
        <div className="glass-card rounded-2xl p-5 border border-indigo-500/30 relative">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center border border-emerald-500/30">
                <FileText className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="font-bold text-white text-sm">{resumeData.fileName}</h4>
                  <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-400">
                    <CheckCircle className="w-3.5 h-3.5" /> AI Parsed
                  </span>
                </div>
                <p className="text-xs text-slate-400">Uploaded {resumeData.uploadDate}</p>
              </div>
            </div>
            <button
              onClick={() => { setResumeData(null); if (onResumeParsed) onResumeParsed(null); }}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10"
              title="Remove resume"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Extracted Skills */}
          {resumeData.extractedSkills?.length > 0 && (
            <div className="mt-4 pt-3 border-t border-white/10">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-300 mb-2">
                <Code className="w-3.5 h-3.5 text-indigo-400" />
                <span>Extracted Technical Skills:</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {resumeData.extractedSkills.map((skill, idx) => (
                  <span key={idx} className="px-2.5 py-0.5 rounded-md bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 text-xs font-medium">
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Extracted Projects */}
          {resumeData.extractedProjects?.length > 0 && (
            <div className="mt-3">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-300 mb-1.5">
                <Briefcase className="w-3.5 h-3.5 text-purple-400" />
                <span>Extracted Projects for AI Questions:</span>
              </div>
              <div className="space-y-1.5">
                {resumeData.extractedProjects.map((p, i) => (
                  <div key={i} className="p-2 rounded-lg bg-white/5 border border-white/5 text-xs">
                    <span className="font-semibold text-slate-200">{p.name}</span>
                    <span className="text-slate-400 ml-2">({p.tech})</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
