import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BookOpen, FileText, Bookmark, LogOut, GraduationCap,
  ClipboardList, Lock, Video, Megaphone, User, DollarSign,
  Download, ExternalLink, Calendar, Percent, Bell,
  Search, ChevronLeft, ChevronRight, Settings, HelpCircle,
  Clock, CheckCircle, AlertCircle, PlayCircle, Zap, TrendingUp,
  Award, Star, ArrowRight, Plus, X, Eye, Users, Menu,
  Crown, Medal, Flame, Activity
} from 'lucide-react';
import StudentProfile from './StudentProfile';
import AttendancePage from './AttendancePage';
import RecordedClassesPage from './RecordedClassesPage';
import StudyMaterialsPage from './StudyMaterialsPage';
import FeesPage from './FeesPage';
import CustomModal from '../components/Modal';

const API_BASE = 'http://localhost:5000/api';

/* ─── tiny helpers ─────────────────────────────────── */
const CircularProgress = ({ pct = 0, size = 80, stroke = 7, color = '#6C3CF0' }) => {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(0,0,0,0.06)" strokeWidth={stroke} />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke={color} strokeWidth={stroke}
        strokeDasharray={circ} strokeDashoffset={offset}
        strokeLinecap="round"
        style={{ transition: 'stroke-dashoffset 0.8s cubic-bezier(0.4,0,0.2,1)' }}
      />
    </svg>
  );
};

const ProgressBar = ({ pct = 0, color = '#6C3CF0', height = 6 }) => (
  <div style={{ background: 'rgba(0,0,0,0.05)', borderRadius: 99, height, overflow: 'hidden', width: '100%' }}>
    <div style={{
      height: '100%', borderRadius: 99, width: `${Math.min(pct, 100)}%`,
      background: `linear-gradient(90deg, ${color}cc, ${color})`,
      transition: 'width 0.8s cubic-bezier(0.4,0,0.2,1)'
    }} />
  </div>
);

const FlatIcon = ({ children, size = 40 }) => (
  <div style={{
    width: size, height: size, borderRadius: 12, flexShrink: 0,
    background: 'rgba(108, 60, 240, 0.08)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6C3CF0'
  }}>
    {children}
  </div>
);

const WeeklyLineChart = ({ data = [0, 0, 0, 0, 0, 0, 0] }) => {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const maxVal = Math.max(...data, 8);
  const width = 380;
  const height = 150;
  const padding = 20;

  const points = data.map((val, idx) => {
    const x = padding + (idx * (width - padding * 2)) / 6;
    const y = height - padding - (val * (height - padding * 2)) / maxVal;
    return { x, y, val };
  });

  const pathD = points.reduce((acc, p, idx) => {
    return acc + `${idx === 0 ? 'M' : 'L'} ${p.x} ${p.y}`;
  }, '');

  const areaD = points.reduce((acc, p, idx) => {
    return acc + `${idx === 0 ? 'M' : 'L'} ${p.x} ${p.y}`;
  }, '') + ` L ${points[6].x} ${height - padding} L ${points[0].x} ${height - padding} Z`;

  return (
    <div style={{ width: '100%', overflow: 'hidden' }}>
      <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: 'auto' }}>
        <defs>
          <linearGradient id="chartGlow" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#6C3CF0" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#6C3CF0" stopOpacity="0.0" />
          </linearGradient>
        </defs>
        {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => {
          const y = padding + ratio * (height - padding * 2);
          return (
            <line key={idx} x1={padding} y1={y} x2={width - padding} y2={y} stroke="rgba(0,0,0,0.04)" strokeDasharray="3 3" />
          );
        })}
        <path d={areaD} fill="url(#chartGlow)" />
        <path d={pathD} fill="none" stroke="#6C3CF0" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        {points.map((p, idx) => (
          <g key={idx}>
            <circle cx={p.x} cy={p.y} r="4" fill="#6C3CF0" stroke="#FFF" strokeWidth="2" style={{ transition: 'all 0.2s', cursor: 'pointer' }}
              onMouseEnter={e => e.currentTarget.setAttribute('r', '6')}
              onMouseLeave={e => e.currentTarget.setAttribute('r', '4')}
            />
            <text x={p.x} y={height - 2} fontSize="9" fontWeight="700" fill="#9499AB" textAnchor="middle">{days[idx]}</text>
          </g>
        ))}
      </svg>
    </div>
  );
};

const MockBarChart = ({ data = [0, 0, 0, 0] }) => {
  const width = 280;
  const height = 150;
  const padding = 20;
  const maxVal = 100;

  const barWidth = 32;
  const gap = (width - padding * 2 - barWidth * data.length) / (data.length - 1);

  return (
    <div style={{ width: '100%', overflow: 'hidden' }}>
      <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: 'auto' }}>
        <defs>
          <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#6C3CF0" />
            <stop offset="100%" stopColor="#8B5CF6" />
          </linearGradient>
        </defs>
        {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => {
          const y = padding + ratio * (height - padding * 2);
          return (
            <line key={idx} x1={padding} y1={y} x2={width - padding} y2={y} stroke="rgba(0,0,0,0.04)" strokeDasharray="3 3" />
          );
        })}
        {data.map((val, idx) => {
          const x = padding + idx * (barWidth + gap);
          const barHeight = (val * (height - padding * 2)) / maxVal;
          const y = height - padding - barHeight;
          return (
            <g key={idx}>
              <rect x={x} y={y} width={barWidth} height={barHeight} fill="url(#barGrad)" rx="6" style={{ transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)', cursor: 'pointer' }}
                onMouseEnter={e => e.currentTarget.setAttribute('opacity', '0.85')}
                onMouseLeave={e => e.currentTarget.setAttribute('opacity', '1')}
              />
              <text x={x + barWidth / 2} y={y - 6} fontSize="9" fontWeight="800" fill="#6C3CF0" textAnchor="middle">{val}%</text>
              <text x={x + barWidth / 2} y={height - 2} fontSize="9" fontWeight="700" fill="#9499AB" textAnchor="middle">Int {idx + 1}</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
};

/* ─── Main Component ───────────────────────────────── */
const StudentDashboard = () => {
  const defaultDummyAnalytics = {
    has_data: true,
    overall_progress: {
      percentage: 78,
      completed_modules: 11,
      remaining_modules: 3
    },
    weekly_learning: [3.5, 4.2, 2.0, 5.5, 6.0, 1.5, 4.0],
    mock_interviews: {
      total: 6,
      completed: 4,
      pending: 2,
      average_score: 82,
      best_score: 95,
      latest_date: "July 06, 2026",
      scores: [70, 78, 85, 95]
    },
    coding_practice: {
      solved: 142,
      streak: 12,
      hours: 58
    },
    assignments: {
      completed: 8,
      pending: 2,
      submission_rate: 80
    },
    attendance: {
      percentage: 92,
      present: 46,
      absent: 4
    },
    milestones: {
      beginner: "Completed",
      intermediate: "In Progress",
      advanced: "Pending"
    }
  };

  const [activeTab, setActiveTab] = useState('dashboard');
  const [dashboardData, setDashboardData] = useState(null);
  const [courses, setCourses] = useState([]);
  const [enrolledCourses, setEnrolledCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [assignments, setAssignments] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [paying, setPaying] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [globalSearch, setGlobalSearch] = useState('');
  const [submitModalAssignment, setSubmitModalAssignment] = useState(null);
  const [submissionText, setSubmissionText] = useState('');
  const [vidQuery, setVidQuery] = useState('');
  const [vidCourse, setVidCourse] = useState('');
  const [matQuery, setMatQuery] = useState('');
  const [profileData, setProfileData] = useState(null);
  const [profileName, setProfileName] = useState('');
  const [profilePhone, setProfilePhone] = useState('');
  const [profileCollege, setProfileCollege] = useState('');
  const [profileCourse, setProfileCourse] = useState('');
  const [profilePic, setProfilePic] = useState('');
  const [currPassword, setCurrPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [portalName, setPortalName] = useState('Levlox');
  const [portalLogo, setPortalLogo] = useState('');
  const [notifications, setNotifications] = useState([]);
  const [showNotiCenter, setShowNotiCenter] = useState(false);
  const [liveClassesList, setLiveClassesList] = useState([]);
  const [showLockModal, setShowLockModal] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [modalText, setModalText] = useState('');
  const [modalType, setModalType] = useState('info');
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [analytics, setAnalytics] = useState(null);
  const [overallLeaderboard, setOverallLeaderboard] = useState([]);
  const [mockLeaderboard, setMockLeaderboard] = useState([]);
  const [taskLeaderboard, setTaskLeaderboard] = useState([]);
  const notiRef = useRef(null);
  const profileRef = useRef(null);

  const showModal = (title, text, type = 'info') => {
    setModalTitle(title);
    setModalText(text);
    setModalType(type);
    setModalOpen(true);
  };

  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const activeAnalytics = analytics && analytics.has_data ? analytics : defaultDummyAnalytics;

  useEffect(() => {
    fetchDashboard();
    fetchCourses();
    fetchEnrolledCourses();
    fetchMySubmissions();
    fetchPortalSettings();
    fetchNotifications();
    fetchLiveClasses();
    fetchAnalytics();
  }, []);

  useEffect(() => {
    if (activeTab === 'profile') fetchProfile();
  }, [activeTab]);

  // Close notification/profile dropdown on outside click
  useEffect(() => {
    const handler = (e) => { 
      if (notiRef.current && !notiRef.current.contains(e.target)) setShowNotiCenter(false); 
      if (profileRef.current && !profileRef.current.contains(e.target)) setShowProfileDropdown(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleLogout = () => { localStorage.clear(); navigate('/login'); };

  const fetchPortalSettings = async () => {
    try {
      const r = await fetch(`${API_BASE}/portal-settings`);
      if (r.ok) { const d = await r.json(); setPortalName(d.portal_name || 'Levlox'); setPortalLogo(d.portal_logo || ''); }
    } catch (e) { console.error(e); }
  };

  const apiFetch = async (url, options = {}) => {
    try {
      const response = await fetch(url, options);
      if (response.status === 401) {
        localStorage.clear();
        navigate('/login?reason=session_expired');
        throw new Error('Session expired');
      }
      if (response.status === 403) {
        showModal('Access Denied', 'Access forbidden: Insufficient permissions.', 'error');
        throw new Error('Access denied');
      }
      if (response.status === 404) {
        showModal('Not Found', 'Requested resource not found.', 'error');
        throw new Error('Resource not found');
      }
      if (response.status >= 500) {
        showModal('Server Error', 'Internal server error. Please try again later.', 'error');
        throw new Error('Server error');
      }
      return response;
    } catch (e) {
      if (e.message !== 'Session expired' && e.message !== 'Access denied' && e.message !== 'Resource not found' && e.message !== 'Server error') {
        showModal('Network Error', 'Network error: Cannot reach the backend server.', 'error');
      }
      throw e;
    }
  };

  const fetchLeaderboards = async () => {
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const [rOverall, rMock, rTask] = await Promise.all([
        apiFetch(`${API_BASE}/student/leaderboard/overall`, { headers }),
        apiFetch(`${API_BASE}/student/leaderboard/mock`, { headers }),
        apiFetch(`${API_BASE}/student/leaderboard/tasks`, { headers })
      ]);
      if (rOverall.ok) setOverallLeaderboard(await rOverall.json());
      if (rMock.ok) setMockLeaderboard(await rMock.json());
      if (rTask.ok) setTaskLeaderboard(await rTask.json());
    } catch (e) {
      console.error('Error fetching leaderboards:', e);
    }
  };

  const fetchAnalytics = async () => {
    try {
      const r = await apiFetch(`${API_BASE}/student/analytics`, { headers: { Authorization: `Bearer ${token}` } });
      const d = await r.json();
      setAnalytics(d);
    } catch (e) { console.error(e); }
    fetchLeaderboards();
  };

  const fetchNotifications = async () => {
    try {
      const r = await apiFetch(`${API_BASE}/student/notifications`, { headers: { Authorization: `Bearer ${token}` } });
      const d = await r.json();
      setNotifications(d || []);
    } catch (e) { console.error(e); }
  };

  const fetchProfile = async () => {
    try {
      const r = await apiFetch(`${API_BASE}/student/profile`, { headers: { Authorization: `Bearer ${token}` } });
      const d = await r.json();
      setProfileData(d); setProfileName(d.name || ''); setProfilePhone(d.phone || '');
      setProfileCollege(d.college || ''); setProfileCourse(d.course || ''); setProfilePic(d.profile_pic || '');
    } catch (e) { console.error(e); }
  };

  const saveProfile = async (e) => {
    e.preventDefault();
    try {
      const r = await apiFetch(`${API_BASE}/student/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: profileName, phone: profilePhone, college: profileCollege, course: profileCourse, profile_pic: profilePic })
      });
      if (r.ok) {
        showModal('Success', 'Profile updated successfully!', 'success'); fetchProfile();
        const lu = JSON.parse(localStorage.getItem('user') || '{}'); lu.name = profileName; localStorage.setItem('user', JSON.stringify(lu));
      } else { const err = await r.json(); showModal('Error', err.message || 'Failed to update profile.', 'error'); }
    } catch (e) { console.error(e); }
  };

  const handlePasswordAlter = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) { showModal('Warning', 'Passwords do not match.', 'warning'); return; }
    try {
      const r = await apiFetch(`${API_BASE}/student/change-password`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ current_password: currPassword, new_password: newPassword })
      });
      const d = await r.json();
      if (r.ok) { showModal('Success', 'Password updated successfully!', 'success'); setCurrPassword(''); setNewPassword(''); setConfirmPassword(''); }
      else showModal('Error', d.message || 'Failed to update password.', 'error');
    } catch (e) { console.error(e); }
  };

  const handleProfileImageMock = (e) => {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => setProfilePic(reader.result);
    reader.readAsDataURL(file);
  };

  const fetchLiveClasses = async () => {
    try {
      const r = await apiFetch(`${API_BASE}/student/live-classes`, { headers: { Authorization: `Bearer ${token}` } });
      const d = await r.json();
      setLiveClassesList(d.liveClasses || []);
    } catch (e) { console.error(e); }
  };

  const handleJoinLiveClass = async (classId) => {
    try {
      const r = await fetch(`${API_BASE}/student/live-classes/${classId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (r.status === 401) {
        localStorage.clear();
        navigate('/login?reason=session_expired');
        return;
      }
      if (r.status === 403) {
        setShowLockModal(true);
        return;
      }
      if (r.status === 404) {
        showModal('Not Found', 'The requested live class could not be found.', 'error');
        return;
      }
      if (r.status >= 500) {
        showModal('Server Error', 'Internal server error occurred.', 'error');
        return;
      }
      if (r.ok) {
        const d = await r.json();
        if (d.meet_link) {
          window.open(d.meet_link, '_blank');
        } else {
          showModal('Link Unavailable', "Meeting URL is currently not available.", 'warning');
        }
      } else {
        showModal('Error', "Failed to retrieve live class meeting link.", 'error');
      }
    } catch (e) {
      console.error(e);
      showModal('Network Error', 'Cannot connect to the server.', 'error');
    }
  };

  const fetchDashboard = async () => {
    try {
      const r = await apiFetch(`${API_BASE}/student/dashboard`, { headers: { Authorization: `Bearer ${token}` } });
      const d = await r.json(); setDashboardData(d);
      const lu = JSON.parse(localStorage.getItem('user') || '{}'); lu.feesPaid = d.student.feesPaid; localStorage.setItem('user', JSON.stringify(lu));
    } catch (e) { console.error(e); }
  };

  const payFees = async () => {
    setPaying(true);
    try {
      const r = await apiFetch(`${API_BASE}/student/pay-fees`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
      if (r.ok) await fetchDashboard();
    } catch (e) { console.error(e); } finally { setPaying(false); }
  };

  const fetchCourses = async () => {
    setLoading(true);
    try {
      const r = await apiFetch(`${API_BASE}/courses`, { headers: { Authorization: `Bearer ${token}` } });
      const d = await r.json(); setCourses(d.courses || []);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const fetchEnrolledCourses = async () => {
    try {
      const r = await apiFetch(`${API_BASE}/courses/enrolled`, { headers: { Authorization: `Bearer ${token}` } });
      const d = await r.json(); setEnrolledCourses(d.courses || []);
    } catch (e) { console.error(e); }
  };

  const fetchMySubmissions = async () => {
    try {
      const r = await apiFetch(`${API_BASE}/assignments/student/submissions`, { headers: { Authorization: `Bearer ${token}` } });
      const d = await r.json(); setSubmissions(d.submissions || []);
    } catch (e) { console.error(e); }
  };

  const enrollInCourse = async (courseId) => {
    try {
      const r = await apiFetch(`${API_BASE}/courses/${courseId}/enroll`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
      if (r.ok) { fetchCourses(); fetchEnrolledCourses(); fetchDashboard(); }
    } catch (e) { console.error(e); }
  };

  const selectCourse = async (course) => {
    setSelectedCourse(course); setLoading(true);
    try {
      const r = await apiFetch(`${API_BASE}/assignments/course/${course._id}`, { headers: { Authorization: `Bearer ${token}` } });
      const d = await r.json(); setAssignments(d.assignments || []);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const submitAssignment = async (e) => {
    e.preventDefault();
    try {
      const r = await apiFetch(`${API_BASE}/assignments/${submitModalAssignment._id}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ submission_text: submissionText })
      });
      if (r.ok) { setSubmitModalAssignment(null); setSubmissionText(''); fetchMySubmissions(); }
    } catch (e) { console.error(e); }
  };

  const getSubmissionStatus = (id) => submissions.find(s => s.assignment_id === id) || null;
  const isPaid = dashboardData?.student?.feesStatus === 'Paid';

  /* ── Profile Completion ── */
  const calcCompletion = () => {
    if (!profileData) return 0;
    const fields = [profileName, profilePhone, profileCollege, profileCourse, profilePic];
    const filled = fields.filter(Boolean).length;
    return Math.round((filled / fields.length) * 100);
  };

  /* ── Greeting ── */
  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good Morning';
    if (h < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  /* ── Quick action items ── */
  const quickActions = [
    { label: 'Join Live Class', icon: <Video size={18} />, action: () => setActiveTab('my-courses') },
    { label: 'Browse Notes', icon: <BookOpen size={18} />, action: () => setActiveTab('study-materials-tab') },
    { label: 'Watch Replay', icon: <PlayCircle size={18} />, action: () => setActiveTab('recorded-classes-tab') },
    { label: 'My Attendance', icon: <Percent size={18} />, action: () => setActiveTab('attendance-tab') },
    { label: 'Announcements', icon: <Megaphone size={18} />, action: () => setActiveTab('announcements-tab') },
  ];

  /* ── SIDEBAR ITEMS ── */
  const navItems = [
    { id: 'dashboard', icon: <Bookmark size={20} strokeWidth={1.75} />, label: 'Dashboard' },
    { id: 'my-courses', icon: <Video size={20} strokeWidth={1.75} />, label: 'Live Classes' },
    { id: 'recorded-classes-tab', icon: <PlayCircle size={20} strokeWidth={1.75} />, label: 'Recorded Classes' },
    { id: 'study-materials-tab', icon: <BookOpen size={20} strokeWidth={1.75} />, label: 'Study Materials' },
    { id: 'attendance-tab', icon: <Percent size={20} strokeWidth={1.75} />, label: 'Attendance' },
    { id: 'announcements-tab', icon: <Megaphone size={20} strokeWidth={1.75} />, label: 'Announcements' },
    { id: 'profile', icon: <User size={20} strokeWidth={1.75} />, label: 'Profile' },
    { id: 'settings', icon: <Settings size={20} strokeWidth={1.75} />, label: 'Settings' },
  ];

  /* ── RENDER ─────────────────────────────────── */
  return (
    <div className="dashboard-layout">
      {/* Mobile Sidebar Backdrop */}
      <div className={`sidebar-backdrop ${mobileMenuOpen ? 'show' : ''}`} onClick={() => setMobileMenuOpen(false)} />

      {/* ═══ SIDEBAR ═══════════════════════════════ */}
      <aside className={`sidebar ${sidebarCollapsed ? 'collapsed' : ''} ${mobileMenuOpen ? 'mobile-open' : ''}`}>
        <div className="sidebar-header">
          <div className="sidebar-brand">
            <div className="sidebar-brand-icon">
              {portalLogo
                ? <img src={portalLogo} alt="logo" style={{ width: 22, height: 22, objectFit: 'contain' }} />
                : <GraduationCap size={20} strokeWidth={1.75} color="white" />
              }
            </div>
            <span className="sidebar-brand-text" style={{ color: 'white', fontWeight: 800, letterSpacing: -0.5, fontSize: 17 }}>{portalName}</span>
          </div>
          <button className="sidebar-toggle-btn" onClick={() => setSidebarCollapsed(!sidebarCollapsed)}>
            {sidebarCollapsed ? <ChevronRight size={16} strokeWidth={2} /> : <ChevronLeft size={16} strokeWidth={2} />}
          </button>
        </div>

        <nav className="sidebar-menu">
          <span className="sidebar-section-label">Main Menu</span>
          {navItems.map(item => (
            <button
              key={item.id}
              className={`sidebar-link ${activeTab === item.id ? 'active' : ''}`}
              onClick={() => { setActiveTab(item.id); setSelectedCourse(null); setMobileMenuOpen(false); }}
            >
              {item.icon}
              <span className="sidebar-link-text">{item.label}</span>
            </button>
          ))}
          <div className="sidebar-footer">
            <span className="sidebar-section-label">Account</span>
            <button className="sidebar-link" onClick={handleLogout} style={{ color: 'rgba(239,68,68,0.7)' }}>
              <LogOut size={20} strokeWidth={1.75} style={{ color: 'rgba(239,68,68,0.7)' }} />
              <span className="sidebar-link-text">Logout</span>
            </button>
          </div>
        </nav>
      </aside>

      {/* ═══ MAIN ═══════════════════════════════════ */}
      <main className={`main-content ${sidebarCollapsed ? 'expanded' : ''}`}>

        {/* ── TOP NAVBAR ── */}
        <header className="top-navbar">
          <button className="drawer-toggle-btn" onClick={() => setMobileMenuOpen(true)}>
            <Menu size={22} strokeWidth={1.75} />
          </button>

          <div className="top-navbar-left">
            <div className="search-bar-container">
              <Search size={16} strokeWidth={1.75} color="var(--text-muted)" />
              <input
                className="search-bar-input"
                placeholder="Search classes, materials, announcements…"
                value={globalSearch}
                onChange={e => { setGlobalSearch(e.target.value); setMatQuery(e.target.value); setVidQuery(e.target.value); }}
              />
            </div>
          </div>

          <div className="navbar-actions">
            {/* Date chip */}
            <div className="navbar-date-chip">
              <Calendar size={14} strokeWidth={1.75} />
              {new Date().toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
            </div>

            {/* Notifications */}
            <div style={{ position: 'relative' }} ref={notiRef}>
              <button className="navbar-action-btn" onClick={() => setShowNotiCenter(!showNotiCenter)}>
                <Bell size={18} strokeWidth={1.75} />
                {notifications.length > 0 && <span className="notification-badge" />}
              </button>
              {showNotiCenter && (
                <div className="noti-center-box">
                  <div style={{ paddingBottom: 12, borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-primary)' }}>Notifications</span>
                    <button onClick={() => setNotifications([])} style={{ background: 'none', border: 'none', color: 'var(--primary-color)', fontSize: 12, cursor: 'pointer', fontWeight: 700 }}>Clear all</button>
                  </div>
                  {notifications.length === 0
                    ? <div style={{ padding: '32px 12px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: 13 }}>You're all caught up ✓</div>
                    : notifications.map((n, i) => (
                      <div key={i} style={{ padding: '12px 4px', borderBottom: i < notifications.length - 1 ? '1px solid var(--border-light)' : 'none' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                          <span style={{ fontSize: 10, textTransform: 'uppercase', color: 'var(--primary-color)', fontWeight: 800, letterSpacing: 0.5 }}>{(n.type || 'alert').replace('_', ' ')}</span>
                          <span style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>{n.created_at}</span>
                        </div>
                        <p style={{ margin: '0 0 2px', fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>{n.title}</p>
                        <p style={{ margin: 0, fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{n.message}</p>
                      </div>
                    ))
                  }
                </div>
              )}
            </div>

            {/* Profile dropdown */}
            <div style={{ position: 'relative' }} ref={profileRef}>
              <div
                className="user-profile-badge"
                onClick={() => setShowProfileDropdown(!showProfileDropdown)}
              >
                <div className="avatar">
                  {profilePic ? <img src={profilePic} alt="avatar" /> : (user.name?.[0]?.toUpperCase() || 'S')}
                </div>
                <div className="profile-info">
                  <span className="profile-name">{profileName || user.name || 'Student'}</span>
                  <span className="profile-role">Student Account</span>
                </div>
              </div>
              {showProfileDropdown && (
                <div style={{ position: 'absolute', right: 0, top: 'calc(100% + 10px)', width: 230, background: 'white', border: '1.5px solid var(--border-color)', borderRadius: 14, boxShadow: 'var(--shadow-lg)', padding: '8px', zIndex: 1000, animation: 'fadeInUp 0.18s ease' }}>
                  <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--border-light)', marginBottom: 6 }}>
                    <p style={{ margin: 0, fontSize: 13.5, fontWeight: 800, color: 'var(--text-primary)' }}>{profileName || user.name || 'Student'}</p>
                    <p style={{ margin: '2px 0 0', fontSize: 11.5, color: 'var(--text-secondary)' }}>{user.email}</p>
                  </div>
                  <button
                    onClick={() => { setActiveTab('profile'); setShowProfileDropdown(false); }}
                    style={{ width: '100%', padding: '9px 12px', background: 'none', border: 'none', textAlign: 'left', fontSize: 13, color: 'var(--text-primary)', cursor: 'pointer', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'inherit', fontWeight: 600, transition: 'background 0.15s' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-alt)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'none'}
                  >
                    <User size={15} color="var(--text-secondary)" /> View Profile
                  </button>
                  <button
                    onClick={handleLogout}
                    style={{ width: '100%', padding: '9px 12px', background: 'none', border: 'none', textAlign: 'left', fontSize: 13, color: '#EF4444', cursor: 'pointer', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'inherit', fontWeight: 600, marginTop: 2, transition: 'background 0.15s' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#FEF2F2'}
                    onMouseLeave={e => e.currentTarget.style.background = 'none'}
                  >
                    <LogOut size={15} /> Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* ══════════════════════════════════════════
            DASHBOARD TAB — PREMIUM LAYOUT
        ═══════════════════════════════════════════ */}
        {activeTab === 'dashboard' && dashboardData && (
          <div className="animate-fade-in">
            {/* ── WELCOME CARD ── */}
            <div style={{
              marginBottom: 28,
              background: 'white',
              border: '1.5px solid var(--border-color)',
              borderRadius: 20,
              padding: '28px 32px',
              boxShadow: 'var(--shadow-card)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 20,
              borderLeft: '4px solid var(--primary-color)',
              overflow: 'hidden',
              position: 'relative'
            }}>
              {/* Decorative bg orb */}
              <div style={{ position: 'absolute', right: -40, top: -40, width: 200, height: 200, borderRadius: '50%', background: 'radial-gradient(circle, rgba(108,60,240,0.05) 0%, transparent 70%)', pointerEvents: 'none' }} />
              <div>
                <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--primary-color)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6, display: 'block' }}>
                  {greeting()}, {new Date().toLocaleDateString('en-US', { weekday: 'long' })}
                </span>
                <h1 style={{ fontSize: 28, fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 10px', letterSpacing: -0.8 }}>
                  {profileName || user.name || 'Student'} 👋
                </h1>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12.5, color: 'var(--text-secondary)', background: 'var(--surface-alt)', padding: '5px 12px', borderRadius: 20, border: '1px solid var(--border-color)', fontWeight: 600 }}>
                    <BookOpen size={13} color="var(--primary-color)" /> {profileCourse || user.course || 'Fullstack Engineering'}
                  </span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12.5, fontWeight: 700, padding: '5px 12px', borderRadius: 20, background: isPaid ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)', color: isPaid ? '#10B981' : '#EF4444', border: `1px solid ${isPaid ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'}` }}>
                    {isPaid ? <CheckCircle size={13} /> : <AlertCircle size={13} />} Fees {isPaid ? 'Paid' : 'Pending'}
                  </span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 16, flexShrink: 0 }}>
                {[{
                  label: 'Attendance', val: `${dashboardData.student?.attendance?.percentage || 0}%`, color: '#10B981', bg: 'rgba(16,185,129,0.08)'
                }, {
                  label: 'Upcoming', val: dashboardData.upcomingLiveClasses?.length || 0, color: 'var(--primary-color)', bg: 'var(--primary-light)'
                }].map((s, i) => (
                  <div key={i} style={{ textAlign: 'center', background: s.bg, borderRadius: 14, padding: '14px 20px', border: `1px solid ${s.color}28` }}>
                    <p style={{ fontSize: 22, fontWeight: 800, color: s.color, margin: '0 0 3px', letterSpacing: -0.5 }}>{s.val}</p>
                    <p style={{ fontSize: 11, color: 'var(--text-secondary)', margin: 0, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.4 }}>{s.label}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* ── MAIN BENTO REDESIGN ── */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 24, marginBottom: 24 }} className="dashboard-main-grid">

              {/* LEFT COLUMN: LEARNING PROGRESS DASHBOARD */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                {/* ─── OVERALL COURSE PROGRESS ─── */}
                <div style={{ background: 'white', border: '1px solid var(--border-color)', borderRadius: 20, padding: 24, boxShadow: 'var(--shadow-sm)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <h4 style={{ fontSize: 14, fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-primary)' }}>
                      <TrendingUp size={16} color="var(--primary-color)" /> Overall Course Progress
                    </h4>
                    <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--primary-color)' }}>
                      {activeAnalytics.overall_progress.percentage}%
                    </span>
                  </div>
                  <div style={{ width: '100%', height: 8, background: '#FAF9FF', border: '1px solid var(--border-color)', borderRadius: 4, overflow: 'hidden', marginBottom: 14 }}>
                    <div style={{
                      width: `${activeAnalytics.overall_progress.percentage}%`,
                      height: '100%',
                      background: 'linear-gradient(135deg, var(--primary-color) 0%, #4c22bc 100%)',
                      borderRadius: 4,
                      transition: 'width 1s cubic-bezier(0.4, 0, 0.2, 1)'
                    }} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-secondary)' }}>
                    <span>Completed Modules: <strong>{activeAnalytics.overall_progress.completed_modules}</strong></span>
                    <span>Remaining Modules: <strong>{activeAnalytics.overall_progress.remaining_modules}</strong></span>
                  </div>
                </div>

                {/* ─── OVERALL BATCH LEADERBOARD ─── */}
                <div style={{ background: 'white', border: '1px solid var(--border-color)', borderRadius: 20, padding: 24, boxShadow: 'var(--shadow-sm)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
                    <h4 style={{ fontSize: 14, fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Crown size={16} color="#FBBF24" /> Overall Batch Leaderboard
                    </h4>
                    <span style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 600 }}>Top Performers</span>
                  </div>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {(overallLeaderboard && overallLeaderboard.length > 0 ? overallLeaderboard : [
                      { rank: 1, name: 'Sri', overall_score: 950, streak: 18 },
                      { rank: 2, name: 'Rahul', overall_score: 910, streak: 15 },
                      { rank: 3, name: 'Kavya', overall_score: 890, streak: 9 }
                    ]).map((s, idx) => {
                      const isTop1 = s.rank === 1;
                      const isTop2 = s.rank === 2;
                      const isTop3 = s.rank === 3;
                      const isCurrent = s.is_current || s.name === user.name;

                      return (
                        <div
                          key={idx}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '12px 16px',
                            background: isCurrent ? 'rgba(108,60,240,0.06)' : 'var(--surface-alt)',
                            border: `1.5px solid ${isCurrent ? 'var(--primary-color)' : 'var(--border-color)'}`,
                            borderRadius: 12,
                            transition: 'all 0.2s',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <div style={{ width: 26, height: 26, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: isTop1 ? 'rgba(251,191,36,0.15)' : isTop2 ? 'rgba(156,163,175,0.15)' : isTop3 ? 'rgba(217,119,6,0.15)' : 'rgba(255,255,255,0.8)', border: '1px solid var(--border-color)', fontSize: 12, fontWeight: 800 }}>
                              {isTop1 ? <Crown size={14} color="#D97706" /> : isTop2 ? <Medal size={14} color="#71717A" /> : isTop3 ? <Medal size={14} color="#B45309" /> : s.rank}
                            </div>
                            <span style={{ fontSize: 13.5, fontWeight: isCurrent ? 800 : 700, color: 'var(--text-primary)' }}>
                              {s.name} {isCurrent && <span style={{ fontSize: 10, color: 'var(--primary-color)', background: 'var(--primary-light)', padding: '2px 6px', borderRadius: 4, marginLeft: 4 }}>You</span>}
                            </span>
                          </div>
                          
                          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--primary-color)' }}>
                              {s.overall_score} pts
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#EF4444', fontWeight: 700 }}>
                              <Flame size={14} /> {s.streak}d
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* ─── SPECIALIZED LEADERBOARDS (GRID) ─── */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 24 }} className="dashboard-main-grid">
                  
                  {/* Mock Interview Leaderboard */}
                  <div style={{ background: 'white', border: '1px solid var(--border-color)', borderRadius: 20, padding: 20, boxShadow: 'var(--shadow-sm)' }}>
                    <h4 style={{ fontSize: 13.5, fontWeight: 800, margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Activity size={15} color="var(--primary-color)" /> Mock Interviews
                    </h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {(mockLeaderboard && mockLeaderboard.length > 0 ? mockLeaderboard : [
                        { rank: 1, name: 'Sri', average_score: 95, completed_interviews: 6 },
                        { rank: 2, name: 'Rahul', average_score: 91, completed_interviews: 5 },
                        { rank: 3, name: 'Kavya', average_score: 89, completed_interviews: 4 }
                      ]).slice(0, 5).map((s, idx) => {
                        const isCurrent = s.is_current || s.name === user.name;
                        const isTop1 = s.rank === 1;
                        const isTop2 = s.rank === 2;
                        const isTop3 = s.rank === 3;
                        return (
                          <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', background: isCurrent ? 'rgba(108,60,240,0.04)' : 'var(--surface-alt)', border: `1px solid ${isCurrent ? 'var(--primary-color)' : 'var(--border-color)'}`, borderRadius: 10, fontSize: 12.5 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center' }}>
                                {isTop1 ? <Crown size={12} color="#D97706" /> : isTop2 ? <Medal size={12} color="#71717A" /> : isTop3 ? <Medal size={12} color="#B45309" /> : `#${s.rank}`}
                              </span>
                              <span style={{ fontWeight: isCurrent ? 800 : 700 }}>{s.name}</span>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                              <span style={{ fontWeight: 700, color: 'var(--primary-color)' }}>{s.average_score}% Avg</span>
                              <div style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>{s.completed_interviews} Completed</div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Task Leaderboard */}
                  <div style={{ background: 'white', border: '1px solid var(--border-color)', borderRadius: 20, padding: 20, boxShadow: 'var(--shadow-sm)' }}>
                    <h4 style={{ fontSize: 13.5, fontWeight: 800, margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <FileText size={15} color="var(--primary-color)" /> Assignments & Tasks
                    </h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {(taskLeaderboard && taskLeaderboard.length > 0 ? taskLeaderboard : [
                        { rank: 1, name: 'Sri', completed_assignments: 8, submission_rate: 80 },
                        { rank: 2, name: 'Rahul', completed_assignments: 7, submission_rate: 70 },
                        { rank: 3, name: 'Kavya', completed_assignments: 6, submission_rate: 60 }
                      ]).slice(0, 5).map((s, idx) => {
                        const isCurrent = s.is_current || s.name === user.name;
                        const isTop1 = s.rank === 1;
                        const isTop2 = s.rank === 2;
                        const isTop3 = s.rank === 3;
                        return (
                          <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', background: isCurrent ? 'rgba(108,60,240,0.04)' : 'var(--surface-alt)', border: `1px solid ${isCurrent ? 'var(--primary-color)' : 'var(--border-color)'}`, borderRadius: 10, fontSize: 12.5 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center' }}>
                                {isTop1 ? <Crown size={12} color="#D97706" /> : isTop2 ? <Medal size={12} color="#71717A" /> : isTop3 ? <Medal size={12} color="#B45309" /> : `#${s.rank}`}
                              </span>
                              <span style={{ fontWeight: isCurrent ? 800 : 700 }}>{s.name}</span>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                              <span style={{ fontWeight: 700, color: 'var(--success-color)' }}>{s.completed_assignments} Done</span>
                              <div style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>{s.submission_rate}% Sub. Rate</div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* UPCOMING LECTURES */}
                <div className="card-premium">
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                    <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Calendar size={16} color="var(--primary-color)" /> Upcoming Lectures
                    </h3>
                    <button onClick={() => setActiveTab('my-courses')} style={{ background: 'var(--primary-light)', border: '1px solid var(--primary-border)', cursor: 'pointer', color: 'var(--primary-color)', fontSize: 12, fontWeight: 700, padding: '5px 12px', borderRadius: 20 }}>
                      View all
                    </button>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {dashboardData.upcomingLiveClasses?.length > 0
                      ? dashboardData.upcomingLiveClasses.slice(0, 3).map((c, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', background: 'var(--surface-alt)', borderRadius: 12, border: '1.5px solid var(--border-color)', borderLeft: '3px solid var(--primary-color)', transition: 'all 0.2s' }}
                          onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--primary-color)'; e.currentTarget.style.background = 'white'; e.currentTarget.style.boxShadow = 'var(--shadow-sm)'; }}
                          onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-color)'; e.currentTarget.style.background = 'var(--surface-alt)'; e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.borderLeft = '3px solid var(--primary-color)'; }}
                        >
                          <div style={{ width: 38, height: 38, borderRadius: 10, background: 'var(--primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary-color)', flexShrink: 0 }}>
                            <Video size={17} strokeWidth={1.75} />
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ margin: 0, fontSize: 13.5, fontWeight: 700, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.title}</p>
                            <p style={{ margin: '3px 0 0', fontSize: 11.5, color: 'var(--text-secondary)' }}>{c.instructor} · {c.date} · {c.time}</p>
                          </div>
                          <span style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--primary-color)', background: 'var(--primary-light)', padding: '4px 9px', borderRadius: 20, flexShrink: 0 }}>Soon</span>
                        </div>
                      ))
                      : <div style={{ textAlign: 'center', padding: '28px 0', color: 'var(--text-secondary)' }}>
                          <Calendar size={28} strokeWidth={1.5} style={{ marginBottom: 8, opacity: 0.4 }} />
                          <p style={{ fontSize: 13, margin: 0, fontWeight: 500 }}>No upcoming classes</p>
                        </div>
                    }
                  </div>
                </div>
              </div>

              {/* RIGHT COLUMN: LATEST REPLAYS, STUDY MATERIALS, ANNOUNCEMENTS */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

                {/* RECORDED CLASSES */}
                <div className="card-premium">
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
                    <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <PlayCircle size={17} color="var(--primary-color)" /> Latest Replays
                    </h3>
                    <button onClick={() => setActiveTab('recorded-classes-tab')} style={{ background: 'var(--primary-light)', border: '1px solid var(--primary-border)', cursor: 'pointer', color: 'var(--primary-color)', fontSize: 12, fontWeight: 700, padding: '5px 12px', borderRadius: 20 }}>
                      View all
                    </button>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {dashboardData.recordedClasses?.slice(0, 3).map((v, i) => (
                      <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'center', padding: '12px 14px', background: 'var(--surface-alt)', borderRadius: 12, border: '1.5px solid var(--border-color)', transition: 'all 0.2s', cursor: 'default' }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'white'; e.currentTarget.style.borderColor = 'var(--primary-border)'; e.currentTarget.style.boxShadow = 'var(--shadow-sm)'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'var(--surface-alt)'; e.currentTarget.style.borderColor = 'var(--border-color)'; e.currentTarget.style.boxShadow = 'none'; }}
                      >
                        <div style={{ width: 64, height: 42, borderRadius: 8, overflow: 'hidden', flexShrink: 0, background: 'linear-gradient(135deg, #6C3CF0, #4c22bc)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                          {v.thumbnail_url
                            ? <img src={v.thumbnail_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            : <span style={{ fontSize: 16, fontWeight: 800, color: 'rgba(255,255,255,0.3)' }}>{(v.title || 'V')[0]}</span>
                          }
                          {!isPaid && <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFF' }}><Lock size={12} /></div>}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ margin: 0, fontSize: 13, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text-primary)' }}>{v.title}</p>
                          <p style={{ margin: '3px 0 0', fontSize: 11, color: 'var(--text-secondary)' }}>{v.duration} · {v.instructor}</p>
                        </div>
                        {isPaid ? (
                          <button onClick={() => window.open(v.youtube_link || v.drive_link, '_blank')} style={{ padding: '6px 12px', fontSize: 11.5, borderRadius: 8, background: 'var(--primary-light)', border: '1px solid var(--primary-border)', color: 'var(--primary-color)', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0 }}>Watch</button>
                        ) : (
                          <span style={{ color: '#EF4444', flexShrink: 0 }}><Lock size={13} /></span>
                        )}
                      </div>
                    ))}
                    {(!dashboardData.recordedClasses || dashboardData.recordedClasses.length === 0) && (
                      <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-secondary)' }}>
                        <PlayCircle size={28} strokeWidth={1.5} style={{ marginBottom: 8, opacity: 0.4 }} />
                        <p style={{ fontSize: 13, margin: 0, fontWeight: 500 }}>No recordings available</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* STUDY MATERIALS */}
                <div className="card-premium">
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
                    <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <BookOpen size={17} color="var(--primary-color)" /> Study Materials
                    </h3>
                    <button onClick={() => setActiveTab('study-materials-tab')} style={{ background: 'var(--primary-light)', border: '1px solid var(--primary-border)', cursor: 'pointer', color: 'var(--primary-color)', fontSize: 12, fontWeight: 700, padding: '5px 12px', borderRadius: 20 }}>
                      View all
                    </button>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {dashboardData.studyMaterials?.slice(0, 3).map((m, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px', background: '#F8F9FC', borderRadius: 12, border: '1px solid #E8E8F2' }}>
                        <div style={{ width: 36, height: 36, borderRadius: 8, background: '#EAE6FD', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary-color)', flexShrink: 0 }}>
                          <FileText size={16} />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ margin: 0, fontSize: 13, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text-primary)' }}>{m.title}</p>
                          <p style={{ margin: '2px 0 0', fontSize: 11, color: 'var(--text-tertiary)' }}>{m.uploaded_at || m.type}</p>
                        </div>
                        {isPaid ? (
                          <a href={m.url} target="_blank" rel="noreferrer" className="btn btn-outline" style={{ padding: '5px 10px', fontSize: 11, borderRadius: 6, width: 'auto', textDecoration: 'none', flexShrink: 0 }}>Get</a>
                        ) : (
                          <span style={{ color: '#EF4444', flexShrink: 0 }}><Lock size={12} /></span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* ANNOUNCEMENTS */}
                <div className="card-premium">
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
                    <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Megaphone size={17} color="var(--primary-color)" /> Announcements
                    </h3>
                    <button onClick={() => setActiveTab('announcements-tab')} style={{ background: 'var(--primary-light)', border: '1px solid var(--primary-border)', cursor: 'pointer', color: 'var(--primary-color)', fontSize: 12, fontWeight: 700, padding: '5px 12px', borderRadius: 20 }}>
                      View all
                    </button>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {dashboardData.announcements?.slice(0, 3).map((a, i) => (
                      <div key={i} style={{ padding: '12px 14px', background: 'var(--surface-alt)', borderRadius: 12, border: '1.5px solid var(--border-color)', borderLeft: a.is_pinned ? '3px solid #F59E0B' : '1.5px solid var(--border-color)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                          <span style={{ fontSize: 10.5, fontWeight: 800, color: 'var(--primary-color)' }}>{a.date}</span>
                          {a.is_pinned && <span style={{ fontSize: 9, fontWeight: 800, color: '#F59E0B', textTransform: 'uppercase' }}>Pinned</span>}
                        </div>
                        <p style={{ margin: '0 0 2px', fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>{a.title}</p>
                        <p style={{ margin: 0, fontSize: 11.5, color: 'var(--text-secondary)', lineHeight: 1.4 }}>{a.content}</p>
                      </div>
                    ))}
                    {(!dashboardData.announcements || dashboardData.announcements.length === 0) && (
                      <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-secondary)' }}>
                        <Megaphone size={28} strokeWidth={1.5} style={{ marginBottom: 8, opacity: 0.4 }} />
                        <p style={{ fontSize: 13, margin: 0, fontWeight: 500 }}>No announcements yet</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}



        {/* ENROLLED / LIVE CLASSES TAB */}
        {activeTab === 'my-courses' && (
          <div className="dashboard-card-section">
            <div className="section-header-premium" style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 className="section-title-premium" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}><Video size={18} color="var(--primary-color)" /> Live Classes</h3>
              <button className="btn btn-outline" style={{ padding: '6px 12px', fontSize: 12 }} onClick={fetchLiveClasses}>Refresh Schedule</button>
            </div>
            {liveClassesList.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 20px', background: 'white', borderRadius: 18, border: '1px solid var(--border-color)' }}>
                <div style={{ fontSize: 36, marginBottom: 12 }}>📅</div>
                <h4 style={{ fontWeight: 800, fontSize: 16, margin: '0 0 6px' }}>No Live Classes Available</h4>
                <p style={{ color: 'var(--text-secondary)', fontSize: 13, maxWidth: 320, margin: '0 auto' }}>There are no published live sessions scheduled right now. Check back later!</p>
              </div>
            ) : (
              <div className="cards-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 24 }}>
                {liveClassesList.map((c, i) => {
                  const status = c.status || 'Upcoming';
                  let badgeBg = 'rgba(108,60,240,0.08)';
                  let badgeColor = '#6C3CF0';
                  if (status === 'Live') {
                    badgeBg = 'rgba(239,68,68,0.08)';
                    badgeColor = '#ef4444';
                  } else if (status === 'Completed') {
                    badgeBg = 'rgba(16,185,129,0.08)';
                    badgeColor = '#10b981';
                  }

                  return (
                    <div key={c._id || i} className="course-card" style={{ background: 'white', border: '1px solid var(--border-color)', borderRadius: 18, padding: 24, boxShadow: 'var(--shadow-sm)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', transition: 'all 0.3s ease' }}>
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--primary-color)', display: 'flex', alignItems: 'center', gap: 6 }}>
                            <BookOpen size={16} strokeWidth={1.75} /> Course Session
                          </span>
                          <span style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', padding: '3px 8px', borderRadius: 20, background: badgeBg, color: badgeColor, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                            {status === 'Live' && <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#ef4444', animation: 'pulse-dot 1.5s infinite' }} />}
                            {status}
                          </span>
                        </div>
                        <h4 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 10px', color: 'var(--text-primary)' }}>{c.title}</h4>
                        {c.description && (
                          <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: 16, display: 'flex', alignItems: 'flex-start', gap: 6 }}>
                            <FileText size={16} strokeWidth={1.75} style={{ marginTop: 2, flexShrink: 0 }} /> {c.description}
                          </p>
                        )}
                        
                        <div style={{ background: '#FAFADF', borderRadius: 12, padding: '12px 14px', marginBottom: 18, display: 'grid', gridTemplateColumns: '1fr', gap: 8, border: '1px solid #E8E8F0' }}>
                          <div style={{ fontSize: 12.5, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 8 }}>
                            <User size={16} strokeWidth={1.75} color="var(--text-secondary)" /> <span><strong>Trainer:</strong> {c.instructor}</span>
                          </div>
                          <div style={{ fontSize: 12.5, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 8 }}>
                            <Calendar size={16} strokeWidth={1.75} color="var(--text-secondary)" /> <span><strong>Date:</strong> {c.date}</span>
                          </div>
                          <div style={{ fontSize: 12.5, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 8 }}>
                            <Clock size={16} strokeWidth={1.75} color="var(--text-secondary)" /> <span><strong>Time:</strong> {c.time}</span>
                          </div>
                        </div>
                      </div>

                      <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: 16, marginTop: 4 }}>
                        {isPaid ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            <div style={{ fontSize: 12, color: 'var(--text-secondary)', wordBreak: 'break-all', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                              <ExternalLink size={16} strokeWidth={1.75} /> <span><strong>Meet Link:</strong> <a href={c.meet_link || c.join_url} target="_blank" rel="noreferrer" style={{ color: 'var(--primary-color)', fontWeight: 600 }}>{c.meet_link || c.join_url || 'N/A'}</a></span>
                            </div>
                            <button onClick={() => handleJoinLiveClass(c._id)} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, width: '100%', border: 'none', cursor: 'pointer', background: 'var(--primary-color)', color: 'white', padding: '10px', borderRadius: 10, fontWeight: 700, fontSize: 13.5 }}>
                              Join Now
                            </button>
                          </div>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            <div style={{ padding: '14px', background: '#FEF2F2', border: '1px solid #fee2e2', borderRadius: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 6 }}>
                              <Lock size={20} strokeWidth={1.75} color="#dc2626" />
                              <span style={{ fontSize: 12.5, fontWeight: 700, color: '#dc2626', lineHeight: 1.4 }}>Live class is locked until your fees are verified.</span>
                            </div>
                            <button className="btn" disabled style={{ opacity: 0.5, cursor: 'not-allowed', width: '100%', padding: '10px', background: '#F3F4F6', color: '#9CA3AF', border: '1px solid #E5E7EB' }}>
                              Join Now
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* RECORDED CLASSES TAB — premium Netflix-style */}
        {activeTab === 'recorded-classes-tab' && dashboardData && (
          <RecordedClassesPage dashboardData={dashboardData} isPaid={isPaid} />
        )}

        {/* STUDY MATERIALS TAB — premium Notion-style */}
        {activeTab === 'study-materials-tab' && dashboardData && (
          <StudyMaterialsPage dashboardData={dashboardData} isPaid={isPaid} />
        )}

        {/* ATTENDANCE TAB — premium GitHub heatmap */}
        {activeTab === 'attendance-tab' && dashboardData && (
          <AttendancePage dashboardData={dashboardData} />
        )}

        {/* FEES TAB — premium Stripe/Vercel dashboard */}
        {activeTab === 'fees-tab' && dashboardData && (
          <FeesPage dashboardData={dashboardData} onPayFees={payFees} paying={paying} />
        )}

        {/* ANNOUNCEMENTS TAB */}
        {activeTab === 'announcements-tab' && dashboardData && (
          <div className="dashboard-card-section">
            <div className="section-header-premium">
              <h3 className="section-title-premium"><Megaphone size={18} color="var(--primary-color)" /> All Announcements</h3>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {dashboardData.announcements?.map((a, i) => (
                <div key={i} style={{ padding: 20, borderRadius: 14, background: a.is_pinned ? 'rgba(108,60,240,0.03)' : 'white', border: `1.5px solid ${a.is_pinned ? 'rgba(108,60,240,0.2)' : 'var(--border-color)'}`, boxShadow: 'var(--shadow-sm)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <span style={{ fontSize: 9.5, fontWeight: 700, textTransform: 'uppercase', padding: '3px 8px', borderRadius: 5, background: a.priority === 'High' ? 'rgba(239,68,68,0.1)' : 'rgba(108,60,240,0.1)', color: a.priority === 'High' ? '#ef4444' : 'var(--primary-color)' }}>{a.priority}</span>
                      {a.is_pinned && <span style={{ fontSize: 11, color: 'var(--primary-color)', fontWeight: 700 }}>📌 Pinned</span>}
                    </div>
                    <span style={{ fontSize: 11.5, color: 'var(--text-secondary)' }}>{a.date}</span>
                  </div>
                  <h4 style={{ fontSize: 15, fontWeight: 800, margin: '0 0 6px' }}>{a.title}</h4>
                  <p style={{ fontSize: 13.5, color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>{a.content}</p>
                </div>
              ))}
            </div>
          </div>
        )}



        {/* PROFILE TAB — premium page component */}
        {activeTab === 'profile' && (
          <StudentProfile
            dashboardData={dashboardData}
            enrolledCourses={enrolledCourses}
            token={token}
          />
        )}

        {/* SETTINGS TAB */}
        {activeTab === 'settings' && (
          <StudentProfile
            dashboardData={dashboardData}
            enrolledCourses={enrolledCourses}
            token={token}
            initialSection="settings"
          />
        )}
      </main>

      {/* SUBMISSION MODAL */}
      {submitModalAssignment && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <h3 style={{ fontSize: 17, fontWeight: 800, margin: 0 }}>Submit: {submitModalAssignment.title}</h3>
              <button className="navbar-action-btn" onClick={() => setSubmitModalAssignment(null)}><X size={18} /></button>
            </div>
            <form onSubmit={submitAssignment}>
              <div className="form-group">
                <label className="form-label">Response / Link</label>
                <textarea className="form-input" style={{ height: 150, resize: 'none' }} value={submissionText} onChange={e => setSubmissionText(e.target.value)} placeholder="Type your response or paste GitHub/Drive links…" required />
              </div>
              <button type="submit" className="btn btn-primary btn-block">Confirm Submission</button>
            </form>
          </div>
        </div>
      )}

      {/* ACCESS RESTRICTED MODAL */}
      {showLockModal && (
        <CustomModal 
          isOpen={showLockModal} 
          onClose={() => setShowLockModal(false)}
          title="Access Restricted"
          type="error"
          confirmText="OK"
          onConfirm={() => setShowLockModal(false)}
        >
          <div style={{ textAlign: 'center', padding: '10px 6px' }}>
            <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--danger-color)', margin: '0 0 8px' }}>
              Your course fees are still pending.
            </p>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5, margin: '0 0 24px' }}>
              Please contact the Levlox Admin to activate your account and access Live Classes.
            </p>
          </div>
        </CustomModal>
      )}

      {/* GLOBAL TOAST/NOTIFICATION MODAL */}
      <CustomModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={modalTitle}
        type={modalType}
        confirmText="Dismiss"
        onConfirm={() => setModalOpen(false)}
      >
        <p style={{ fontSize: '14.5px', color: 'var(--text-secondary)' }}>{modalText}</p>
      </CustomModal>
    </div>
  );
};

export default StudentDashboard;
