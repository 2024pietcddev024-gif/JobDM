import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useInterview } from '../context/InterviewContext';
import { Award, Flame, ShieldCheck, Mic, Code, Trophy, Star, Crown, Lock, Loader2, AlertCircle } from 'lucide-react';
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
const BADGE_ICONS = { Flame, ShieldCheck, Mic, Code };

export default function Leaderboard({ onNavigate }) {
  const { user } = useAuth();
  const { pastSessions } = useInterview();

  const userBadges = user?.badges || [];
  const totalSessions = pastSessions.length;

  const [leaderboard, setLeaderboard] = useState([]);
  const [userRank, setUserRank] = useState(null);
  const [scope, setScope] = useState('college'); // default to strictly college scope
  const [collegeName, setCollegeName] = useState(null);
  const [canToggleScope, setCanToggleScope] = useState(false);
  const [criteriaText, setCriteriaText] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('interviewiq_token');
        const res = await fetch(`${API_URL}/interviews/leaderboard?scope=${scope}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Failed to fetch leaderboard');
        const data = await res.json();
        setLeaderboard(data.leaderboard || []);
        setUserRank(data.userRank || null);
        setCollegeName(data.collegeName || user?.campus?.collegeName || null);
        setCanToggleScope(Boolean(data.canToggleScope));
        setCriteriaText(data.criteria || '');
      } catch (err) {
        console.error('[Leaderboard] Fetch error:', err);
        setError('Error: ' + err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchLeaderboard();
  }, [scope, user]);

  const renderRankIcon = (rank) => {
    if (rank === 1) return <div className="w-8 h-8 rounded-full bg-yellow-500/20 text-yellow-500 flex items-center justify-center font-bold text-lg mx-auto">🥇</div>;
    if (rank === 2) return <div className="w-8 h-8 rounded-full bg-slate-400/20 text-slate-600 dark:text-slate-400 flex items-center justify-center font-bold text-lg mx-auto">🥈</div>;
    if (rank === 3) return <div className="w-8 h-8 rounded-full bg-amber-700/20 text-amber-600 flex items-center justify-center font-bold text-lg mx-auto">🥉</div>;
    return <div className="w-8 h-8 rounded-full bg-white dark:bg-white/5 text-slate-600 dark:text-slate-400 flex items-center justify-center font-bold text-sm mx-auto">#{rank}</div>;
  };

  const currentUserEntry = leaderboard.find(entry => entry.userId === user?.id);

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="text-center max-w-2xl mx-auto space-y-2">
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-amber-100 border border-amber-200 text-amber-800 dark:bg-amber-900/40 dark:border-amber-700/50 dark:text-amber-300 text-xs font-semibold shadow-sm">
          <Trophy className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" /> JobDM Platform Leaderboard
        </div>
        <h1 className="text-3xl lg:text-4xl font-extrabold text-slate-900 dark:text-white font-['Outfit'] tracking-tight">
          Candidate Performance <span className="gradient-text">Rankings</span>
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Rankings are calculated based on verified completed mock interviews (normalized 0-100% scale), practice volume, and peak scores.
        </p>
      </div>

      {/* Leaderboard Table Container */}
      <div className="rounded-3xl p-6 lg:p-8 border border-amber-200 dark:border-amber-800/40 bg-amber-50/70 dark:bg-amber-950/20 space-y-6 shadow-sm">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h3 className="font-extrabold text-xl text-slate-900 dark:text-white font-['Outfit'] flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300">
                <Trophy className="w-5 h-5" />
              </div>
              {collegeName ? `${collegeName} Institutional Leaderboard` : 'Candidate Performance Rankings'}
            </h3>
            {collegeName && (
              <p className="text-xs text-amber-800/80 dark:text-amber-300/80 mt-1 font-medium">
                🔒 Filtered strictly to students enrolled at {collegeName}. Cross-college rankings are protected.
              </p>
            )}
          </div>

          {/* Scope Toggle — Only visible if user has Super-Admin authorization */}
          {canToggleScope && (
            <div className="flex items-center gap-2 bg-white/70 dark:bg-white/5 p-1 rounded-2xl border border-amber-200/70 dark:border-white/10">
              <button
                onClick={() => setScope('platform')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  scope === 'platform'
                    ? 'bg-amber-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                Platform-Wide
              </button>
              <button
                onClick={() => setScope('college')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  scope === 'college'
                    ? 'bg-amber-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                College Roster
              </button>
            </div>
          )}
        </div>

        {/* Scoring Methodology Banner */}
        <div className="p-3.5 rounded-2xl bg-amber-100/60 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-800/50 text-amber-900 dark:text-amber-200 text-xs flex items-center gap-2">
          <Star className="w-4 h-4 text-amber-600 shrink-0" />
          <span>
            <strong>Scoring Methodology:</strong> {criteriaText || 'Ranked by average score on completed mock interviews (100% normalized scale), then total completed sessions count and top score. Incomplete and abandoned sessions are excluded.'}
          </span>
        </div>

        {loading ? (
          <div className="py-12 text-center flex flex-col items-center justify-center space-y-4">
            <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
            <p className="text-sm text-slate-600 dark:text-slate-400">Loading global rankings...</p>
          </div>
        ) : error ? (
          <div className="py-12 text-center flex flex-col items-center justify-center space-y-4">
            <AlertCircle className="w-8 h-8 text-red-400" />
            <p className="text-sm text-red-400 font-medium">{error}</p>
          </div>
        ) : leaderboard.length === 0 ? (
          <div className="py-16 text-center space-y-4">
            <div className="w-16 h-16 rounded-3xl bg-amber-100 border border-amber-200 flex items-center justify-center mx-auto shadow-sm">
              <Award className="w-8 h-8 text-amber-600" />
            </div>
            <div>
              <p className="text-lg font-bold text-slate-900 dark:text-white font-['Outfit']">No rankings yet</p>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 max-w-sm mx-auto">
                Complete your first interview to appear on the global leaderboard.
              </p>
            </div>
            {!totalSessions && (
              <button
                onClick={() => onNavigate?.('new-interview')}
                className="px-6 py-2.5 rounded-xl glow-btn text-white text-xs font-bold shadow-lg">
                Start Your First Interview
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="text-slate-600 dark:text-slate-400 border-b border-amber-200/80 dark:border-white/10 text-xs font-bold uppercase tracking-wider">
                    <th className="pb-3 px-4 text-center font-bold">Rank</th>
                    <th className="pb-3 px-4 font-bold">Candidate</th>
                    <th className="pb-3 px-4 text-right font-bold">Average Score</th>
                    <th className="pb-3 px-4 text-right font-bold hidden sm:table-cell">Completed</th>
                    <th className="pb-3 px-4 text-right font-bold hidden md:table-cell">Best Score</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-amber-200/60 dark:divide-white/5">
                  {leaderboard.map((entry) => {
                    const isCurrentUser = entry.userId === user?.id;
                    const isTop3 = entry.rank <= 3;
                    return (
                      <tr 
                        key={entry.userId} 
                        className={`transition-colors rounded-xl ${
                          isCurrentUser 
                            ? 'bg-amber-100/90 dark:bg-amber-900/40 text-amber-950 dark:text-amber-100 font-semibold' 
                            : 'hover:bg-amber-100/40 dark:hover:bg-white/5'
                        }`}
                      >
                        <td className="py-4 px-4 text-center">
                          {renderRankIcon(entry.rank)}
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-white shadow-sm ${
                                isTop3 ? 'bg-gradient-to-br from-amber-500 to-orange-500' : 'bg-slate-700'
                            }`}>
                              {entry.displayName?.charAt(0)?.toUpperCase() || '?'}
                            </div>
                            <div>
                              <div className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                {entry.displayName}
                                {isCurrentUser && (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] bg-amber-600 text-white font-bold shadow-sm">YOU</span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-4 text-right">
                          <div className="font-bold text-slate-900 dark:text-white">{entry.averageScore.toFixed(1)}%</div>
                        </td>
                        <td className="py-4 px-4 text-right hidden sm:table-cell">
                          <div className="text-slate-700 dark:text-slate-300">{entry.completedInterviews}</div>
                        </td>
                        <td className="py-4 px-4 text-right hidden md:table-cell">
                          <div className="text-amber-700 dark:text-amber-300 font-bold">{entry.bestScore.toFixed(1)}%</div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {user && userRank && !currentUserEntry && (
              <div className="mt-6 p-4 rounded-2xl bg-white dark:bg-white/5 border border-amber-200 dark:border-white/10 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-amber-500 text-white flex items-center justify-center font-bold shadow-sm">
                    {user.full_name?.charAt(0)?.toUpperCase() || '?'}
                  </div>
                  <div>
                    <div className="font-bold text-slate-900 dark:text-white flex items-center gap-2">Your Ranking</div>
                    <div className="text-xs text-slate-600 dark:text-slate-400">Rank #{userRank.rank} • {userRank.averageScore.toFixed(1)}% Avg</div>
                  </div>
                </div>
              </div>
            )}
            {user && !userRank && (
              <div className="mt-6 p-4 rounded-2xl bg-white dark:bg-white/5 border border-amber-200 dark:border-white/10 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-slate-700 text-white flex items-center justify-center font-bold">
                    {user.full_name?.charAt(0)?.toUpperCase() || '?'}
                  </div>
                  <div>
                    <div className="font-bold text-slate-900 dark:text-white flex items-center gap-2">Your Ranking</div>
                    <div className="text-xs text-slate-600 dark:text-slate-400">Complete an interview to join the leaderboard</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* My Badges */}
      <div className="rounded-3xl p-6 lg:p-8 border border-violet-200 dark:border-violet-800/40 bg-violet-50 dark:bg-violet-950/20 space-y-4 shadow-sm">
        <h3 className="font-extrabold text-lg text-slate-900 dark:text-white font-['Outfit'] flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-violet-100 text-violet-700 dark:bg-violet-900/50 dark:text-violet-300">
            <Star className="w-5 h-5" />
          </div>
          My Unlocked Badges
        </h3>

        {userBadges.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {userBadges.map((badge) => {
              const Icon = BADGE_ICONS[badge.icon] || Award;
              return (
                <div key={badge.id} className="p-4 rounded-2xl bg-white dark:bg-white/5 border border-violet-200/80 dark:border-white/10 text-center space-y-2 group hover:border-violet-300 dark:border-violet-500/20 transition-all shadow-sm">
                  <div className="w-12 h-12 rounded-2xl bg-violet-100 text-violet-700 dark:bg-violet-900/50 dark:text-violet-300 border border-violet-200 dark:border-violet-700/50 flex items-center justify-center mx-auto group-hover:scale-110 transition-transform shadow-sm">
                    <Icon className="w-6 h-6" />
                  </div>
                  <h4 className="font-bold text-slate-900 dark:text-white text-xs">{badge.name}</h4>
                  <p className="text-[10px] text-slate-600 dark:text-slate-400">{badge.desc}</p>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-8 text-center space-y-2">
            <Award className="w-10 h-10 text-slate-400 mx-auto" />
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">No badges earned yet</p>
            <p className="text-xs text-slate-500">Complete interviews to unlock achievement badges.</p>
          </div>
        )}
      </div>
    </div>
  );
}

