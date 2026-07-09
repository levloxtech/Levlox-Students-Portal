import React, { useState, useEffect } from 'react';
import { 
  Play, Lock, FileText, CheckCircle, Calendar, Award, Clock, 
  ArrowRight, ArrowLeft, ChevronDown, ChevronUp, Download, HelpCircle, 
  Send, User, AlertCircle, BookOpen, Globe, Info, CheckSquare, Square
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
    console.error("RecordedClassesPage caught an error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ background: 'white', border: '1px solid #E2E8F0', borderRadius: 20, padding: 40, textAlign: 'center', maxWidth: 500, margin: '40px auto' }}>
          <AlertCircle size={40} color="#EF4444" style={{ margin: '0 auto 16px' }} />
          <h3 style={{ fontSize: 18, fontWeight: 800, marginBottom: 8, color: '#1E293B' }}>Something went wrong</h3>
          <button onClick={() => window.location.reload()} style={{ padding: '10px 20px', background: '#6C3CF0', color: '#fff', border: 'none', borderRadius: 10, cursor: 'pointer', fontWeight: 700 }}>
            Reload Page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

const RecordedClassesPage = ({ initialCourseId = null, initialLessonId = null }) => {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Navigation State
  const [selectedCourseId, setSelectedCourseId] = useState(null);
  
  // Course Player State
  const [playerModules, setPlayerModules] = useState([]);
  const [activeLesson, setActiveLesson] = useState(null);
  const [playerLoading, setPlayerLoading] = useState(false);
  const [expandedModules, setExpandedModules] = useState({});
  const [isPaid, setIsPaid] = useState(false);
  
  // Submission Modals
  const [submitAssignment, setSubmitAssignment] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [submissionText, setSubmissionText] = useState('');

  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    setIsPlaying(false);
  }, [activeLesson]);

  // Fetch Courses Overview (Page 1)
  const fetchCourses = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/student/recorded-courses', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Failed to load courses');
      const data = await response.json();
      setCourses(data.courses || []);
      setIsPaid(data.isPaid);
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCourses();
  }, []);

  // Auto deep-link: if Dashboard passes a lesson/course, jump straight into the player
  useEffect(() => {
    if (initialCourseId && !loading) {
      loadCoursePlayer(initialCourseId, initialLessonId);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]);

  // Fetch Player Data (Page 2)
  // targetLessonId: optional — if provided, auto-select that specific lesson
  const loadCoursePlayer = async (courseId, targetLessonId = null) => {
    setPlayerLoading(true);
    setSelectedCourseId(courseId);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/student/recorded-courses/${courseId}/player`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      const modules = data.modules || [];
      setPlayerModules(modules);
      setIsPaid(data.isPaid);

      // Find the lesson to highlight (by targetLessonId, or fall back to first)
      let selectedLesson = null;
      let expandMap = {};

      for (const mod of modules) {
        for (const les of mod.lessons || []) {
          if (targetLessonId && les.id === targetLessonId) {
            selectedLesson = les;
            expandMap[mod.id] = true;
            break;
          }
        }
        if (selectedLesson) break;
      }

      // If no match, fall back to first lesson
      if (!selectedLesson && modules.length > 0) {
        expandMap[modules[0].id] = true;
        if (modules[0].lessons?.length > 0) {
          selectedLesson = modules[0].lessons[0];
        }
      }

      setExpandedModules(expandMap);
      setActiveLesson(selectedLesson);
    } catch (err) {
      console.error(err);
      alert("Error loading player curriculum: " + err.message);
    } finally {
      setPlayerLoading(false);
    }
  };

  // Mark Lesson Completed
  const handleMarkCompleted = async (lesson) => {
    if (!lesson || lesson.locked) return;
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/lessons/${lesson.id}/complete`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        // Update local state
        setPlayerModules(prevModules => 
          prevModules.map(m => ({
            ...m,
            lessons: m.lessons.map(l => l.id === lesson.id ? { ...l, completed: true } : l)
          }))
        );
        setActiveLesson(prev => prev.id === lesson.id ? { ...prev, completed: true } : prev);
        
        // Reload course list metrics silently
        fetchCourses();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleStartQuiz = (quiz) => {
    if (!quiz || quiz.locked) return;
    alert(`Starting Quiz: ${quiz}\nGood Luck!`);
  };

  const handleOpenSubmit = (assignment) => {
    if (!assignment || assignment.locked) return;
    setSubmitAssignment({ id: activeLesson.id, title: assignment });
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
      } else {
        alert("Failed to submit assignment");
      }
    } catch (err) {
      console.error(err);
      alert("Submission error");
    } finally {
      setSubmitting(false);
    }
  };

  // Lesson Nav helpers
  const getAllLessons = () => {
    const list = [];
    playerModules.forEach(m => {
      m.lessons.forEach(l => {
        list.push(l);
      });
    });
    return list;
  };

  const handlePrevLesson = () => {
    const list = getAllLessons();
    const idx = list.findIndex(l => l.id === activeLesson.id);
    if (idx > 0) {
      setActiveLesson(list[idx - 1]);
    }
  };

  const handleNextLesson = () => {
    const list = getAllLessons();
    const idx = list.findIndex(l => l.id === activeLesson.id);
    if (idx < list.length - 1) {
      setActiveLesson(list[idx + 1]);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 300, gap: 12 }}>
        <div style={{ width: 40, height: 40, border: '4px solid #F3F4F6', borderTopColor: '#6C3CF0', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
        <p style={{ color: '#64748B', fontSize: 14, fontWeight: 600 }}>Loading recorded courses...</p>
      </div>
    );
  }

  // ====================================================
  // PAGE 1 – RECORDED COURSES LISTING
  // ====================================================
  if (!selectedCourseId) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <span style={{ fontSize: 11, fontWeight: 800, background: 'rgba(108,60,240,0.08)', color: '#6C3CF0', padding: '4px 12px', borderRadius: 20, textTransform: 'uppercase' }}>
              Learning Portal
            </span>
            <h1 style={{ fontSize: 26, fontWeight: 900, margin: '8px 0 0', letterSpacing: '-0.5px', color: '#1E293B' }}>
              My Recorded Courses
            </h1>
          </div>
        </div>

        {courses.length === 0 ? (
          <div style={{ padding: 60, textAlign: 'center', background: 'white', borderRadius: 20, border: '1.5px solid #F1F5F9' }}>
            <BookOpen size={40} color="#94A3B8" style={{ margin: '0 auto 16px' }} />
            <h4 style={{ fontWeight: 800, color: '#1E293B', marginBottom: 6 }}>No Courses Found</h4>
            <p style={{ color: '#64748B', fontSize: 14 }}>You are not enrolled in any recorded streams yet.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 24 }}>
            {courses.map((course) => (
              <div 
                key={course.id}
                style={{ 
                  background: '#FFFFFF', 
                  border: '1.5px solid #F1F5F9', 
                  borderRadius: 20, 
                  padding: 24,
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.02)',
                  transition: 'all 0.25s ease',
                  cursor: 'pointer'
                }}
                className="course-card-premium"
                onClick={() => loadCoursePlayer(course.id)}
              >
                <style dangerouslySetInnerHTML={{__html: `
                  .course-card-premium:hover {
                    transform: translateY(-4px);
                    box-shadow: 0 12px 20px -8px rgba(108, 60, 240, 0.12);
                    border-color: rgba(108, 60, 240, 0.2);
                  }
                `}} />
                
                {/* Thumbnail placeholder */}
                <div style={{ 
                  width: '100%', 
                  height: 140, 
                  borderRadius: 14, 
                  background: 'linear-gradient(135deg, #6C3CF0, #4c22bc)', 
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#FFFFFF',
                  fontSize: 28,
                  fontWeight: 900,
                  marginBottom: 16
                }}>
                  {course.title[0]}
                </div>

                <h3 style={{ fontSize: 18, fontWeight: 800, color: '#1E293B', margin: '0 0 12px' }}>{course.title}</h3>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 16px', marginBottom: 16, fontSize: 13, color: '#64748B' }}>
                  <span>Trainer: <strong style={{ color: '#334155' }}>{course.trainer}</strong></span>
                  <span>Batch: <strong style={{ color: '#334155' }}>{course.batch}</strong></span>
                  <span>Modules: <strong style={{ color: '#334155' }}>{course.modules_count}</strong></span>
                  <span>Videos: <strong style={{ color: '#334155' }}>{course.videos_count}</strong></span>
                </div>

                {/* Progress bar */}
                <div style={{ marginBottom: 18 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 700, color: '#6C3CF0', marginBottom: 4 }}>
                    <span>Progress</span>
                    <span>{course.progress}%</span>
                  </div>
                  <div style={{ height: 6, background: '#F1F5F9', borderRadius: 99, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${course.progress}%`, background: '#6C3CF0', borderRadius: 99 }} />
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #F1F5F9', paddingTop: 14 }}>
                  <span style={{ fontSize: 11.5, color: '#94A3B8' }}>Last: {course.last_watched}</span>
                  <button 
                    style={{ 
                      background: 'rgba(108,60,240,0.06)', 
                      color: '#6C3CF0', 
                      border: 'none', 
                      borderRadius: 10, 
                      padding: '8px 16px',
                      fontSize: 12.5,
                      fontWeight: 800,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4
                    }}
                  >
                    <span>Continue Learning</span>
                    <ArrowRight size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ====================================================
  // PAGE 2 – COURSE PLAYER PAGE
  // ====================================================
  if (playerLoading || !activeLesson) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 300, gap: 12 }}>
        <div style={{ width: 40, height: 40, border: '4px solid #F3F4F6', borderTopColor: '#6C3CF0', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
        <p style={{ color: '#64748B', fontSize: 14 }}>Loading Course Player...</p>
      </div>
    );
  }

  const allLessonsList = getAllLessons();
  const currentIdx = allLessonsList.findIndex(l => l.id === activeLesson.id);

  /* ── Inline styles sheet ── */
  const STYLES = `
    @keyframes spin { to { transform: rotate(360deg); } }

    .lms-player-wrap {
      display: flex;
      flex-direction: column;
      gap: 0;
      background: #F8FAFC;
      min-height: 100vh;
      font-family: 'Inter', sans-serif;
    }

    /* Top nav bar */
    .lms-topbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 10px 0 14px;
      border-bottom: 1px solid #E8ECF0;
      gap: 12px;
      flex-wrap: wrap;
    }

    /* Main body: video+details left | playlist right */
    .lms-body {
      display: grid;
      grid-template-columns: 1fr 300px;
      gap: 20px;
      align-items: start;
      padding-top: 18px;
    }
    @media (max-width: 960px) {
      .lms-body { grid-template-columns: 1fr; }
    }

    /* Left column */
    .lms-left {
      display: flex;
      flex-direction: column;
      gap: 14px;
      min-width: 0;
    }

    /* Video frame */
    .lms-video-frame {
      width: 100%;
      border-radius: 14px;
      overflow: hidden;
      background: #0F172A;
      box-shadow: 0 8px 24px rgba(0,0,0,0.14);
      position: relative;
      aspect-ratio: 16/9;
      max-height: 460px;
    }
    @media (min-width: 961px) {
      .lms-video-frame { aspect-ratio: unset; height: 440px; }
    }

    /* Lesson details card */
    .lms-details-card {
      background: #fff;
      border: 1.5px solid #EDF0F5;
      border-radius: 14px;
      padding: 16px 20px;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .lms-details-top {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 12px;
      flex-wrap: wrap;
    }

    .lms-lesson-label {
      font-size: 10.5px;
      font-weight: 800;
      color: #6C3CF0;
      text-transform: uppercase;
      letter-spacing: 0.6px;
    }
    .lms-lesson-title {
      font-size: 17px;
      font-weight: 800;
      color: #1E293B;
      margin: 3px 0 0;
      line-height: 1.25;
    }
    .lms-lesson-desc {
      font-size: 13px;
      color: #64748B;
      line-height: 1.5;
      margin: 0;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    .lms-complete-btn {
      white-space: nowrap;
      flex-shrink: 0;
      padding: 7px 14px;
      border: none;
      border-radius: 9px;
      font-size: 12px;
      font-weight: 800;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 5px;
      transition: opacity .15s;
    }
    .lms-complete-btn:hover { opacity: 0.85; }

    /* Prev / Next navigation strip */
    .lms-nav-strip {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding-top: 10px;
      border-top: 1px solid #EDF0F5;
    }

    .lms-nav-btn {
      display: flex;
      align-items: center;
      gap: 5px;
      padding: 6px 13px;
      border-radius: 8px;
      border: 1.5px solid #E2E8F0;
      background: transparent;
      font-size: 12px;
      font-weight: 700;
      color: #475569;
      cursor: pointer;
      transition: background .15s, border-color .15s;
    }
    .lms-nav-btn:hover:not(:disabled) {
      background: #F1F5F9;
      border-color: #CBD5E1;
    }
    .lms-nav-btn:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }

    /* Resource actions row */
    .lms-resources {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
    }

    .lms-resource-btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 9px 16px;
      border-radius: 9px;
      font-size: 12.5px;
      font-weight: 700;
      text-decoration: none;
      cursor: pointer;
      transition: background .15s, box-shadow .15s;
      border: 1.5px solid #E2E8F0;
      background: #FFFFFF;
      color: #334155;
    }
    .lms-resource-btn:hover {
      background: #F8FAFC;
      box-shadow: 0 2px 8px rgba(108,60,240,0.08);
      border-color: rgba(108,60,240,0.25);
    }

    /* RIGHT: Playlist sidebar */
    .lms-playlist-sidebar {
      position: sticky;
      top: 80px;
      max-height: calc(100vh - 100px);
      overflow-y: auto;
      background: #fff;
      border: 1.5px solid #EDF0F5;
      border-radius: 14px;
      display: flex;
      flex-direction: column;
    }
    @media (max-width: 960px) {
      .lms-playlist-sidebar {
        position: static;
        max-height: none;
      }
    }
    .lms-playlist-sidebar::-webkit-scrollbar { width: 4px; }
    .lms-playlist-sidebar::-webkit-scrollbar-track { background: transparent; }
    .lms-playlist-sidebar::-webkit-scrollbar-thumb { background: #E2E8F0; border-radius: 4px; }

    .lms-playlist-header {
      padding: 14px 16px;
      border-bottom: 1px solid #EDF0F5;
      font-size: 13px;
      font-weight: 800;
      color: #1E293B;
      position: sticky;
      top: 0;
      background: #fff;
      z-index: 2;
    }

    /* Module accordion */
    .lms-module-header {
      padding: 10px 14px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      cursor: pointer;
      border-bottom: 1px solid #EDF0F5;
      background: #F8FAFC;
      transition: background .15s;
    }
    .lms-module-header:hover { background: #F1F5F9; }
    .lms-module-title {
      font-size: 11.5px;
      font-weight: 800;
      color: #334155;
      text-transform: uppercase;
      letter-spacing: 0.4px;
    }

    /* Lesson row inside playlist */
    .lms-playlist-lesson {
      padding: 9px 14px;
      display: flex;
      align-items: center;
      gap: 8px;
      cursor: pointer;
      border-bottom: 1px solid #F8FAFC;
      transition: background .15s;
    }
    .lms-playlist-lesson:hover { background: #F8FAFC; }
    .lms-playlist-lesson.active {
      background: rgba(108,60,240,0.06);
      border-left: 3px solid #6C3CF0;
    }
    .lms-lesson-name {
      font-size: 12px;
      font-weight: 600;
      color: #475569;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      flex: 1;
    }
    .lms-playlist-lesson.active .lms-lesson-name {
      color: #6C3CF0;
      font-weight: 800;
    }

    /* Locked overlay */
    .lms-locked-overlay {
      position: absolute;
      inset: 0;
      background: rgba(15,23,42,0.94);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
      padding: 24px;
      color: #fff;
      border-radius: 14px;
    }
  `;

  return (
    <div className="lms-player-wrap">
      <style dangerouslySetInnerHTML={{ __html: STYLES }} />

      {/* ── TOP BAR ── */}
      <div className="lms-topbar">
        <button
          onClick={() => setSelectedCourseId(null)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 700, color: '#475569', padding: '5px 8px', borderRadius: 7, transition: 'background .15s' }}
          onMouseEnter={e => e.currentTarget.style.background='#F1F5F9'}
          onMouseLeave={e => e.currentTarget.style.background='none'}
        >
          <ArrowLeft size={15} />
          Back to Courses
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#94A3B8', fontWeight: 600 }}>
          <span style={{ color: '#6C3CF0', fontWeight: 800 }}>Lesson {activeLesson.video_number}</span>
          <span>·</span>
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 220 }}>{activeLesson.title}</span>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={handlePrevLesson}
            disabled={currentIdx === 0}
            className="lms-nav-btn"
          >
            <ArrowLeft size={13} /> Prev
          </button>
          <button
            onClick={handleNextLesson}
            disabled={currentIdx === allLessonsList.length - 1}
            className="lms-nav-btn"
          >
            Next <ArrowRight size={13} />
          </button>
        </div>
      </div>

      {/* ── BODY: Left + Right ── */}
      <div className="lms-body">

        {/* ── LEFT COLUMN ── */}
        <div className="lms-left">

          {/* Video Player & Premium Access Lock */}
          <div className="lms-video-frame">
            {isPlaying && isPaid && !activeLesson.locked ? (
              <iframe
                src={activeLesson.url?.replace('watch?v=', 'embed/')}
                title={activeLesson.title}
                style={{ width: '100%', height: '100%', border: 'none' }}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            ) : (
              <div style={{
                position: 'absolute',
                inset: 0,
                backgroundImage: activeLesson.thumbnail ? `url(${activeLesson.thumbnail})` : 'linear-gradient(135deg, #1E1B4B 0%, #311068 100%)',
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'column'
              }}>
                {/* Backdrop Blur Overlay */}
                <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(3px)', zIndex: 1 }} />
                
                <div style={{ position: 'relative', zIndex: 2, textAlign: 'center', padding: '24px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  {isPaid && !activeLesson.locked ? (
                    // PAID STUDENT: SHOW PLAY BUTTON
                    <button 
                      onClick={() => setIsPlaying(true)}
                      style={{
                        width: 72,
                        height: 72,
                        borderRadius: '50%',
                        background: '#6C3CF0',
                        color: 'white',
                        border: 'none',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 10px 25px -5px rgba(108, 60, 240, 0.5)',
                        transition: 'transform 0.2s ease, background-color 0.2s',
                        marginBottom: 12
                      }}
                      onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.08)'}
                      onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                    >
                      <Play size={30} fill="white" style={{ marginLeft: 4 }} />
                    </button>
                  ) : (
                    // UNPAID STUDENT: HIDE PLAY BUTTON, SHOW LATEST UPDATE & RENEW BUTTON
                    <div style={{ 
                      background: 'rgba(255, 255, 255, 0.1)', 
                      backdropFilter: 'blur(10px)', 
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      borderRadius: 16, 
                      padding: '24px 30px', 
                      maxWidth: 380,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)'
                    }}>
                      <div style={{ display: 'inline-flex', padding: '6px 14px', background: '#EF4444', color: 'white', borderRadius: 20, fontSize: 11, fontWeight: 800, textTransform: 'uppercase', marginBottom: 12, letterSpacing: 0.5 }}>
                        Latest Update
                      </div>
                      <h4 style={{ color: 'white', fontSize: 15, fontWeight: 800, margin: '0 0 10px', textAlign: 'center', lineHeight: 1.4 }}>
                        This lecture is available with your next active learning period.
                      </h4>
                      <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12.5, margin: '0 0 20px', textAlign: 'center' }}>
                        Please clear outstanding course fee dues to unlock immediate streaming.
                      </p>
                      <button 
                        onClick={() => alert("Please contact the Levlox Administration or visit the Fees section to pay your pending dues and renew your learning access.")}
                        style={{
                          background: '#6C3CF0',
                          color: 'white',
                          border: 'none',
                          borderRadius: 8,
                          padding: '10px 24px',
                          fontSize: 13,
                          fontWeight: 800,
                          cursor: 'pointer',
                          boxShadow: '0 4px 12px rgba(108, 60, 240, 0.3)',
                          transition: 'background-color 0.15s'
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = '#5930cb'}
                        onMouseLeave={e => e.currentTarget.style.background = '#6C3CF0'}
                      >
                        Renew Access
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* ── Compact Lesson Details Card ── */}
          <div className="lms-details-card">
            <div className="lms-details-top">
              <div style={{ minWidth: 0 }}>
                <div className="lms-lesson-label">Lesson {activeLesson.video_number}</div>
                <h2 className="lms-lesson-title">{activeLesson.title}</h2>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 16px', margin: '8px 0', fontSize: '13px', color: '#64748B' }}>
                  <span>Trainer: <strong style={{ color: '#334155' }}>{activeLesson.trainer || 'Sri'}</strong></span>
                  <span>Duration: <strong style={{ color: '#334155' }}>{activeLesson.duration || '1h 15m'}</strong></span>
                  <span>Uploaded: <strong style={{ color: '#334155' }}>{activeLesson.upload_date || 'July 09, 2026'}</strong></span>
                </div>
                {activeLesson.description && (
                  <p className="lms-lesson-desc" style={{ marginTop: 6 }}>{activeLesson.description}</p>
                )}
              </div>

              {/* Mark Completed */}
              {!activeLesson.locked && (
                <button
                  className="lms-complete-btn"
                  onClick={() => handleMarkCompleted(activeLesson)}
                  disabled={activeLesson.completed}
                  style={{
                    background: activeLesson.completed ? 'rgba(16,185,129,0.08)' : '#6C3CF0',
                    color: activeLesson.completed ? '#10B981' : '#fff',
                  }}
                >
                  <CheckCircle size={13} />
                  {activeLesson.completed ? 'Completed' : 'Mark Complete'}
                </button>
              )}
            </div>

            {/* Prev / Next strip */}
            <div className="lms-nav-strip">
              <button className="lms-nav-btn" onClick={handlePrevLesson} disabled={currentIdx === 0}>
                <ArrowLeft size={13} /> Previous
              </button>
              <span style={{ fontSize: 11, color: '#94A3B8', fontWeight: 600 }}>
                {currentIdx + 1} / {allLessonsList.length}
              </span>
              <button className="lms-nav-btn" onClick={handleNextLesson} disabled={currentIdx === allLessonsList.length - 1}>
                Next <ArrowRight size={13} />
              </button>
            </div>
          </div>

          {/* ── Resources (Notes + Assignment only) ── */}
          {(activeLesson.notes_url || activeLesson.assignment) && !activeLesson.locked && (
            <div className="lms-resources">
              {activeLesson.notes_url && (
                <a
                  href={activeLesson.notes_url}
                  target="_blank"
                  rel="noreferrer"
                  className="lms-resource-btn"
                >
                  <Download size={14} color="#6C3CF0" />
                  Download PDF Notes
                </a>
              )}
              {activeLesson.assignment && (
                <button
                  className="lms-resource-btn"
                  onClick={() => handleOpenSubmit(activeLesson.assignment)}
                >
                  <FileText size={14} color="#6C3CF0" />
                  Submit Assignment
                </button>
              )}
            </div>
          )}

        </div>

        {/* ── RIGHT COLUMN: Sticky Playlist ── */}
        <div className="lms-playlist-sidebar">
          <div className="lms-playlist-header">
            📋 Course Playlist
            <span style={{ fontWeight: 600, color: '#94A3B8', marginLeft: 6, fontSize: 11 }}>
              {allLessonsList.filter(l => l.completed).length}/{allLessonsList.length} done
            </span>
          </div>

          {playerModules.map((module) => {
            const isExpanded = !!expandedModules[module.id];
            const doneCount = module.lessons.filter(l => l.completed).length;
            return (
              <div key={module.id}>
                {/* Module header */}
                <div
                  className="lms-module-header"
                  onClick={() => setExpandedModules(prev => ({ ...prev, [module.id]: !prev[module.id] }))}
                >
                  <div style={{ minWidth: 0 }}>
                    <div className="lms-module-title">{module.title}</div>
                    <div style={{ fontSize: 10.5, color: '#94A3B8', fontWeight: 600, marginTop: 1 }}>
                      {doneCount}/{module.lessons.length} completed
                    </div>
                  </div>
                  {isExpanded
                    ? <ChevronUp size={14} color="#94A3B8" style={{ flexShrink: 0 }} />
                    : <ChevronDown size={14} color="#94A3B8" style={{ flexShrink: 0 }} />
                  }
                </div>

                {/* Lessons */}
                {isExpanded && module.lessons.map((les) => {
                  const isActive = les.id === activeLesson.id;
                  return (
                    <div
                      key={les.id}
                      className={`lms-playlist-lesson${isActive ? ' active' : ''}`}
                      onClick={() => !les.locked && setActiveLesson(les)}
                      style={{ cursor: les.locked ? 'default' : 'pointer' }}
                    >
                      {/* Status icon */}
                      <div style={{ flexShrink: 0 }}>
                        {les.completed
                          ? <CheckCircle size={13} color="#10B981" />
                          : les.locked
                            ? <Lock size={13} color="#CBD5E1" />
                            : <Play size={13} color={isActive ? '#6C3CF0' : '#94A3B8'} />
                        }
                      </div>

                      <span className="lms-lesson-name">
                        {les.video_number}. {les.title}
                      </span>

                      {les.duration && (
                        <span style={{ fontSize: 10.5, color: '#94A3B8', flexShrink: 0, fontWeight: 600 }}>
                          {les.duration}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>

      </div>

      {/* ── ASSIGNMENT SUBMIT MODAL ── */}
      {submitAssignment && (
        <div style={{
          position: 'fixed', inset: 0,
          background: 'rgba(15,23,42,0.45)',
          backdropFilter: 'blur(5px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 9999, padding: 20
        }}>
          <div style={{
            background: '#fff', borderRadius: 16, width: '100%', maxWidth: 480,
            padding: '28px 28px 24px', boxShadow: '0 25px 40px rgba(0,0,0,0.12)'
          }}>
            <h3 style={{ fontSize: 16, fontWeight: 800, color: '#1E293B', margin: '0 0 4px' }}>
              📝 Submit Assignment
            </h3>
            <p style={{ fontSize: 12.5, color: '#64748B', margin: '0 0 18px' }}>
              {submitAssignment.title}
            </p>

            <form onSubmit={handleConfirmSubmit}>
              <textarea
                value={submissionText}
                onChange={e => setSubmissionText(e.target.value)}
                required
                placeholder="Paste your GitHub repo link, answer, or notes..."
                style={{
                  width: '100%', height: 110, resize: 'none',
                  borderRadius: 10, border: '1.5px solid #E2E8F0',
                  padding: 12, fontSize: 13, fontFamily: 'inherit',
                  outline: 'none', boxSizing: 'border-box',
                  transition: 'border-color .15s'
                }}
                onFocus={e => e.target.style.borderColor='#6C3CF0'}
                onBlur={e => e.target.style.borderColor='#E2E8F0'}
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 16 }}>
                <button
                  type="button"
                  onClick={() => setSubmitAssignment(null)}
                  style={{ padding: '8px 16px', background: '#F1F5F9', color: '#475569', border: 'none', borderRadius: 8, fontSize: 12.5, fontWeight: 700, cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{ padding: '8px 20px', background: '#6C3CF0', color: '#fff', border: 'none', borderRadius: 8, fontSize: 12.5, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
                >
                  {submitting ? 'Submitting...' : 'Submit'}
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
