import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Clock, GraduationCap, Users, Video, Percent, PlayCircle,
  Megaphone, Settings, LogOut, CheckCircle, Plus, Pencil, Trash2,
  Lock, Key, Eye, EyeOff, Save, Menu, ChevronLeft, ChevronRight, X, ExternalLink
} from 'lucide-react';
import leveloxIcon from '../assets/levelox-icon-transparent.png';
import CustomModal from '../components/Modal';
import { useAuth } from '../context/AuthContext';
import {
  getDocument,
  getDocuments,
  updateDocumentFields,
  getBatches,
  getStudentsByBatch,
  getLiveClasses,
  addLiveClass,
  updateLiveClass,
  deleteLiveClass,
  getAttendanceByBatchAndDate,
  saveBatchAttendance,
  getAttendanceForStudent,
  updateStudent,
  getRecordedClasses,
  getAnnouncements,
  addAnnouncement,
  deleteAnnouncement,
  uploadProfileImage,
  classifyFirestoreError,
} from '../services/firebaseService';
import { changeOwnPassword, validatePasswordStrength, describeAuthError } from '../services/authService';

const TrainerDashboard = () => {
  const navigate = useNavigate();
  const { currentUser, userProfile, logout: authLogout, uid, applyProfilePatch, refreshProfile } = useAuth();
  const queryClient = useQueryClient();

  const trainer = userProfile || {};

  const [activeTab, setActiveTab] = useState('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [modalText, setModalText] = useState('');
  const [modalType, setModalType] = useState('info');

  const showModal = (title, text, type = 'info') => {
    setModalTitle(title);
    setModalText(text);
    setModalType(type);
    setModalOpen(true);
  };

  // Mandatory First Login Password Lock Guard
  const mustChangePassword = trainer.mustChangePassword === true;
  useEffect(() => {
    if (mustChangePassword && activeTab !== 'settings') {
      setActiveTab('settings');
    }
  }, [mustChangePassword, activeTab]);

  // Load Trainer's assigned batches
  const assignedBatchIds = useMemo(() => {
    if (!trainer) return [];
    return trainer.assigned_batch_ids || [];
  }, [trainer]);

  const { data: allBatches = [] } = useQuery({
    queryKey: ['trainerBatches', uid],
    queryFn: getBatches,
    staleTime: 2 * 60 * 1000,
  });

  const myBatches = useMemo(() => {
    if (!trainer) return [];
    return allBatches.filter(b => 
      assignedBatchIds.includes(b.id) || 
      b.trainer_uid === uid || 
      b.trainer_id === trainer.trainer_id ||
      b.trainer_id === trainer.trainerId ||
      b.trainer_name === trainer.name
    );
  }, [allBatches, assignedBatchIds, uid, trainer]);

  // Selected Batch for Details
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [batchStudents, setBatchStudents] = useState([]);
  const [loadingBatchStudents, setLoadingBatchStudents] = useState(false);

  // Load Students for Selected Batch or All Trainer Batches
  const { data: trainerStudents = [] } = useQuery({
    queryKey: ['trainerStudents', myBatches.map(b => b.id).join(',')],
    queryFn: async () => {
      if (myBatches.length === 0) return [];
      const studentLists = await Promise.all(
        myBatches.map(b => getStudentsByBatch(b.id).catch(() => []))
      );
      const flattened = studentLists.flat();
      const uniqueMap = new Map();
      flattened.forEach(s => uniqueMap.set(s.id, s));
      return Array.from(uniqueMap.values());
    },
    enabled: myBatches.length > 0,
  });

  // Attendance State
  const [attBatchId, setAttBatchId] = useState('');
  const [attDate, setAttDate] = useState(new Date().toISOString().substring(0, 10));
  const [attRecords, setAttRecords] = useState([]);
  const [loadingAttRecords, setLoadingAttRecords] = useState(false);
  const [attSavedDates, setAttSavedDates] = useState([]);

  useEffect(() => {
    if (myBatches.length > 0 && !attBatchId) {
      setAttBatchId(myBatches[0].id);
    }
  }, [myBatches, attBatchId]);

  useEffect(() => {
    const loadAtt = async () => {
      if (!attBatchId || !attDate) return;
      setLoadingAttRecords(true);
      try {
        const students = await getStudentsByBatch(attBatchId);
        const existing = await getAttendanceByBatchAndDate(attBatchId, attDate);
        const existingMap = new Map(existing.map(r => [r.studentId || r.student_id, r.status]));

        const records = students.map(s => ({
          studentId: s.id,
          studentName: s.name,
          rollNumber: s.rollNumber || s.roll_number || s.studentIdNumber || 'N/A',
          course: s.course || '',
          status: existingMap.get(s.id) || 'Present'
        }));
        setAttRecords(records);
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingAttRecords(false);
      }
    };
    if (activeTab === 'attendance') {
      loadAtt();
    }
  }, [attBatchId, attDate, activeTab]);

  const handleSaveAttendance = async () => {
    if (!attBatchId || attRecords.length === 0) return;
    try {
      const selectedBatchObj = myBatches.find(b => b.id === attBatchId);
      await saveBatchAttendance(attBatchId, attDate, attRecords, {
        batchName: selectedBatchObj?.name || '',
        courseName: selectedBatchObj?.course_name || ''
      });

      // Update student overall stats
      await Promise.all(attRecords.map(async (r) => {
        try {
          const allAtt = await getAttendanceForStudent(r.studentId);
          const present = allAtt.filter(rec => (rec.status || '').toLowerCase() === 'present').length;
          const total = allAtt.length;
          const pct = total > 0 ? Math.round((present / total) * 100) : 0;
          await updateStudent(r.studentId, {
            attendance: { present, absent: total - present, total_days: total, percentage: pct }
          });
        } catch {}
      }));

      showModal('Success', 'Attendance saved successfully!', 'success');
    } catch (err) {
      showModal('Error', classifyFirestoreError(err).message, 'error');
    }
  };

  // Live Classes State
  const { data: allLiveClasses = [], refetch: refetchLive } = useQuery({
    queryKey: ['trainerLiveClasses'],
    queryFn: () => getLiveClasses(),
  });

  const trainerLiveClasses = useMemo(() => {
    const myBatchIds = new Set(myBatches.map(b => b.id));
    return allLiveClasses.filter(c => myBatchIds.has(c.batch_id) || c.instructor === trainer.name);
  }, [allLiveClasses, myBatches, trainer]);

  const [showLiveModal, setShowLiveModal] = useState(false);
  const [liveTitle, setLiveTitle] = useState('');
  const [liveBatchId, setLiveBatchId] = useState('');
  const [liveDate, setLiveDate] = useState('');
  const [liveTime, setLiveTime] = useState('');
  const [liveMeetLink, setLiveMeetLink] = useState('');
  const [liveDesc, setLiveDesc] = useState('');

  const handleScheduleLiveClass = async (e) => {
    e.preventDefault();
    if (!liveBatchId || !liveTitle || !liveMeetLink) {
      showModal('Validation Error', 'Please select a batch, enter title and Google Meet link.', 'warning');
      return;
    }
    try {
      await addLiveClass({
        title: liveTitle,
        instructor: trainer.name || 'Trainer',
        meet_link: liveMeetLink,
        meetLink: liveMeetLink,
        date: liveDate,
        time: liveTime,
        description: liveDesc,
        status: 'Upcoming',
        batch_id: liveBatchId,
      });
      setShowLiveModal(false);
      setLiveTitle(''); setLiveMeetLink(''); setLiveDesc('');
      refetchLive();
      showModal('Success', 'Live session scheduled successfully!', 'success');
    } catch (err) {
      showModal('Error', classifyFirestoreError(err).message, 'error');
    }
  };

  // Recorded Classes State
  const { data: allRecorded = [] } = useQuery({
    queryKey: ['trainerRecordedClasses'],
    queryFn: () => getRecordedClasses(),
  });

  const trainerRecordedClasses = useMemo(() => {
    const myBatchIds = new Set(myBatches.map(b => b.id));
    return allRecorded.filter(r => myBatchIds.has(r.batch_id));
  }, [allRecorded, myBatches]);

  // Announcements State
  const { data: allAnnouncements = [], refetch: refetchAnnouncements } = useQuery({
    queryKey: ['trainerAnnouncements'],
    queryFn: () => getAnnouncements(),
  });

  const trainerAnnouncements = useMemo(() => {
    const myBatchIds = new Set(myBatches.map(b => b.id));
    return allAnnouncements.filter(a => myBatchIds.has(a.batch_id));
  }, [allAnnouncements, myBatches]);

  const [showAnnModal, setShowAnnModal] = useState(false);
  const [annTitle, setAnnTitle] = useState('');
  const [annBatchId, setAnnBatchId] = useState('');
  const [annContent, setAnnContent] = useState('');
  const [annPriority, setAnnPriority] = useState('Medium');

  const handleCreateAnnouncement = async (e) => {
    e.preventDefault();
    if (!annBatchId || !annTitle || !annContent) {
      showModal('Validation Error', 'Batch, title and content are required.', 'warning');
      return;
    }
    try {
      await addAnnouncement({
        title: annTitle,
        content: annContent,
        priority: annPriority,
        batch_id: annBatchId,
        author: trainer.name || 'Trainer',
        date: new Date().toLocaleDateString('en-IN'),
      });
      setShowAnnModal(false);
      setAnnTitle(''); setAnnContent('');
      refetchAnnouncements();
      showModal('Success', 'Announcement posted!', 'success');
    } catch (err) {
      showModal('Error', classifyFirestoreError(err).message, 'error');
    }
  };

  // Password / Settings State
  const [currPass, setCurrPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [savingPass, setSavingPass] = useState(false);

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (!currPass) {
      showModal('Validation Error', 'Current password is required.', 'warning');
      return;
    }
    const err = validatePasswordStrength(newPass);
    if (err) {
      showModal('Validation Error', err, 'warning');
      return;
    }
    if (newPass !== confirmPass) {
      showModal('Validation Error', 'New passwords do not match.', 'warning');
      return;
    }

    setSavingPass(true);
    try {
      await changeOwnPassword(currPass, newPass);
      await updateDocumentFields('trainers', uid, { mustChangePassword: false });
      await refreshProfile();
      setCurrPass(''); setNewPass(''); setConfirmPass('');
      showModal('Password Changed', 'Your password has been updated successfully. You now have full access to Trainer Portal.', 'success');
      setActiveTab('dashboard');
    } catch (err) {
      showModal('Update Failed', describeAuthError(err), 'error');
    } finally {
      setSavingPass(false);
    }
  };

  const handleLogout = async () => {
    await authLogout();
    navigate('/login');
  };

  return (
    <div className="dashboard-layout">
      {/* Sidebar Backdrop */}
      <div className={`sidebar-backdrop ${mobileMenuOpen ? 'show' : ''}`} onClick={() => setMobileMenuOpen(false)} />

      {/* Sidebar */}
      <aside className={`sidebar ${sidebarCollapsed ? 'collapsed' : ''} ${mobileMenuOpen ? 'mobile-open' : ''}`}>
        <div className="sidebar-header" style={{ display: 'flex', alignItems: 'center', justifyContent: sidebarCollapsed ? 'center' : 'space-between', padding: '16px 12px' }}>
          <div className="sidebar-brand" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <img src={leveloxIcon} alt="Levlox" style={{ width: 32, height: 32, objectFit: 'contain' }} />
            {!sidebarCollapsed && <span style={{ color: '#FFF', fontWeight: 800, fontSize: 22 }}>Levlox</span>}
          </div>
          <button className="sidebar-toggle-btn" onClick={() => setSidebarCollapsed(!sidebarCollapsed)}>
            {sidebarCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
          </button>
        </div>

        <nav className="sidebar-menu" style={{ overflowY: 'auto' }}>
          <span className="sidebar-section-label">Trainer Portal</span>
          
          <button className={`sidebar-link ${activeTab === 'dashboard' ? 'active' : ''}`} disabled={mustChangePassword} onClick={() => { setActiveTab('dashboard'); setMobileMenuOpen(false); }}>
            <Clock size={18} />
            <span className="sidebar-link-text">Dashboard</span>
          </button>

          <button className={`sidebar-link ${activeTab === 'batches' ? 'active' : ''}`} disabled={mustChangePassword} onClick={() => { setActiveTab('batches'); setMobileMenuOpen(false); }}>
            <GraduationCap size={18} />
            <span className="sidebar-link-text">My Batches</span>
          </button>

          <button className={`sidebar-link ${activeTab === 'students' ? 'active' : ''}`} disabled={mustChangePassword} onClick={() => { setActiveTab('students'); setMobileMenuOpen(false); }}>
            <Users size={18} />
            <span className="sidebar-link-text">My Students</span>
          </button>

          <button className={`sidebar-link ${activeTab === 'live-classes' ? 'active' : ''}`} disabled={mustChangePassword} onClick={() => { setActiveTab('live-classes'); setMobileMenuOpen(false); }}>
            <Video size={18} />
            <span className="sidebar-link-text">Live Classes</span>
          </button>

          <button className={`sidebar-link ${activeTab === 'attendance' ? 'active' : ''}`} disabled={mustChangePassword} onClick={() => { setActiveTab('attendance'); setMobileMenuOpen(false); }}>
            <Percent size={18} />
            <span className="sidebar-link-text">Attendance</span>
          </button>

          <button className={`sidebar-link ${activeTab === 'recorded-classes' ? 'active' : ''}`} disabled={mustChangePassword} onClick={() => { setActiveTab('recorded-classes'); setMobileMenuOpen(false); }}>
            <PlayCircle size={18} />
            <span className="sidebar-link-text">Recorded Classes</span>
          </button>

          <button className={`sidebar-link ${activeTab === 'announcements' ? 'active' : ''}`} disabled={mustChangePassword} onClick={() => { setActiveTab('announcements'); setMobileMenuOpen(false); }}>
            <Megaphone size={18} />
            <span className="sidebar-link-text">Announcements</span>
          </button>

          <button className={`sidebar-link ${activeTab === 'settings' ? 'active' : ''}`} onClick={() => { setActiveTab('settings'); setMobileMenuOpen(false); }}>
            <Settings size={18} />
            <span className="sidebar-link-text">Profile / Settings</span>
          </button>
        </nav>

        <div className="sidebar-footer">
          <button className="sidebar-link" onClick={handleLogout} style={{ color: 'rgba(239,68,68,0.8)' }}>
            <LogOut size={18} />
            <span className="sidebar-link-text">Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className={`main-content ${sidebarCollapsed ? 'expanded' : ''}`}>
        {/* Header */}
        <header className="top-navbar">
          <button className="drawer-toggle-btn" onClick={() => setMobileMenuOpen(true)}>
            <Menu size={22} />
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <img src={leveloxIcon} alt="Levlox" style={{ height: 32, width: 32, objectFit: 'contain' }} />
            <div>
              <span style={{ fontSize: 20, fontWeight: 800, color: '#111827', display: 'block', lineHeight: 1 }}>Levlox</span>
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--primary-color)' }}>Trainer Portal</span>
            </div>
          </div>

          <div className="navbar-actions">
            <div className="user-profile-badge">
              <div className="avatar" style={{ background: 'linear-gradient(135deg, #6C3CF0, #4c22bc)', color: '#fff' }}>
                {(trainer.name || 'T')[0].toUpperCase()}
              </div>
              <div className="profile-info">
                <span className="profile-name">{trainer.name || 'Trainer'}</span>
                <span className="profile-role">ID: {trainer.trainer_id || trainer.trainerId || 'TRN'}</span>
              </div>
            </div>
          </div>
        </header>

        {/* Password Lock Warning Banner */}
        {mustChangePassword && (
          <div style={{ background: '#FEF2F2', border: '1.5px solid #FCA5A5', color: '#991B1B', borderRadius: 16, padding: '16px 24px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12 }}>
            <Lock size={24} color="#DC2626" />
            <div>
              <strong style={{ fontSize: 14, display: 'block' }}>Action Required: First Login Temporary Password Change</strong>
              <span style={{ fontSize: 12.5 }}>For security reasons, you must change your temporary password before accessing trainer features.</span>
            </div>
          </div>
        )}

        {/* ─── TAB 1: DASHBOARD ────────────────────────────────────────── */}
        {activeTab === 'dashboard' && !mustChangePassword && (
          <div className="animate-fade-in">
            <div style={{ marginBottom: 24 }}>
              <h2 style={{ fontSize: 24, fontWeight: 800, margin: 0 }}>Welcome back, {trainer.name || 'Trainer'}!</h2>
              <p style={{ margin: '4px 0 0', fontSize: 13.5, color: 'var(--text-secondary)' }}>
                Here is an overview of your assigned batches and student activities today.
              </p>
            </div>

            {/* Stats Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 24 }}>
              <div className="stat-card-premium" style={{ background: '#FFF', border: '1.5px solid var(--border-color)', borderRadius: 16, padding: 20 }}>
                <span style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase' }}>My Assigned Batches</span>
                <h3 style={{ fontSize: 28, fontWeight: 800, margin: '8px 0 4px', color: 'var(--primary-color)' }}>{myBatches.length}</h3>
                <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>Active teaching rosters</span>
              </div>

              <div className="stat-card-premium" style={{ background: '#FFF', border: '1.5px solid var(--border-color)', borderRadius: 16, padding: 20 }}>
                <span style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase' }}>My Enrolled Students</span>
                <h3 style={{ fontSize: 28, fontWeight: 800, margin: '8px 0 4px', color: '#10B981' }}>{trainerStudents.length}</h3>
                <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>Students across assigned batches</span>
              </div>

              <div className="stat-card-premium" style={{ background: '#FFF', border: '1.5px solid var(--border-color)', borderRadius: 16, padding: 20 }}>
                <span style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase' }}>Upcoming Live Sessions</span>
                <h3 style={{ fontSize: 28, fontWeight: 800, margin: '8px 0 4px', color: '#3B82F6' }}>{trainerLiveClasses.length}</h3>
                <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>Scheduled live lectures</span>
              </div>
            </div>

            {/* Quick Actions / Batches Summary */}
            <div className="dashboard-card-section" style={{ background: '#FFF', border: '1.5px solid var(--border-color)', borderRadius: 16, padding: 24 }}>
              <h3 style={{ fontSize: 16, fontWeight: 800, margin: '0 0 16px' }}>Assigned Batches Quick Access</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
                {myBatches.map(b => (
                  <div key={b.id} style={{ background: 'var(--surface-alt)', border: '1px solid var(--border-color)', borderRadius: 12, padding: 16 }}>
                    <span style={{ fontSize: 11, fontWeight: 800, background: 'rgba(108,60,240,0.1)', color: 'var(--primary-color)', padding: '3px 8px', borderRadius: 6 }}>
                      {b.code || b.batchId || 'BAT'}
                    </span>
                    <h4 style={{ fontSize: 16, fontWeight: 800, margin: '8px 0 4px' }}>{b.name}</h4>
                    <p style={{ fontSize: 12.5, color: 'var(--text-secondary)', margin: '0 0 12px' }}>Course: {b.course_name || 'N/A'}</p>
                    <button className="btn btn-outline" style={{ width: '100%', fontSize: 12 }} onClick={() => { setSelectedBatch(b); setActiveTab('batches'); }}>
                      View Roster
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ─── TAB 2: MY BATCHES ────────────────────────────────────────── */}
        {activeTab === 'batches' && !mustChangePassword && (
          <div>
            <div style={{ marginBottom: 24 }}>
              <h2 style={{ fontSize: 24, fontWeight: 800, margin: 0 }}>My Batches</h2>
              <p style={{ margin: '4px 0 0', fontSize: 13.5, color: 'var(--text-secondary)' }}>
                Batches assigned to you by Super Admin.
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 20 }}>
              {myBatches.map(b => (
                <div key={b.id} style={{ background: '#FFF', border: '1.5px solid var(--border-color)', borderRadius: 16, padding: 20 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                    <span style={{ fontSize: 11, fontWeight: 800, background: 'rgba(108,60,240,0.1)', color: 'var(--primary-color)', padding: '3px 8px', borderRadius: 6 }}>
                      {b.code || 'BAT'}
                    </span>
                    <span style={{ fontSize: 11, fontWeight: 700, background: 'rgba(16,185,129,0.1)', color: '#10B981', padding: '3px 8px', borderRadius: 6 }}>
                      {b.status || 'Active'}
                    </span>
                  </div>
                  <h3 style={{ fontSize: 18, fontWeight: 800, margin: '0 0 4px' }}>{b.name}</h3>
                  <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '0 0 12px' }}>Course: {b.course_name}</p>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 16 }}>
                    <span>Start Date: <strong>{b.start_date || 'N/A'}</strong></span>
                    <span>End Date: <strong>{b.end_date || 'N/A'}</strong></span>
                    <span>Capacity: <strong>{b.students_count || 0} / {b.max_students || 30} Students</strong></span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ─── TAB 3: MY STUDENTS ────────────────────────────────────────── */}
        {activeTab === 'students' && !mustChangePassword && (
          <div>
            <div style={{ marginBottom: 24 }}>
              <h2 style={{ fontSize: 24, fontWeight: 800, margin: 0 }}>My Students</h2>
              <p style={{ margin: '4px 0 0', fontSize: 13.5, color: 'var(--text-secondary)' }}>
                Enrolled students belonging exclusively to your assigned batches.
              </p>
            </div>

            <div style={{ background: '#FFF', border: '1.5px solid var(--border-color)', borderRadius: 16, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead style={{ background: 'var(--surface-alt)', borderBottom: '1.5px solid var(--border-color)' }}>
                  <tr>
                    <th style={{ padding: '12px 16px', fontSize: 12, fontWeight: 800, color: 'var(--text-secondary)' }}>STUDENT ID</th>
                    <th style={{ padding: '12px 16px', fontSize: 12, fontWeight: 800, color: 'var(--text-secondary)' }}>NAME</th>
                    <th style={{ padding: '12px 16px', fontSize: 12, fontWeight: 800, color: 'var(--text-secondary)' }}>EMAIL</th>
                    <th style={{ padding: '12px 16px', fontSize: 12, fontWeight: 800, color: 'var(--text-secondary)' }}>BATCH</th>
                    <th style={{ padding: '12px 16px', fontSize: 12, fontWeight: 800, color: 'var(--text-secondary)' }}>FEE STATUS (VIEW ONLY)</th>
                    <th style={{ padding: '12px 16px', fontSize: 12, fontWeight: 800, color: 'var(--text-secondary)' }}>STATUS</th>
                  </tr>
                </thead>
                <tbody>
                  {trainerStudents.map(s => (
                    <tr key={s.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '14px 16px', fontSize: 13, fontFamily: 'monospace', fontWeight: 700 }}>{s.rollNumber || s.roll_number || s.studentId || 'N/A'}</td>
                      <td style={{ padding: '14px 16px', fontSize: 13.5, fontWeight: 700 }}>{s.name}</td>
                      <td style={{ padding: '14px 16px', fontSize: 13, color: 'var(--text-secondary)' }}>{s.email}</td>
                      <td style={{ padding: '14px 16px', fontSize: 13, fontWeight: 600 }}>{s.batch_name || 'Assigned Batch'}</td>
                      <td style={{ padding: '14px 16px' }}>
                        <span className={`badge-status ${s.feesStatus === 'Paid' ? 'paid' : 'unpaid'}`} style={{ fontSize: 11, fontWeight: 700 }}>
                          {s.feesStatus || 'Pending'}
                        </span>
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 8px', background: 'rgba(16,185,129,0.1)', color: '#10B981', borderRadius: 6 }}>
                          {s.status || 'Active'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ─── TAB 4: LIVE CLASSES ────────────────────────────────────────── */}
        {activeTab === 'live-classes' && !mustChangePassword && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <div>
                <h2 style={{ fontSize: 24, fontWeight: 800, margin: 0 }}>Live Classes</h2>
                <p style={{ margin: '4px 0 0', fontSize: 13.5, color: 'var(--text-secondary)' }}>
                  Schedule live sessions with Google Meet links for your assigned batches.
                </p>
              </div>
              <button className="btn btn-primary" onClick={() => setShowLiveModal(true)}>
                <Plus size={16} /> Schedule Live Class
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 20 }}>
              {trainerLiveClasses.map(c => (
                <div key={c.id} style={{ background: '#FFF', border: '1.5px solid var(--border-color)', borderRadius: 16, padding: 20 }}>
                  <span style={{ fontSize: 11, fontWeight: 800, background: 'rgba(59,130,246,0.1)', color: '#3B82F6', padding: '3px 8px', borderRadius: 6 }}>
                    {c.status || 'Upcoming'}
                  </span>
                  <h3 style={{ fontSize: 16, fontWeight: 800, margin: '8px 0 4px' }}>{c.title}</h3>
                  <p style={{ fontSize: 12.5, color: 'var(--text-secondary)', margin: '0 0 10px' }}>Date: {c.date} | Time: {c.time}</p>
                  <a href={c.meet_link || c.meetLink} target="_blank" rel="noreferrer" className="btn btn-primary" style={{ width: '100%', fontSize: 12, justifyContent: 'center' }}>
                    <ExternalLink size={14} /> Join Google Meet
                  </a>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ─── TAB 5: ATTENDANCE ────────────────────────────────────────── */}
        {activeTab === 'attendance' && !mustChangePassword && (
          <div>
            <div style={{ marginBottom: 24 }}>
              <h2 style={{ fontSize: 24, fontWeight: 800, margin: 0 }}>Batch Attendance Matrix</h2>
              <p style={{ margin: '4px 0 0', fontSize: 13.5, color: 'var(--text-secondary)' }}>
                Mark daily attendance for your assigned batch students.
              </p>
            </div>

            {/* Batch & Date Selectors */}
            <div style={{ display: 'flex', gap: 16, marginBottom: 20, flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: 200 }}>
                <label className="form-label">Select Assigned Batch</label>
                <select className="form-select" value={attBatchId} onChange={e => setAttBatchId(e.target.value)}>
                  {myBatches.map(b => (
                    <option key={b.id} value={b.id}>{b.name} ({b.code || 'BAT'})</option>
                  ))}
                </select>
              </div>

              <div style={{ flex: 1, minWidth: 200 }}>
                <label className="form-label">Attendance Date</label>
                <input type="date" className="form-input" value={attDate} onChange={e => setAttDate(e.target.value)} />
              </div>
            </div>

            {/* Attendance Roster Table */}
            <div style={{ background: '#FFF', border: '1.5px solid var(--border-color)', borderRadius: 16, padding: 20 }}>
              {attRecords.length === 0 ? (
                <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-secondary)' }}>
                  No students found in selected batch.
                </div>
              ) : (
                <div>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', marginBottom: 20 }}>
                    <thead>
                      <tr style={{ borderBottom: '1.5px solid var(--border-color)' }}>
                        <th style={{ padding: '10px 14px', fontSize: 12 }}>ROLL NO</th>
                        <th style={{ padding: '10px 14px', fontSize: 12 }}>STUDENT NAME</th>
                        <th style={{ padding: '10px 14px', fontSize: 12 }}>ATTENDANCE STATUS</th>
                      </tr>
                    </thead>
                    <tbody>
                      {attRecords.map(r => (
                        <tr key={r.studentId} style={{ borderBottom: '1px solid var(--border-color)' }}>
                          <td style={{ padding: '12px 14px', fontSize: 13, fontFamily: 'monospace', fontWeight: 700 }}>{r.rollNumber}</td>
                          <td style={{ padding: '12px 14px', fontSize: 13.5, fontWeight: 700 }}>{r.studentName}</td>
                          <td style={{ padding: '12px 14px' }}>
                            <div style={{ display: 'flex', gap: 10 }}>
                              <button
                                className={`btn ${r.status === 'Present' ? 'btn-primary' : 'btn-outline'}`}
                                style={{ padding: '4px 12px', fontSize: 12 }}
                                onClick={() => setAttRecords(prev => prev.map(item => item.studentId === r.studentId ? { ...item, status: 'Present' } : item))}
                              >
                                Present
                              </button>
                              <button
                                className={`btn ${r.status === 'Absent' ? 'btn-danger' : 'btn-outline'}`}
                                style={{ padding: '4px 12px', fontSize: 12, backgroundColor: r.status === 'Absent' ? '#EF4444' : undefined, color: r.status === 'Absent' ? '#FFF' : undefined }}
                                onClick={() => setAttRecords(prev => prev.map(item => item.studentId === r.studentId ? { ...item, status: 'Absent' } : item))}
                              >
                                Absent
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <button className="btn btn-primary" onClick={handleSaveAttendance}>
                    Save Batch Attendance
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ─── TAB 6: RECORDED CLASSES ────────────────────────────────────────── */}
        {activeTab === 'recorded-classes' && !mustChangePassword && (
          <div>
            <div style={{ marginBottom: 24 }}>
              <h2 style={{ fontSize: 24, fontWeight: 800, margin: 0 }}>Recorded Classes</h2>
              <p style={{ margin: '4px 0 0', fontSize: 13.5, color: 'var(--text-secondary)' }}>
                Recorded class lectures available for your assigned batches.
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20 }}>
              {trainerRecordedClasses.map(r => (
                <div key={r.id} style={{ background: '#FFF', border: '1.5px solid var(--border-color)', borderRadius: 16, padding: 20 }}>
                  <span style={{ fontSize: 11, fontWeight: 800, background: 'rgba(108,60,240,0.1)', color: 'var(--primary-color)', padding: '3px 8px', borderRadius: 6 }}>
                    {r.module || 'Recorded Session'}
                  </span>
                  <h3 style={{ fontSize: 16, fontWeight: 800, margin: '8px 0 4px' }}>{r.title}</h3>
                  <p style={{ fontSize: 12.5, color: 'var(--text-secondary)', margin: '0 0 10px' }}>Course: {r.course_title || 'N/A'}</p>
                  {r.video_url && (
                    <a href={r.video_url} target="_blank" rel="noreferrer" className="btn btn-outline" style={{ width: '100%', fontSize: 12, justifyContent: 'center' }}>
                      <PlayCircle size={14} /> Watch Recording
                    </a>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ─── TAB 7: ANNOUNCEMENTS ────────────────────────────────────────── */}
        {activeTab === 'announcements' && !mustChangePassword && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <div>
                <h2 style={{ fontSize: 24, fontWeight: 800, margin: 0 }}>Announcements</h2>
                <p style={{ margin: '4px 0 0', fontSize: 13.5, color: 'var(--text-secondary)' }}>
                  Post batch-level notices for your students.
                </p>
              </div>
              <button className="btn btn-primary" onClick={() => setShowAnnModal(true)}>
                <Plus size={16} /> Post Announcement
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {trainerAnnouncements.map(a => (
                <div key={a.id} style={{ background: '#FFF', border: '1.5px solid var(--border-color)', borderRadius: 16, padding: 20 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--primary-color)' }}>{a.date || 'Notice'}</span>
                    <span style={{ fontSize: 11, fontWeight: 700, background: 'rgba(245,158,11,0.1)', color: '#D97706', padding: '3px 8px', borderRadius: 6 }}>
                      {a.priority || 'Medium'}
                    </span>
                  </div>
                  <h3 style={{ fontSize: 16, fontWeight: 800, margin: '0 0 6px' }}>{a.title}</h3>
                  <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0, whiteSpace: 'pre-wrap' }}>{a.content}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ─── TAB 8: PROFILE / SETTINGS ────────────────────────────────────────── */}
        {activeTab === 'settings' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
            {/* Profile Info */}
            <div style={{ background: '#FFF', border: '1.5px solid var(--border-color)', borderRadius: 20, padding: 24 }}>
              <h3 style={{ fontSize: 16, fontWeight: 800, margin: '0 0 16px' }}>Trainer Profile</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, fontSize: 13 }}>
                <div><span>Trainer ID:</span> <strong style={{ color: 'var(--primary-color)' }}>{trainer.trainer_id || trainer.trainerId}</strong></div>
                <div><span>Full Name:</span> <strong>{trainer.name}</strong></div>
                <div><span>Email Address:</span> <strong>{trainer.email}</strong></div>
                <div><span>Mobile Number:</span> <strong>{trainer.phone || trainer.mobile || 'N/A'}</strong></div>
                <div><span>Course / Expertise:</span> <strong>{trainer.specialization || trainer.course || 'N/A'}</strong></div>
              </div>
            </div>

            {/* Change Password Form */}
            <div style={{ background: '#FFF', border: '1.5px solid var(--border-color)', borderRadius: 20, padding: 24 }}>
              <h3 style={{ fontSize: 16, fontWeight: 800, margin: '0 0 16px' }}>Change Password</h3>
              <form onSubmit={handleChangePassword} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <label className="form-label">Current Password</label>
                  <input type="password" className="form-input" value={currPass} onChange={e => setCurrPass(e.target.value)} required />
                </div>
                <div>
                  <label className="form-label">New Password</label>
                  <input type="password" className="form-input" value={newPass} onChange={e => setNewPass(e.target.value)} placeholder="Min 8 chars" required />
                </div>
                <div>
                  <label className="form-label">Confirm New Password</label>
                  <input type="password" className="form-input" value={confirmPass} onChange={e => setConfirmPass(e.target.value)} required />
                </div>
                <button type="submit" disabled={savingPass} className="btn btn-primary" style={{ marginTop: 8 }}>
                  {savingPass ? 'Updating Password...' : 'Update Password'}
                </button>
              </form>
            </div>
          </div>
        )}
      </main>

      {/* SCHEDULE LIVE MODAL */}
      {showLiveModal && (
        <CustomModal isOpen={showLiveModal} onClose={() => setShowLiveModal(false)} title="Schedule Live Class">
          <form onSubmit={handleScheduleLiveClass} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label className="form-label">Select Assigned Batch *</label>
              <select className="form-select" value={liveBatchId} onChange={e => setLiveBatchId(e.target.value)} required>
                <option value="">-- Select Batch --</option>
                {myBatches.map(b => (
                  <option key={b.id} value={b.id}>{b.name} ({b.code || 'BAT'})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="form-label">Session Title *</label>
              <input type="text" className="form-input" value={liveTitle} onChange={e => setLiveTitle(e.target.value)} placeholder="e.g. Python OOP Concepts" required />
            </div>
            <div>
              <label className="form-label">Google Meet URL *</label>
              <input type="url" className="form-input" value={liveMeetLink} onChange={e => setLiveMeetLink(e.target.value)} placeholder="https://meet.google.com/abc-defg-hij" required />
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <div style={{ flex: 1 }}>
                <label className="form-label">Date</label>
                <input type="date" className="form-input" value={liveDate} onChange={e => setLiveDate(e.target.value)} />
              </div>
              <div style={{ flex: 1 }}>
                <label className="form-label">Time</label>
                <input type="time" className="form-input" value={liveTime} onChange={e => setLiveTime(e.target.value)} />
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 10 }}>
              <button type="button" className="btn btn-outline" onClick={() => setShowLiveModal(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary">Schedule Session</button>
            </div>
          </form>
        </CustomModal>
      )}

      {/* CREATE ANNOUNCEMENT MODAL */}
      {showAnnModal && (
        <CustomModal isOpen={showAnnModal} onClose={() => setShowAnnModal(false)} title="Post Announcement">
          <form onSubmit={handleCreateAnnouncement} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label className="form-label">Target Assigned Batch *</label>
              <select className="form-select" value={annBatchId} onChange={e => setAnnBatchId(e.target.value)} required>
                <option value="">-- Select Batch --</option>
                {myBatches.map(b => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="form-label">Notice Title *</label>
              <input type="text" className="form-input" value={annTitle} onChange={e => setAnnTitle(e.target.value)} placeholder="e.g. Class Rescheduled" required />
            </div>
            <div>
              <label className="form-label">Message Content *</label>
              <textarea className="form-input" value={annContent} onChange={e => setAnnContent(e.target.value)} style={{ minHeight: 80 }} required />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 10 }}>
              <button type="button" className="btn btn-outline" onClick={() => setShowAnnModal(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary">Publish Notice</button>
            </div>
          </form>
        </CustomModal>
      )}

      {/* Global Notification Modal */}
      {modalOpen && (
        <CustomModal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={modalTitle}>
          <p style={{ margin: '12px 0 20px', fontSize: 14, color: 'var(--text-secondary)' }}>{modalText}</p>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button className="btn btn-primary" onClick={() => setModalOpen(false)}>OK</button>
          </div>
        </CustomModal>
      )}
    </div>
  );
};

export default TrainerDashboard;
