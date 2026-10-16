import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import ResumeUploader from '../components/ResumeUploader';
import { 
  User, Mail, Briefcase, Award, Flame, Save, CheckCircle, 
  AlertCircle, Lock, Eye, EyeOff, Code, GraduationCap, 
  Building2, CheckCircle2, ShieldCheck, RefreshCw, Send
} from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

const PROGRAMMING_LANGUAGES = [
  { id: 'python', name: 'Python' },
  { id: 'java', name: 'Java' },
  { id: 'cpp', name: 'C++' },
  { id: 'javascript', name: 'JavaScript' },
  { id: 'typescript', name: 'TypeScript' },
  { id: 'csharp', name: 'C#' },
  { id: 'go', name: 'Go' },
  { id: 'rust', name: 'Rust' },
  { id: 'kotlin', name: 'Kotlin' },
  { id: 'php', name: 'PHP' },
  { id: 'swift', name: 'Swift' },
  { id: 'sql', name: 'SQL' }
];

export default function Profile() {
  const { user, updateUserProfile, updateResumeData } = useAuth();

  // Use correct DB field names with fallbacks
  const [name, setName] = useState(user?.name || user?.full_name || '');
  const [email] = useState(user?.email || '');
  const [targetRole, setTargetRole] = useState(user?.targetRole || user?.target_role || 'Backend Developer');
  const [targetLevel, setTargetLevel] = useState(user?.targetLevel || user?.target_level || 'Intermediate');
  const [preferredCodingLanguage, setPreferredCodingLanguage] = useState(user?.preferredCodingLanguage || 'Python');
  const [practiceLanguages, setPracticeLanguages] = useState(user?.practiceLanguages || []);

  // Dual Email Identity & Lifecycle state
  const [collegeEmailInput, setCollegeEmailInput] = useState('');
  const [personalEmailInput, setPersonalEmailInput] = useState('');
  const [emailActionLoading, setEmailActionLoading] = useState(false);
  const [identityMsg, setIdentityMsg] = useState('');
  const [identityError, setIdentityError] = useState('');

  // Password change
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);

  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState('');

  // Keep form in sync if user object updates after a login re-sync
  useEffect(() => {
    if (user) {
      setName(user.name || user.full_name || '');
      setTargetRole(user.targetRole || user.target_role || 'Backend Developer');
      setTargetLevel(user.targetLevel || user.target_level || 'Intermediate');
      setPreferredCodingLanguage(user.preferredCodingLanguage || 'Python');
      setPracticeLanguages(user.practiceLanguages || []);
    }
  }, [user]);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaveError('');

    // Validate password section if user typed anything
    if (newPassword || currentPassword) {
      if (!currentPassword) {
        setSaveError('Enter your current password to set a new one.');
        return;
      }
      if (newPassword.length < 6) {
        setSaveError('New password must be at least 6 characters.');
        return;
      }
      if (newPassword !== confirmPassword) {
        setSaveError('New passwords do not match.');
        return;
      }
    }

    setIsSaving(true);

    const payload = {
      name,
      full_name: name,
      targetRole,
      target_role: targetRole,
      targetLevel,
      target_level: targetLevel,
      preferred_coding_language: preferredCodingLanguage,
      practice_languages: practiceLanguages
    };

    if (newPassword && currentPassword) {
      payload.current_password = currentPassword;
      payload.new_password = newPassword;
    }

    const result = await updateUserProfile(payload, true);

    setIsSaving(false);

    if (result?.success === false) {
      setSaveError(result.error || 'Failed to save profile.');
    } else {
      setSaveSuccess(true);
      // Clear password fields on success
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setSaveSuccess(false), 4000);
    }
  };

  const token = localStorage.getItem('interviewiq_token');

  const handleLinkCollegeEmail = async (e) => {
    e.preventDefault();
    if (!collegeEmailInput.trim() || !collegeEmailInput.includes('@')) {
      setIdentityError('Please provide a valid college email address.');
      return;
    }
    try {
      setEmailActionLoading(true);
      setIdentityError('');
      setIdentityMsg('');

      const res = await fetch(`${API_URL}/auth/link-college-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ college_email: collegeEmailInput.trim() })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to link college email');

      setIdentityMsg('College email linked and verified successfully!');
      setCollegeEmailInput('');
      await updateUserProfile({}, true);
      setTimeout(() => setIdentityMsg(''), 4000);
    } catch (err) {
      setIdentityError(err.message);
    } finally {
      setEmailActionLoading(false);
    }
  };

  const handleLinkPersonalEmail = async (e) => {
    e.preventDefault();
    if (!personalEmailInput.trim() || !personalEmailInput.includes('@')) {
      setIdentityError('Please provide a valid personal recovery email.');
      return;
    }
    try {
      setEmailActionLoading(true);
      setIdentityError('');
      setIdentityMsg('');

      const res = await fetch(`${API_URL}/auth/link-personal-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ personal_email: personalEmailInput.trim() })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to link personal email');

      setIdentityMsg('Personal email linked and verified successfully!');
      setPersonalEmailInput('');
      await updateUserProfile({}, true);
      setTimeout(() => setIdentityMsg(''), 4000);
    } catch (err) {
      setIdentityError(err.message);
    } finally {
      setEmailActionLoading(false);
    }
  };

  const handleUpdateContactPreference = async (pref) => {
    try {
      setEmailActionLoading(true);
      setIdentityError('');
      setIdentityMsg('');

      const res = await fetch(`${API_URL}/auth/email-preferences`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ preference: pref })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update contact preference');

      setIdentityMsg(`Primary communication preference set to ${pref === 'COLLEGE' ? 'College Email' : 'Personal Email'}.`);
      await updateUserProfile({}, true);
      setTimeout(() => setIdentityMsg(''), 4000);
    } catch (err) {
      setIdentityError(err.message);
    } finally {
      setEmailActionLoading(false);
    }
  };

  const handleUpdateLifecycle = async (newStatus) => {
    if (!confirm(`Are you sure you want to transition your account status to ${newStatus}? All practice history will be permanently preserved.`)) return;
    try {
      setEmailActionLoading(true);
      setIdentityError('');
      setIdentityMsg('');

      const res = await fetch(`${API_URL}/auth/lifecycle-status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ 
          status: newStatus,
          graduation_year: new Date().getFullYear()
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update account lifecycle');

      setIdentityMsg(data.message || 'Account lifecycle updated successfully.');
      await updateUserProfile({}, true);
      setTimeout(() => setIdentityMsg(''), 5000);
    } catch (err) {
      setIdentityError(err.message);
    } finally {
      setEmailActionLoading(false);
    }
  };

  // Generate initials avatar
  const initials = (user?.name || user?.full_name || 'U')
    .split(' ')
    .map(w => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-300">
      {/* User Header Profile Card */}
      <div className="rounded-3xl p-6 lg:p-8 border border-pink-200 dark:border-pink-800/40 bg-pink-50/80 dark:bg-pink-950/20 flex flex-col sm:flex-row items-center gap-6 shadow-sm">
        {/* Avatar — use initials since there's no avatar URL in the DB */}
        <div className="w-24 h-24 rounded-2xl ring-4 ring-pink-300 dark:ring-pink-500/40 shadow-md bg-gradient-to-br from-pink-400 to-rose-500 border border-pink-300 flex items-center justify-center">
          <span className="text-3xl font-extrabold text-white font-['Outfit']">{initials}</span>
        </div>
        <div className="text-center sm:text-left space-y-1">
          <h1 className="text-2xl lg:text-3xl font-extrabold text-slate-900 dark:text-white font-['Outfit']">
            {user?.name || user?.full_name || 'Candidate'}
          </h1>
          <p className="text-xs text-slate-600 dark:text-slate-400">{user?.email}</p>
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-2">
            <span className="px-3 py-1 rounded-full bg-pink-100 text-pink-800 dark:bg-pink-900/40 dark:text-pink-300 text-xs font-semibold border border-pink-200 dark:border-pink-700/50">
              {user?.targetRole || user?.target_role || 'Backend Developer'}
            </span>
            <span className="px-3 py-1 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 text-xs font-semibold border border-amber-200 dark:border-amber-700/50 flex items-center gap-1">
              <Flame className="w-3.5 h-3.5 text-amber-600" /> {user?.streakDays || user?.streak_days || 0} Day Streak
            </span>
            <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 text-xs font-semibold border border-emerald-200 dark:border-emerald-700/50">
              {user?.targetLevel || user?.target_level || 'Intermediate'}
            </span>
            <span className="px-3 py-1 rounded-full bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300 text-xs font-bold border border-purple-200 dark:border-purple-700/50 flex items-center gap-1">
              <GraduationCap className="w-3.5 h-3.5 text-purple-600" />
              {user?.account_lifecycle_status || 'ACTIVE_STUDENT'}
            </span>
          </div>
        </div>
      </div>

      {/* DUAL EMAIL IDENTITY & LIFECYCLE CARD */}
      <div className="rounded-3xl p-6 lg:p-8 border border-sky-200 dark:border-sky-800/40 bg-sky-50/60 dark:bg-sky-950/20 space-y-6 shadow-sm">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <h3 className="font-extrabold text-xl text-slate-900 dark:text-white font-['Outfit'] flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-sky-100 text-sky-700 dark:bg-sky-900/50 dark:text-sky-300">
              <ShieldCheck className="w-5 h-5" />
            </div>
            Dual Email Identity &amp; Alumni Continuity
          </h3>
          <span className="text-[11px] font-bold px-3 py-1 rounded-full bg-sky-100 dark:bg-sky-900/50 text-sky-800 dark:text-sky-300">
            One Canonical Account
          </span>
        </div>

        <p className="text-xs text-slate-600 dark:text-slate-400">
          Link both your institutional college email and permanent personal email to one unified JobDM profile. You can log in using either address, and your practice history, coding solutions, and interview portfolio remain yours forever after graduation.
        </p>

        {identityMsg && (
          <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/40 text-emerald-800 dark:text-emerald-300 text-xs font-bold flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" /> {identityMsg}
          </div>
        )}
        {identityError && (
          <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/40 text-rose-800 dark:text-rose-300 text-xs font-bold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" /> {identityError}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* College Email Identity Card */}
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-white/10 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <Building2 className="w-4 h-4 text-sky-600" /> College Email
                </span>
                {user?.college_email ? (
                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 text-[10px] font-black flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Linked &amp; Verified
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 text-[10px] font-bold">
                    Not Linked
                  </span>
                )}
              </div>

              {user?.college_email ? (
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200/60 text-xs font-semibold text-slate-900 dark:text-white">
                  {user.college_email}
                  <p className="text-[10px] text-slate-400 mt-0.5 font-normal">
                    Authorized for college batch enrollment &amp; teacher progress monitoring.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleLinkCollegeEmail} className="space-y-2 mt-2">
                  <input
                    type="email"
                    placeholder="e.g. rollno@piet.edu"
                    value={collegeEmailInput}
                    onChange={(e) => setCollegeEmailInput(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl text-xs border border-slate-300 dark:border-white/10 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white"
                  />
                  <button
                    type="submit"
                    disabled={emailActionLoading}
                    className="w-full py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs shadow-sm transition-all"
                  >
                    Link &amp; Verify College Email
                  </button>
                </form>
              )}
            </div>
          </div>

          {/* Personal Email Identity Card */}
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-white/10 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <Mail className="w-4 h-4 text-purple-600" /> Personal / Recovery Email
                </span>
                {user?.personal_email ? (
                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 text-[10px] font-black flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Linked &amp; Verified
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 text-[10px] font-bold">
                    Not Linked
                  </span>
                )}
              </div>

              {user?.personal_email ? (
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200/60 text-xs font-semibold text-slate-900 dark:text-white">
                  {user.personal_email}
                  <p className="text-[10px] text-slate-400 mt-0.5 font-normal">
                    Permanent identity for account recovery and career communications post-graduation.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleLinkPersonalEmail} className="space-y-2 mt-2">
                  <input
                    type="email"
                    placeholder="e.g. personal@gmail.com"
                    value={personalEmailInput}
                    onChange={(e) => setPersonalEmailInput(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl text-xs border border-slate-300 dark:border-white/10 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white"
                  />
                  <button
                    type="submit"
                    disabled={emailActionLoading}
                    className="w-full py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-sm transition-all"
                  >
                    Link Recovery Email
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>

        {/* Contact Channel & Lifecycle Actions */}
        <div className="pt-4 border-t border-slate-200/80 dark:border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <p className="text-xs font-bold text-slate-900 dark:text-white mb-1">
              Primary Communication Preference
            </p>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                <input
                  type="radio"
                  name="contact_preference"
                  checked={user?.primary_contact_preference === 'PERSONAL'}
                  onChange={() => handleUpdateContactPreference('PERSONAL')}
                  className="text-sky-600 focus:ring-sky-500"
                />
                Personal Email (Career &amp; Placements)
              </label>
              <label className="flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                <input
                  type="radio"
                  name="contact_preference"
                  checked={user?.primary_contact_preference === 'COLLEGE'}
                  onChange={() => handleUpdateContactPreference('COLLEGE')}
                  className="text-sky-600 focus:ring-sky-500"
                />
                College Email (Academic Notices)
              </label>
            </div>
          </div>

          <div>
            {user?.account_lifecycle_status !== 'ALUMNI' ? (
              <button
                type="button"
                onClick={() => handleUpdateLifecycle('ALUMNI')}
                className="px-4 py-2 rounded-xl border border-purple-300 dark:border-purple-700/50 text-purple-700 dark:text-purple-300 hover:bg-purple-100/50 text-xs font-bold transition-all flex items-center gap-1.5"
              >
                <GraduationCap className="w-4 h-4" /> Transition to Alumni Status
              </button>
            ) : (
              <span className="px-3 py-1.5 rounded-xl bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 text-xs font-bold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Verified Alumni Member
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Edit Profile Form */}
      <div className="rounded-3xl p-6 lg:p-8 border border-violet-200 dark:border-violet-800/40 bg-violet-50/60 dark:bg-violet-950/20 space-y-6 shadow-sm">
        <h3 className="font-extrabold text-xl text-slate-900 dark:text-white font-['Outfit'] flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-violet-100 text-violet-700 dark:bg-violet-900/50 dark:text-violet-300">
            <User className="w-5 h-5" />
          </div>
          Candidate Profile &amp; Target Goals
        </h3>

        {saveSuccess && (
          <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/40 text-emerald-800 dark:text-emerald-300 text-xs font-bold flex items-center gap-2 shadow-sm">
            <CheckCircle className="w-4 h-4 text-emerald-600" /> Profile saved to database successfully!
          </div>
        )}
        {saveError && (
          <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/40 text-rose-800 dark:text-rose-300 text-xs font-bold flex items-center gap-2 shadow-sm">
            <AlertCircle className="w-4 h-4 text-rose-600" /> {saveError}
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Full Name */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">
                Full Name
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-600 dark:text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your full name"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl glass-input text-xs"
                />
              </div>
            </div>

            {/* Email (read-only) */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-600 dark:text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="email"
                  value={email}
                  readOnly
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl glass-input text-xs opacity-60 cursor-not-allowed"
                  title="Email cannot be changed"
                />
              </div>
              <p className="text-[10px] text-slate-500 mt-1">Email is your login identifier and cannot be changed.</p>
            </div>

            {/* Target Role */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">
                Target Interview Role
              </label>
              <select
                value={targetRole}
                onChange={(e) => setTargetRole(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl glass-input text-xs text-slate-900 dark:text-white"
              >
                <option value="Backend Developer" className="bg-white dark:bg-slate-900">Backend Developer</option>
                <option value="Frontend Developer" className="bg-white dark:bg-slate-900">Frontend Developer</option>
                <option value="System Design" className="bg-white dark:bg-slate-900">System Design</option>
                <option value="AI / ML Engineer" className="bg-white dark:bg-slate-900">AI / ML Engineer</option>
                <option value="HR &amp; Behavioral" className="bg-white dark:bg-slate-900">HR &amp; Behavioral</option>
                <option value="Data Science" className="bg-white dark:bg-slate-900">Data Science</option>
                <option value="General Software" className="bg-white dark:bg-slate-900">General Software</option>
              </select>
            </div>

            {/* Experience Level */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">
                Experience Level
              </label>
              <select
                value={targetLevel}
                onChange={(e) => setTargetLevel(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl glass-input text-xs text-slate-900 dark:text-white"
              >
                <option value="Beginner" className="bg-white dark:bg-slate-900">Beginner (1-2 YOE)</option>
                <option value="Intermediate" className="bg-white dark:bg-slate-900">Intermediate (3-5 YOE)</option>
                <option value="Advanced" className="bg-white dark:bg-slate-900">Advanced (6+ YOE)</option>
              </select>
            </div>
            
            {/* Preferred Coding Language */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">
                Preferred Interview Language
              </label>
              <select
                value={preferredCodingLanguage}
                onChange={(e) => setPreferredCodingLanguage(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl glass-input text-xs text-slate-900 dark:text-white"
              >
                {PROGRAMMING_LANGUAGES.map(lang => (
                  <option key={lang.id} value={lang.name} className="bg-white dark:bg-slate-900">{lang.name}</option>
                ))}
              </select>
            </div>
          </div>
          
          {/* Interested Practice Languages */}
          <div className="border-t border-slate-300 dark:border-white/10 pt-5 space-y-4">
            <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Code className="w-4 h-4 text-indigo-600 dark:text-indigo-400" /> Interested Practice Languages
            </h4>
            <p className="text-xs text-slate-600 dark:text-slate-400">Select multiple languages you want to practice coding in.</p>
            <div className="flex flex-wrap gap-3">
              {PROGRAMMING_LANGUAGES.map(lang => {
                const isSelected = practiceLanguages.includes(lang.name);
                return (
                  <label key={lang.id} className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="checkbox"
                      checked={isSelected}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setPracticeLanguages([...practiceLanguages, lang.name]);
                        } else {
                          setPracticeLanguages(practiceLanguages.filter(l => l !== lang.name));
                        }
                      }}
                      className="rounded bg-white dark:bg-slate-900 border-slate-400 dark:border-white/20 text-indigo-500 focus:ring-indigo-500 focus:ring-2"
                    />
                    <span className="text-sm text-slate-700 dark:text-slate-300">{lang.name}</span>
                  </label>
                )
              })}
            </div>
          </div>

          {/* Password Change Section */}
          <div className="border-t border-slate-300 dark:border-white/10 pt-5 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Lock className="w-4 h-4 text-indigo-600 dark:text-indigo-400" /> Change Password
                <span className="text-[10px] font-normal text-slate-500">(leave blank to keep current)</span>
              </h4>
              <button
                type="button"
                onClick={() => setShowPasswords(!showPasswords)}
                className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
              >
                {showPasswords ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                {showPasswords ? 'Hide' : 'Show'}
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">Current Password</label>
                <input
                  type={showPasswords ? 'text' : 'password'}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Current password"
                  className="w-full px-4 py-2.5 rounded-xl glass-input text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">New Password</label>
                <input
                  type={showPasswords ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Min 6 characters"
                  className="w-full px-4 py-2.5 rounded-xl glass-input text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">Confirm Password</label>
                <input
                  type={showPasswords ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat new password"
                  className="w-full px-4 py-2.5 rounded-xl glass-input text-xs"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={isSaving}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl glow-btn text-white text-xs font-bold shadow-xl disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? 'Saving to Database...' : 'Save Changes'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Resume Management */}
      <div className="rounded-3xl p-6 lg:p-8 border border-emerald-200 dark:border-emerald-800/40 bg-emerald-50/60 dark:bg-emerald-950/20 space-y-4 shadow-sm">
        <h3 className="font-extrabold text-xl text-slate-900 dark:text-white font-['Outfit'] flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300">
            <Briefcase className="w-5 h-5" />
          </div>
          Active Resume Attachment
        </h3>
        <ResumeUploader
          currentResume={user?.resumeData}
          onResumeParsed={(parsedData) => updateResumeData(parsedData)}
        />
      </div>
    </div>
  );
}
