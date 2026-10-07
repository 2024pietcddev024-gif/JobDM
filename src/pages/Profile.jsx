import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import ResumeUploader from '../components/ResumeUploader';
import { User, Mail, Briefcase, Award, Flame, Save, CheckCircle, AlertCircle, Lock, Eye, EyeOff, Code } from 'lucide-react';

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
      <div className="glass-card rounded-3xl p-6 lg:p-8 border border-white/10 flex flex-col sm:flex-row items-center gap-6">
        {/* Avatar — use initials since there's no avatar URL in the DB */}
        <div className="w-24 h-24 rounded-2xl ring-4 ring-indigo-500/40 shadow-xl bg-gradient-to-br from-indigo-500/30 to-purple-600/30 border border-indigo-500/30 flex items-center justify-center">
          <span className="text-3xl font-extrabold text-white font-['Outfit']">{initials}</span>
        </div>
        <div className="text-center sm:text-left space-y-1">
          <h1 className="text-2xl lg:text-3xl font-extrabold text-white font-['Outfit']">
            {user?.name || user?.full_name || 'Candidate'}
          </h1>
          <p className="text-xs text-slate-400">{user?.email}</p>
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-2">
            <span className="px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-semibold border border-indigo-500/30">
              {user?.targetRole || user?.target_role || 'Backend Developer'}
            </span>
            <span className="px-3 py-1 rounded-full bg-amber-500/20 text-amber-400 text-xs font-semibold border border-amber-500/30 flex items-center gap-1">
              <Flame className="w-3.5 h-3.5" /> {user?.streakDays || user?.streak_days || 0} Day Streak
            </span>
            <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-semibold border border-emerald-500/30">
              {user?.targetLevel || user?.target_level || 'Intermediate'}
            </span>
          </div>
        </div>
      </div>

      {/* Edit Profile Form */}
      <div className="glass-card rounded-3xl p-6 lg:p-8 border border-white/10 space-y-6">
        <h3 className="font-extrabold text-xl text-white font-['Outfit']">Candidate Profile &amp; Target Goals</h3>

        {saveSuccess && (
          <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-xs font-bold flex items-center gap-2">
            <CheckCircle className="w-4 h-4" /> Profile saved to database successfully!
          </div>
        )}
        {saveError && (
          <div className="p-4 rounded-2xl bg-rose-950/40 border border-rose-500/30 text-rose-300 text-xs font-bold flex items-center gap-2">
            <AlertCircle className="w-4 h-4" /> {saveError}
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Full Name */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
                Full Name
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
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
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
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
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
                Target Interview Role
              </label>
              <select
                value={targetRole}
                onChange={(e) => setTargetRole(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl glass-input text-xs text-white"
              >
                <option value="Backend Developer" className="bg-slate-900">Backend Developer</option>
                <option value="Frontend Developer" className="bg-slate-900">Frontend Developer</option>
                <option value="System Design" className="bg-slate-900">System Design</option>
                <option value="AI / ML Engineer" className="bg-slate-900">AI / ML Engineer</option>
                <option value="HR &amp; Behavioral" className="bg-slate-900">HR &amp; Behavioral</option>
                <option value="Data Science" className="bg-slate-900">Data Science</option>
                <option value="General Software" className="bg-slate-900">General Software</option>
              </select>
            </div>

            {/* Experience Level */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
                Experience Level
              </label>
              <select
                value={targetLevel}
                onChange={(e) => setTargetLevel(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl glass-input text-xs text-white"
              >
                <option value="Beginner" className="bg-slate-900">Beginner (1-2 YOE)</option>
                <option value="Intermediate" className="bg-slate-900">Intermediate (3-5 YOE)</option>
                <option value="Advanced" className="bg-slate-900">Advanced (6+ YOE)</option>
              </select>
            </div>
            
            {/* Preferred Coding Language */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
                Preferred Interview Language
              </label>
              <select
                value={preferredCodingLanguage}
                onChange={(e) => setPreferredCodingLanguage(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl glass-input text-xs text-white"
              >
                {PROGRAMMING_LANGUAGES.map(lang => (
                  <option key={lang.id} value={lang.name} className="bg-slate-900">{lang.name}</option>
                ))}
              </select>
            </div>
          </div>
          
          {/* Interested Practice Languages */}
          <div className="border-t border-white/10 pt-5 space-y-4">
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <Code className="w-4 h-4 text-indigo-400" /> Interested Practice Languages
            </h4>
            <p className="text-xs text-slate-400">Select multiple languages you want to practice coding in.</p>
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
                      className="rounded bg-slate-900 border-white/20 text-indigo-500 focus:ring-indigo-500 focus:ring-2"
                    />
                    <span className="text-sm text-slate-300">{lang.name}</span>
                  </label>
                )
              })}
            </div>
          </div>

          {/* Password Change Section */}
          <div className="border-t border-white/10 pt-5 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <Lock className="w-4 h-4 text-indigo-400" /> Change Password
                <span className="text-[10px] font-normal text-slate-500">(leave blank to keep current)</span>
              </h4>
              <button
                type="button"
                onClick={() => setShowPasswords(!showPasswords)}
                className="text-xs text-indigo-400 hover:underline flex items-center gap-1"
              >
                {showPasswords ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                {showPasswords ? 'Hide' : 'Show'}
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">Current Password</label>
                <input
                  type={showPasswords ? 'text' : 'password'}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Current password"
                  className="w-full px-4 py-2.5 rounded-xl glass-input text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">New Password</label>
                <input
                  type={showPasswords ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Min 6 characters"
                  className="w-full px-4 py-2.5 rounded-xl glass-input text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">Confirm Password</label>
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
      <div className="glass-card rounded-3xl p-6 lg:p-8 border border-white/10 space-y-4">
        <h3 className="font-extrabold text-xl text-white font-['Outfit']">Active Resume Attachment</h3>
        <ResumeUploader
          currentResume={user?.resumeData}
          onResumeParsed={(parsedData) => updateResumeData(parsedData)}
        />
      </div>
    </div>
  );
}
