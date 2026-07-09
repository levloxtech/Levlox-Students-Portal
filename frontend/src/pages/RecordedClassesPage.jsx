import React, { useState, useEffect } from 'react';
import { 
  Play, Lock, FileText, CheckCircle, Calendar, Award, Clock, 
  ArrowRight, ChevronDown, ChevronUp, Download, HelpCircle, 
  Send, User, AlertCircle, BookOpen, Globe, Info
} from 'lucide-react';

/* ── Error Boundary Component ────────────────────── */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("RecordedClassesPage Error Boundary caught an error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ background: 'white', border: '1px solid #E2E8F0', borderRadius: 20, padding: 40, textAlign: 'center', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)', maxWidth: 500, margin: '40px auto' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
            <AlertCircle size={40} color="#EF4444" strokeWidth={1.75} />
          </div>
          <h3 style={{ fontSize: 18, fontWeight: 800, marginBottom: 8, color: '#1E293B' }}>Something went wrong</h3>
          <p style={{ color: '#64748B', fontSize: 14, lineHeight: 1.5, marginBottom: 20 }}>
            An error occurred while loading this page. Please try refreshing or contact support if the issue persists.
          </p>
          <button onClick={() => window.location.reload()} style={{ padding: '10px 20px', background: '#6C3CF0', color: '#fff', border: 'none', borderRadius: 10, cursor: 'pointer', fontWeight: 700, fontSize: 13 }}>
            Reload Page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

const RecordedClassesPage = ({ dashboardData, isPaid: propIsPaid }) => {
  const [courseData, setCourseData] = useState(null);
  const [isPaid, setIsPaid] = useState(propIsPaid);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedModules, setExpandedModules] = useState({});
  const [submitAssignment, setSubmitAssignment] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [submissionText, setSubmissionText] = useState('');

  // Fetch LMS Structure
  useEffect(() => {
    const fetchLMSData = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch('http://localhost:5000/api/student/recorded-classes-lms', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (!response.ok) {
          throw new Error('Failed to load LMS data');
        }
        const data = await response.json();
        setCourseData(data.course);
        setIsPaid(data.isPaid);
        
        // Auto expand first module
        if (data.course?.modules?.length > 0) {
          setExpandedModules({ [data.course.modules[0].id]: true });
        }
      } catch (err) {
        console.error(err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchLMSData();
  }, []);

  const toggleModule = (id) => {
    setExpandedModules(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const handleStartQuiz = (quiz) => {
    if (quiz.locked) return;
    alert(`Starting quiz: ${quiz.name}\nGood luck!`);
  };

  const handleOpenSubmit = (assignment) => {
    if (assignment.locked) return;
    setSubmitAssignment(assignment);
    setSubmissionText('');
  };

  const handleConfirmSubmit = async (e) => {
    e.preventDefault();
    if (!submissionText.trim()) return;
    setSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/assignments/${submitAssignment.id}/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ submission_text: submissionText })
      });
      if (response.ok) {
        alert("Assignment submitted successfully!");
        setSubmitAssignment(null);
        // Refresh local data to show "Submitted"
        setCourseData(prev => {
          const updatedModules = prev.modules.map(mod => {
            const updatedAssignments = mod.assignments.map(ass => {
              if (ass.id === submitAssignment.id) {
                return { ...ass, status: 'Submitted' };
              }
              return ass;
            });
            return { ...mod, assignments: updatedAssignments };
          });
          return { ...prev, modules: updatedModules };
        });
      } else {
        const errData = await response.json();
        alert(errData.message || "Failed to submit assignment");
      }
    } catch (err) {
      console.error(err);
      alert("Error submitting assignment");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 300, gap: 12 }}>
        <div style={{ width: 40, height: 40, border: '4px solid #F3F4F6', borderTopColor: '#6C3CF0', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
        <p style={{ color: '#64748B', fontSize: 14, fontWeight: 600 }}>Loading LMS Course Dashboard...</p>
        <style dangerouslySetInnerHTML={{__html: `
          @keyframes spin { to { transform: rotate(360deg); } }
        `}} />
      </div>
    );
  }

  if (error || !courseData) {
    return (
      <div style={{ textAlign: 'center', padding: '40px 20px', background: 'white', borderRadius: 18, border: '1px solid #E2E8F0', boxShadow: '0 1px 3px 0 rgba(0,0, 0, 0.05)' }}>
        <AlertCircle size={40} color="#EF4444" style={{ margin: '0 auto 12px' }} />
        <h4 style={{ fontWeight: 800, fontSize: 16, color: '#1E293B', marginBottom: 6 }}>Error Loading LMS Data</h4>
        <p style={{ color: '#64748B', fontSize: 13, marginBottom: 16 }}>{error || 'Could not fetch Course details.'}</p>
        <button onClick={() => window.location.reload()} style={{ padding: '8px 18px', background: '#6C3CF0', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}>Try Again</button>
      </div>
    );
  }

  // Count assignments & quizzes completed for stats
  let totalAssignments = 0;
  let completedAssignments = 0;
  let totalQuizzes = 0;
  let completedQuizzes = 0;

  courseData.modules.forEach(m => {
    m.assignments.forEach(a => {
      totalAssignments++;
      if (a.status === 'Submitted' || a.status === 'Graded') completedAssignments++;
    });
    if (m.quiz) {
      totalQuizzes++;
      if (m.quiz.attempts && m.quiz.attempts !== '0/2') completedQuizzes++;
    }
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, paddingBottom: 40, fontFamily: 'inherit' }}>
      
      {/* ── COURSE BANNER ── */}
      <div style={{ 
        background: 'linear-gradient(135deg, #1E1B4B 0%, #312E81 50%, #4338CA 100%)', 
        borderRadius: 20, 
        padding: '32px 40px', 
        color: '#FFFFFF', 
        position: 'relative', 
        overflow: 'hidden',
        boxShadow: '0 10px 25px -5px rgba(67, 56, 202, 0.15), 0 8px 10px -6px rgba(67, 56, 202, 0.15)'
      }}>
        {/* Decorative elements */}
        <div style={{ position: 'absolute', top: '-10%', right: '-5%', width: 300, height: 300, borderRadius: '50%', background: 'radial-gradient(circle, rgba(108,60,240,0.15) 0%, transparent 60%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: '-20%', left: '10%', width: 200, height: 200, borderRadius: '50%', background: 'radial-gradient(circle, rgba(99,102,241,0.1) 0%, transparent 70%)', pointerEvents: 'none' }} />
        
        <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', mdDirection: 'row', justifyContent: 'space-between', gap: 20 }}>
          <div>
            <span style={{ fontSize: 11, fontWeight: 800, background: '#E0E7FF', color: '#4338CA', padding: '4px 12px', borderRadius: 20, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Course Dashboard
            </span>
            <h1 style={{ fontSize: 32, fontWeight: 900, margin: '14px 0 8px', letterSpacing: '-0.8px', color: '#FFFFFF' }}>
              {courseData.title}
            </h1>
            
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginTop: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13.5, color: '#C7D2FE' }}>
                <User size={15} color="#A5B4FC" />
                <span>Trainer: <strong>{courseData.trainer}</strong></span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13.5, color: '#C7D2FE' }}>
                <Award size={15} color="#A5B4FC" />
                <span>Batch: <strong>{courseData.batch}</strong></span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13.5, color: '#C7D2FE' }}>
                <Clock size={15} color="#A5B4FC" />
                <span>Progress: <strong>{courseData.progress}%</strong></span>
              </div>
            </div>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', minWidth: 220 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, fontWeight: 700, color: '#E0E7FF', marginBottom: 6 }}>
              <span>Course Progress</span>
              <span>{courseData.progress}%</span>
            </div>
            {/* Progress bar */}
            <div style={{ height: 8, background: 'rgba(255,255,255,0.15)', borderRadius: 99, overflow: 'hidden', marginBottom: 16 }}>
              <div style={{ height: '100%', width: `${courseData.progress}%`, background: '#FFFFFF', borderRadius: 99 }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5, color: '#C7D2FE', marginBottom: 14 }}>
              <span>{courseData.modules_completed} Modules Completed</span>
              <span>{courseData.modules_remaining} Remaining</span>
            </div>
            
            <button 
              onClick={() => {
                const firstPending = courseData.modules.find(m => m.progress < 100);
                if (firstPending) {
                  toggleModule(firstPending.id);
                  const el = document.getElementById(firstPending.id);
                  if (el) el.scrollIntoView({ behavior: 'smooth' });
                }
              }}
              style={{ 
                background: '#FFFFFF', 
                color: '#4338CA', 
                border: 'none', 
                borderRadius: 12, 
                padding: '10px 18px', 
                fontSize: 13, 
                fontWeight: 800, 
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
                transition: 'all 0.2s'
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 12px -2px rgba(0,0,0,0.15)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0,0,0,0.1)'; }}
            >
              <span>Continue Learning</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* ── MAIN CONTENT GRID ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', lgDirection: 'row', gap: 28 }} className="recorded-lms-grid">
        <style dangerouslySetInnerHTML={{__html: `
          .recorded-lms-grid {
            display: grid;
            grid-template-columns: 1fr;
          }
          @media (min-width: 1024px) {
            .recorded-lms-grid {
              grid-template-columns: 1fr 340px;
            }
          }
        `}} />

        {/* LEFT COLUMN: MODULES & ACCORDIONS */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          
          <h2 style={{ fontSize: 18, fontWeight: 800, color: '#1E293B', margin: '0 0 4px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <BookOpen size={20} color="#6C3CF0" /> Course Modules
          </h2>

          {courseData.modules.map((module) => {
            const isExpanded = !!expandedModules[module.id];
            
            // Build custom module progress bar indicator e.g. ██████████░░░
            const progressBlocks = 12;
            const filledBlocks = Math.round((module.progress / 100) * progressBlocks);
            const emptyBlocks = progressBlocks - filledBlocks;
            const barString = '█'.repeat(filledBlocks) + '░'.repeat(emptyBlocks);

            return (
              <div 
                key={module.id} 
                id={module.id}
                style={{ 
                  background: '#FFFFFF', 
                  border: '1.5px solid #F1F5F9', 
                  borderRadius: 16, 
                  overflow: 'hidden', 
                  boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)',
                  transition: 'all 0.2s'
                }}
              >
                {/* Accordion Trigger */}
                <div 
                  onClick={() => toggleModule(module.id)}
                  style={{ 
                    padding: '20px 24px', 
                    background: isExpanded ? 'rgba(108,60,240,0.02)' : 'transparent',
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center', 
                    cursor: 'pointer',
                    userSelect: 'none',
                    borderBottom: isExpanded ? '1px solid #F1F5F9' : 'none',
                    transition: 'background 0.2s'
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1, marginRight: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 15, fontWeight: 800, color: '#1E293B' }}>{module.title}</span>
                    </div>
                    {/* Progress representation */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, fontFamily: 'monospace', color: '#6C3CF0', fontWeight: 'bold' }}>
                      <span style={{ letterSpacing: 1.5 }}>{barString}</span>
                      <span>{module.progress}%</span>
                    </div>
                  </div>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#64748B', background: '#F1F5F9', padding: '3px 9px', borderRadius: 12 }}>
                      {module.videos.length} videos
                    </span>
                    {isExpanded ? <ChevronUp size={18} color="#64748B" /> : <ChevronDown size={18} color="#64748B" />}
                  </div>
                </div>

                {/* Accordion Content */}
                {isExpanded && (
                  <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
                    
                    {/* Videos Sub-section */}
                    <div>
                      <h4 style={{ fontSize: 13, fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Play size={13} color="#6C3CF0" fill="#6C3CF0" /> Lecture Replays
                      </h4>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        {module.videos.map((vid) => {
                          const hasProgress = vid.watch_progress > 0;
                          
                          return (
                            <div 
                              key={vid.id}
                              style={{ 
                                display: 'flex', 
                                alignItems: 'center', 
                                gap: 16, 
                                padding: 14, 
                                background: '#F8FAFC', 
                                borderRadius: 12,
                                border: '1px solid #E2E8F0',
                                opacity: !vid.locked ? 1 : 0.8,
                                position: 'relative',
                                transition: 'transform 0.15s, box-shadow 0.15s'
                              }}
                              className="video-item-row"
                            >
                              {/* Video Letter Icon / Placeholder */}
                              <div style={{ 
                                width: 50, 
                                height: 50, 
                                borderRadius: 8, 
                                background: 'linear-gradient(135deg, #6C3CF0, #4c22bc)', 
                                display: 'flex', 
                                alignItems: 'center', 
                                justifyContent: 'center',
                                color: '#FFFFFF',
                                fontWeight: 900,
                                fontSize: 16,
                                flexShrink: 0
                              }}>
                                {vid.title[0]}
                              </div>
                              
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <h5 style={{ margin: '0 0 4px', fontSize: 13.5, fontWeight: 700, color: '#1E293B', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {vid.title}
                                </h5>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 11, color: '#64748B' }}>
                                  <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                                    <Clock size={11} /> {vid.duration}
                                  </span>
                                  {vid.completed && (
                                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, color: '#10B981', fontWeight: 700 }}>
                                      <CheckCircle size={11} /> Completed
                                    </span>
                                  )}
                                  {vid.locked && (
                                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, color: '#EF4444', fontWeight: 700 }}>
                                      <Lock size={11} /> Premium Locked
                                    </span>
                                  )}
                                </div>
                                {hasProgress && !vid.locked && (
                                  <div style={{ marginTop: 8 }}>
                                    <div style={{ height: 3, background: '#E2E8F0', borderRadius: 9, overflow: 'hidden' }}>
                                      <div style={{ height: '100%', width: `${vid.watch_progress}%`, background: '#6C3CF0' }} />
                                    </div>
                                  </div>
                                )}
                              </div>

                              <div>
                                {!vid.locked ? (
                                  <button 
                                    onClick={() => window.open(vid.url, '_blank')}
                                    style={{ 
                                      background: '#6C3CF0', 
                                      color: '#FFFFFF', 
                                      border: 'none', 
                                      borderRadius: 8, 
                                      width: 32, 
                                      height: 32, 
                                      display: 'flex', 
                                      alignItems: 'center', 
                                      justifyContent: 'center',
                                      cursor: 'pointer',
                                      boxShadow: '0 2px 4px rgba(108,60,240,0.2)'
                                    }}
                                  >
                                    <Play size={12} fill="#FFFFFF" style={{ marginLeft: 2 }} />
                                  </button>
                                ) : (
                                  <div style={{ 
                                    background: '#F1F5F9', 
                                    borderRadius: 8, 
                                    width: 32, 
                                    height: 32, 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    justifyContent: 'center',
                                    color: '#94A3B8'
                                  }}>
                                    <Lock size={12} />
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Notes Sub-section */}
                    {module.notes?.length > 0 && (
                      <div>
                        <h4 style={{ fontSize: 13, fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                          <FileText size={13} color="#6C3CF0" /> Module Resources & Notes
                        </h4>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10 }}>
                          {module.notes.map((note) => (
                            <div 
                              key={note.id}
                              style={{ 
                                display: 'flex', 
                                alignItems: 'center', 
                                justifySelection: 'space-between',
                                padding: '12px 14px', 
                                background: '#FFFFFF', 
                                border: '1px solid #E2E8F0', 
                                borderRadius: 10,
                                opacity: !note.locked ? 1 : 0.7
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
                                <FileText size={16} color="#6C3CF0" style={{ flexShrink: 0 }} />
                                <span style={{ fontSize: 12.5, fontWeight: 700, color: '#334155', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {note.file_name}
                                </span>
                              </div>
                              
                              {!note.locked ? (
                                <a 
                                  href={note.url} 
                                  target="_blank" 
                                  rel="noreferrer"
                                  style={{ 
                                    background: 'rgba(108,60,240,0.06)', 
                                    color: '#6C3CF0', 
                                    border: 'none', 
                                    borderRadius: 6, 
                                    width: 24, 
                                    height: 24, 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    justifyContent: 'center',
                                    cursor: 'pointer'
                                  }}
                                >
                                  <Download size={11} />
                                </a>
                              ) : (
                                <Lock size={12} color="#94A3B8" />
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Assignment & Quiz Grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
                      
                      {/* Assignment Card */}
                      {module.assignments?.map((assignment) => {
                        const isSubmitted = assignment.status === 'Submitted' || assignment.status === 'Graded';
                        const isLate = assignment.status === 'Late';
                        
                        let badgeBg = '#FEF3C7';
                        let badgeColor = '#D97706';
                        if (isSubmitted) {
                          badgeBg = '#D1FAE5';
                          badgeColor = '#059669';
                        } else if (isLate) {
                          badgeBg = '#FEE2E2';
                          badgeColor = '#DC2626';
                        }

                        return (
                          <div 
                            key={assignment.id}
                            style={{ 
                              background: '#FFFFFF', 
                              border: '1px solid #E2E8F0', 
                              borderRadius: 12, 
                              padding: 16,
                              display: 'flex',
                              flexDirection: 'column',
                              justifyContent: 'space-between',
                              gap: 12,
                              opacity: !assignment.locked ? 1 : 0.7
                            }}
                          >
                            <div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                                <span style={{ fontSize: 10, fontWeight: 800, color: '#6C3CF0', textTransform: 'uppercase', letterSpacing: 0.4 }}>
                                  Assignment
                                </span>
                                <span style={{ fontSize: 9, fontWeight: 800, background: badgeBg, color: badgeColor, padding: '2px 6px', borderRadius: 4 }}>
                                  {assignment.status}
                                </span>
                              </div>
                              <h5 style={{ margin: '0 0 6px', fontSize: 13, fontWeight: 700, color: '#1E293B' }}>
                                {assignment.title}
                              </h5>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 3, fontSize: 11, color: '#64748B' }}>
                                <span>Deadline: <strong>{assignment.deadline}</strong></span>
                                <span>Max Marks: <strong>{assignment.marks} pts</strong></span>
                              </div>
                            </div>

                            {!assignment.locked ? (
                              <button 
                                onClick={() => handleOpenSubmit(assignment)}
                                disabled={isSubmitted}
                                style={{ 
                                  width: '100%', 
                                  padding: '8px', 
                                  background: isSubmitted ? '#F1F5F9' : '#6C3CF0', 
                                  color: isSubmitted ? '#94A3B8' : '#FFFFFF', 
                                  border: 'none', 
                                  borderRadius: 8, 
                                  fontSize: 12, 
                                  fontWeight: 700, 
                                  cursor: isSubmitted ? 'default' : 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  gap: 6
                                }}
                              >
                                <span>{isSubmitted ? 'Submitted ✓' : 'Submit Assignment'}</span>
                              </button>
                            ) : (
                              <button 
                                disabled
                                style={{ 
                                  width: '100%', 
                                  padding: '8px', 
                                  background: '#F1F5F9', 
                                  color: '#94A3B8', 
                                  border: 'none', 
                                  borderRadius: 8, 
                                  fontSize: 12, 
                                  fontWeight: 700,
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  gap: 6
                                }}
                              >
                                <Lock size={11} />
                                <span>Premium Locked</span>
                              </button>
                            )}
                          </div>
                        );
                      })}

                      {/* Quiz Card */}
                      {module.quiz && (
                        <div 
                          style={{ 
                            background: '#FFFFFF', 
                            border: '1px solid #E2E8F0', 
                            borderRadius: 12, 
                            padding: 16,
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'space-between',
                            gap: 12,
                            opacity: !module.quiz.locked ? 1 : 0.7
                          }}
                        >
                          <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                              <span style={{ fontSize: 10, fontWeight: 800, color: '#6C3CF0', textTransform: 'uppercase', letterSpacing: 0.4 }}>
                                Quiz Assessment
                              </span>
                              <span style={{ fontSize: 9.5, fontWeight: 700, color: '#64748B' }}>
                                Attempts: {module.quiz.attempts}
                              </span>
                            </div>
                            <h5 style={{ margin: '0 0 6px', fontSize: 13, fontWeight: 700, color: '#1E293B' }}>
                              {module.quiz.name}
                            </h5>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 3, fontSize: 11, color: '#64748B' }}>
                              <span>Questions: <strong>{module.quiz.questions} Qs</strong></span>
                              <span>Time Limit: <strong>{module.quiz.time}</strong></span>
                            </div>
                          </div>

                          {!module.quiz.locked ? (
                            <button 
                              onClick={() => handleStartQuiz(module.quiz)}
                              style={{ 
                                width: '100%', 
                                padding: '8px', 
                                background: 'transparent', 
                                color: '#6C3CF0', 
                                border: '1.5px solid #6C3CF0', 
                                borderRadius: 8, 
                                fontSize: 12, 
                                fontWeight: 700, 
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: 6,
                                transition: 'all 0.15s'
                              }}
                              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(108,60,240,0.04)' }}
                              onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
                            >
                              <span>Start Quiz</span>
                            </button>
                          ) : (
                            <button 
                              disabled
                              style={{ 
                                width: '100%', 
                                padding: '8px', 
                                background: '#F1F5F9', 
                                color: '#94A3B8', 
                                border: 'none', 
                                borderRadius: 8, 
                                fontSize: 12, 
                                fontWeight: 700,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: 6
                              }}
                            >
                              <Lock size={11} />
                              <span>Premium Locked</span>
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* RIGHT SIDEBAR (Desktop details) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          
          {/* Course Summary Card */}
          <div style={{ 
            background: '#FFFFFF', 
            border: '1.5px solid #F1F5F9', 
            borderRadius: 16, 
            padding: 24, 
            boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)'
          }}>
            <h3 style={{ fontSize: 15, fontWeight: 800, color: '#1E293B', margin: '0 0 16px', borderBottom: '1px solid #F1F5F9', paddingBottom: 12 }}>
              Course Overview
            </h3>

            {/* Circular Progress & Metrics */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, marginBottom: 20 }}>
              <div style={{ position: 'relative', width: 90, height: 90, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {/* SVG Progress Circle */}
                <svg width="90" height="90" viewBox="0 0 36 36" style={{ transform: 'rotate(-90deg)' }}>
                  <circle cx="18" cy="18" r="15.915" fill="none" stroke="#F1F5F9" strokeWidth="3" />
                  <circle 
                    cx="18" cy="18" r="15.915" fill="none" 
                    stroke="#6C3CF0" strokeWidth="3" 
                    strokeDasharray={`${courseData.progress} ${100 - courseData.progress}`} 
                    strokeDashoffset="0" 
                    strokeLinecap="round" 
                  />
                </svg>
                <div style={{ position: 'absolute', fontSize: 16, fontWeight: 900, color: '#1E293B' }}>
                  {courseData.progress}%
                </div>
              </div>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#64748B' }}>Total Completion</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13 }}>
                <span style={{ color: '#64748B' }}>Modules Completed</span>
                <span style={{ fontWeight: 800, color: '#1E293B' }}>{courseData.modules_completed} / {courseData.modules.length}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13 }}>
                <span style={{ color: '#64748B' }}>Assignments Completed</span>
                <span style={{ fontWeight: 800, color: '#1E293B' }}>{completedAssignments} / {totalAssignments}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13 }}>
                <span style={{ color: '#64748B' }}>Quizzes Completed</span>
                <span style={{ fontWeight: 800, color: '#1E293B' }}>{completedQuizzes} / {totalQuizzes}</span>
              </div>
            </div>

            <div style={{ borderTop: '1px solid #F1F5F9', paddingTop: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#334155' }}>
                <Award size={15} color="#6C3CF0" />
                <span>Certificates: <strong>Pending Completion</strong></span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#334155' }}>
                <Clock size={15} color="#6C3CF0" />
                <span>Course Duration: <strong>{courseData.duration}</strong></span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#334155' }}>
                <Calendar size={15} color="#6C3CF0" />
                <span>Last Updated: <strong>{courseData.last_updated}</strong></span>
              </div>
            </div>
          </div>

          {/* Locked status banner if unpaid */}
          {!isPaid && (
            <div style={{ 
              background: 'linear-gradient(135deg, #FEF2F2 0%, #FEE2E2 100%)', 
              border: '1.5px solid #FCA5A5', 
              borderRadius: 16, 
              padding: 20,
              display: 'flex',
              flexDirection: 'column',
              gap: 12
            }}>
              <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <Lock size={20} color="#EF4444" style={{ flexShrink: 0, marginTop: 2 }} />
                <div>
                  <h4 style={{ margin: 0, fontSize: 13.5, fontWeight: 800, color: '#991B1B' }}>Premium Access Locked</h4>
                  <p style={{ margin: '4px 0 0', fontSize: 12, color: '#B91C1C', lineHeight: 1.45 }}>
                    Your materials, quizzes, and videos are currently locked. Pay course fees to unlock immediate access.
                  </p>
                </div>
              </div>
              <div style={{ 
                background: 'rgba(239, 68, 68, 0.08)', 
                border: '1px solid rgba(239, 68, 68, 0.2)', 
                borderRadius: 8, 
                padding: '8px 12px', 
                fontSize: 11.5, 
                fontWeight: 700, 
                color: '#EF4444', 
                textAlign: 'center' 
              }}>
                Unlock after Fees Payment
              </div>
            </div>
          )}

        </div>
      </div>

      {/* ── MOCK INTERVIEW SECTION ── */}
      <div style={{ 
        background: '#FFFFFF', 
        border: '1.5px solid #F1F5F9', 
        borderRadius: 16, 
        padding: 24, 
        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)',
        marginTop: 8
      }}>
        <h3 style={{ fontSize: 15, fontWeight: 800, color: '#1E293B', margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Award size={18} color="#6C3CF0" /> Mock Interview Status
        </h3>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
          {courseData.mock_interviews?.map((interview) => {
            const isCompleted = interview.status === 'Completed';
            return (
              <div 
                key={interview.number}
                style={{ 
                  background: '#F8FAFC', 
                  border: '1px solid #E2E8F0', 
                  borderRadius: 12, 
                  padding: 18,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 12
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 13, fontWeight: 800, color: '#1E293B' }}>
                    Mock Interview #{interview.number}
                  </span>
                  <span style={{ 
                    fontSize: 9.5, 
                    fontWeight: 800, 
                    background: isCompleted ? '#D1FAE5' : '#E0E7FF', 
                    color: isCompleted ? '#059669' : '#4338CA', 
                    padding: '3px 8px', 
                    borderRadius: 20 
                  }}>
                    {interview.status}
                  </span>
                </div>

                <div style={{ fontSize: 12.5, color: '#64748B', display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <span>Score: <strong style={{ color: isCompleted ? '#10B981' : '#64748B' }}>{interview.score}</strong></span>
                  <span>Feedback: <em style={{ color: '#475569', display: 'block', marginTop: 4 }}>"{interview.feedback}"</em></span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── RESOURCES & DOWNLOADS SECTION ── */}
      <div style={{ 
        background: '#FFFFFF', 
        border: '1.5px solid #F1F5F9', 
        borderRadius: 16, 
        padding: 24, 
        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)',
        marginTop: 8
      }}>
        <h3 style={{ fontSize: 15, fontWeight: 800, color: '#1E293B', margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Download size={18} color="#6C3CF0" /> General Downloads & Links
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
          {courseData.resources?.map((res, i) => {
            const isGitHub = res.type === 'GitHub Repository';
            const IconComponent = isGitHub ? Globe : FileText;

            return (
              <div 
                key={i}
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between',
                  padding: 16, 
                  background: '#F8FAFC', 
                  border: '1px solid #E2E8F0', 
                  borderRadius: 12,
                  opacity: isPaid ? 1 : 0.7
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0, flex: 1 }}>
                  <div style={{ 
                    width: 36, 
                    height: 36, 
                    borderRadius: 8, 
                    background: 'rgba(108,60,240,0.06)', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    color: '#6C3CF0',
                    flexShrink: 0
                  }}>
                    <IconComponent size={16} />
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#1E293B', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {res.title}
                    </p>
                    <p style={{ margin: '2px 0 0', fontSize: 11, color: '#64748B' }}>
                      {res.type}
                    </p>
                  </div>
                </div>

                {isPaid ? (
                  <button 
                    onClick={() => window.open(res.url, '_blank')}
                    style={{ 
                      background: '#6C3CF0', 
                      color: '#FFFFFF', 
                      border: 'none', 
                      borderRadius: 8, 
                      padding: '8px 12px',
                      fontSize: 11.5,
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4
                    }}
                  >
                    <span>Download</span>
                    <Download size={11} />
                  </button>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 700, color: '#94A3B8' }}>
                    <Lock size={12} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* SUBMIT ASSIGNMENT OVERLAY MODAL */}
      {submitAssignment && (
        <div style={{ 
          position: 'fixed', 
          inset: 0, 
          background: 'rgba(15, 23, 42, 0.4)', 
          backdropFilter: 'blur(4px)',
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          zIndex: 9999,
          padding: 20
        }}>
          <div style={{ 
            background: '#FFFFFF', 
            borderRadius: 16, 
            width: '100%', 
            maxWidth: 500, 
            padding: 28, 
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)'
          }}>
            <h3 style={{ fontSize: 16.5, fontWeight: 800, color: '#1E293B', margin: '0 0 8px' }}>
              Submit: {submitAssignment.title}
            </h3>
            <p style={{ fontSize: 12.5, color: '#64748B', margin: '0 0 20px' }}>
              Paste your solution code, GitHub repository link, or host URL below.
            </p>

            <form onSubmit={handleConfirmSubmit}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 20 }}>
                <label style={{ fontSize: 11.5, fontWeight: 700, color: '#475569' }}>Submission Link or Text</label>
                <textarea 
                  value={submissionText} 
                  onChange={e => setSubmissionText(e.target.value)} 
                  required
                  placeholder="https://github.com/username/project-repo..."
                  style={{ 
                    height: 120, 
                    resize: 'none', 
                    borderRadius: 10, 
                    border: '1.5px solid #E2E8F0', 
                    padding: 12,
                    fontSize: 13,
                    fontFamily: 'inherit',
                    outline: 'none'
                  }} 
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
                <button 
                  type="button" 
                  onClick={() => setSubmitAssignment(null)}
                  style={{ 
                    padding: '8px 16px', 
                    background: '#F1F5F9', 
                    color: '#475569', 
                    border: 'none', 
                    borderRadius: 8, 
                    fontSize: 12.5, 
                    fontWeight: 700, 
                    cursor: 'pointer' 
                  }}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={submitting}
                  style={{ 
                    padding: '8px 20px', 
                    background: '#6C3CF0', 
                    color: '#FFFFFF', 
                    border: 'none', 
                    borderRadius: 8, 
                    fontSize: 12.5, 
                    fontWeight: 700, 
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6
                  }}
                >
                  {submitting ? 'Submitting...' : 'Confirm Submission'}
                  <Send size={11} />
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

const RecordedClassesPageWithErrorBoundary = (props) => {
  return (
    <ErrorBoundary>
      <RecordedClassesPage {...props} />
    </ErrorBoundary>
  );
};

export default RecordedClassesPageWithErrorBoundary;
