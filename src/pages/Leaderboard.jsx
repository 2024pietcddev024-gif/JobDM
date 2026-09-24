import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useInterview } from '../context/InterviewContext';
import { Award, Flame, ShieldCheck, Mic, Code, Trophy, Star, Crown, Lock } from 'lucide-react';

const BADGE_ICONS = { Flame, ShieldCheck, Mic, Code };

export default function Leaderboard({ onNavigate }) {
  const { user } = useAuth();
  const { pastSessions } = useInterview();

  const userBadges = user?.badges || [];
  const totalSessions = pastSessions.length;

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
          Rankings are calculated based on overall interview scores, practice streaks, and technical depth.
        </p>
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

      {/* Global Leaderboard — Coming Soon */}
      <div className="glass-card rounded-3xl p-6 lg:p-8 border border-white/10 space-y-4">
        <h3 className="font-extrabold text-xl text-white font-['Outfit']">Global Candidate Rankings</h3>

        <div className="py-16 text-center space-y-4">
          <div className="w-16 h-16 rounded-3xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto">
            <Lock className="w-8 h-8 text-amber-400/60" />
          </div>
          <div>
            <p className="text-lg font-bold text-white font-['Outfit']">Leaderboard Coming Soon</p>
            <p className="text-sm text-slate-400 mt-1 max-w-sm mx-auto">
              The global leaderboard will show real candidates ranked by their actual interview performance. Complete more interviews to secure your spot.
            </p>
          </div>
          {totalSessions > 0 ? (
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs font-semibold">
              <Crown className="w-4 h-4" />
              You've completed {totalSessions} interview{totalSessions !== 1 ? 's' : ''} — keep going!
            </div>
          ) : (
            <button
              onClick={() => onNavigate?.('new-interview')}
              className="px-6 py-2.5 rounded-xl glow-btn text-white text-xs font-bold shadow-lg"
            >
              Start Your First Interview
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
