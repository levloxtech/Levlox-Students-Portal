import React, { useState, useEffect } from 'react';
import { 
  Crown, Award, Star, Flame, Zap, Trophy,
  Users, Calendar, Filter, Mic, ClipboardList, MessageSquare
} from 'lucide-react';

const API_BASE = 'http://localhost:5000/api';

const CustomPodiumMedal = ({ rank, size = 22 }) => {
  const colors = {
    1: { primary: '#F59E0B', ribbon: '#3B82F6' },
    2: { primary: '#94A3B8', ribbon: '#3B82F6' },
    3: { primary: '#B45309', ribbon: '#3B82F6' }
  };
  
  const activeColor = colors[rank] || colors[1];
  
  return (
    <svg width={size} height={size + 6} viewBox="0 0 24 30" fill="none" style={{ display: 'inline-block', verticalAlign: 'middle' }}>
      <path d="M6 2L12 14L18 2" stroke={activeColor.ribbon} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M10 2L12 10L14 2" stroke="#1D4ED8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="12" cy="18" r="7" fill={activeColor.primary} stroke="#FFF" strokeWidth="1.5" />
      <text x="12" y="20.5" fill="#FFF" fontSize="8" fontWeight="900" textAnchor="middle" fontFamily="sans-serif">
        {rank}
      </text>
    </svg>
  );
};

const LeaderboardPage = ({ token, user }) => {
  const [activeTab, setActiveTab] = useState('overall');
  const [leaderboardData, setLeaderboardData] = useState([]);
  const [loading, setLoading] = useState(false);
  
  useEffect(() => {
    fetchLeaderboard();
  }, [activeTab]);

  const fetchLeaderboard = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        month: 'all',
        week: 'all'
      });
      
      const endpoint = `${API_BASE}/student/leaderboard/${activeTab === 'activity' ? 'live-class-activity' : activeTab}`;
      const res = await fetch(`${endpoint}?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setLeaderboardData(data || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const getBadgeIcon = (badge) => {
    if (!badge) return <Award size={14} color="#10B981" />;
    const normalized = badge.toLowerCase();
    if (normalized.includes("champion")) return <Crown size={14} color="#F59E0B" />;
    if (normalized.includes("top performer")) return <Flame size={14} color="#EF4444" />;
    if (normalized.includes("rising star")) return <Star size={14} color="#FBBF24" />;
    if (normalized.includes("fast learner")) return <Zap size={14} color="#3B82F6" />;
    return <Award size={14} color="#10B981" />;
  };

  const topThree = leaderboardData.slice(0, 3);
  const totalStudents = leaderboardData.length;
  const currentStudentRank = leaderboardData.findIndex(s => s.is_current) + 1;

  return (
    <div className="animate-fade-in" style={{ padding: '4px 0' }}>
      
      {/* Header */}
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h2 style={{ fontSize: 24, fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>LMS Leaderboard</h2>
          <p style={{ margin: '4px 0 0', fontSize: 13.5, color: 'var(--text-secondary)' }}>
            Track learning milestones, mock interview performance, and active live session ranking.
          </p>
        </div>

        {/* Global Summary Badge */}
        <div style={{ display: 'flex', gap: 12 }}>
          <div style={{ background: 'var(--primary-light)', border: '1px solid var(--primary-border)', borderRadius: 14, padding: '8px 16px', display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 90 }}>
            <span style={{ fontSize: 18, fontWeight: 800, color: 'var(--primary-color)' }}>{currentStudentRank > 0 ? `#${currentStudentRank}` : '-'}</span>
            <span style={{ fontSize: 10, color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: 0.5 }}>Your Rank</span>
          </div>
          <div style={{ background: 'var(--surface-alt)', border: '1px solid var(--border-color)', borderRadius: 14, padding: '8px 16px', display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 90 }}>
            <span style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)' }}>{totalStudents}</span>
            <span style={{ fontSize: 10, color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: 0.5 }}>Total Users</span>
          </div>
        </div>
      </div>



      {/* TOP PODIUM */}
      {leaderboardData.length > 0 && (
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', 
          gap: 20, 
          marginBottom: 28 
        }}>
          {/* 2nd Place */}
          {topThree[1] && (
            <div style={{
              background: 'white',
              border: '1.5px solid var(--border-color)',
              borderTop: '4px solid #94A3B8',
              borderRadius: 18,
              padding: 20,
              textAlign: 'center',
              boxShadow: 'var(--shadow-card)',
              position: 'relative'
            }}>
              <span style={{ position: 'absolute', top: 14, right: 16 }}>
                <CustomPodiumMedal rank={2} size={24} />
              </span>
              <div style={{ width: 54, height: 54, borderRadius: '50%', background: '#F1F5F9', border: '2px solid #94A3B8', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', fontSize: 18, fontWeight: 800 }}>
                {topThree[1].profile_pic ? <img src={topThree[1].profile_pic} alt="avatar" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} /> : (topThree[1].name?.[0] || 'S')}
              </div>
              <h4 style={{ margin: '0 0 4px', fontSize: 15, fontWeight: 800 }}>{topThree[1].name}</h4>
              <p style={{ margin: '0 0 10px', fontSize: 11.5, color: 'var(--text-secondary)', fontWeight: 700 }}>2nd Performer</p>
              <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--primary-color)', background: 'var(--primary-light)', padding: '5px 12px', borderRadius: 20 }}>
                {activeTab === 'overall' ? `${topThree[1].overall_score} pts` : activeTab === 'mock' ? `${topThree[1].average_score}% Avg` : activeTab === 'tasks' ? `${topThree[1].completed_assignments} Tasks` : `${topThree[1].activity_points} pts`}
              </span>
            </div>
          )}

          {/* 1st Place */}
          {topThree[0] && (
            <div style={{
              background: 'white',
              border: '1.5px solid var(--border-color)',
              borderTop: '4px solid #F59E0B',
              borderRadius: 18,
              padding: 20,
              textAlign: 'center',
              boxShadow: 'var(--shadow-lg)',
              position: 'relative',
              transform: 'scale(1.03)',
              zIndex: 2
            }}>
              <span style={{ position: 'absolute', top: 14, right: 16 }}>
                <CustomPodiumMedal rank={1} size={24} />
              </span>
              <div style={{ width: 62, height: 62, borderRadius: '50%', background: '#FEF3C7', border: '3px solid #F59E0B', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', fontSize: 20, fontWeight: 900, position: 'relative' }}>
                <Crown size={16} color="#F59E0B" style={{ position: 'absolute', top: -14, left: 'calc(50% - 8px)' }} />
                {topThree[0].profile_pic ? <img src={topThree[0].profile_pic} alt="avatar" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} /> : (topThree[0].name?.[0] || 'S')}
              </div>
              <h4 style={{ margin: '0 0 4px', fontSize: 16, fontWeight: 800 }}>{topThree[0].name}</h4>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, margin: '12px 0 0', width: '100%' }}>
                <span style={{ fontSize: 11.5, color: '#D97706', fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap' }}>
                  🏆 Batch Champion
                </span>
                <span style={{ fontSize: 13, fontWeight: 800, color: 'white', background: 'var(--primary-color)', padding: '5px 12px', borderRadius: 20, boxShadow: '0 4px 10px rgba(108,60,240,0.2)', flexShrink: 0 }}>
                  {activeTab === 'overall' ? `${topThree[0].overall_score} pts` : activeTab === 'mock' ? `${topThree[0].average_score}% Avg` : activeTab === 'tasks' ? `${topThree[0].completed_assignments} Tasks` : `${topThree[0].activity_points} pts`}
                </span>
              </div>
            </div>
          )}

          {/* 3rd Place */}
          {topThree[2] && (
            <div style={{
              background: 'white',
              border: '1.5px solid var(--border-color)',
              borderTop: '4px solid #B45309',
              borderRadius: 18,
              padding: 20,
              textAlign: 'center',
              boxShadow: 'var(--shadow-card)',
              position: 'relative'
            }}>
              <span style={{ position: 'absolute', top: 14, right: 16 }}>
                <CustomPodiumMedal rank={3} size={24} />
              </span>
              <div style={{ width: 54, height: 54, borderRadius: '50%', background: '#FAF8F5', border: '2px solid #B45309', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', fontSize: 18, fontWeight: 800 }}>
                {topThree[2].profile_pic ? <img src={topThree[2].profile_pic} alt="avatar" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} /> : (topThree[2].name?.[0] || 'S')}
              </div>
              <h4 style={{ margin: '0 0 4px', fontSize: 15, fontWeight: 800 }}>{topThree[2].name}</h4>
              <p style={{ margin: '0 0 10px', fontSize: 11.5, color: 'var(--text-secondary)', fontWeight: 700 }}>3rd Performer</p>
              <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--primary-color)', background: 'var(--primary-light)', padding: '5px 12px', borderRadius: 20 }}>
                {activeTab === 'overall' ? `${topThree[2].overall_score} pts` : activeTab === 'mock' ? `${topThree[2].average_score}% Avg` : activeTab === 'tasks' ? `${topThree[2].completed_assignments} Tasks` : `${topThree[2].activity_points} pts`}
              </span>
            </div>
          )}
        </div>
      )}

      {/* TABS CONTAINER */}
      <div style={{ display: 'flex', borderBottom: '2.5px solid var(--border-color)', marginBottom: 24, gap: 16, overflowX: 'auto', paddingBottom: 2 }}>
        {[
          { id: 'overall', label: 'Overall Ranking', icon: <Trophy size={18} /> },
          { id: 'mock', label: 'Mock Interview', icon: <Mic size={18} /> },
          { id: 'tasks', label: 'Assignments', icon: <ClipboardList size={18} /> },
          { id: 'activity', label: 'Live Class Activity', icon: <MessageSquare size={18} /> }
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            style={{
              padding: '10px 18px',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === t.id ? '3px solid var(--primary-color)' : '3px solid transparent',
              color: activeTab === t.id ? 'var(--primary-color)' : 'var(--text-secondary)',
              fontSize: 13.5,
              fontWeight: 800,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              fontFamily: 'inherit',
              transition: 'all 0.15s',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6
            }}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {/* LIST TABLE VIEW */}
      <div style={{
        background: 'white',
        border: '1.5px solid var(--border-color)',
        borderRadius: 20,
        boxShadow: 'var(--shadow-card)',
        overflow: 'hidden'
      }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-secondary)', fontWeight: 600 }}>
            Recalculating and sorting rankings...
          </div>
        ) : leaderboardData.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-secondary)' }}>
            <Trophy size={32} style={{ opacity: 0.3, marginBottom: 8 }} />
            <p style={{ margin: 0, fontWeight: 600 }}>No ranks found matching the filters.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: 'var(--surface-alt)', borderBottom: '1.5px solid var(--border-color)' }}>
                  <th style={{ padding: '16px 24px', fontSize: 11, fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Rank</th>
                  <th style={{ padding: '16px 24px', fontSize: 11, fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Student</th>
                  {activeTab === 'overall' && (
                    <>
                      <th style={{ padding: '16px 24px', fontSize: 11, fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Batch</th>
                      <th style={{ padding: '16px 24px', fontSize: 11, fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Badge / Reward</th>
                      <th style={{ padding: '16px 24px', fontSize: 11, fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', textAlign: 'right' }}>Total Score</th>
                    </>
                  )}
                  {activeTab === 'mock' && (
                    <>
                      <th style={{ padding: '16px 24px', fontSize: 11, fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Completed Interviews</th>
                      <th style={{ padding: '16px 24px', fontSize: 11, fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Highest Score</th>
                      <th style={{ padding: '16px 24px', fontSize: 11, fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', textAlign: 'right' }}>Average Score</th>
                    </>
                  )}
                  {activeTab === 'tasks' && (
                    <>
                      <th style={{ padding: '16px 24px', fontSize: 11, fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Completed Tasks</th>
                      <th style={{ padding: '16px 24px', fontSize: 11, fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Submission Rate</th>
                      <th style={{ padding: '16px 24px', fontSize: 11, fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Late Submissions</th>
                      <th style={{ padding: '16px 24px', fontSize: 11, fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', textAlign: 'right' }}>Assignment Score</th>
                    </>
                  )}
                  {activeTab === 'activity' && (
                    <>
                      <th style={{ padding: '16px 24px', fontSize: 11, fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', textAlign: 'right' }}>Activity Score</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {leaderboardData.map((row, index) => {
                  const medal = (row.rank === 1 || row.rank === 2 || row.rank === 3)
                    ? <CustomPodiumMedal rank={row.rank} size={22} />
                    : `#${row.rank}`;
                  const rankColor = row.rank === 1 ? '#D97706' : row.rank === 2 ? '#64748B' : row.rank === 3 ? '#B45309' : 'var(--text-secondary)';
                  
                  return (
                    <tr
                      key={row.student_id}
                      style={{
                        borderBottom: '1px solid var(--border-color)',
                        background: row.is_current ? 'rgba(108,60,240,0.04)' : 'transparent',
                        borderLeft: row.is_current ? '4.5px solid var(--primary-color)' : '4.5px solid transparent',
                        transition: 'background 0.15s'
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = row.is_current ? 'rgba(108,60,240,0.06)' : 'var(--surface-alt)'}
                      onMouseLeave={e => e.currentTarget.style.background = row.is_current ? 'rgba(108,60,240,0.04)' : 'transparent'}
                    >
                      {/* Rank Column */}
                      <td style={{ padding: '16px 24px', fontSize: 14, fontWeight: 800, color: rankColor, display: 'flex', alignItems: 'center', height: 42 }}>
                        {medal}
                      </td>

                      {/* Student Profile Column */}
                      <td style={{ padding: '16px 24px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800, flexShrink: 0 }}>
                            {row.profile_pic ? <img src={row.profile_pic} alt="" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} /> : (row.name?.[0]?.toUpperCase() || 'S')}
                          </div>
                          <div>
                            <span style={{ fontSize: 13.5, fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                              {row.name} {row.is_current && <span style={{ fontSize: 10, background: 'var(--primary-color)', color: 'white', padding: '1px 6px', borderRadius: 4 }}>You</span>}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Overall Tab columns */}
                      {activeTab === 'overall' && (
                        <>
                          <td style={{ padding: '16px 24px', fontSize: 13, color: 'var(--text-secondary)', fontWeight: 600 }}>
                            {row.batch}
                          </td>
                          <td style={{ padding: '16px 24px' }}>
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11.5, fontWeight: 700, color: 'var(--text-primary)', background: 'var(--surface-alt)', padding: '4px 10px', borderRadius: 12, border: '1px solid var(--border-color)' }}>
                              {getBadgeIcon(row.badge)} {row.badge ? row.badge.replace(/[^\w\s]/g, '').trim() : 'Consistent Student'}
                            </div>
                          </td>
                          <td style={{ padding: '16px 24px', fontSize: 14, fontWeight: 800, color: 'var(--primary-color)', textAlign: 'right' }}>
                            {row.overall_score} pts
                          </td>
                        </>
                      )}

                      {/* Mock Tab columns */}
                      {activeTab === 'mock' && (
                        <>
                          <td style={{ padding: '16px 24px', fontSize: 13, color: 'var(--text-secondary)', fontWeight: 600 }}>
                            {row.completed_interviews} Interviews
                          </td>
                          <td style={{ padding: '16px 24px', fontSize: 13, color: 'var(--text-secondary)', fontWeight: 700 }}>
                            Best {row.highest_score}%
                          </td>
                          <td style={{ padding: '16px 24px', fontSize: 14, fontWeight: 800, color: 'var(--primary-color)', textAlign: 'right' }}>
                            {row.average_score}%
                          </td>
                        </>
                      )}

                      {/* Tasks Tab columns */}
                      {activeTab === 'tasks' && (
                        <>
                          <td style={{ padding: '16px 24px', fontSize: 13, color: 'var(--text-secondary)', fontWeight: 600 }}>
                            {row.completed_assignments} Tasks
                          </td>
                          <td style={{ padding: '16px 24px', fontSize: 13, color: 'var(--text-secondary)', fontWeight: 700 }}>
                            {row.submission_rate}%
                          </td>
                          <td style={{ padding: '16px 24px', fontSize: 13, color: '#EF4444', fontWeight: 600 }}>
                            {row.late_submission_count} late
                          </td>
                          <td style={{ padding: '16px 24px', fontSize: 14, fontWeight: 800, color: 'var(--primary-color)', textAlign: 'right' }}>
                            {row.assignment_score}%
                          </td>
                        </>
                      )}

                      {/* Activity Tab columns */}
                      {activeTab === 'activity' && (
                        <>
                          <td style={{ padding: '16px 24px', fontSize: 14, fontWeight: 800, color: 'var(--primary-color)', textAlign: 'right' }}>
                            {row.activity_points} pts
                          </td>
                        </>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
};

export default LeaderboardPage;
