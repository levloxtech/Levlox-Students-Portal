import React, { useState, useEffect } from 'react';
import {
  User, Mail, Phone, BookOpen, Calendar, Award, Lock,
  Edit3, Camera, CheckCircle, Star, Zap, GraduationCap,
  TrendingUp, Shield, Code, Cpu, Database, Globe, ArrowRight,
  Save, X, Eye, EyeOff, ChevronRight, CalendarCheck,
  Bell, Smartphone, Trash2, LogOut, Check, RefreshCw, Download
} from 'lucide-react';

const API_BASE = 'http://localhost:5000/api';

/* ─── Reusable helpers ─────────────────────────────── */
const ProgressBar = ({ pct = 0, color = '#6C3CF0', height = 7 }) => (
  <div style={{ background: 'rgba(0,0,0,0.06)', borderRadius: 99, height, overflow: 'hidden', width: '100%' }}>
    <div style={{
      height: '100%', borderRadius: 99, width: `${Math.min(pct, 100)}%`,
      background: `linear-gradient(90deg, ${color}bb, ${color})`,
      transition: 'width 1s cubic-bezier(0.4,0,0.2,1)'
    }} />
  </div>
);

const CircularProgress = ({ pct = 0, size = 72, stroke = 6, color = '#6C3CF0' }) => {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(0,0,0,0.07)" strokeWidth={stroke} />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={stroke}
        strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
        style={{ transition: 'stroke-dashoffset 1s cubic-bezier(0.4,0,0.2,1)' }} />
    </svg>
  );
};

const SkillTag = ({ label, color = '#6C3CF0' }) => (
  <span style={{
    display: 'inline-flex', alignItems: 'center', gap: 5,
    padding: '5px 14px', borderRadius: 20, fontSize: 12, fontWeight: 700,
    background: `${color}14`, color, border: `1px solid ${color}28`,
    transition: 'all 0.15s', cursor: 'default'
  }}
    onMouseEnter={e => { e.currentTarget.style.background = `${color}24`; e.currentTarget.style.transform = 'scale(1.04)'; }}
    onMouseLeave={e => { e.currentTarget.style.background = `${color}14`; e.currentTarget.style.transform = ''; }}>
    {label}
  </span>
);

const CertCard = ({ title, issuer, date, icon, color = '#6C3CF0', onDownload }) => (
  <div style={{
    background: `linear-gradient(135deg, ${color}08, ${color}04)`,
    border: `1px solid ${color}20`, borderRadius: 16, padding: 20,
    display: 'flex', alignItems: 'flex-start', gap: 14, transition: 'all 0.2s',
    position: 'relative', width: '100%'
  }}
    onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = `0 10px 28px ${color}18`; }}
    onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = ''; }}>
    <div style={{
      width: 46, height: 46, borderRadius: 12, flexShrink: 0,
      background: `linear-gradient(135deg, ${color}, ${color}cc)`,
      display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff'
    }}>{icon}</div>
    <div style={{ flex: 1 }}>
      <p style={{ fontSize: 14, fontWeight: 800, margin: '0 0 3px', color: '#121118' }}>{title}</p>
      <p style={{ fontSize: 12, color: '#6B7280', margin: '0 0 6px' }}>Issued by {issuer}</p>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 12, gap: 8, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 6, background: `${color}14`, color, fontWeight: 700 }}>{date}</span>
        <button onClick={onDownload} style={{ background: 'transparent', border: 'none', color: 'var(--primary-color)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 800, padding: 0 }}>
          <Download size={12} /> Download
        </button>
      </div>
    </div>
  </div>
);

/* ─── Main Component ───────────────────────────────── */
const StudentProfile = ({ dashboardData, enrolledCourses = [], token, initialSection = 'overview' }) => {
  const [activeSection, setActiveSection] = useState(initialSection);
  const [profileData, setProfileData] = useState(null);
  const [editing, setEditing] = useState(false);
  const [profileName, setProfileName] = useState('');
  const [profilePhone, setProfilePhone] = useState('');
  const [profileCollege, setProfileCollege] = useState('');
  const [profileCourse, setProfileCourse] = useState('');
  const [profilePic, setProfilePic] = useState('');
  const [profileBatch, setProfileBatch] = useState('');
  const [profileSkills, setProfileSkills] = useState('');
  const [currPassword, setCurrPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');

  // Settings extended state variables
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [otpVerified, setOtpVerified] = useState(false);
  const [tempPhone, setTempPhone] = useState('');

  // Notification Preferences state
  const [notifEmail, setNotifEmail] = useState(true);
  const [notifPush, setNotifPush] = useState(true);
  const [notifClassReminders, setNotifClassReminders] = useState(true);

  // Privacy & Security state
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [publicProfile, setPublicProfile] = useState(true);

  // Delete Account Confirmation state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

  useEffect(() => {
    if (profilePhone) {
      setTempPhone(profilePhone);
    }
  }, [profilePhone]);

  useEffect(() => { fetchProfile(); }, []);
  useEffect(() => { setActiveSection(initialSection); }, [initialSection]);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const fetchProfile = async () => {
    try {
      const r = await fetch(`${API_BASE}/student/profile`, { headers: { Authorization: `Bearer ${token}` } });
      if (r.ok) {
        const d = await r.json();
        setProfileData(d);
        setProfileName(d.name || '');
        setProfilePhone(d.phone || '');
        setProfileCollege(d.college || '');
        setProfileCourse(d.course || '');
        setProfilePic(d.profile_pic || '');
        setProfileBatch(d.batch || '2024-25');
        setProfileSkills(d.skills || '');
      }
    } catch (e) { console.error(e); }
  };

  const saveProfile = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      const r = await fetch(`${API_BASE}/student/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: profileName, phone: profilePhone, college: profileCollege, course: profileCourse, profile_pic: profilePic, batch: profileBatch, skills: profileSkills })
      });
      if (r.ok) { showToast('Profile updated successfully ✓'); fetchProfile(); setEditing(false); }
      else { const err = await r.json(); showToast(err.message || 'Failed to save'); }
    } catch (e) { console.error(e); } finally { setSaving(false); }
  };

  const changePassword = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) { showToast('Passwords do not match'); return; }
    try {
      const r = await fetch(`${API_BASE}/student/change-password`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ current_password: currPassword, new_password: newPassword })
      });
      const d = await r.json();
      if (r.ok) { showToast('Password updated ✓'); setCurrPassword(''); setNewPassword(''); setConfirmPassword(''); }
      else showToast(d.message || 'Failed');
    } catch (e) { console.error(e); }
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => setProfilePic(reader.result);
    reader.readAsDataURL(file);
  };

  const completion = () => {
    if (!profileData) return 0;
    const fields = [profileName, profilePhone, profileCollege, profileCourse, profilePic, profileBatch];
    return Math.round((fields.filter(Boolean).length / fields.length) * 100);
  };

  const skillsList = profileSkills
    ? profileSkills.split(',').map(s => s.trim()).filter(Boolean)
    : ['JavaScript', 'React.js', 'Node.js', 'Python', 'CSS', 'HTML5', 'Git', 'REST APIs'];

  const skillColors = ['#6C3CF0', '#10B981', '#F59E0B', '#EF4444', '#3B82F6', '#8B5CF6', '#06B6D4', '#EC4899'];

  const mockCourseProgress = enrolledCourses.slice(0, 5).map((c, i) => ({
    ...c, progress: [72, 45, 88, 33, 61][i % 5],
    color: ['#6C3CF0', '#10B981', '#F59E0B', '#3B82F6', '#EF4444'][i % 5]
  }));

  const mockCerts = [
    { title: 'React Developer Certification', issuer: 'Levlox Academy', date: 'June 2024', icon: <Code size={20} />, color: '#6C3CF0' },
    { title: 'Backend Engineering Badge', issuer: 'Levlox Academy', date: 'April 2024', icon: <Database size={20} />, color: '#10B981' },
    { title: 'Frontend Mastery Award', issuer: 'Levlox Academy', date: 'Feb 2024', icon: <Globe size={20} />, color: '#F59E0B' },
    { title: 'Python Programming Basics', issuer: 'Levlox Academy', date: 'Jan 2024', icon: <Cpu size={20} />, color: '#3B82F6' },
  ];

  const isPaid = dashboardData?.student?.feesStatus === 'Paid';
  const attendance = dashboardData?.student?.attendance || { percentage: 0, present: 0, absent: 0 };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: <User size={15} /> },
    { id: 'progress', label: 'Learning', icon: <TrendingUp size={15} /> },
    { id: 'certificates', label: 'Certificates', icon: <Award size={15} /> },
    { id: 'settings', label: 'Settings', icon: <Edit3 size={15} /> },
  ];

  if (!profileData && !dashboardData) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300 }}>
        <div style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
          <p>Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* TOAST */}
      {toast && (
        <div style={{ position: 'fixed', top: 24, right: 24, background: '#121118', color: '#fff', borderRadius: 12, padding: '12px 20px', fontSize: 13, fontWeight: 600, zIndex: 2000, boxShadow: '0 16px 32px rgba(0,0,0,0.2)', display: 'flex', alignItems: 'center', gap: 8, animation: 'slideIn 0.3s ease' }}>
          <CheckCircle size={15} color="#10B981" /> {toast}
        </div>
      )}

      {/* PAGE HEADER & TABS NAVIGATION */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h2 style={{ fontSize: 24, fontWeight: 800, margin: 0 }}>Student Profile</h2>
          <p style={{ margin: '4px 0 0', fontSize: 13.5, color: 'var(--text-secondary)' }}>Manage your details, progression, credentials, and settings.</p>
        </div>
        {/* TABS */}
        <div style={{ display: 'flex', gap: 4, background: 'white', padding: 6, borderRadius: 16, border: '1.5px solid var(--border-color)', boxShadow: 'var(--shadow-card)' }}>
          {tabs.map(t => (
            <button key={t.id} onClick={() => setActiveSection(t.id)} style={{
              display: 'flex', alignItems: 'center', gap: 7, padding: '10px 20px', borderRadius: 10,
              border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: 700,
              background: activeSection === t.id ? 'var(--primary-color)' : 'transparent',
              color: activeSection === t.id ? '#fff' : 'var(--text-secondary)',
              boxShadow: activeSection === t.id ? '0 4px 14px rgba(108,60,240,0.28)' : 'none',
              transition: 'all 0.18s'
            }}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* ════ OVERVIEW TAB ════ */}
      {activeSection === 'overview' && (
        <div>
          {/* ── REDESIGNED PREMIUM HERO COVER ── */}
          <div className="profile-cover-premium">
            <div className="profile-cover-orbs" style={{ width: 320, height: 320, background: 'radial-gradient(circle, rgba(108,60,240,0.18) 0%, transparent 70%)', top: -120, right: 80, position: 'absolute' }} />
            <div className="profile-cover-orbs" style={{ width: 200, height: 200, background: 'radial-gradient(circle, rgba(59,130,246,0.12) 0%, transparent 70%)', bottom: -80, left: 200, position: 'absolute' }} />
            <div style={{ position: 'absolute', inset: 0, background: 'repeating-linear-gradient(45deg, transparent, transparent 40px, rgba(255,255,255,0.01) 40px, rgba(255,255,255,0.01) 80px)' }} />
          </div>

          {/* ── REDESIGNED PREMIUM PROFILE CARD ── */}
          <div className="profile-card-premium">
            {/* Avatar */}
            <div className="profile-avatar-wrapper">
              <div className="profile-avatar-inner">
                {profilePic ? (
                  <img src={profilePic} alt="avatar" className="profile-avatar-img" />
                ) : (
                  <div className="profile-avatar-placeholder">
                    {(profileName || 'S')[0].toUpperCase()}
                  </div>
                )}
              </div>
              <label className="profile-avatar-upload-badge">
                <Camera size={14} />
                <input type="file" accept="image/*" onChange={handleImageUpload} style={{ display: 'none' }} />
              </label>
            </div>

            {/* Profile Info */}
            <div className="profile-info-premium">
              <div className="profile-name-row">
                <h1 className="profile-name-title">{profileName || dashboardData?.student?.name}</h1>
                <span style={{ padding: '3px 10px', background: 'rgba(108,60,240,0.1)', color: 'var(--primary-color)', borderRadius: 20, fontSize: 12, fontWeight: 700, border: '1px solid rgba(108,60,240,0.2)' }}>Student</span>
                {isPaid && <span style={{ padding: '3px 10px', background: 'rgba(16,185,129,0.1)', color: '#10B981', borderRadius: 20, fontSize: 12, fontWeight: 700, border: '1px solid rgba(16,185,129,0.2)' }}>Fees Clear</span>}
              </div>

              <div className="profile-details-grid">
                <div className="profile-detail-item">
                  <Mail size={14.5} color="var(--primary-color)" />
                  <span>{profileData?.email || dashboardData?.student?.email}</span>
                </div>
                <div className="profile-detail-item">
                  <Calendar size={14.5} color="var(--primary-color)" />
                  <span>Batch {profileBatch || '2024–25'}</span>
                </div>
                <div className="profile-detail-item">
                  <GraduationCap size={14.5} color="var(--primary-color)" />
                  <span>{profileCourse || dashboardData?.student?.course || 'Student'}</span>
                </div>
              </div>

              {/* Profile completion bar */}
              <div className="profile-progress-container">
                <ProgressBar pct={completion()} color="var(--primary-color)" height={6} />
                <span className="profile-progress-text">{completion()}% profile completed</span>
              </div>
            </div>
          </div>

          {/* ── REDESIGNED PREMIUM STATISTICS CONTAINER ── */}
          <div className="profile-stats-container">
            {/* Attendance Card */}
            <div className="profile-stat-card">
              <div className="profile-stat-header">
                <span className="profile-stat-title">Attendance</span>
                <div className="profile-stat-icon-wrapper" style={{ color: '#10B981', background: 'rgba(16, 185, 129, 0.1)' }}>
                  <CalendarCheck size={20} />
                </div>
              </div>
              <div className="profile-stat-body">
                <div className="profile-stat-value" style={{ color: '#10B981' }}>{attendance.percentage || 92}%</div>
                <p className="profile-stat-desc">Overall Attendance</p>
              </div>
            </div>

            {/* Courses Card */}
            <div className="profile-stat-card">
              <div className="profile-stat-header">
                <span className="profile-stat-title">Courses</span>
                <div className="profile-stat-icon-wrapper" style={{ color: '#6C3CF0', background: 'rgba(108, 60, 240, 0.1)' }}>
                  <BookOpen size={20} />
                </div>
              </div>
              <div className="profile-stat-body">
                <div className="profile-stat-value" style={{ color: '#6C3CF0' }}>{enrolledCourses.length || 2}</div>
                <p className="profile-stat-desc">Enrolled Courses</p>
              </div>
            </div>

            {/* Certificates Card */}
            <div className="profile-stat-card">
              <div className="profile-stat-header">
                <span className="profile-stat-title">Certificates</span>
                <div className="profile-stat-icon-wrapper" style={{ color: '#F59E0B', background: 'rgba(245, 158, 11, 0.1)' }}>
                  <Award size={20} />
                </div>
              </div>
              <div className="profile-stat-body">
                <div className="profile-stat-value" style={{ color: '#F59E0B' }}>{mockCerts.length || 4}</div>
                <p className="profile-stat-desc">Certificates Earned</p>
              </div>
            </div>
          </div>

          {/* Details & Cards Layout */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 24 }} className="dashboard-main-grid">
            {/* Left Column */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {/* Personal Info Card */}
              <div style={{ background: 'white', border: '1.5px solid var(--border-color)', borderRadius: 20, padding: 28, boxShadow: 'var(--shadow-card)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 }}>
                  <h3 style={{ fontSize: 16, fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}><User size={17} color="var(--primary-color)" /> Personal Information</h3>
                  <button onClick={() => { setActiveSection('settings'); setEditing(true); }} style={{ background: 'var(--primary-light)', border: '1px solid var(--primary-border)', borderRadius: 8, padding: '7px 14px', fontSize: 12, fontWeight: 700, color: 'var(--primary-color)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, fontFamily: 'inherit' }}>
                    <Edit3 size={12} /> Edit
                  </button>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  {[
                    { label: 'Full Name', val: profileName || '—', icon: <User size={14} />, color: '#6C3CF0' },
                    { label: 'Email Address', val: profileData?.email || dashboardData?.student?.email || '—', icon: <Mail size={14} />, color: '#10B981' },
                    { label: 'Phone', val: profilePhone || 'Not added', icon: <Phone size={14} />, color: '#F59E0B' },
                    { label: 'College', val: profileCollege || 'Not added', icon: <GraduationCap size={14} />, color: '#3B82F6' },
                    { label: 'Course', val: profileCourse || 'Not added', icon: <BookOpen size={14} />, color: '#8B5CF6' },
                    { label: 'Batch', val: profileBatch || '2024–25', icon: <Calendar size={14} />, color: '#EC4899' },
                  ].map((f, i) => (
                    <div key={i} style={{ padding: '16px', background: 'var(--surface-alt)', borderRadius: 12, border: '1.5px solid var(--border-color)', transition: 'all 0.2s' }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--primary-border)'; e.currentTarget.style.background = 'white'; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-color)'; e.currentTarget.style.background = 'var(--surface-alt)'; }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 6, color: f.color }}>
                        {f.icon}<span style={{ fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.4 }}>{f.label}</span>
                      </div>
                      <p style={{ fontSize: 14, fontWeight: 700, margin: 0, color: 'var(--text-primary)', wordBreak: 'break-all' }}>{f.val}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Skills */}
              <div style={{ background: 'white', border: '1px solid var(--border-color)', borderRadius: 20, padding: 28, boxShadow: 'var(--shadow-sm)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
                  <h3 style={{ fontSize: 16, fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}><Zap size={17} color="var(--primary-color)" /> Skills & Technologies</h3>
                  <span style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 600 }}>{skillsList.length} skills</span>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {skillsList.map((s, i) => <SkillTag key={i} label={s} color={skillColors[i % skillColors.length]} />)}
                </div>
              </div>

              {/* Recent Activity Card */}
              <div style={{ background: 'white', border: '1px solid var(--border-color)', borderRadius: 20, padding: 28, boxShadow: 'var(--shadow-sm)' }}>
                <h3 style={{ fontSize: 16, fontWeight: 800, margin: '0 0 20px', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Zap size={17} color="var(--primary-color)" /> Recent Activity
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {[
                    { title: 'Completed Module 4: Advanced Context API', desc: 'React Developer Course', time: '2 hours ago' },
                    { title: 'Attended Live Class: Node.js Performance Tuning', desc: 'Backend Engineering Program', time: 'Yesterday' },
                    { title: 'Earned Course Certificate: Frontend Mastery', desc: 'Levlox Academy Accreditation', time: '3 days ago' },
                    { title: 'Semester Tuition Payment Successful', desc: 'Transaction ID: TXN987654321', time: '1 week ago' }
                  ].map((act, idx) => (
                    <div key={idx} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                      <div style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--primary-color)', marginTop: 6, flexShrink: 0 }} />
                      <div style={{ flex: 1 }}>
                        <p style={{ margin: 0, fontSize: 13.5, fontWeight: 700, color: 'var(--text-primary)' }}>{act.title}</p>
                        <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--text-secondary)' }}>{act.desc}</p>
                      </div>
                      <span style={{ fontSize: 11, color: 'var(--text-tertiary)', fontWeight: 600, flexShrink: 0 }}>{act.time}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Column */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {/* Profile completion */}
              <div style={{ background: 'linear-gradient(135deg, #0B0A0F, #1a1625)', border: 'none', borderRadius: 20, padding: 26, boxShadow: '0 12px 32px rgba(108,60,240,0.18)' }}>
                <h3 style={{ fontSize: 14, fontWeight: 700, margin: '0 0 18px', color: '#9CA3AF', display: 'flex', alignItems: 'center', gap: 7 }}><Star size={14} color="#a78bfa" /> Profile Completion</h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                  <div style={{ position: 'relative', flexShrink: 0 }}>
                    <CircularProgress pct={completion()} size={80} stroke={7} color="#6C3CF0" />
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 800, color: '#fff' }}>{completion()}%</div>
                  </div>
                  <div style={{ flex: 1 }}>
                    {[
                      { label: 'Name', done: !!profileName },
                      { label: 'Phone', done: !!profilePhone },
                      { label: 'College', done: !!profileCollege },
                      { label: 'Course', done: !!profileCourse },
                      { label: 'Photo', done: !!profilePic },
                      { label: 'Batch', done: !!profileBatch },
                    ].map((item, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 5 }}>
                        {item.done
                          ? <CheckCircle size={12} color="#10B981" />
                          : <div style={{ width: 12, height: 12, borderRadius: '50%', border: '2px solid #4B5563', flexShrink: 0 }} />
                        }
                        <span style={{ fontSize: 12, color: item.done ? '#D1D5DB' : '#6B7280', fontWeight: item.done ? 600 : 500 }}>{item.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Academic Stats */}
              <div style={{ background: 'white', border: '1px solid var(--border-color)', borderRadius: 20, padding: 26, boxShadow: 'var(--shadow-sm)' }}>
                <h3 style={{ fontSize: 15, fontWeight: 800, margin: '0 0 18px', display: 'flex', alignItems: 'center', gap: 8 }}><Shield size={16} color="var(--primary-color)" /> Academic Standing</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {[
                    { label: 'Attendance', val: attendance.percentage + '%', pct: Number(attendance.percentage), color: '#10B981' },
                    { label: 'Course Completion', val: `${enrolledCourses.length > 0 ? Math.round(mockCourseProgress.reduce((s, c) => s + c.progress, 0) / Math.max(mockCourseProgress.length, 1)) : 0}%`, pct: enrolledCourses.length > 0 ? Math.round(mockCourseProgress.reduce((s, c) => s + c.progress, 0) / Math.max(mockCourseProgress.length, 1)) : 0, color: '#6C3CF0' },
                    { label: 'Fees Paid', val: isPaid ? '100%' : Math.round((dashboardData?.student?.feesPaidAmount / Math.max(dashboardData?.student?.feesTotal, 1)) * 100) + '%', pct: isPaid ? 100 : Math.round((dashboardData?.student?.feesPaidAmount / Math.max(dashboardData?.student?.feesTotal, 1)) * 100), color: isPaid ? '#10B981' : '#EF4444' },
                  ].map((item, i) => (
                    <div key={i}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{item.label}</span>
                        <span style={{ fontSize: 13, fontWeight: 800, color: item.color }}>{item.val}</span>
                      </div>
                      <ProgressBar pct={item.pct} color={item.color} height={7} />
                    </div>
                  ))}
                </div>
              </div>

              {/* Enrollment info */}
              <div style={{ background: 'rgba(108,60,240,0.03)', border: '1px solid rgba(108,60,240,0.12)', borderRadius: 20, padding: 22 }}>
                <h3 style={{ fontSize: 14, fontWeight: 700, margin: '0 0 14px', color: 'var(--primary-color)', display: 'flex', alignItems: 'center', gap: 7 }}><Calendar size={14} /> Enrollment Details</h3>
                {[
                  { label: 'Student ID', val: dashboardData?.student?.rollNumber || 'LSP-2026' },
                  { label: 'Enrolled On', val: profileData?.join_date || dashboardData?.student?.enrollmentDate || '—' },
                  { label: 'Academic Year', val: profileBatch || '2024–2025' },
                  { label: 'Fee Status', val: dashboardData?.student?.feesStatus || '—' },
                ].map((f, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: i < 3 ? '1px solid rgba(108,60,240,0.08)' : 'none' }}>
                    <span style={{ fontSize: 12.5, color: 'var(--text-secondary)', fontWeight: 500 }}>{f.label}</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>{f.val}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ════ LEARNING PROGRESS TAB ════ */}
      {activeSection === 'progress' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 24 }} className="dashboard-main-grid">
          {/* Left: Courses & Schedule */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
            <div style={{ background: 'white', border: '1px solid var(--border-color)', borderRadius: 20, padding: 28, boxShadow: 'var(--shadow-sm)' }}>
              <h3 style={{ fontSize: 16, fontWeight: 800, margin: '0 0 22px', display: 'flex', alignItems: 'center', gap: 8 }}><BookOpen size={17} color="var(--primary-color)" /> Course Progress</h3>
              {enrolledCourses.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 0' }}>
                  <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>No courses enrolled yet</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                  {mockCourseProgress.map((c, i) => (
                    <div key={c._id || i}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{ width: 32, height: 32, borderRadius: 8, background: `linear-gradient(135deg, ${c.color}, ${c.color}cc)`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', flexShrink: 0 }}>
                            <BookOpen size={14} />
                          </div>
                          <div>
                            <p style={{ margin: 0, fontSize: 13.5, fontWeight: 700 }}>{c.title}</p>
                            <p style={{ margin: 0, fontSize: 11.5, color: 'var(--text-secondary)' }}>{c.instructor}</p>
                          </div>
                        </div>
                        <span style={{ fontSize: 13, fontWeight: 800, color: c.color, flexShrink: 0, marginLeft: 8 }}>{c.progress}%</span>
                      </div>
                      <ProgressBar pct={c.progress} color={c.color} height={8} />
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 5 }}>
                        <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{Math.round(c.progress / 10)} / 10 modules</span>
                        <span style={{ fontSize: 11, color: c.color, fontWeight: 600 }}>{c.progress < 100 ? 'In Progress' : 'Completed'}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Live Classes Card */}
            <div style={{ background: 'white', border: '1px solid var(--border-color)', borderRadius: 20, padding: 28, boxShadow: 'var(--shadow-sm)' }}>
              <h3 style={{ fontSize: 16, fontWeight: 800, margin: '0 0 18px', display: 'flex', alignItems: 'center', gap: 7 }}><TrendingUp size={16} color="var(--primary-color)" /> Upcoming Live Classes</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {[
                  { topic: 'Advanced React: Suspense & Server Components', date: 'July 10, 4:00 PM', instructor: 'Sarah Connor', status: 'Join Scheduled' },
                  { topic: 'REST API Best Practices & Middleware Integration', date: 'July 12, 6:00 PM', instructor: 'David Miller', status: 'Join Scheduled' },
                ].map((live, idx) => (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: 'var(--surface-alt)', borderRadius: 12, border: '1px solid var(--border-color)' }}>
                    <div>
                      <p style={{ margin: 0, fontSize: 13.5, fontWeight: 700, color: 'var(--text-primary)' }}>{live.topic}</p>
                      <p style={{ margin: '3px 0 0', fontSize: 12, color: 'var(--text-secondary)' }}>{live.date} · Instructor: {live.instructor}</p>
                    </div>
                    <span style={{ fontSize: 11.5, background: 'rgba(108,60,240,0.1)', color: 'var(--primary-color)', padding: '4px 10px', borderRadius: 8, fontWeight: 700 }}>{live.status}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right: Streak & Logs */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
            <div style={{ background: 'linear-gradient(135deg, #0B0A0F, #1a1625)', borderRadius: 20, padding: 26 }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, margin: '0 0 16px', color: '#9CA3AF' }}>Weekly Study Activity</h3>
              <div style={{ display: 'flex', gap: 8 }}>
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, i) => {
                  const heights = [85, 60, 90, 45, 75, 30, 10];
                  return (
                    <div key={day} style={{ flex: 1, textAlign: 'center' }}>
                      <div style={{ height: 80, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', marginBottom: 6 }}>
                        <div style={{ width: '70%', height: `${heights[i]}%`, borderRadius: 6, background: heights[i] > 50 ? 'linear-gradient(180deg,#6C3CF0,#4c22bc)' : heights[i] > 20 ? 'linear-gradient(180deg,rgba(108,60,240,0.5),rgba(76,34,188,0.5))' : 'rgba(255,255,255,0.06)', transition: 'height 0.8s ease' }} />
                      </div>
                      <span style={{ fontSize: 10, color: '#6B7280' }}>{day[0]}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Recorded Classes Card */}
            <div style={{ background: 'white', border: '1px solid var(--border-color)', borderRadius: 20, padding: 28, boxShadow: 'var(--shadow-sm)' }}>
              <h3 style={{ fontSize: 15, fontWeight: 800, margin: '0 0 18px', display: 'flex', alignItems: 'center', gap: 7 }}><BookOpen size={16} color="var(--primary-color)" /> Recently Recorded Lectures</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {[
                  { title: 'Intro to JSX & State management', duration: '45 mins', date: 'July 05, 2026' },
                  { title: 'Connecting React with Express API', duration: '60 mins', date: 'July 03, 2026' },
                  { title: 'Database Schema Design & MongoDB', duration: '75 mins', date: 'June 28, 2026' },
                ].map((rec, idx) => (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', borderBottom: idx < 2 ? '1px solid var(--border-color)' : 'none' }}>
                    <div>
                      <p style={{ margin: 0, fontSize: 13.5, fontWeight: 700, color: 'var(--text-primary)' }}>{rec.title}</p>
                      <p style={{ margin: '3px 0 0', fontSize: 12, color: 'var(--text-secondary)' }}>Published: {rec.date}</p>
                    </div>
                    <span style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600 }}>{rec.duration}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Study Materials Card */}
            <div style={{ background: 'white', border: '1px solid var(--border-color)', borderRadius: 20, padding: 28, boxShadow: 'var(--shadow-sm)' }}>
              <h3 style={{ fontSize: 15, fontWeight: 800, margin: '0 0 18px', display: 'flex', alignItems: 'center', gap: 7 }}><GraduationCap size={16} color="var(--primary-color)" /> Recommended Study Materials</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {[
                  { file: 'React Hooks Cheat Sheet.pdf', size: '1.4 MB' },
                  { file: 'Express Middleware Architecture Guide.pdf', size: '2.8 MB' },
                  { file: 'Database Optimization Slides.pdf', size: '4.2 MB' },
                ].map((mat, idx) => (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: 'var(--surface-alt)', borderRadius: 12, border: '1px solid var(--border-color)' }}>
                    <div>
                      <p style={{ margin: 0, fontSize: 13.5, fontWeight: 700, color: 'var(--text-primary)' }}>{mat.file}</p>
                      <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--text-secondary)' }}>Size: {mat.size}</p>
                    </div>
                    <button onClick={() => showToast(`Downloading ${mat.file}...`)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--primary-color)', display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 700, padding: 0 }}>
                      <Download size={14} /> Download
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ════ CERTIFICATES TAB ════ */}
      {activeSection === 'certificates' && (
        <div>
          <div style={{ background: 'linear-gradient(135deg, rgba(108,60,240,0.04), rgba(108,60,240,0.01))', border: '1px dashed rgba(108,60,240,0.2)', borderRadius: 16, padding: '18px 24px', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 14 }}>
            <Award size={24} color="var(--primary-color)" />
            <div>
              <p style={{ margin: 0, fontSize: 14, fontWeight: 800 }}>You have earned {mockCerts.length} certificate{mockCerts.length !== 1 ? 's' : ''}</p>
              <p style={{ margin: 0, fontSize: 12.5, color: 'var(--text-secondary)', marginTop: 3 }}>Keep learning to unlock more badges and recognition.</p>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 18 }}>
            {mockCerts.map((c, i) => <CertCard key={i} {...c} onDownload={() => showToast(`Downloading ${c.title}...`)} />)}
          </div>
          {/* Locked upcoming */}
          <div style={{ marginTop: 24 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 14, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 6 }}><Lock size={16} strokeWidth={1.75} /> Upcoming Certificates</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 14 }}>
              {['Advanced System Design', 'Cloud Deployment Mastery', 'Machine Learning Fundamentals'].map((t, i) => (
                <div key={i} style={{ border: '1px dashed var(--border-color)', borderRadius: 14, padding: 18, display: 'flex', alignItems: 'center', gap: 12, opacity: 0.6 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Lock size={16} color="var(--primary-color)" /></div>
                  <div>
                    <p style={{ margin: 0, fontSize: 13.5, fontWeight: 700 }}>{t}</p>
                    <p style={{ margin: '3px 0 0', fontSize: 11.5, color: 'var(--text-secondary)' }}>Complete the course to unlock</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ════ SETTINGS TAB ════ */}
      {activeSection === 'settings' && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 24 }} className="dashboard-main-grid">
            {/* Left Column */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              {/* Edit Profile */}
              <div style={{ background: 'white', border: '1px solid var(--border-color)', borderRadius: 20, padding: 28, boxShadow: 'var(--shadow-sm)' }}>
                <h3 style={{ fontSize: 16, fontWeight: 800, margin: '0 0 22px', display: 'flex', alignItems: 'center', gap: 8 }}><Edit3 size={17} color="var(--primary-color)" /> Profile & Details</h3>
                
                {/* Photo Upload Section */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 24, paddingBottom: 20, borderBottom: '1px solid var(--border-color)' }}>
                  <div style={{ width: 80, height: 80, borderRadius: '50%', overflow: 'hidden', background: 'var(--primary-light)', border: '3px solid white', boxShadow: 'var(--shadow-sm)' }}>
                    {profilePic ? (
                      <img src={profilePic} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg,#6C3CF0,#4c22bc)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, fontWeight: 800, color: '#fff' }}>
                        {(profileName || 'S')[0].toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div>
                    <p style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>Profile Picture</p>
                    <p style={{ margin: '2px 0 10px', fontSize: 12, color: 'var(--text-secondary)' }}>PNG or JPG. Max size 2MB.</p>
                    <label className="btn btn-outline btn-sm" style={{ cursor: 'pointer' }}>
                      Upload New Photo
                      <input type="file" accept="image/*" onChange={handleImageUpload} style={{ display: 'none' }} />
                    </label>
                  </div>
                </div>

                <form onSubmit={saveProfile}>
                  {[
                    { label: 'Full Name', val: profileName, set: setProfileName, type: 'text', required: true },
                    { label: 'College', val: profileCollege, set: setProfileCollege, type: 'text' },
                    { label: 'Course / Stream', val: profileCourse, set: setProfileCourse, type: 'text' },
                  ].map((f, i) => (
                    <div key={i} className="form-group">
                      <label className="form-label">{f.label}</label>
                      <input type={f.type} className="form-input" value={f.val} onChange={e => f.set(e.target.value)} required={f.required} placeholder={f.placeholder || ''} />
                    </div>
                  ))}
                  <div className="form-group">
                    <label className="form-label">Skills (comma-separated)</label>
                    <textarea className="form-input" value={profileSkills} onChange={e => setProfileSkills(e.target.value)} placeholder="React, Python, Node.js…" style={{ height: 80, resize: 'vertical' }} />
                  </div>
                  <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '12px' }} disabled={saving}>
                    <Save size={14} /> {saving ? 'Saving...' : 'Save Profile Details'}
                  </button>
                </form>
              </div>
            </div>

            {/* Right Column */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              {/* Change Password */}
              <div style={{ background: 'white', border: '1px solid var(--border-color)', borderRadius: 20, padding: 28, boxShadow: 'var(--shadow-sm)' }}>
                <h3 style={{ fontSize: 16, fontWeight: 800, margin: '0 0 22px', display: 'flex', alignItems: 'center', gap: 8 }}><Lock size={17} color="var(--primary-color)" /> Security Settings</h3>
                <div style={{ background: 'rgba(108,60,240,0.03)', border: '1px solid rgba(108,60,240,0.1)', borderRadius: 12, padding: '12px 16px', marginBottom: 20, fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  Use a strong password with at least 8 characters, numbers, and symbols.
                </div>
                <form onSubmit={changePassword}>
                  <div className="form-group">
                    <label className="form-label">Current Password</label>
                    <div style={{ position: 'relative' }}>
                      <input type={showPw ? 'text' : 'password'} className="form-input" value={currPassword} onChange={e => setCurrPassword(e.target.value)} required style={{ paddingRight: 40 }} />
                      <button type="button" onClick={() => setShowPw(!showPw)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                        {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">New Password</label>
                    <input type={showPw ? 'text' : 'password'} className="form-input" value={newPassword} onChange={e => setNewPassword(e.target.value)} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Confirm New Password</label>
                    <input type={showPw ? 'text' : 'password'} className="form-input" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required />
                    {confirmPassword && newPassword !== confirmPassword && (
                      <p style={{ fontSize: 11.5, color: '#EF4444', marginTop: 6, fontWeight: 600 }}>Passwords do not match</p>
                    )}
                  </div>
                  <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '12px' }} disabled={newPassword !== confirmPassword && !!confirmPassword}>
                    <Lock size={14} /> Update Password
                  </button>
                </form>
              </div>

              {/* Change Mobile & Email */}
              <div style={{ background: 'white', border: '1px solid var(--border-color)', borderRadius: 20, padding: 28, boxShadow: 'var(--shadow-sm)' }}>
                <h3 style={{ fontSize: 16, fontWeight: 800, margin: '0 0 20px', display: 'flex', alignItems: 'center', gap: 8 }}><Smartphone size={17} color="var(--primary-color)" /> Contact Settings</h3>
                
                {/* Mobile OTP Flow */}
                <div style={{ marginBottom: 20 }}>
                  <label className="form-label">Change Mobile Number</label>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <input type="tel" className="form-input" value={tempPhone} onChange={e => setTempPhone(e.target.value)} disabled={otpVerified} />
                    {!otpSent && !otpVerified && (
                      <button type="button" onClick={() => { setOtpSent(true); showToast('Mock OTP Code Sent to ' + tempPhone); }} className="btn btn-secondary btn-sm" disabled={!tempPhone}>
                        Send OTP
                      </button>
                    )}
                  </div>
                  {otpSent && !otpVerified && (
                    <div style={{ marginTop: 12, display: 'flex', gap: 10, alignItems: 'center' }}>
                      <input type="text" placeholder="Enter 6-digit OTP" className="form-input" value={otpCode} onChange={e => setOtpCode(e.target.value)} style={{ maxWidth: 140 }} />
                      <button type="button" onClick={() => { setOtpVerified(true); setOtpSent(false); setProfilePhone(tempPhone); showToast('Phone Number Verified successfully ✓'); }} className="btn btn-primary btn-sm">
                        Verify & Save
                      </button>
                    </div>
                  )}
                  {otpVerified && (
                    <p style={{ fontSize: 12, color: 'var(--success-color)', marginTop: 8, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <CheckCircle size={13} color="var(--success-color)" /> Mobile verified & updated!
                    </p>
                  )}
                </div>

                {/* Email Change */}
                <div>
                  <label className="form-label">Email Address (Read-only)</label>
                  <input type="email" className="form-input" value={profileData?.email || dashboardData?.student?.email} disabled style={{ opacity: 0.7 }} />
                  <p style={{ fontSize: 11.5, color: 'var(--text-tertiary)', marginTop: 6 }}>Email updates are managed by the Portal Administrator.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentProfile;
