import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  GraduationCap, Users, Video, Clock, BookOpen, 
  Megaphone, Settings, Plus, LogOut, CheckCircle, Award, 
  Percent, CalendarCheck, Pencil, Eye, Search, Filter, 
  PlayCircle, Clock3, Trophy, Key, ChevronDown, X, Download, 
  FileText, FileSpreadsheet, User, Mail, Phone, Lock, EyeOff, 
  Camera, Save, Shield, Menu, Calendar as CalendarIcon, Check, CheckSquare,
  AlertCircle, ChevronLeft, ChevronRight, ExternalLink
} from 'lucide-react';
import CustomModal from '../components/Modal';
import leveloxIcon from '../assets/levelox-icon-transparent.png';
import { useAuth } from '../context/AuthContext';
import { 
  getTrainerBatches, 
  getTrainerStudents, 
  getTrainerAttendanceSheets, 
  getTrainerLiveClasses, 
  createTrainerLiveClass,
  getTrainerRecordedClasses,
  createTrainerRecordedClass,
  getTrainerAnnouncements,
  createTrainerAnnouncement,
  uploadTrainerProfilePic
} from '../services/trainerService';
import { 
  saveBatchAttendance, 
  getAttendanceByBatchAndDate, 
  awardActivityScore,
  updateDocumentFields,
  classifyFirestoreError 
} from '../services/firebaseService';
import { 
  changeOwnPassword, 
  validatePasswordStrength 
} from '../services/authService';

const TrainerDashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const { currentUser, userProfile, logout, refreshProfile, applyProfilePatch } = useAuth();

  // Responsive sidebar collapse state
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Determine active tab from URL path (e.g. /trainer/batches -> batches)
  const currentPath = location.pathname.replace('/trainer', '').replace('/', '') || 'dashboard';
  const [activeTab, setActiveTab] = useState(currentPath);

  useEffect(() => {
    const tabFromPath = location.pathname.replace('/trainer', '').replace('/', '') || 'dashboard';
    setActiveTab(tabFromPath);
  }, [location.pathname]);

  const handleTabChange = (tabKey) => {
    setActiveTab(tabKey);
    setMobileMenuOpen(false);
    if (tabKey === 'dashboard') {
      navigate('/trainer');
    } else {
      navigate(`/trainer/${tabKey}`);
    }
  };

  const mustChangePassword = userProfile?.mustChangePassword === true;

  // Toast notification state
  const [toast, setToast] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const trainerUid = currentUser?.uid;
  const assignedBatchIds = useMemo(() => userProfile?.assigned_batch_ids || userProfile?.assignedBatchIds || [], [userProfile]);
  const assignedCourseIds = useMemo(() => userProfile?.assigned_course_ids || userProfile?.assignedCourseIds || [], [userProfile]);

  // ─── 1. FETCH TRAINER DATA ───────────────────────────────────────────────
  const { data: batches = [], isLoading: batchesLoading, refetch: refetchBatches } = useQuery({
    queryKey: ['trainerBatches', trainerUid, assignedBatchIds],
    queryFn: () => getTrainerBatches(trainerUid, assignedBatchIds),
    enabled: !!trainerUid,
  });

  const { data: students = [], isLoading: studentsLoading, refetch: refetchStudents } = useQuery({
    queryKey: ['trainerStudents', assignedBatchIds],
    queryFn: () => getTrainerStudents(assignedBatchIds),
    enabled: assignedBatchIds.length > 0,
  });

  const { data: liveClasses = [], isLoading: liveLoading, refetch: refetchLive } = useQuery({
    queryKey: ['trainerLiveClasses', trainerUid, assignedBatchIds],
    queryFn: () => getTrainerLiveClasses(trainerUid, assignedBatchIds),
    enabled: !!trainerUid,
  });

  const { data: recordedClasses = [], isLoading: recordedLoading, refetch: refetchRecorded } = useQuery({
    queryKey: ['trainerRecordedClasses', assignedBatchIds, assignedCourseIds],
    queryFn: () => getTrainerRecordedClasses(assignedBatchIds, assignedCourseIds),
  });

  const { data: announcements = [], isLoading: announcementsLoading, refetch: refetchAnnouncements } = useQuery({
    queryKey: ['trainerAnnouncements', assignedBatchIds],
    queryFn: () => getTrainerAnnouncements(assignedBatchIds),
  });

  const { data: attendanceSheets = [], isLoading: sheetsLoading, refetch: refetchSheets } = useQuery({
    queryKey: ['trainerAttendanceSheets', assignedBatchIds],
    queryFn: () => getTrainerAttendanceSheets(assignedBatchIds),
    enabled: assignedBatchIds.length > 0,
  });

  // Derived Statistics for Dashboard Cards
  const stats = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    const todayClassesCount = liveClasses.filter(c => c.date === todayStr).length;
    const upcomingClassesCount = liveClasses.filter(c => (c.date || '') >= todayStr && (c.status || '').toLowerCase() !== 'completed').length;
    
    // Total Activity Points awarded across assigned students
    const totalPoints = students.reduce((acc, s) => acc + (Number(s.activityPoints) || 0), 0);

    // Pending attendance sheets count for today
    const markedTodayBatchIds = new Set(attendanceSheets.filter(s => s.date === todayStr).map(s => s.batchId || s.batch_id));
    const attendancePendingCount = Math.max(0, batches.length - markedTodayBatchIds.size);

    return {
      totalBatches: batches.length,
      totalStudents: students.length,
      todayClassesCount,
      upcomingClassesCount,
      attendancePendingCount,
      totalPoints,
    };
  }, [batches, students, liveClasses, attendanceSheets]);

  // Student Search Query State
  const [studentSearchQuery, setStudentSearchQuery] = useState('');

  // ─── 2. ATTENDANCE MODULE STATES ──────────────────────────────────────────
  const [attCourseFilter, setAttCourseFilter] = useState('');
  const [attBatchId, setAttBatchId] = useState('');
  const [attDate, setAttDate] = useState(new Date().toISOString().split('T')[0]);
  const [attStudentRecords, setAttStudentRecords] = useState({});
  const [loadingAttendance, setLoadingAttendance] = useState(false);
  const [savingAttendance, setSavingAttendance] = useState(false);

  // Selected batch for attendance sheet
  const selectedAttBatch = useMemo(() => batches.find(b => b.id === attBatchId), [batches, attBatchId]);

  // Students belonging to selected attendance batch
  const attBatchStudents = useMemo(() => {
    if (!attBatchId) return [];
    return students.filter(s => s.batch_id === attBatchId || s.batchId === attBatchId || (selectedAttBatch?.student_ids || []).includes(s.id));
  }, [students, attBatchId, selectedAttBatch]);

  // Load attendance records when batch or date changes
  useEffect(() => {
    if (!attBatchId || !attDate) return;
    let isMounted = true;
    setLoadingAttendance(true);
    getAttendanceByBatchAndDate(attBatchId, attDate)
      .then((records) => {
        if (!isMounted) return;
        const initialMap = {};
        records.forEach(r => {
          const sid = r.studentId || r.student_id;
          if (sid) initialMap[sid] = r.status;
        });
        setAttStudentRecords(initialMap);
      })
      .catch(err => console.error("Error loading attendance:", err))
      .finally(() => { if (isMounted) setLoadingAttendance(false); });
    return () => { isMounted = false; };
  }, [attBatchId, attDate]);

  const handleMarkStudent = (studentId, status) => {
    setAttStudentRecords(prev => ({
      ...prev,
      [studentId]: status
    }));
  };

  const handleSelectAll = (status) => {
    const updated = {};
    attBatchStudents.forEach(s => {
      updated[s.id] = status;
    });
    setAttStudentRecords(updated);
  };

  const handleResetAttendance = () => {
    setAttStudentRecords({});
  };

  // Attendance summary metrics
  const attSummary = useMemo(() => {
    let present = 0;
    let absent = 0;
    let notMarked = 0;
    const total = attBatchStudents.length;

    attBatchStudents.forEach(s => {
      const st = attStudentRecords[s.id];
      if (st === 'Present') present += 1;
      else if (st === 'Absent') absent += 1;
      else notMarked += 1;
    });

    const markedCount = present + absent;
    const rate = markedCount > 0 ? ((present / markedCount) * 100).toFixed(1) : 0;
    return { total, present, absent, notMarked, rate };
  }, [attBatchStudents, attStudentRecords]);

  const handleSaveAttendance = async () => {
    if (!attBatchId || !attDate) {
      alert("Please select a batch and class date.");
      return;
    }
    if (attBatchStudents.length === 0) {
      alert("No students in this batch to mark attendance.");
      return;
    }

    setSavingAttendance(true);
    try {
      const recordsToSave = attBatchStudents.map(s => ({
        studentId: s.id,
        studentName: s.name || 'Student',
        rollNumber: s.rollNumber || s.id,
        course: s.course || selectedAttBatch?.course_name || '',
        status: attStudentRecords[s.id] || 'Absent'
      }));

      await saveBatchAttendance(attBatchId, attDate, recordsToSave, {
        batchName: selectedAttBatch?.name || '',
        courseName: selectedAttBatch?.course_name || ''
      });

      showToast(`Attendance saved for ${selectedAttBatch?.name || 'Batch'} (${attDate}) ✓`);
      refetchSheets();
    } catch (err) {
      console.error(err);
      alert(classifyFirestoreError(err).message);
    } finally {
      setSavingAttendance(false);
    }
  };

  // Calendar date selector & agenda
  const [selectedCalendarDate, setSelectedCalendarDate] = useState(new Date().toISOString().split('T')[0]);

  // ─── 3. BATCH DETAILS MODAL ──────────────────────────────────────────────
  const [selectedBatchDetails, setSelectedBatchDetails] = useState(null);

  // ─── 4. STUDENT DETAILS MODAL ─────────────────────────────────────────────
  const [selectedStudentDetails, setSelectedStudentDetails] = useState(null);

  // ─── 5. LIVE CLASS MODAL ────────────────────────────────────────────────
  const [showLiveModal, setShowLiveModal] = useState(false);
  const [liveLectureName, setLiveLectureName] = useState('');
  const [liveCourseName, setLiveCourseName] = useState('');
  const [liveBatchId, setLiveBatchId] = useState('');
  const [liveDate, setLiveDate] = useState('');
  const [liveStartTime, setLiveStartTime] = useState('');
  const [liveEndTime, setLiveEndTime] = useState('');
  const [liveMeetLink, setLiveMeetLink] = useState('');
  const [schedulingLive, setSchedulingLive] = useState(false);

  const handleScheduleLiveClass = async (e) => {
    e.preventDefault();
    if (!liveLectureName || !liveBatchId || !liveDate || !liveMeetLink) {
      alert("Please fill in all required fields.");
      return;
    }
    setSchedulingLive(true);
    try {
      const batchObj = batches.find(b => b.id === liveBatchId);
      await createTrainerLiveClass(trainerUid, userProfile?.fullName || userProfile?.name || 'Trainer', {
        title: liveLectureName,
        lectureName: liveLectureName,
        course: liveCourseName || batchObj?.course_name || '',
        courseId: batchObj?.course_id || '',
        batchId: liveBatchId,
        batchName: batchObj?.name || '',
        date: liveDate,
        time: `${liveStartTime} - ${liveEndTime}`,
        startTime: liveStartTime,
        endTime: liveEndTime,
        meetLink: liveMeetLink,
        meet_url: liveMeetLink,
        status: 'Upcoming'
      });
      showToast('Live Class scheduled successfully ✓');
      refetchLive();
      setShowLiveModal(false);
    } catch (err) {
      console.error(err);
      alert(classifyFirestoreError(err).message);
    } finally {
      setSchedulingLive(false);
    }
  };

  // ─── 6. RECORDED CLASS MODAL ─────────────────────────────────────────────
  const [showRecordedModal, setShowRecordedModal] = useState(false);
  const [recTitle, setRecTitle] = useState('');
  const [recCourseName, setRecCourseName] = useState('');
  const [recBatchId, setRecBatchId] = useState('');
  const [recVideoUrl, setRecVideoUrl] = useState('');
  const [recDescription, setRecDescription] = useState('');
  const [savingRecorded, setSavingRecorded] = useState(false);

  const handleAddRecordedClass = async (e) => {
    e.preventDefault();
    if (!recTitle || !recVideoUrl) {
      alert("Title and Video URL are required.");
      return;
    }
    setSavingRecorded(true);
    try {
      const batchObj = batches.find(b => b.id === recBatchId);
      await createTrainerRecordedClass({
        title: recTitle,
        course_title: recCourseName || batchObj?.course_name || '',
        batchId: recBatchId,
        video_url: recVideoUrl,
        embedUrl: recVideoUrl,
        description: recDescription,
        uploadedBy: userProfile?.fullName || 'Trainer'
      });
      showToast('Recorded Lesson added successfully ✓');
      refetchRecorded();
      setShowRecordedModal(false);
    } catch (err) {
      console.error(err);
      alert(classifyFirestoreError(err).message);
    } finally {
      setSavingRecorded(false);
    }
  };

  // ─── 7. ANNOUNCEMENT MODAL ───────────────────────────────────────────────
  const [showAnnModal, setShowAnnModal] = useState(false);
  const [annTitle, setAnnTitle] = useState('');
  const [annMessage, setAnnMessage] = useState('');
  const [annBatchId, setAnnBatchId] = useState('');
  const [annPriority, setAnnPriority] = useState('Normal');
  const [savingAnn, setSavingAnn] = useState(false);

  const handleCreateAnnouncement = async (e) => {
    e.preventDefault();
    if (!annTitle || !annMessage || !annBatchId) {
      alert("Title, Message, and Batch are required.");
      return;
    }
    setSavingAnn(true);
    try {
      const batchObj = batches.find(b => b.id === annBatchId);
      await createTrainerAnnouncement(userProfile?.fullName || 'Trainer', {
        title: annTitle,
        content: annMessage,
        message: annMessage,
        batchId: annBatchId,
        batchName: batchObj?.name || '',
        priority: annPriority,
        date: new Date().toISOString().split('T')[0]
      });
      showToast('Announcement posted to batch ✓');
      refetchAnnouncements();
      setShowAnnModal(false);
    } catch (err) {
      console.error(err);
      alert(classifyFirestoreError(err).message);
    } finally {
      setSavingAnn(false);
    }
  };

  // ─── 8. ACTIVITY SCORES MODAL ───────────────────────────────────────────
  const [showActivityModal, setShowActivityModal] = useState(false);
  const [actStudentId, setActStudentId] = useState('');
  const [actPoints, setActPoints] = useState(10);
  const [actType, setActType] = useState('Participation');
  const [actRemarks, setActRemarks] = useState('');
  const [savingActivity, setSavingActivity] = useState(false);

  const handleAwardPoints = async (e) => {
    e.preventDefault();
    if (!actStudentId || !actPoints) {
      alert("Student and Points are required.");
      return;
    }
    setSavingActivity(true);
    try {
      const targetStudent = students.find(s => s.id === actStudentId);
      await awardActivityScore({
        studentId: actStudentId,
        studentName: targetStudent?.name || 'Student',
        batchId: targetStudent?.batch_id || targetStudent?.batchId || '',
        batchName: targetStudent?.batch_name || targetStudent?.batchName || '',
        date: new Date().toISOString().split('T')[0],
        meeting: 'Trainer Portal Session',
        activityType: actType,
        points: Number(actPoints),
        remarks: actRemarks,
        awardedBy: userProfile?.fullName || 'Trainer'
      });
      showToast(`Awarded +${actPoints} points to ${targetStudent?.name || 'Student'} ✓`);
      refetchStudents();
      setShowActivityModal(false);
    } catch (err) {
      console.error(err);
      alert(classifyFirestoreError(err).message);
    } finally {
      setSavingActivity(false);
    }
  };

  // ─── 9. PROFILE EDIT MODAL & AVATAR UPLOAD ──────────────────────────────
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [editingPhone, setEditingPhone] = useState(userProfile?.phone || '');
  const [editingName, setEditingName] = useState(userProfile?.fullName || userProfile?.name || '');
  const [savingProfile, setSavingProfile] = useState(false);

  useEffect(() => {
    if (userProfile) {
      setEditingName(userProfile.fullName || userProfile.name || '');
      setEditingPhone(userProfile.phone || '');
    }
  }, [userProfile]);

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingAvatar(true);
    try {
      const photoUrl = await uploadTrainerProfilePic(trainerUid, file);
      applyProfilePatch({ profilePic: photoUrl, profile_pic: photoUrl });
      showToast('Profile photo updated ✓');
    } catch (err) {
      console.error(err);
      alert(err.message || 'Avatar upload failed.');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      await updateDocumentFields('trainers', trainerUid, {
        fullName: editingName,
        name: editingName,
        phone: editingPhone
      });
      applyProfilePatch({ fullName: editingName, name: editingName, phone: editingPhone });
      showToast('Profile details updated ✓');
    } catch (err) {
      console.error(err);
      alert(classifyFirestoreError(err).message);
    } finally {
      setSavingProfile(false);
    }
  };

  // ─── 10. SETTINGS / PASSWORD CHANGE ─────────────────────────────────────
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPass1, setShowPass1] = useState(false);
  const [showPass2, setShowPass2] = useState(false);
  const [changingPass, setChangingPass] = useState(false);
  const [passError, setPassError] = useState('');

  const passValidation = useMemo(() => validatePasswordStrength(newPassword), [newPassword]);

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPassError('');
    if (!currentPassword) {
      setPassError('Current password is required.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPassError('New password and confirmation do not match.');
      return;
    }
    if (!passValidation.isValid) {
      setPassError(passValidation.message);
      return;
    }

    setChangingPass(true);
    try {
      await changeOwnPassword(currentPassword, newPassword);
      // Set mustChangePassword = false in Firestore
      await updateDocumentFields('trainers', trainerUid, { mustChangePassword: false });
      applyProfilePatch({ mustChangePassword: false });
      showToast('Password updated successfully! Portal access unlocked ✓');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      handleTabChange('dashboard');
    } catch (err) {
      console.error(err);
      setPassError(err.message || 'Failed to update password. Check your current password.');
    } finally {
      setChangingPass(false);
    }
  };

  return (
    <div className="dashboard-layout">
      {/* Toast Alert */}
      {toast && (
        <div style={{
          position: 'fixed', top: 24, right: 24, background: '#121118', color: '#fff',
          borderRadius: 12, padding: '12px 20px', fontSize: 13, fontWeight: 600, zIndex: 2000,
          boxShadow: '0 16px 32px rgba(0,0,0,0.2)', display: 'flex', alignItems: 'center', gap: 8
        }}>
          <CheckCircle size={16} color="#10B981" /> {toast}
        </div>
      )}

      {/* Sidebar */}
      <aside className={`sidebar ${sidebarCollapsed ? 'collapsed' : ''} ${mobileMenuOpen ? 'mobile-open' : ''}`}>
        <div className="sidebar-header">
          <div className="sidebar-brand">
            <div className="sidebar-brand-icon">
              <GraduationCap size={20} color="#fff" />
            </div>
            <div className="sidebar-brand-text">
              Levlox <span>Trainer</span>
            </div>
          </div>
          <button className="sidebar-toggle-btn" onClick={() => setSidebarCollapsed(!sidebarCollapsed)}>
            {sidebarCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        </div>

        <div className="sidebar-section-label">Main Navigation</div>

        <ul className="sidebar-menu">
          {[
            { key: 'dashboard', label: 'Dashboard', icon: GraduationCap },
            { key: 'batches', label: 'My Batches', icon: LayersIcon },
            { key: 'students', label: 'My Students', icon: Users },
            { key: 'attendance', label: 'Attendance', icon: CalendarCheck },
            { key: 'live-classes', label: 'Live Classes', icon: Video },
            { key: 'recorded-classes', label: 'Recorded Classes', icon: PlayCircle },
            { key: 'announcements', label: 'Announcements', icon: Megaphone },
            { key: 'activity-scores', label: 'Activity Scores', icon: Trophy },
          ].map(item => {
            const Icon = item.icon;
            const isActive = activeTab === item.key;
            return (
              <li key={item.key}>
                <button 
                  className={`sidebar-link ${isActive ? 'active' : ''}`}
                  onClick={() => handleTabChange(item.key)}
                  disabled={mustChangePassword && item.key !== 'settings'}
                >
                  <Icon size={18} />
                  <span className="sidebar-link-text">{item.label}</span>
                </button>
              </li>
            );
          })}
        </ul>

        <div className="sidebar-section-label">Account & Preferences</div>
        <ul className="sidebar-menu">
          <li>
            <button 
              className={`sidebar-link ${activeTab === 'profile' ? 'active' : ''}`}
              onClick={() => handleTabChange('profile')}
              disabled={mustChangePassword}
            >
              <User size={18} />
              <span className="sidebar-link-text">Profile</span>
            </button>
          </li>
          <li>
            <button 
              className={`sidebar-link ${activeTab === 'settings' ? 'active' : ''}`}
              onClick={() => handleTabChange('settings')}
            >
              <Settings size={18} />
              <span className="sidebar-link-text">Settings</span>
            </button>
          </li>
        </ul>

        <div className="sidebar-footer">
          <button className="sidebar-link" onClick={logout} style={{ color: '#EF4444' }}>
            <LogOut size={18} color="#EF4444" />
            <span className="sidebar-link-text">Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content Body */}
      <main className={`main-content ${sidebarCollapsed ? 'expanded' : ''}`}>
        {/* Sticky Topbar */}
        <header className="top-navbar">
          <div className="top-navbar-left">
            <button className="sidebar-toggle-btn mobile-only" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
              <Menu size={20} />
            </button>
            <div>
              <h1 style={{ fontSize: 18, fontWeight: 800, margin: 0 }}>Levlox Trainer Portal</h1>
              <p style={{ margin: 0, fontSize: 12, color: 'var(--text-secondary)' }}>
                Teaching Management & Student Engagement
              </p>
            </div>
          </div>

          <div className="navbar-actions">
            <div className="navbar-date-chip">
              <CalendarIcon size={14} />
              {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingLeft: 12, borderLeft: '1.5px solid var(--border-color)' }}>
              <img 
                src={userProfile?.profilePic || userProfile?.profile_pic || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'} 
                alt="Trainer Profile" 
                style={{ width: 38, height: 38, borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--primary-color)' }}
              />
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: 13, fontWeight: 800, color: '#121118' }}>
                  {userProfile?.fullName || userProfile?.name || 'Trainer'}
                </span>
                <span style={{ fontSize: 11, color: 'var(--primary-color)', fontWeight: 700 }}>
                  ID: {userProfile?.trainerId || userProfile?.code || 'TRN001001'}
                </span>
              </div>
            </div>
          </div>
        </header>

        {/* FORCED PASSWORD CHANGE BANNER */}
        {mustChangePassword && activeTab !== 'settings' && (
          <div style={{ background: '#FFFBEB', border: '1.5px solid #FCD34D', borderRadius: 16, padding: 16, marginBottom: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <AlertCircle size={22} color="#D97706" />
              <div>
                <h4 style={{ margin: 0, fontSize: 14, fontWeight: 800, color: '#92400E' }}>Temporary Password Change Required</h4>
                <p style={{ margin: '2px 0 0', fontSize: 12.5, color: '#B45309' }}>
                  For security reasons, you must set a new password before navigating the Trainer Portal.
                </p>
              </div>
            </div>
            <button className="btn btn-primary btn-sm" onClick={() => handleTabChange('settings')}>
              Go to Settings
            </button>
          </div>
        )}

        {/* ─── MODULE 1: DASHBOARD OVERVIEW ─────────────────────────────────── */}
        {activeTab === 'dashboard' && (
          <div className="animate-fade-in">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 18, marginBottom: 28 }}>
              {[
                { title: 'My Batches', count: stats.totalBatches, icon: LayersIcon, color: '#6C3CF0', bg: 'rgba(108,60,240,0.08)' },
                { title: 'My Students', count: stats.totalStudents, icon: Users, color: '#3B82F6', bg: 'rgba(59,130,246,0.08)' },
                { title: "Today's Classes", count: stats.todayClassesCount, icon: Video, color: '#10B981', bg: 'rgba(16,185,129,0.08)' },
                { title: 'Attendance Pending', count: stats.attendancePendingCount, icon: CalendarCheck, color: '#F59E0B', bg: 'rgba(245,158,11,0.08)' },
                { title: 'Upcoming Classes', count: stats.upcomingClassesCount, icon: Clock, color: '#8B5CF6', bg: 'rgba(139,92,246,0.08)' },
                { title: 'Total Activity Points', count: stats.totalPoints, icon: Trophy, color: '#EC4899', bg: 'rgba(236,72,153,0.08)' },
              ].map((card, idx) => {
                const Icon = card.icon;
                return (
                  <div key={idx} style={{ background: '#FFF', border: '1.5px solid var(--border-color)', borderRadius: 18, padding: 20, boxShadow: 'var(--shadow-card)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)' }}>{card.title}</span>
                      <h2 style={{ fontSize: 26, fontWeight: 800, margin: '4px 0 0', color: '#121118' }}>{card.count}</h2>
                    </div>
                    <div style={{ width: 44, height: 44, borderRadius: 12, background: card.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Icon size={22} color={card.color} />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Quick Actions & Assigned Batches Overview */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 24 }}>
              <div style={{ background: '#FFF', border: '1.5px solid var(--border-color)', borderRadius: 20, padding: 24, boxShadow: 'var(--shadow-card)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <h3 style={{ fontSize: 16, fontWeight: 800, margin: 0 }}>Assigned Batches Summary</h3>
                  <button className="btn btn-ghost btn-sm" onClick={() => handleTabChange('batches')}>View All</button>
                </div>
                {batches.length === 0 ? (
                  <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>No batches assigned yet.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {batches.slice(0, 4).map(b => (
                      <div key={b.id} style={{ padding: 14, background: 'var(--surface-alt)', border: '1px solid var(--border-color)', borderRadius: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 800, color: '#121118' }}>{b.name}</div>
                          <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Course: {b.course_name || 'N/A'} • {b.students_count || 0} Students</div>
                        </div>
                        <span style={{ fontSize: 11, fontWeight: 800, padding: '3px 8px', background: 'rgba(16,185,129,0.1)', color: '#10B981', borderRadius: 6 }}>
                          {b.status || 'Active'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div style={{ background: '#FFF', border: '1.5px solid var(--border-color)', borderRadius: 20, padding: 24, boxShadow: 'var(--shadow-card)' }}>
                <h3 style={{ fontSize: 16, fontWeight: 800, margin: '0 0 16px' }}>Quick Teaching Tools</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <button className="btn btn-outline" style={{ height: 50, flexDirection: 'column', gap: 2, fontSize: 12 }} onClick={() => handleTabChange('attendance')}>
                    <CalendarCheck size={18} color="var(--primary-color)" /> Take Attendance
                  </button>
                  <button className="btn btn-outline" style={{ height: 50, flexDirection: 'column', gap: 2, fontSize: 12 }} onClick={() => setShowLiveModal(true)}>
                    <Video size={18} color="#10B981" /> Schedule Class
                  </button>
                  <button className="btn btn-outline" style={{ height: 50, flexDirection: 'column', gap: 2, fontSize: 12 }} onClick={() => setShowAnnModal(true)}>
                    <Megaphone size={18} color="#F59E0B" /> Announcement
                  </button>
                  <button className="btn btn-outline" style={{ height: 50, flexDirection: 'column', gap: 2, fontSize: 12 }} onClick={() => setShowActivityModal(true)}>
                    <Trophy size={18} color="#EC4899" /> Award Points
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ─── MODULE 2: MY BATCHES ─────────────────────────────────────────── */}
        {activeTab === 'batches' && (
          <div className="animate-fade-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ fontSize: 20, fontWeight: 800, margin: 0 }}>My Assigned Batches</h2>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 20 }}>
              {batches.map(b => (
                <div key={b.id} style={{ background: '#FFF', border: '1.5px solid var(--border-color)', borderRadius: 18, padding: 20, boxShadow: 'var(--shadow-card)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <span style={{ fontSize: 11, fontWeight: 800, background: 'rgba(108,60,240,0.1)', color: 'var(--primary-color)', padding: '4px 10px', borderRadius: 6 }}>
                      {b.code || b.batchId || b.id}
                    </span>
                    <span style={{ fontSize: 11, fontWeight: 800, padding: '3px 8px', background: 'rgba(16,185,129,0.1)', color: '#10B981', borderRadius: 6 }}>
                      {b.status || 'Active'}
                    </span>
                  </div>
                  <h3 style={{ fontSize: 17, fontWeight: 800, margin: '0 0 4px', color: '#121118' }}>{b.name}</h3>
                  <p style={{ fontSize: 12.5, color: 'var(--text-secondary)', margin: '0 0 14px' }}>
                    Course: <strong>{b.course_name || 'N/A'}</strong>
                  </p>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border-color)', paddingTop: 12, marginBottom: 16 }}>
                    <span>Students: <strong>{b.students_count || 0}</strong></span>
                    <span>Schedule: <strong>{b.schedule || 'Regular'}</strong></span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    <button className="btn btn-outline btn-sm" onClick={() => setSelectedBatchDetails(b)}>
                      <Eye size={14} /> Batch Details
                    </button>
                    <button className="btn btn-primary btn-sm" onClick={() => { setAttBatchId(b.id); handleTabChange('attendance'); }}>
                      <CalendarCheck size={14} /> Attendance
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ─── MODULE 3: MY STUDENTS ────────────────────────────────────────── */}
        {activeTab === 'students' && (() => {
          const filteredTrainerStudents = students.filter(s => {
            if (!studentSearchQuery.trim()) return true;
            const q = studentSearchQuery.toLowerCase();
            return (
              (s.name || '').toLowerCase().includes(q) ||
              (s.email || '').toLowerCase().includes(q) ||
              (s.rollNumber || s.id || '').toLowerCase().includes(q)
            );
          });

          return (
            <div className="animate-fade-in">
              <div style={{ background: '#FFF', border: '1.5px solid var(--border-color)', borderRadius: 20, padding: 20, marginBottom: 24 }}>
                <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: 240 }} className="search-bar-container">
                    <Search size={16} color="var(--text-secondary)" />
                    <input
                      type="text"
                      placeholder="Search student by name or email..."
                      className="search-bar-input"
                      value={studentSearchQuery}
                      onChange={(e) => setStudentSearchQuery(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div style={{ background: '#FFF', border: '1.5px solid var(--border-color)', borderRadius: 20, overflow: 'hidden', boxShadow: 'var(--shadow-card)' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13.5 }}>
                  <thead style={{ background: 'var(--surface-alt)', borderBottom: '1px solid var(--border-color)' }}>
                    <tr>
                      <th style={{ padding: '14px 20px', fontWeight: 800, color: 'var(--text-secondary)' }}>Student Name</th>
                      <th style={{ padding: '14px 20px', fontWeight: 800, color: 'var(--text-secondary)' }}>Student ID</th>
                      <th style={{ padding: '14px 20px', fontWeight: 800, color: 'var(--text-secondary)' }}>Course</th>
                      <th style={{ padding: '14px 20px', fontWeight: 800, color: 'var(--text-secondary)' }}>Batch</th>
                      <th style={{ padding: '14px 20px', fontWeight: 800, color: 'var(--text-secondary)' }}>Activity Points</th>
                      <th style={{ padding: '14px 20px', fontWeight: 800, color: 'var(--text-secondary)' }}>Status</th>
                      <th style={{ padding: '14px 20px', fontWeight: 800, color: 'var(--text-secondary)' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTrainerStudents.map(s => (
                      <tr key={s.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                        <td style={{ padding: '14px 20px', fontWeight: 700 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <img src={s.profile_pic || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'} alt="" style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover' }} />
                            <div>
                              <div>{s.name}</div>
                              <div style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 400 }}>{s.email}</div>
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: '14px 20px', fontFamily: 'monospace', fontWeight: 700 }}>{s.rollNumber || s.id}</td>
                        <td style={{ padding: '14px 20px' }}>{s.course || 'Fullstack'}</td>
                        <td style={{ padding: '14px 20px' }}>{s.batch_name || s.batchName || 'Assigned'}</td>
                        <td style={{ padding: '14px 20px', fontWeight: 800, color: 'var(--primary-color)' }}>{s.activityPoints || 0} pts</td>
                        <td style={{ padding: '14px 20px' }}>
                          <span style={{ fontSize: 11, fontWeight: 800, padding: '3px 8px', background: 'rgba(16,185,129,0.1)', color: '#10B981', borderRadius: 6 }}>
                            {s.status || 'Active'}
                          </span>
                        </td>
                        <td style={{ padding: '14px 20px' }}>
                          <div style={{ display: 'flex', gap: 6 }}>
                            {s.email && (
                              <a
                                href={`mailto:${s.email}`}
                                className="btn btn-outline btn-sm"
                                style={{ padding: '4px 8px', textDecoration: 'none', color: 'var(--primary-color)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                                title="Send Mail"
                              >
                                <Mail size={14} />
                              </a>
                            )}
                            <button className="btn btn-outline btn-sm" onClick={() => setSelectedStudentDetails(s)}>
                              <Eye size={14} /> Profile
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })()}

        {/* ─── MODULE 4: ATTENDANCE SHEET & CALENDAR ─────────────────────────── */}
        {activeTab === 'attendance' && (
          <div className="animate-fade-in">
            {/* Top Selectors */}
            <div style={{ background: '#FFF', border: '1.5px solid var(--border-color)', borderRadius: 20, padding: 20, marginBottom: 24 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
                <div>
                  <label className="form-label">Select Assigned Batch *</label>
                  <select className="form-select" value={attBatchId} onChange={e => setAttBatchId(e.target.value)}>
                    <option value="">-- Choose Batch --</option>
                    {batches.map(b => (
                      <option key={b.id} value={b.id}>{b.name} ({b.course_name})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="form-label">Class Date *</label>
                  <input type="date" className="form-input" value={attDate} onChange={e => setAttDate(e.target.value)} />
                </div>
              </div>
            </div>

            {attBatchId && (
              <div style={{ display: 'grid', gridTemplateColumns: '3fr 1fr', gap: 24, marginBottom: 32 }}>
                {/* Left Attendance Sheet */}
                <div>
                  {/* Summary Bar */}
                  <div style={{ background: '#FFF', border: '1.5px solid var(--border-color)', borderRadius: 18, padding: 20, marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                    <div style={{ display: 'flex', gap: 20 }}>
                      <div><span style={{ fontSize: 11, color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 800 }}>Total</span><h3 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>{attSummary.total}</h3></div>
                      <div><span style={{ fontSize: 11, color: '#10B981', textTransform: 'uppercase', fontWeight: 800 }}>Present</span><h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#10B981' }}>{attSummary.present}</h3></div>
                      <div><span style={{ fontSize: 11, color: '#EF4444', textTransform: 'uppercase', fontWeight: 800 }}>Absent</span><h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#EF4444' }}>{attSummary.absent}</h3></div>
                      <div><span style={{ fontSize: 11, color: '#F59E0B', textTransform: 'uppercase', fontWeight: 800 }}>Not Marked</span><h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#F59E0B' }}>{attSummary.notMarked}</h3></div>
                      <div><span style={{ fontSize: 11, color: 'var(--primary-color)', textTransform: 'uppercase', fontWeight: 800 }}>Attendance Rate</span><h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: 'var(--primary-color)' }}>{attSummary.rate}%</h3></div>
                    </div>

                    <div style={{ display: 'flex', gap: 8 }}>
                      <button className="btn btn-outline btn-sm" onClick={() => handleSelectAll('Present')}>All Present</button>
                      <button className="btn btn-outline btn-sm" onClick={() => handleSelectAll('Absent')}>All Absent</button>
                      <button className="btn btn-ghost btn-sm" onClick={handleResetAttendance}>Reset</button>
                      <button className="btn btn-primary btn-sm" onClick={handleSaveAttendance} disabled={savingAttendance}>
                        <Save size={14} /> {savingAttendance ? 'Saving...' : 'Save Attendance'}
                      </button>
                    </div>
                  </div>

                  {/* Attendance Table */}
                  <div style={{ background: '#FFF', border: '1.5px solid var(--border-color)', borderRadius: 20, overflow: 'hidden', boxShadow: 'var(--shadow-card)' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13.5 }}>
                      <thead style={{ background: 'var(--surface-alt)', borderBottom: '1px solid var(--border-color)' }}>
                        <tr>
                          <th style={{ padding: '14px 20px', fontWeight: 800, color: 'var(--text-secondary)' }}>Student ID</th>
                          <th style={{ padding: '14px 20px', fontWeight: 800, color: 'var(--text-secondary)' }}>Student Name</th>
                          <th style={{ padding: '14px 20px', fontWeight: 800, color: 'var(--text-secondary)' }}>Attendance Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {attBatchStudents.map(s => {
                          const status = attStudentRecords[s.id] || 'Not Marked';
                          return (
                            <tr key={s.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                              <td style={{ padding: '14px 20px', fontFamily: 'monospace', fontWeight: 700 }}>{s.rollNumber || s.id}</td>
                              <td style={{ padding: '14px 20px', fontWeight: 700 }}>{s.name}</td>
                              <td style={{ padding: '14px 20px' }}>
                                <div style={{ display: 'flex', gap: 8 }}>
                                  <button 
                                    className={`btn btn-sm ${status === 'Present' ? 'btn-primary' : 'btn-outline'}`}
                                    style={{ background: status === 'Present' ? '#10B981' : '', borderColor: status === 'Present' ? '#10B981' : '' }}
                                    onClick={() => handleMarkStudent(s.id, 'Present')}
                                  >
                                    Present
                                  </button>
                                  <button 
                                    className={`btn btn-sm ${status === 'Absent' ? 'btn-danger' : 'btn-outline'}`}
                                    onClick={() => handleMarkStudent(s.id, 'Absent')}
                                  >
                                    Absent
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Right Interactive Attendance Calendar & Agenda */}
                <div>
                  <div style={{ background: '#FFF', border: '1.5px solid var(--border-color)', borderRadius: 20, padding: 20, boxShadow: 'var(--shadow-card)', marginBottom: 20 }}>
                    <h3 style={{ fontSize: 15, fontWeight: 800, margin: '0 0 12px' }}>Class Calendar</h3>
                    <input 
                      type="date" 
                      className="form-input" 
                      value={selectedCalendarDate} 
                      onChange={e => { setSelectedCalendarDate(e.target.value); setAttDate(e.target.value); }} 
                    />
                    <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 8, fontSize: 12 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><span style={{ width: 10, height: 10, borderRadius: '50%', background: '#10B981' }}></span> Green = Attendance Completed</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><span style={{ width: 10, height: 10, borderRadius: '50%', background: '#F59E0B' }}></span> Orange = Pending Sheet</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><span style={{ width: 10, height: 10, borderRadius: '50%', background: '#9499AB' }}></span> Gray = No Schedule</div>
                    </div>
                  </div>

                  <div style={{ background: '#FFF', border: '1.5px solid var(--border-color)', borderRadius: 20, padding: 20, boxShadow: 'var(--shadow-card)' }}>
                    <h4 style={{ fontSize: 13, fontWeight: 800, margin: '0 0 10px', color: 'var(--primary-color)' }}>AGENDA: {selectedCalendarDate}</h4>
                    {liveClasses.filter(c => c.date === selectedCalendarDate).length === 0 ? (
                      <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: 0 }}>No live class scheduled for this date.</p>
                    ) : (
                      liveClasses.filter(c => c.date === selectedCalendarDate).map(lc => (
                        <div key={lc.id} style={{ padding: 10, background: 'var(--surface-alt)', borderRadius: 10, fontSize: 12, marginBottom: 8 }}>
                          <div style={{ fontWeight: 800, color: '#121118' }}>{lc.title || lc.lectureName}</div>
                          <div style={{ color: 'var(--text-secondary)' }}>Batch: {lc.batchName || lc.batchId}</div>
                          <div style={{ color: 'var(--primary-color)', fontWeight: 700 }}>Time: {lc.time}</div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Attendance History Section */}
            <div style={{ marginTop: 32 }}>
              <h3 style={{ fontSize: 17, fontWeight: 800, marginBottom: 16 }}>Attendance History Log</h3>
              <div style={{ background: '#FFF', border: '1.5px solid var(--border-color)', borderRadius: 20, overflow: 'hidden', boxShadow: 'var(--shadow-card)' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead style={{ background: 'var(--surface-alt)', borderBottom: '1px solid var(--border-color)' }}>
                    <tr>
                      <th style={{ padding: '12px 18px', fontWeight: 800 }}>Date</th>
                      <th style={{ padding: '12px 18px', fontWeight: 800 }}>Batch</th>
                      <th style={{ padding: '12px 18px', fontWeight: 800 }}>Course</th>
                      <th style={{ padding: '12px 18px', fontWeight: 800 }}>Present</th>
                      <th style={{ padding: '12px 18px', fontWeight: 800 }}>Absent</th>
                      <th style={{ padding: '12px 18px', fontWeight: 800 }}>Attendance Rate</th>
                      <th style={{ padding: '12px 18px', fontWeight: 800 }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {attendanceSheets.map(sh => (
                      <tr key={sh.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                        <td style={{ padding: '12px 18px', fontWeight: 700 }}>{sh.date}</td>
                        <td style={{ padding: '12px 18px' }}>{sh.batchName || sh.batch_name || sh.batchId}</td>
                        <td style={{ padding: '12px 18px' }}>{sh.courseName || sh.course_name || 'Course'}</td>
                        <td style={{ padding: '12px 18px', color: '#10B981', fontWeight: 800 }}>{sh.presentCount || sh.present_count || 0}</td>
                        <td style={{ padding: '12px 18px', color: '#EF4444', fontWeight: 800 }}>{sh.absentCount || sh.absent_count || 0}</td>
                        <td style={{ padding: '12px 18px', fontWeight: 800, color: 'var(--primary-color)' }}>
                          {sh.attendancePercentage || sh.attendance_percentage || 0}%
                        </td>
                        <td style={{ padding: '12px 18px' }}>
                          <button className="btn btn-outline btn-sm" onClick={() => { setAttBatchId(sh.batchId || sh.batch_id); setAttDate(sh.date); }}>
                            Edit Attendance
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ─── MODULE 5: LIVE CLASSES ────────────────────────────────────────── */}
        {activeTab === 'live-classes' && (
          <div className="animate-fade-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ fontSize: 20, fontWeight: 800, margin: 0 }}>Assigned Live Classes</h2>
              <button className="btn btn-primary" onClick={() => setShowLiveModal(true)}>
                <Plus size={16} /> Schedule Live Class
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 20 }}>
              {liveClasses.map(lc => (
                <div key={lc.id} style={{ background: '#FFF', border: '1.5px solid var(--border-color)', borderRadius: 18, padding: 20, boxShadow: 'var(--shadow-card)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={{ fontSize: 11, fontWeight: 800, background: 'rgba(16,185,129,0.1)', color: '#10B981', padding: '4px 10px', borderRadius: 6 }}>
                      {lc.status || 'Upcoming'}
                    </span>
                    <span style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 700 }}>{lc.date}</span>
                  </div>
                  <h3 style={{ fontSize: 16, fontWeight: 800, margin: '0 0 6px', color: '#121118' }}>{lc.title || lc.lectureName}</h3>
                  <div style={{ fontSize: 12.5, color: 'var(--text-secondary)', marginBottom: 14 }}>
                    Batch: <strong>{lc.batchName || lc.batchId}</strong> • Time: <strong>{lc.time}</strong>
                  </div>
                  <a href={lc.meetLink || lc.meet_url} target="_blank" rel="noreferrer" className="btn btn-primary btn-sm" style={{ width: '100%', textDecoration: 'none' }}>
                    <ExternalLink size={14} /> Join Google Meet
                  </a>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ─── MODULE 6: RECORDED CLASSES ───────────────────────────────────── */}
        {activeTab === 'recorded-classes' && (
          <div className="animate-fade-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ fontSize: 20, fontWeight: 800, margin: 0 }}>Course Recording Modules</h2>
              <button className="btn btn-primary" onClick={() => setShowRecordedModal(true)}>
                <Plus size={16} /> Add Lesson / Video
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 20 }}>
              {recordedClasses.map(rc => (
                <div key={rc.id} style={{ background: '#FFF', border: '1.5px solid var(--border-color)', borderRadius: 18, padding: 20, boxShadow: 'var(--shadow-card)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                    <PlayCircle size={24} color="var(--primary-color)" />
                    <h3 style={{ fontSize: 16, fontWeight: 800, margin: 0 }}>{rc.title}</h3>
                  </div>
                  <p style={{ fontSize: 12.5, color: 'var(--text-secondary)', margin: '0 0 14px' }}>{rc.description || 'Lesson recording video.'}</p>
                  <a href={rc.video_url || rc.embedUrl} target="_blank" rel="noreferrer" className="btn btn-outline btn-sm" style={{ width: '100%', textDecoration: 'none' }}>
                    <PlayCircle size={14} /> Watch Lesson
                  </a>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ─── MODULE 7: ANNOUNCEMENTS ──────────────────────────────────────── */}
        {activeTab === 'announcements' && (
          <div className="animate-fade-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ fontSize: 20, fontWeight: 800, margin: 0 }}>Batch Announcements</h2>
              <button className="btn btn-primary" onClick={() => setShowAnnModal(true)}>
                <Plus size={16} /> Post Announcement
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {announcements.map(an => (
                <div key={an.id} style={{ background: '#FFF', border: '1.5px solid var(--border-color)', borderRadius: 18, padding: 20, boxShadow: 'var(--shadow-card)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={{ fontSize: 11, fontWeight: 800, background: 'rgba(245,158,11,0.1)', color: '#F59E0B', padding: '4px 10px', borderRadius: 6 }}>
                      Batch: {an.batchName || an.batchId || 'All'}
                    </span>
                    <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{an.date}</span>
                  </div>
                  <h3 style={{ fontSize: 16, fontWeight: 800, margin: '0 0 6px' }}>{an.title}</h3>
                  <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0, whiteSpace: 'pre-wrap' }}>{an.message || an.content}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ─── MODULE 8: ACTIVITY SCORES ────────────────────────────────────── */}
        {activeTab === 'activity-scores' && (
          <div className="animate-fade-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ fontSize: 20, fontWeight: 800, margin: 0 }}>Award Student Activity Points</h2>
              <button className="btn btn-primary" onClick={() => setShowActivityModal(true)}>
                <Plus size={16} /> Award Activity Points
              </button>
            </div>

            <div style={{ background: '#FFF', border: '1.5px solid var(--border-color)', borderRadius: 20, overflow: 'hidden', boxShadow: 'var(--shadow-card)' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13.5 }}>
                <thead style={{ background: 'var(--surface-alt)', borderBottom: '1px solid var(--border-color)' }}>
                  <tr>
                    <th style={{ padding: '14px 20px', fontWeight: 800 }}>Student Name</th>
                    <th style={{ padding: '14px 20px', fontWeight: 800 }}>Batch</th>
                    <th style={{ padding: '14px 20px', fontWeight: 800 }}>Total Points</th>
                    <th style={{ padding: '14px 20px', fontWeight: 800 }}>Quick Action</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map(s => (
                    <tr key={s.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '14px 20px', fontWeight: 700 }}>{s.name}</td>
                      <td style={{ padding: '14px 20px' }}>{s.batch_name || s.batchName || 'Assigned'}</td>
                      <td style={{ padding: '14px 20px', fontWeight: 800, color: 'var(--primary-color)' }}>{s.activityPoints || 0} pts</td>
                      <td style={{ padding: '14px 20px' }}>
                        <button className="btn btn-outline btn-sm" onClick={() => { setActStudentId(s.id); setShowActivityModal(true); }}>
                          + Award Points
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ─── MODULE 9: PROFILE ────────────────────────────────────────────── */}
        {activeTab === 'profile' && (
          <div className="animate-fade-in" style={{ maxWidth: 640, margin: '0 auto' }}>
            <div style={{ background: '#FFF', border: '1.5px solid var(--border-color)', borderRadius: 24, padding: 32, boxShadow: 'var(--shadow-lg)' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 28 }}>
                <div style={{ position: 'relative', marginBottom: 16 }}>
                  <img 
                    src={userProfile?.profilePic || userProfile?.profile_pic || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'} 
                    alt="Avatar" 
                    style={{ width: 100, height: 100, borderRadius: '50%', objectFit: 'cover', border: '4px solid var(--primary-color)' }}
                  />
                  <label htmlFor="profile-avatar-input" style={{ position: 'absolute', bottom: 0, right: 0, background: 'var(--primary-color)', color: '#fff', borderRadius: '50%', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                    <Camera size={16} />
                  </label>
                  <input type="file" id="profile-avatar-input" accept="image/*" style={{ display: 'none' }} onChange={handleAvatarChange} disabled={uploadingAvatar} />
                </div>
                <h2 style={{ fontSize: 20, fontWeight: 800, margin: 0 }}>{userProfile?.fullName || userProfile?.name}</h2>
                <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--primary-color)', background: 'rgba(108,60,240,0.1)', padding: '4px 12px', borderRadius: 20, marginTop: 6 }}>
                  Trainer ID: {userProfile?.trainerId || userProfile?.code}
                </span>
              </div>

              <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <label className="form-label">Full Name</label>
                  <input type="text" className="form-input" value={editingName} onChange={e => setEditingName(e.target.value)} required />
                </div>
                <div>
                  <label className="form-label">Email Address (Auth ID)</label>
                  <input type="email" className="form-input" value={userProfile?.email || ''} disabled style={{ opacity: 0.7 }} />
                </div>
                <div>
                  <label className="form-label">Phone Number</label>
                  <input type="text" className="form-input" value={editingPhone} onChange={e => setEditingPhone(e.target.value)} placeholder="+91 9876543210" />
                </div>
                <button type="submit" className="btn btn-primary" disabled={savingProfile} style={{ marginTop: 10 }}>
                  <Save size={16} /> {savingProfile ? 'Saving...' : 'Save Profile Changes'}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* ─── MODULE 10: SETTINGS (PASSWORD CHANGE) ────────────────────────── */}
        {activeTab === 'settings' && (
          <div className="animate-fade-in" style={{ maxWidth: 540, margin: '0 auto' }}>
            <div style={{ background: '#FFF', border: '1.5px solid var(--border-color)', borderRadius: 24, padding: 32, boxShadow: 'var(--shadow-lg)' }}>
              <h2 style={{ fontSize: 20, fontWeight: 800, margin: '0 0 6px' }}>Account Settings & Security</h2>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '0 0 24px' }}>
                Change your password and manage security preferences.
              </p>

              {passError && (
                <div style={{ background: '#FEF2F2', border: '1px solid #FCA5A5', color: '#991B1B', borderRadius: 12, padding: 12, fontSize: 13, fontWeight: 600, marginBottom: 18 }}>
                  {passError}
                </div>
              )}

              <form onSubmit={handleChangePassword} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <label className="form-label">Current Password *</label>
                  <input type="password" className="form-input" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} required />
                </div>
                <div>
                  <label className="form-label">New Password *</label>
                  <input type="password" className="form-input" value={newPassword} onChange={e => setNewPassword(e.target.value)} required />
                </div>
                <div>
                  <label className="form-label">Confirm New Password *</label>
                  <input type="password" className="form-input" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required />
                </div>

                <button type="submit" className="btn btn-primary" disabled={changingPass} style={{ marginTop: 10 }}>
                  <Lock size={16} /> {changingPass ? 'Updating...' : 'Update Password'}
                </button>
              </form>
            </div>
          </div>
        )}
      </main>

      {/* ─── MODALS ───────────────────────────────────────────────────────── */}
      {/* Schedule Live Class Modal */}
      {showLiveModal && (
        <CustomModal isOpen={showLiveModal} onClose={() => setShowLiveModal(false)} title="Schedule New Live Class">
          <form onSubmit={handleScheduleLiveClass} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div><label className="form-label">Lecture Name *</label><input type="text" className="form-input" value={liveLectureName} onChange={e => setLiveLectureName(e.target.value)} required /></div>
            <div>
              <label className="form-label">Assign Batch *</label>
              <select className="form-select" value={liveBatchId} onChange={e => setLiveBatchId(e.target.value)} required>
                <option value="">-- Select Batch --</option>
                {batches.map(b => <option key={b.id} value={b.id}>{b.name} ({b.course_name})</option>)}
              </select>
            </div>
            <div><label className="form-label">Class Date *</label><input type="date" className="form-input" value={liveDate} onChange={e => setLiveDate(e.target.value)} required /></div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div><label className="form-label">Start Time</label><input type="time" className="form-input" value={liveStartTime} onChange={e => setLiveStartTime(e.target.value)} /></div>
              <div><label className="form-label">End Time</label><input type="time" className="form-input" value={liveEndTime} onChange={e => setLiveEndTime(e.target.value)} /></div>
            </div>
            <div><label className="form-label">Google Meet Link *</label><input type="url" className="form-input" value={liveMeetLink} onChange={e => setLiveMeetLink(e.target.value)} placeholder="https://meet.google.com/..." required /></div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 10 }}>
              <button type="button" className="btn btn-outline" onClick={() => setShowLiveModal(false)}>Cancel</button>
              <button type="submit" disabled={schedulingLive} className="btn btn-primary">{schedulingLive ? 'Scheduling...' : 'Schedule Class'}</button>
            </div>
          </form>
        </CustomModal>
      )}

      {/* Add Recorded Lesson Modal */}
      {showRecordedModal && (
        <CustomModal isOpen={showRecordedModal} onClose={() => setShowRecordedModal(false)} title="Add Recorded Lesson">
          <form onSubmit={handleAddRecordedClass} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div><label className="form-label">Lesson Title *</label><input type="text" className="form-input" value={recTitle} onChange={e => setRecTitle(e.target.value)} required /></div>
            <div>
              <label className="form-label">Assign Batch</label>
              <select className="form-select" value={recBatchId} onChange={e => setRecBatchId(e.target.value)}>
                <option value="">-- All Assigned Batches --</option>
                {batches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
            <div><label className="form-label">Video / Embed URL *</label><input type="url" className="form-input" value={recVideoUrl} onChange={e => setRecVideoUrl(e.target.value)} placeholder="https://youtube.com/embed/..." required /></div>
            <div><label className="form-label">Description</label><textarea className="form-input" value={recDescription} onChange={e => setRecDescription(e.target.value)} style={{ minHeight: 60 }} /></div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 10 }}>
              <button type="button" className="btn btn-outline" onClick={() => setShowRecordedModal(false)}>Cancel</button>
              <button type="submit" disabled={savingRecorded} className="btn btn-primary">{savingRecorded ? 'Saving...' : 'Add Lesson'}</button>
            </div>
          </form>
        </CustomModal>
      )}

      {/* Create Announcement Modal */}
      {showAnnModal && (
        <CustomModal isOpen={showAnnModal} onClose={() => setShowAnnModal(false)} title="Create Announcement">
          <form onSubmit={handleCreateAnnouncement} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div><label className="form-label">Title *</label><input type="text" className="form-input" value={annTitle} onChange={e => setAnnTitle(e.target.value)} required /></div>
            <div>
              <label className="form-label">Target Batch *</label>
              <select className="form-select" value={annBatchId} onChange={e => setAnnBatchId(e.target.value)} required>
                <option value="">-- Select Batch --</option>
                {batches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
            <div><label className="form-label">Message Content *</label><textarea className="form-input" value={annMessage} onChange={e => setAnnMessage(e.target.value)} style={{ minHeight: 80 }} required /></div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 10 }}>
              <button type="button" className="btn btn-outline" onClick={() => setShowAnnModal(false)}>Cancel</button>
              <button type="submit" disabled={savingAnn} className="btn btn-primary">{savingAnn ? 'Posting...' : 'Post Announcement'}</button>
            </div>
          </form>
        </CustomModal>
      )}

      {/* Award Activity Points Modal */}
      {showActivityModal && (
        <CustomModal isOpen={showActivityModal} onClose={() => setShowActivityModal(false)} title="Award Student Activity Points">
          <form onSubmit={handleAwardPoints} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label className="form-label">Select Student *</label>
              <select className="form-select" value={actStudentId} onChange={e => setActStudentId(e.target.value)} required>
                <option value="">-- Select Student --</option>
                {students.map(s => <option key={s.id} value={s.id}>{s.name} ({s.batch_name || 'Batch'})</option>)}
              </select>
            </div>
            <div><label className="form-label">Points Amount *</label><input type="number" className="form-input" value={actPoints} onChange={e => setActPoints(e.target.value)} required /></div>
            <div>
              <label className="form-label">Activity Type</label>
              <select className="form-select" value={actType} onChange={e => setActType(e.target.value)}>
                <option value="Participation">Class Participation (+5)</option>
                <option value="Quiz Winner">Quiz Winner (+15)</option>
                <option value="Assignment Completed">Assignment (+10)</option>
                <option value="Perfect Attendance">Perfect Attendance (+20)</option>
              </select>
            </div>
            <div><label className="form-label">Remarks</label><input type="text" className="form-input" value={actRemarks} onChange={e => setActRemarks(e.target.value)} placeholder="e.g. Great answer during lecture" /></div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 10 }}>
              <button type="button" className="btn btn-outline" onClick={() => setShowActivityModal(false)}>Cancel</button>
              <button type="submit" disabled={savingActivity} className="btn btn-primary">{savingActivity ? 'Awarding...' : 'Award Points'}</button>
            </div>
          </form>
        </CustomModal>
      )}

      {/* Batch Details Modal */}
      {selectedBatchDetails && (
        <CustomModal isOpen={!!selectedBatchDetails} onClose={() => setSelectedBatchDetails(null)} title={`Batch Details — ${selectedBatchDetails.name}`}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ padding: 14, background: 'var(--surface-alt)', borderRadius: 12 }}>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Batch Code: <strong>{selectedBatchDetails.code || selectedBatchDetails.id}</strong></div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Course: <strong>{selectedBatchDetails.course_name}</strong></div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Schedule: <strong>{selectedBatchDetails.schedule || 'Regular'}</strong></div>
            </div>
            <h4 style={{ margin: '8px 0 0', fontSize: 14, fontWeight: 800 }}>Student Roster ({selectedBatchDetails.students_count || 0})</h4>
            <div style={{ maxHeight: 240, overflowY: 'auto' }}>
              {students.filter(s => s.batch_id === selectedBatchDetails.id || (selectedBatchDetails.student_ids || []).includes(s.id)).map(st => (
                <div key={st.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border-color)', fontSize: 13 }}>
                  <span>{st.name} ({st.rollNumber || st.id})</span>
                  <span style={{ color: 'var(--text-secondary)' }}>{st.email}</span>
                </div>
              ))}
            </div>
          </div>
        </CustomModal>
      )}

      {/* Student Details Modal */}
      {selectedStudentDetails && (
        <CustomModal isOpen={!!selectedStudentDetails} onClose={() => setSelectedStudentDetails(null)} title={`Student Profile — ${selectedStudentDetails.name}`}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <img src={selectedStudentDetails.profile_pic || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'} alt="" style={{ width: 60, height: 60, borderRadius: '50%', objectFit: 'cover' }} />
              <div>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800 }}>{selectedStudentDetails.name}</h3>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>ID: {selectedStudentDetails.rollNumber || selectedStudentDetails.id}</div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Email: {selectedStudentDetails.email}</div>
              </div>
            </div>
            <div style={{ padding: 14, background: 'var(--surface-alt)', borderRadius: 12, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, fontSize: 12.5 }}>
              <div>Course: <strong>{selectedStudentDetails.course}</strong></div>
              <div>Batch: <strong>{selectedStudentDetails.batch_name || 'Assigned'}</strong></div>
              <div>Activity Score: <strong>{selectedStudentDetails.activityPoints || 0} pts</strong></div>
              <div>Account Status: <strong>{selectedStudentDetails.status || 'Active'}</strong></div>
            </div>
          </div>
        </CustomModal>
      )}
    </div>
  );
};

// Helper Icon for sidebar menu
const LayersIcon = ({ size, color }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color || "currentColor"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="12 2 2 7 12 12 22 7 12 2" />
    <polyline points="2 17 12 22 22 17" />
    <polyline points="2 12 12 17 22 12" />
  </svg>
);

export default TrainerDashboard;
