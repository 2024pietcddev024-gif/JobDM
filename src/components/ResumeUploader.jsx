import React, { useState } from 'react';
import { parseResumeFile, parseResumeWithAI } from '../services/resumeParser';
import { UploadCloud, FileText, CheckCircle, Sparkles, X, Code, Briefcase, Tag, AlertCircle } from 'lucide-react';

export default function ResumeUploader({ onResumeParsed, currentResume }) {
  const [isDragging, setIsDragging] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [error, setError] = useState('');
  const [resumeData, setResumeData] = useState(currentResume || null);

  const handleFile = async (file) => {
    if (!file) return;
    setIsParsing(true);
    setError('');
    try {
      const { fileData, mimeType, fileName } = await parseResumeFile(file);
      console.log(`[Diagnostic] File selected: ${fileName}, size: ${file.size} bytes, mime: ${mimeType}`);
      const token = localStorage.getItem('interviewiq_token');
      
      const parsed = await parseResumeWithAI(fileData, mimeType, fileName, token);
      console.log(`[Diagnostic] AI parsing successful`, parsed);
      setResumeData(parsed);
      if (onResumeParsed) onResumeParsed(parsed);
    } catch (err) {
      console.error('[Diagnostic] Error parsing resume:', err.message || err);
      setError(`Unable to analyze this resume. Details: ${err.message || err}`);
      setResumeData(null);
      if (onResumeParsed) onResumeParsed(null);
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
      {error && (
        <div className="flex items-center gap-2 p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/40 text-rose-800 dark:text-rose-300 text-sm shadow-sm">
          <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400" />
          <span>{error}</span>
          <button onClick={() => setError('')} className="ml-auto text-xs font-bold underline hover:text-rose-950 dark:hover:text-white">Try Again</button>
        </div>
      )}
      {!resumeData ? (
        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          className={`relative border-2 border-dashed rounded-3xl p-6 text-center transition-all cursor-pointer ${
            isDragging 
              ? 'border-emerald-500 bg-emerald-100/60 scale-[1.01]' 
              : 'border-emerald-300 dark:border-emerald-800/60 bg-emerald-50/50 dark:bg-emerald-950/20 hover:border-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30'
          }`}
        >
          <input
            type="file"
            accept=".pdf,.doc,.docx,.txt"
            onChange={handleFileChange}
            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
            disabled={isParsing}
          />

          <div className="flex flex-col items-center justify-center space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300 flex items-center justify-center border border-emerald-200 dark:border-emerald-700/50 shadow-sm">
              {isParsing ? (
                <Sparkles className="w-7 h-7 text-emerald-600 dark:text-emerald-400 animate-pulse" />
              ) : (
                <UploadCloud className="w-7 h-7 text-emerald-600 dark:text-emerald-400" />
              )}
            </div>
            <div>
              <p className="font-bold text-slate-900 dark:text-white text-base font-['Outfit']">
                {isParsing ? 'Analyzing your resume...' : 'Upload Resume'}
              </p>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                {isParsing ? '⏳ Extracting skills, domains & personalizing interview...' : 'Supported: PDF, DOC, DOCX. Optional.'}
              </p>
            </div>
            {!isParsing && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300 text-xs font-semibold border border-emerald-200 dark:border-emerald-700/50">
                <Sparkles className="w-3.5 h-3.5 text-emerald-600" /> AI Resume Personalization
              </span>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-emerald-200 dark:border-emerald-800/40 relative shadow-sm">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300 flex items-center justify-center border border-emerald-200 dark:border-emerald-700/50 shadow-sm">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="font-bold text-slate-900 dark:text-white text-sm font-['Outfit']">{resumeData.fileName}</h4>
                  <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-700 dark:text-emerald-300">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-600" /> Resume Analysis Complete
                  </span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400">Interview options have been personalized based on your resume.</p>
              </div>
            </div>
            <button
              onClick={() => { setResumeData(null); if (onResumeParsed) onResumeParsed(null); }}
              className="p-1 rounded-lg text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:text-white hover:bg-slate-100 dark:bg-white/10"
              title="Remove resume"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-300 dark:border-white/10 space-y-4">
            
            {/* Extracted Categories / Domains */}
            {resumeData.categories?.length > 0 && (
              <div>
                <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  <Tag className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                  <span>Detected Technical Domains:</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {resumeData.categories.map((cat, idx) => (
                    <span key={idx} className="px-2.5 py-0.5 rounded-md bg-blue-500/15 border border-indigo-300 dark:border-indigo-500/20 text-indigo-700 dark:text-indigo-300 text-xs font-medium">
                      {cat}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Extracted Languages */}
            {resumeData.programmingLanguages?.length > 0 && (
              <div>
                <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  <Code className="w-3.5 h-3.5 text-orange-400" />
                  <span>Detected Languages:</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {resumeData.programmingLanguages.map((lang, idx) => (
                    <span key={idx} className="px-2.5 py-0.5 rounded-md bg-orange-500/15 border border-orange-500/30 text-orange-300 text-xs font-medium">
                      {lang}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Extracted Skills */}
            {resumeData.extractedSkills?.length > 0 && (
              <div>
                <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                  <span>Technologies & Skills:</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {resumeData.extractedSkills.map((skill, idx) => (
                    <span key={idx} className="px-2.5 py-0.5 rounded-md bg-indigo-500/15 border border-indigo-300 dark:border-indigo-500/20 text-indigo-700 dark:text-indigo-300 text-xs font-medium">
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Extracted Projects */}
            {resumeData.extractedProjects?.length > 0 && (
              <div>
                <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  <Briefcase className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                  <span>Extracted Projects:</span>
                </div>
                <div className="space-y-1.5">
                  {resumeData.extractedProjects.map((p, i) => (
                    <div key={i} className="p-2 rounded-lg bg-white dark:bg-white/5 border border-slate-200 dark:border-white/5 text-xs">
                      <span className="font-semibold text-slate-800 dark:text-slate-200">{p.name || (typeof p === 'string' ? p : 'Project')}</span>
                      {p.technologies && (
                         <span className="text-slate-600 dark:text-slate-400 ml-2">({p.technologies.join(', ')})</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {resumeData.experienceLevel && (
               <div className="text-xs text-slate-600 dark:text-slate-400 mt-2">
                 Experience Level Detected: <strong className="text-slate-800 dark:text-slate-200">{resumeData.experienceLevel}</strong>
               </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
