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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const token = localStorage.getItem('interviewiq_token');
        const res = await fetch(`${API_URL}/interviews/leaderboard`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Failed to fetch leaderboard');
        const data = await res.json();
        setLeaderboard(data.leaderboard || []);
        setUserRank(data.userRank || null);
      } catch (err) {
        console.error('[Leaderboard] Fetch error:', err);
        setError('Error: ' + err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchLeaderboard();
  }, []);

  const renderRankIcon = (rank) => {
    if (rank === 1) return <div className="w-8 h-8 rounded-full bg-yellow-500/20 text-yellow-500 flex items-center justify-center font-bold text-lg mx-auto">🥇</div>;
    if (rank === 2) return <div className="w-8 h-8 rounded-full bg-slate-400/20 text-slate-400 flex items-center justify-center font-bold text-lg mx-auto">🥈</div>;
    if (rank === 3) return <div className="w-8 h-8 rounded-full bg-amber-700/20 text-amber-600 flex items-center justify-center font-bold text-lg mx-auto">🥉</div>;
    return <div className="w-8 h-8 rounded-full bg-white/5 text-slate-400 flex items-center justify-center font-bold text-sm mx-auto">#{rank}</div>;
  };

  const currentUserEntry = leaderboard.find(entry => entry.userId === user?.id);

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="text-center max-w-2xl mx-auto space-y-2">
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-semibold">
          <Trophy className="w-3.5 h-3.5" /> Platform Leaderboard
        </div>
        <h1 className="text-3xl lg:text-4xl font-extrabold text-white font-['Outfit'] tracking-tight">
          Top Candidate <span className="gradient-text">Rankings</span>
        </h1>
        <p className="text-sm text-slate-400">
          Rankings are calculated based on overall interview scores, consistency, and technical depth.
        </p>
      </div>

      {/* Global Leaderboard */}
      <div className="glass-card rounded-3xl p-6 lg:p-8 border border-white/10 space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h3 className="font-extrabold text-xl text-white font-['Outfit']">Global Candidate Rankings</h3>
        </div>

        {loading ? (
          <div className="py-12 text-center flex flex-col items-center justify-center space-y-4">
            <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
            <p className="text-sm text-slate-400">Loading global rankings...</p>
          </div>
        ) : error ? (
          <div className="py-12 text-center flex flex-col items-center justify-center space-y-4">
            <AlertCircle className="w-8 h-8 text-red-400" />
            <p className="text-sm text-red-400 font-medium">{error}</p>
          </div>
        ) : leaderboard.length === 0 ? (
          <div className="py-16 text-center space-y-4">
            <div className="w-16 h-16 rounded-3xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto">
              <Award className="w-8 h-8 text-amber-400/60" />
            </div>
            <div>
              <p className="text-lg font-bold text-white font-['Outfit']">No rankings yet</p>
              <p className="text-sm text-slate-400 mt-1 max-w-sm mx-auto">
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
                  <tr className="text-slate-400 border-b border-white/10">
                    <th className="pb-3 px-4 text-center font-medium">Rank</th>
                    <th className="pb-3 px-4 font-medium">Candidate</th>
                    <th className="pb-3 px-4 text-right font-medium">Average Score</th>
                    <th className="pb-3 px-4 text-right font-medium hidden sm:table-cell">Completed</th>
                    <th className="pb-3 px-4 text-right font-medium hidden md:table-cell">Best Score</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {leaderboard.map((entry) => {
                    const isCurrentUser = entry.userId === user?.id;
                    const isTop3 = entry.rank <= 3;
                    return (
                      <tr 
                        key={entry.userId} 
                        className={`transition-colors hover:bg-white/5 ${
                          isCurrentUser ? 'bg-indigo-500/10 hover:bg-indigo-500/20' : ''
                        }`}
                      >
                        <td className="py-4 px-4 text-center">
                          {renderRankIcon(entry.rank)}
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white shadow-inner ${
                                isTop3 ? 'bg-gradient-to-br from-amber-400 to-orange-500' : 'bg-slate-700'
                            }`}>
                              {entry.displayName?.charAt(0)?.toUpperCase() || '?'}
                            </div>
                            <div>
                              <div className="font-bold text-white flex items-center gap-2">
                                {entry.displayName}
                                {isCurrentUser && (
                                  <span className="px-2 py-0.5 rounded text-[10px] bg-indigo-500 text-white font-bold">YOU</span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-4 text-right">
                          <div className="font-bold text-white">{entry.averageScore.toFixed(1)}%</div>
                        </td>
                        <td className="py-4 px-4 text-right hidden sm:table-cell">
                          <div className="text-slate-300">{entry.completedInterviews}</div>
                        </td>
                        <td className="py-4 px-4 text-right hidden md:table-cell">
                          <div className="text-amber-400 font-semibold">{entry.bestScore.toFixed(1)}%</div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {user && userRank && !currentUserEntry && (
              <div className="mt-6 p-4 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center font-bold text-white">
                    {user.full_name?.charAt(0)?.toUpperCase() || '?'}
                  </div>
                  <div>
                    <div className="font-bold text-white flex items-center gap-2">Your Ranking</div>
                    <div className="text-xs text-slate-400">Rank #{userRank.rank} • {userRank.averageScore.toFixed(1)}% Avg</div>
                  </div>
                </div>
              </div>
            )}
            {user && !userRank && (
              <div className="mt-6 p-4 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center font-bold text-white">
                    {user.full_name?.charAt(0)?.toUpperCase() || '?'}
                  </div>
                  <div>
                    <div className="font-bold text-white flex items-center gap-2">Your Ranking</div>
                    <div className="text-xs text-slate-400">Complete an interview to join the leaderboard</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* My Badges */}
      <div className="glass-card rounded-3xl p-6 lg:p-8 border border-white/10 space-y-4">
        <h3 className="font-extrabold text-lg text-white font-['Outfit'] flex items-center gap-2">
          <Star className="w-5 h-5 text-amber-400" /> My Unlocked Badges
        </h3>

        {userBadges.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {userBadges.map((badge) => {
              const Icon = BADGE_ICONS[badge.icon] || Award;
              return (
                <div key={badge.id} className="p-4 rounded-2xl bg-white/5 border border-white/10 text-center space-y-2 group hover:border-amber-500/40 transition-all">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500/20 to-orange-500/20 border border-amber-500/30 flex items-center justify-center mx-auto text-amber-400 group-hover:scale-110 transition-transform">
                    <Icon className="w-6 h-6" />
                  </div>
                  <h4 className="font-bold text-white text-xs">{badge.name}</h4>
                  <p className="text-[10px] text-slate-400">{badge.desc}</p>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-8 text-center space-y-2">
            <Award className="w-10 h-10 text-slate-600 mx-auto" />
            <p className="text-sm font-semibold text-slate-400">No badges earned yet</p>
            <p className="text-xs text-slate-500">Complete interviews to unlock achievement badges.</p>
          </div>
        )}
      </div>
    </div>
  );
}

