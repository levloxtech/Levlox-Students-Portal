import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  GraduationCap, Users, Video, Clock, BookOpen, 
  Megaphone, Wallet, Settings, Trash2, Plus, 
  LogOut, CheckCircle, Award, Percent, CalendarCheck,
  Pencil, Eye, ChevronLeft, ChevronRight, Search, Filter,
  PlayCircle, Clock3, TriangleAlert, CircleAlert, Wallet as WalletIcon, Trophy
} from 'lucide-react';
import CustomModal from '../components/Modal';

const API_BASE = 'http://localhost:5000/api';

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [stats, setStats] = useState(null);
  const [students, setStudents] = useState([]);
  const [liveClasses, setLiveClasses] = useState([]);
  const [recordedClasses, setRecordedClasses] = useState([]);
  const [notes, setNotes] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(false);

  // Batch Management states
  const [batches, setBatches] = useState([]);
  const [selectedBatchId, setSelectedBatchId] = useState('');
  const [batchName, setBatchName] = useState('');
  const [batchCourseName, setBatchCourseName] = useState('');
  const [batchTrainerName, setBatchTrainerName] = useState('');
  const [batchStartDate, setBatchStartDate] = useState('');
  const [batchEndDate, setBatchEndDate] = useState('');
  const [batchStatus, setBatchStatus] = useState('Active');
  const [batchMaxStudents, setBatchMaxStudents] = useState(30);
  const [editingBatch, setEditingBatch] = useState(null);
  const [assigningBatch, setAssigningBatch] = useState(null);
  const [selectedStudentIds, setSelectedStudentIds] = useState([]);
  const [allStudentsForAssign, setAllStudentsForAssign] = useState([]);

  // Pagination & Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [feesFilter, setFeesFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Sidebar collapsible state
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Modals
  const [editingStudent, setEditingStudent] = useState(null);
  const [editingFeesStudent, setEditingFeesStudent] = useState(null);
  const [attendanceStudent, setAttendanceStudent] = useState(null);
  const [attendanceHistory, setAttendanceHistory] = useState([]);

  // Form states for edits
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editRollNumber, setEditRollNumber] = useState('');
  const [editTotal, setEditTotal] = useState(1500);
  const [editPaid, setEditPaid] = useState(0);
  const [editStatus, setEditStatus] = useState('Pending');
  const [editPayDate, setEditPayDate] = useState('');

  // Attendance Sheet States
  const [selectedClassId, setSelectedClassId] = useState('');
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().substring(0, 10));

  // Form states for creations
  const [liveTitle, setLiveTitle] = useState('');
  const [liveInstructor, setLiveInstructor] = useState('');
  const [liveDate, setLiveDate] = useState('');
  const [liveTime, setLiveTime] = useState('');
  const [liveUrl, setLiveUrl] = useState('');
  const [liveDescription, setLiveDescription] = useState('');
  const [liveToday, setLiveToday] = useState(false);
  const [livePublished, setLivePublished] = useState(true);
  const [liveStatus, setLiveStatus] = useState('Upcoming'); // Upcoming / Live / Completed
  const [editingLiveClass, setEditingLiveClass] = useState(null);

  // Edit live class form states
  const [editLiveTitle, setEditLiveTitle] = useState('');
  const [editLiveInstructor, setEditLiveInstructor] = useState('');
  const [editLiveMeetLink, setEditLiveMeetLink] = useState('');
  const [editLiveDate, setEditLiveDate] = useState('');
  const [editLiveTime, setEditLiveTime] = useState('');
  const [editLiveDescription, setEditLiveDescription] = useState('');
  const [editLiveStatus, setEditLiveStatus] = useState('Upcoming');
  const [editLiveToday, setEditLiveToday] = useState(false);
  const [editLivePublished, setEditLivePublished] = useState(true);

  const [recTitle, setRecTitle] = useState('');
  const [recDuration, setRecDuration] = useState('1h 30m');
  const [recDescription, setRecDescription] = useState('');
  const [recThumbnail, setRecThumbnail] = useState('');
  const [recYoutube, setRecYoutube] = useState('');
  const [recDrive, setRecDrive] = useState('');
  const [recCourseTitle, setRecCourseTitle] = useState('Fullstack Engineering');
  const [recModule, setRecModule] = useState('Module 1 - Python Basics');
  const [recVideoUrl, setRecVideoUrl] = useState('');
  const [recThumbnailUrl, setRecThumbnailUrl] = useState('');
  const [recLessonDescription, setRecLessonDescription] = useState('');
  const [recNotesUrl, setRecNotesUrl] = useState('');
  const [recAssignment, setRecAssignment] = useState('');
  const [recQuiz, setRecQuiz] = useState('');
  const [recVisibility, setRecVisibility] = useState('everyone');
  const [recSortOrder, setRecSortOrder] = useState('');
  const [editingRecordedClass, setEditingRecordedClass] = useState(null);

  const [noteTitle, setNoteTitle] = useState('');
  const [noteType, setNoteType] = useState('PDF');
  const [noteUrl, setNoteUrl] = useState('');
  const [noteDescription, setNoteDescription] = useState('');
  const [noteSubject, setNoteSubject] = useState('');

  const [annTitle, setAnnTitle] = useState('');
  const [annContent, setAnnContent] = useState('');
  const [annPriority, setAnnPriority] = useState('Medium');
  const [annPinned, setAnnPinned] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState(null);

  // Edit announcements form states
  const [editAnnTitle, setEditAnnTitle] = useState('');
  const [editAnnContent, setEditAnnContent] = useState('');
  const [editAnnPriority, setEditAnnPriority] = useState('Medium');
  const [editAnnPinned, setEditAnnPinned] = useState(false);

  // Portal settings states
  const [portalName, setPortalName] = useState('Levlox Student Portal');
  const [portalLogo, setPortalLogo] = useState('');

  // Activity score management states
  const [actBatchId, setActBatchId] = useState('');
  const [actStudentId, setActStudentId] = useState('');
  const [actDate, setActDate] = useState(new Date().toISOString().substring(0, 10));
  const [actMeeting, setActMeeting] = useState('');
  const [actType, setActType] = useState('+10 Answered Questions');
  const [actPoints, setActPoints] = useState(10);
  const [actRemarks, setActRemarks] = useState('');
  const [batchStudents, setBatchStudents] = useState([]);
  const [activityLogs, setActivityLogs] = useState([]);

  const handleActBatchChange = async (batchId) => {
    setActBatchId(batchId);
    setActStudentId('');
    if (!batchId) {
      setBatchStudents([]);
      return;
    }
    try {
      const response = await fetch(`${API_BASE}/admin/students-by-batch/${batchId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setBatchStudents(data || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleAwardActivity = async (e) => {
    e.preventDefault();
    if (!actStudentId || !actBatchId || !actMeeting) {
      showModal("Missing Fields", "Please select Batch, Student, and enter Meeting Title.", "warning");
      return;
    }
    try {
      const response = await fetch(`${API_BASE}/admin/live-class-activity`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          student_id: actStudentId,
          batch_id: actBatchId,
          date: actDate,
          meeting: actMeeting,
          activity_type: actType,
          points: actPoints,
          remarks: actRemarks
        })
      });
      if (response.ok) {
        showModal("Success", "Activity score updated successfully!", "success");
        setActRemarks('');
        fetchActivityLogs();
        fetchStats();
      } else {
        const err = await response.json();
        showModal("Error", err.message || "Failed to award activity points", "error");
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchActivityLogs = async () => {
    try {
      const response = await fetch(`${API_BASE}/admin/live-class-activity`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setActivityLogs(data || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Notification Modals
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

  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => {
    fetchStats();
    fetchPortalSettings();
    fetchBatches();
  }, []);

  const fetchPortalSettings = async () => {
    try {
      const response = await fetch(`${API_BASE}/portal-settings`);
      if (response.ok) {
        const data = await response.json();
        setPortalName(data.portal_name || 'Levlox Student Portal');
        setPortalLogo(data.portal_logo || '');
      }
    } catch (error) {
      console.error(error);
    }
  };

  const savePortalSettings = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${API_BASE}/portal-settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          portal_name: portalName,
          portal_logo: portalLogo
        })
      });
      if (response.ok) {
        showModal("Success", "Portal settings updated successfully!", "success");
        fetchPortalSettings();
      } else {
        showModal("Error", "Failed to save portal settings", "error");
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handlePortalLogoMock = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setPortalLogo(reader.result);
    };
    reader.readAsDataURL(file);
  };

  // ══════════════════════════════════════════════════════
  // BATCH MANAGEMENT EVENT HANDLERS
  // ══════════════════════════════════════════════════════
  const fetchBatches = async () => {
    try {
      const response = await fetch(`${API_BASE}/admin/batches`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setBatches(data || []);
      }
    } catch (error) {
      console.error("Error fetching batches:", error);
    }
  };

  const fetchAllStudentsForAssign = async () => {
    try {
      const response = await fetch(`${API_BASE}/admin/students?limit=200`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setAllStudentsForAssign(data.students || []);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const createBatch = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${API_BASE}/admin/batches`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: batchName,
          course_name: batchCourseName,
          trainer_name: batchTrainerName,
          start_date: batchStartDate,
          end_date: batchEndDate,
          status: batchStatus,
          max_students: batchMaxStudents
        })
      });
      if (response.ok) {
        setBatchName('');
        setBatchCourseName('');
        setBatchTrainerName('');
        setBatchStartDate('');
        setBatchEndDate('');
        setBatchStatus('Active');
        setBatchMaxStudents(30);
        showModal("Success", "New batch created successfully!", "success");
        fetchBatches();
      } else {
        const err = await response.json();
        showModal("Error", err.message || "Failed to create batch", "error");
      }
    } catch (error) {
      console.error(error);
    }
  };

  const startEditBatch = (batch) => {
    setEditingBatch(batch);
    setBatchName(batch.name);
    setBatchCourseName(batch.course_name);
    setBatchTrainerName(batch.trainer_name);
    setBatchStartDate(batch.start_date || '');
    setBatchEndDate(batch.end_date || '');
    setBatchStatus(batch.status || 'Active');
    setBatchMaxStudents(batch.max_students || 30);
  };

  const saveBatchEdit = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${API_BASE}/admin/batches/${editingBatch.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: batchName,
          course_name: batchCourseName,
          trainer_name: batchTrainerName,
          start_date: batchStartDate,
          end_date: batchEndDate,
          status: batchStatus,
          max_students: batchMaxStudents
        })
      });
      if (response.ok) {
        setEditingBatch(null);
        setBatchName('');
        setBatchCourseName('');
        setBatchTrainerName('');
        setBatchStartDate('');
        setBatchEndDate('');
        setBatchStatus('Active');
        setBatchMaxStudents(30);
        showModal("Success", "Batch details updated successfully!", "success");
        fetchBatches();
      } else {
        const err = await response.json();
        showModal("Error", err.message || "Failed to update batch", "error");
      }
    } catch (error) {
      console.error(error);
    }
  };

  const deleteBatch = async (batchId) => {
    if (!window.confirm("Are you sure you want to delete this batch? All assigned students will be unlinked.")) return;
    try {
      const response = await fetch(`${API_BASE}/admin/batches/${batchId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        showModal("Success", "Batch deleted successfully!", "success");
        fetchBatches();
      } else {
        showModal("Error", "Failed to delete batch", "error");
      }
    } catch (error) {
      console.error(error);
    }
  };

  const startAssignStudents = (batch) => {
    setAssigningBatch(batch);
    setSelectedStudentIds(batch.student_ids || []);
    fetchAllStudentsForAssign();
  };

  const toggleStudentAssign = (studentId) => {
    setSelectedStudentIds(prev => 
      prev.includes(studentId) ? prev.filter(id => id !== studentId) : [...prev, studentId]
    );
  };

  const saveStudentAssignments = async () => {
    try {
      const response = await fetch(`${API_BASE}/admin/batches/${assigningBatch.id}/assign-students`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ student_ids: selectedStudentIds })
      });
      if (response.ok) {
        setAssigningBatch(null);
        setSelectedStudentIds([]);
        showModal("Success", "Student assignments updated successfully!", "success");
        fetchBatches();
        fetchStudents();
      } else {
        showModal("Error", "Failed to assign students", "error");
      }
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    if (activeTab === 'students' || activeTab === 'attendance' || activeTab === 'fees-management') {
      fetchStudents();
    } else if (activeTab === 'live-classes') {
      fetchLiveClasses();
      fetchBatches();
    } else if (activeTab === 'recorded-classes') {
      fetchRecordedClasses();
      fetchBatches();
    } else if (activeTab === 'notes') {
      fetchNotes();
      fetchBatches();
    } else if (activeTab === 'announcements') {
      fetchAnnouncements();
      fetchBatches();
    } else if (activeTab === 'batches') {
      fetchBatches();
    } else if (activeTab === 'activity-score') {
      fetchBatches();
      fetchActivityLogs();
    }
  }, [activeTab, currentPage, searchQuery, statusFilter, feesFilter]);

  const handleLogout = () => {
    localStorage.clear();
    navigate('/login');
  };

  const fetchStats = async () => {
    try {
      const response = await fetch(`${API_BASE}/admin/stats`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  };

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams({
        page: currentPage,
        limit: 5,
        search: searchQuery,
        status: statusFilter,
        feesPaid: feesFilter
      });
      
      const response = await fetch(`${API_BASE}/admin/students?${queryParams}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setStudents(data.students || []);
        setTotalPages(data.pages || 1);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const fetchLiveClasses = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/student/dashboard`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        const combined = [];
        if (data.todayLiveClass) combined.push(data.todayLiveClass);
        if (data.upcomingLiveClasses) combined.push(...data.upcomingLiveClasses);
        setLiveClasses(combined);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRecordedClasses = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/admin/recorded-classes`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setRecordedClasses(data.recorded_classes || data || []);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const fetchNotes = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/student/dashboard`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setNotes(data.studyMaterials || []);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAnnouncements = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/student/dashboard`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setAnnouncements(data.announcements || []);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const toggleFees = async (studentId) => {
    try {
      const response = await fetch(`${API_BASE}/admin/students/${studentId}/toggle-fees`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        fetchStudents();
        fetchStats();
      }
    } catch (error) {
      console.error(error);
    }
  };

  const toggleStatus = async (studentId) => {
    try {
      const response = await fetch(`${API_BASE}/admin/students/${studentId}/toggle-status`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        fetchStudents();
        fetchStats();
      }
    } catch (error) {
      console.error(error);
    }
  };

  const deleteStudent = async (studentId) => {
    if (!window.confirm("Are you sure you want to delete this student account? This action cannot be undone.")) return;
    try {
      const response = await fetch(`${API_BASE}/admin/students/${studentId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        fetchStudents();
        fetchStats();
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleEditClick = (student) => {
    setEditingStudent(student);
    setEditName(student.name);
    setEditEmail(student.email);
    setEditRollNumber(student.rollNumber);
  };

  const saveStudentEdit = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${API_BASE}/admin/students/${editingStudent.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: editName,
          email: editEmail,
          rollNumber: editRollNumber
        })
      });
      if (response.ok) {
        setEditingStudent(null);
        fetchStudents();
      } else {
        const err = await response.json();
        showModal("Error", err.message || "Failed to update profile", "error");
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleEditFeesClick = (student) => {
    setEditingFeesStudent(student);
    setEditTotal(student.feesTotal || 1500);
    setEditPaid(student.feesPaidAmount || 0);
    setEditStatus(student.feesStatus || 'Pending');
    setEditPayDate(student.feesPaymentDate || '');
  };

  const saveFeesEdit = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${API_BASE}/admin/students/${editingFeesStudent.id}/update-fees`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          feesTotal: editTotal,
          feesPaidAmount: editPaid,
          feesStatus: editStatus,
          feesPaymentDate: editPayDate
        })
      });
      if (response.ok) {
        setEditingFeesStudent(null);
        fetchStudents();
        fetchStats();
      }
    } catch (error) {
      console.error(error);
    }
  };

  const fetchAttendanceSheet = async (classId) => {
    if (!classId) {
      setAttendanceRecords([]);
      return;
    }
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/admin/attendance/class/${classId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setAttendanceRecords(data.records || []);
        if (data.date) {
          setAttendanceDate(data.date);
        }
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = (studentId, newStatus) => {
    setAttendanceRecords(prev => 
      prev.map(r => r.student_id === studentId ? { ...r, status: newStatus } : r)
    );
  };

  const saveAttendanceSheet = async () => {
    if (!selectedClassId) return;
    try {
      const response = await fetch(`${API_BASE}/admin/attendance/save`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          live_class_id: selectedClassId,
          date: attendanceDate,
          records: attendanceRecords
        })
      });
      if (response.ok) {
        showModal("Success", "Attendance saved successfully!", "success");
        fetchStudents();
        fetchStats();
      } else {
        const err = await response.json();
        showModal("Error", err.message || "Failed to save attendance", "error");
      }
    } catch (error) {
      console.error(error);
    }
  };

  const viewAttendance = async (student) => {
    setAttendanceStudent(student);
    try {
      const response = await fetch(`${API_BASE}/admin/students/${student.id}/attendance-history`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setAttendanceHistory(data.attendanceHistory || []);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const addLiveClass = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${API_BASE}/admin/live-classes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          title: liveTitle,
          instructor: liveInstructor,
          meet_link: liveUrl,
          date: liveDate,
          time: liveTime,
          description: liveDescription,
          status: liveStatus,
          is_today: liveToday,
          is_published: livePublished,
          batch_id: selectedBatchId
        })
      });
      if (response.ok) {
        setLiveTitle('');
        setLiveInstructor('');
        setLiveDate('');
        setLiveTime('');
        setLiveUrl('');
        setLiveDescription('');
        setLiveStatus('Upcoming');
        setLiveToday(false);
        setLivePublished(true);
        setSelectedBatchId('');
        fetchLiveClasses();
        fetchStats();
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleEditLiveClick = (item) => {
    setEditingLiveClass(item);
    setEditLiveTitle(item.title);
    setEditLiveInstructor(item.instructor);
    setEditLiveMeetLink(item.meet_link || item.join_url || '');
    setEditLiveDate(item.date || '');
    setEditLiveTime(item.time || '');
    setEditLiveDescription(item.description || '');
    setEditLiveStatus(item.status || 'Upcoming');
    setEditLiveToday(item.is_today || false);
    setEditLivePublished(item.is_published !== false);
  };

  const saveLiveClassEdit = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${API_BASE}/admin/live-classes/${editingLiveClass._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          title: editLiveTitle,
          instructor: editLiveInstructor,
          meet_link: editLiveMeetLink,
          date: editLiveDate,
          time: editLiveTime,
          description: editLiveDescription,
          status: editLiveStatus,
          is_today: editLiveToday,
          is_published: editLivePublished
        })
      });
      if (response.ok) {
        setEditingLiveClass(null);
        fetchLiveClasses();
      }
    } catch (error) {
      console.error(error);
    }
  };

  const deleteLiveClass = async (id) => {
    try {
      const response = await fetch(`${API_BASE}/admin/live-classes/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        fetchLiveClasses();
        fetchStats();
      }
    } catch (error) {
      console.error(error);
    }
  };

  const addRecordedClass = async (e) => {
    e.preventDefault();
    const isEditing = !!editingRecordedClass;
    const url = isEditing 
      ? `${API_BASE}/admin/recorded-classes/${editingRecordedClass._id}`
      : `${API_BASE}/admin/recorded-classes`;
    const method = isEditing ? 'PUT' : 'POST';
    try {
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          title: recTitle,
          module: recModule,
          video_url: recVideoUrl,
          thumbnail: recThumbnailUrl,
          description: recLessonDescription,
          notes_url: recNotesUrl,
          assignment: recAssignment,
          quiz: recQuiz,
          visibility: recVisibility,
          course_title: recCourseTitle,
          batch_id: selectedBatchId,
          sort_order: recSortOrder ? parseInt(recSortOrder) : 999
        })
      });
      if (response.ok) {
        setRecTitle('');
        setRecModule('Module 1 - Python Basics');
        setRecVideoUrl('');
        setRecThumbnailUrl('');
        setRecLessonDescription('');
        setRecNotesUrl('');
        setRecAssignment('');
        setRecQuiz('');
        setRecVisibility('everyone');
        setRecSortOrder('');
        setEditingRecordedClass(null);
        fetchRecordedClasses();
        fetchStats();
        showModal("Success", isEditing ? "Lesson updated successfully!" : "New LMS Lesson posted successfully!", "success");
      } else {
        const err = await response.json();
        showModal("Error", err.message || "Failed to upload lesson", "error");
      }
    } catch (error) {
      console.error(error);
    }
  };

  const toggleRecordedClassVisibility = async (id, currentVisibility) => {
    const newVisibility = currentVisibility === 'everyone' ? 'paid' : 'everyone';
    try {
      const response = await fetch(`${API_BASE}/admin/recorded-classes/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          visibility: newVisibility
        })
      });
      if (response.ok) {
        showModal("Success", `Visibility changed to: ${newVisibility === 'everyone' ? 'Everyone' : 'Paid Students Only'}`, "success");
        fetchRecordedClasses();
      } else {
        showModal("Error", "Failed to update visibility status", "error");
      }
    } catch (error) {
      console.error(error);
    }
  };

  const deleteRecordedClass = async (id) => {
    try {
      const response = await fetch(`${API_BASE}/admin/recorded-classes/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        fetchRecordedClasses();
        fetchStats();
      }
    } catch (error) {
      console.error(error);
    }
  };

  const addNote = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${API_BASE}/admin/study-materials`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          title: noteTitle,
          subject: noteSubject,
          type: noteType,
          url: noteUrl,
          description: noteDescription,
          batch_id: selectedBatchId
        })
      });
      if (response.ok) {
        setNoteTitle('');
        setNoteSubject('');
        setNoteUrl('');
        setNoteDescription('');
        fetchNotes();
        fetchStats();
      }
    } catch (error) {
      console.error(error);
    }
  };

  const deleteNote = async (id) => {
    try {
      const response = await fetch(`${API_BASE}/admin/study-materials/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        fetchNotes();
        fetchStats();
      }
    } catch (error) {
      console.error(error);
    }
  };

  const addAnnouncement = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${API_BASE}/admin/announcements`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          title: annTitle,
          content: annContent,
          priority: annPriority,
          is_pinned: annPinned,
          batch_id: selectedBatchId
        })
      });
      if (response.ok) {
        setAnnTitle('');
        setAnnContent('');
        setAnnPriority('Medium');
        setAnnPinned(false);
        fetchAnnouncements();
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleEditAnnClick = (item) => {
    setEditingAnnouncement(item);
    setEditAnnTitle(item.title);
    setEditAnnContent(item.content);
    setEditAnnPriority(item.priority || 'Medium');
    setEditAnnPinned(item.is_pinned || false);
  };

  const saveAnnouncementEdit = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${API_BASE}/admin/announcements/${editingAnnouncement._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          title: editAnnTitle,
          content: editAnnContent,
          priority: editAnnPriority,
          is_pinned: editAnnPinned
        })
      });
      if (response.ok) {
        setEditingAnnouncement(null);
        fetchAnnouncements();
      }
    } catch (error) {
      console.error(error);
    }
  };

  const deleteAnnouncement = async (id) => {
    try {
      const response = await fetch(`${API_BASE}/admin/announcements/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        fetchAnnouncements();
      }
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div className="dashboard-layout">
      {/* Collapsible Sidebar */}
      <aside className={`sidebar ${sidebarCollapsed ? 'collapsed' : ''}`}>
        <div className="sidebar-header">
          <div className="sidebar-brand">
            {portalLogo ? (
              <img src={portalLogo} alt="logo" style={{ width: '28px', height: '28px', objectFit: 'contain', borderRadius: '4px' }} />
            ) : (
              <div style={{ background: '#6C3CF0', color: 'white', width: '32px', height: '32px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <GraduationCap size={18} />
              </div>
            )}
            <span className="sidebar-brand-text">{portalName}</span>
          </div>
          <button className="sidebar-toggle-btn" onClick={() => setSidebarCollapsed(!sidebarCollapsed)}>
            {sidebarCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
          </button>
        </div>

        <nav className="sidebar-menu" style={{ overflowY: 'auto' }}>
          <button className={`sidebar-link ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={() => setActiveTab('dashboard')}>
            <Clock size={18} />
            <span className="sidebar-link-text">Dashboard</span>
          </button>
          
          <button className={`sidebar-link ${activeTab === 'students' ? 'active' : ''}`} onClick={() => { setActiveTab('students'); setCurrentPage(1); }}>
            <Users size={18} />
            <span className="sidebar-link-text">Students</span>
          </button>

          <button className={`sidebar-link ${activeTab === 'batches' ? 'active' : ''}`} onClick={() => { setActiveTab('batches'); fetchBatches(); }}>
            <GraduationCap size={18} />
            <span className="sidebar-link-text">Batch Management</span>
          </button>
          
          <button className={`sidebar-link ${activeTab === 'live-classes' ? 'active' : ''}`} onClick={() => setActiveTab('live-classes')}>
            <Video size={18} />
            <span className="sidebar-link-text">Live Classes</span>
          </button>
          
          <button className={`sidebar-link ${activeTab === 'attendance' ? 'active' : ''}`} onClick={() => { setActiveTab('attendance'); setCurrentPage(1); }}>
            <Percent size={18} />
            <span className="sidebar-link-text">Attendance</span>
          </button>
          
          <button className={`sidebar-link ${activeTab === 'recorded-classes' ? 'active' : ''}`} onClick={() => setActiveTab('recorded-classes')}>
            <PlayCircle size={18} />
            <span className="sidebar-link-text">Recorded Classes</span>
          </button>
          
          <button className={`sidebar-link ${activeTab === 'notes' ? 'active' : ''}`} onClick={() => setActiveTab('notes')}>
            <BookOpen size={18} />
            <span className="sidebar-link-text">Notes</span>
          </button>
          
          <button className={`sidebar-link ${activeTab === 'announcements' ? 'active' : ''}`} onClick={() => setActiveTab('announcements')}>
            <Megaphone size={18} />
            <span className="sidebar-link-text">Announcements</span>
          </button>
          
          <button className={`sidebar-link ${activeTab === 'fees-management' ? 'active' : ''}`} onClick={() => { setActiveTab('fees-management'); setCurrentPage(1); }}>
            <Wallet size={18} />
            <span className="sidebar-link-text">Fees Management</span>
          </button>
          
          <button className={`sidebar-link ${activeTab === 'activity-score' ? 'active' : ''}`} onClick={() => setActiveTab('activity-score')}>
            <Trophy size={18} />
            <span className="sidebar-link-text">Activity Scores</span>
          </button>
          
          <button className={`sidebar-link ${activeTab === 'settings' ? 'active' : ''}`} onClick={() => setActiveTab('settings')}>
            <Settings size={18} />
            <span className="sidebar-link-text">Settings</span>
          </button>

          <button className="sidebar-link sidebar-footer" onClick={handleLogout} style={{ marginTop: '20px' }}>
            <LogOut size={18} />
            <span className="sidebar-link-text">Logout</span>
          </button>
        </nav>
      </aside>

      {/* Main Content */}
      <main className={`main-content ${sidebarCollapsed ? 'expanded' : ''}`}>
        
        {/* Top Navbar */}
        <header className="top-navbar">
          <div className="search-bar-container">
            <Search size={16} style={{ color: 'var(--text-secondary)' }} />
            <input 
              type="text" 
              placeholder="Search databases..." 
              className="search-bar-input"
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
            />
          </div>

          <div className="navbar-actions">
            <div className="user-profile-badge">
              <div className="avatar">{user.name ? user.name[0].toUpperCase() : 'A'}</div>
              <div className="profile-info">
                <span className="profile-name">{user.name}</span>
                <span className="profile-role">Portal Administrator</span>
              </div>
            </div>
          </div>
        </header>

        {/* Dashboard Tab */}
        {activeTab === 'dashboard' && stats && (
          <div>
            <div className="welcome-card-premium">
              <div className="welcome-card-content">
                <h2 className="welcome-card-title">Administrator Control Center</h2>
                <p className="welcome-card-subtitle">Manage curriculum courses, student transaction files, attendance rates, and broadcast updates to the institution.</p>
              </div>
            </div>

            <div className="stats-grid-premium">
              <div className="stat-card-premium">
                <div className="stat-card-header">
                  <span className="stat-card-label">Total Learners</span>
                  <div className="stat-card-icon" style={{ background: 'rgba(108, 60, 240, 0.08)', color: '#6C3CF0' }}>
                    <Users size={16} />
                  </div>
                </div>
                <div>
                  <h3 className="stat-card-value">{stats.totalStudents}</h3>
                  <span className="stat-card-footer">Registered in LSP Database</span>
                </div>
              </div>

              <div className="stat-card-premium">
                <div className="stat-card-header">
                  <span className="stat-card-label">Outstanding Balances</span>
                  <div className="stat-card-icon" style={{ backgroundColor: 'rgba(239, 68, 68, 0.08)', color: 'var(--danger-color)' }}>
                    <Wallet size={16} />
                  </div>
                </div>
                <div>
                  <h3 className="stat-card-value">${stats.unpaidAmount || 0}</h3>
                  <span className="stat-card-footer">{stats.unpaidStudentsCount} Students pending dues</span>
                </div>
              </div>

              <div className="stat-card-premium">
                <div className="stat-card-header">
                  <span className="stat-card-label">Financial Collection</span>
                  <div className="stat-card-icon" style={{ backgroundColor: 'rgba(16, 185, 129, 0.08)', color: 'var(--success-color)' }}>
                    <Wallet size={16} />
                  </div>
                </div>
                <div>
                  <h3 className="stat-card-value">${stats.totalCollected || 0}</h3>
                  <span className="stat-card-footer">From total billing package: ${stats.totalExpected || 0}</span>
                </div>
              </div>
            </div>

            <div className="dashboard-main-grid">
              <div className="dashboard-card-section">
                <h3 className="section-title-premium">
                  <Users size={18} style={{ color: 'var(--primary-color)' }} />
                  Institution Registry Snippet
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '16px' }}>
                  {students.slice(0, 4).map(student => (
                    <div key={student.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', background: '#fafafd', borderRadius: '10px' }}>
                      <div>
                        <strong style={{ display: 'block', color: 'var(--text-primary)', fontSize: '13.5px' }}>{student.name}</strong>
                        <span style={{ color: 'var(--text-secondary)', fontSize: '11px' }}>ID: {student.rollNumber} | {student.email}</span>
                      </div>
                      <span className={`badge-status ${student.feesStatus === 'Paid' ? 'paid' : 'unpaid'}`} style={{ fontSize: '10px' }}>
                        {student.feesStatus}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="dashboard-card-section">
                <h3 className="section-title-premium">
                  <Megaphone size={18} style={{ color: 'var(--primary-color)' }} />
                  Latest Notice Broadcasts
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '16px' }}>
                  {announcements.slice(0, 3).map((item, idx) => (
                    <div key={idx} style={{ padding: '12px', background: '#fafafd', borderRadius: '10px', borderLeft: item.is_pinned ? '3px solid var(--primary-color)' : 'none' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <strong style={{ fontSize: '13px', color: 'var(--text-primary)' }}>{item.title}</strong>
                        <span style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>{item.date}</span>
                      </div>
                      <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0 }}>{item.content?.substring(0, 80)}...</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Batches Management Tab */}
        {activeTab === 'batches' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.6fr', gap: '30px' }}>
            {/* Create / Edit Batch Form */}
            <div className="dashboard-card-section">
              <h4 style={{ marginBottom: '18px', fontSize: '15px', fontWeight: '700' }}>
                {editingBatch ? 'Edit Batch Details' : 'Create New Batch'}
              </h4>
              <form onSubmit={editingBatch ? saveBatchEdit : createBatch}>
                <div className="form-group">
                  <label className="form-label" htmlFor="batchName">Batch Name</label>
                  <input id="batchName" type="text" className="form-input" value={batchName} onChange={(e) => setBatchName(e.target.value)} placeholder="e.g. Fullstack MERN Web Dev - Alpha" required />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="batchCourseName">Course Title</label>
                  <input id="batchCourseName" type="text" className="form-input" value={batchCourseName} onChange={(e) => setBatchCourseName(e.target.value)} placeholder="e.g. Fullstack Engineering" required />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="batchTrainerName">Trainer / Instructor</label>
                  <input id="batchTrainerName" type="text" className="form-input" value={batchTrainerName} onChange={(e) => setBatchTrainerName(e.target.value)} placeholder="e.g. Dr. Sarah Jenkins" required />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="batchStartDate">Start Date</label>
                  <input id="batchStartDate" type="date" className="form-input" value={batchStartDate} onChange={(e) => setBatchStartDate(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="batchEndDate">End Date</label>
                  <input id="batchEndDate" type="date" className="form-input" value={batchEndDate} onChange={(e) => setBatchEndDate(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="batchStatusSelect">Batch Status</label>
                  <select id="batchStatusSelect" className="form-select" value={batchStatus} onChange={(e) => setBatchStatus(e.target.value)}>
                    <option value="Active">Active</option>
                    <option value="Completed">Completed</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="batchMaxStudents">Maximum Seats</label>
                  <input id="batchMaxStudents" type="number" className="form-input" value={batchMaxStudents} onChange={(e) => setBatchMaxStudents(e.target.value)} required />
                </div>
                <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                  {editingBatch && (
                    <button type="button" className="btn btn-outline" style={{ flex: 1 }} onClick={() => {
                      setEditingBatch(null);
                      setBatchName('');
                      setBatchCourseName('');
                      setBatchTrainerName('');
                      setBatchStartDate('');
                      setBatchEndDate('');
                      setBatchStatus('Active');
                      setBatchMaxStudents(30);
                    }}>
                      Cancel
                    </button>
                  )}
                  <button type="submit" className="btn btn-primary" style={{ flex: 2 }}>
                    {editingBatch ? 'Save Batch Changes' : 'Confirm New Batch'}
                  </button>
                </div>
              </form>
            </div>

            {/* Batches List Cards */}
            <div className="dashboard-card-section">
              <div className="section-header-premium" style={{ marginBottom: '20px' }}>
                <h4 style={{ fontSize: '15.5px', fontWeight: '700', margin: 0 }}>Registered Institutional Batches</h4>
              </div>

              {batches.length === 0 ? (
                <p style={{ color: 'var(--text-secondary)', fontSize: '14.5px' }}>No batches created yet. Use the left panel to configure a new batch.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {batches.map((batch) => (
                    <div key={batch.id} className="feed-item-premium" style={{ display: 'flex', flexDirection: 'column', alignItems: 'stretch', padding: '20px', gap: '12px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                          <span style={{ fontSize: '10.5px', fontWeight: 800, textTransform: 'uppercase', color: 'var(--primary-color)', background: 'var(--primary-light)', padding: '3px 8px', borderRadius: '6px' }}>
                            {batch.code} · {batch.course_name}
                          </span>
                          <h5 style={{ fontWeight: '800', fontSize: '17px', color: 'var(--text-primary)', margin: '8px 0 2px' }}>{batch.name}</h5>
                          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0 }}>Instructor: <strong>{batch.trainer_name}</strong></p>
                        </div>
                        <span className={`badge-status ${batch.status === 'Active' ? 'paid' : 'unpaid'}`}>
                          {batch.status}
                        </span>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', background: 'var(--surface-alt)', padding: '12px', borderRadius: '12px', border: '1px solid var(--border-color)', fontSize: '12.5px' }}>
                        <div>
                          <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '11px', textTransform: 'uppercase', fontWeight: 700 }}>Students</span>
                          <strong>{batch.students_count} / {batch.max_students}</strong>
                        </div>
                        <div>
                          <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '11px', textTransform: 'uppercase', fontWeight: 700 }}>Start Date</span>
                          <strong>{batch.start_date}</strong>
                        </div>
                        <div>
                          <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '11px', textTransform: 'uppercase', fontWeight: 700 }}>End Date</span>
                          <strong>{batch.end_date}</strong>
                        </div>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-color)', paddingTop: '12px' }}>
                        <button className="btn btn-primary" style={{ padding: '8px 16px', fontSize: '12.5px' }} onClick={() => startAssignStudents(batch)}>
                          Assign Students
                        </button>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button className="btn btn-outline" style={{ padding: '8px 12px', fontSize: '12px' }} onClick={() => startEditBatch(batch)}>
                            Edit
                          </button>
                          <button className="btn btn-danger" style={{ padding: '8px 12px', fontSize: '12px', backgroundColor: 'var(--danger-color)', color: 'white' }} onClick={() => deleteBatch(batch.id)}>
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Students Registry Tab */}
        {activeTab === 'students' && (
          <div className="dashboard-card-section">
            <div className="section-header-premium">
              <h3 className="section-title-premium">Student Accounts Registry</h3>
              
              <div style={{ display: 'flex', gap: '8px' }}>
                <select className="form-select" style={{ padding: '6px 12px', fontSize: '12px', width: '130px', margin: 0 }} value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}>
                  <option value="">All Accounts</option>
                  <option value="Active">Active Only</option>
                  <option value="Suspended">Suspended</option>
                </select>
                <select className="form-select" style={{ padding: '6px 12px', fontSize: '12px', width: '130px', margin: 0 }} value={feesFilter} onChange={(e) => { setFeesFilter(e.target.value); setCurrentPage(1); }}>
                  <option value="">All Ledger States</option>
                  <option value="Paid">Fully Paid</option>
                  <option value="Pending">Pending Dues</option>
                </select>
              </div>
            </div>

            <div className="table-container-premium">
              <table className="table-premium">
                <thead>
                  <tr>
                    <th>Roll Number</th>
                    <th>Name</th>
                    <th>Email Address</th>
                    <th>Status</th>
                    <th>Action Controls</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((student) => (
                    <tr key={student.id}>
                      <td><strong>{student.rollNumber}</strong></td>
                      <td>{student.name}</td>
                      <td>{student.email}</td>
                      <td>
                        <span className={`badge-status ${student.status === 'Active' ? 'paid' : 'unpaid'}`}>
                          {student.status || 'Active'}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button className="btn btn-outline" style={{ padding: '6px 10px', fontSize: '12px' }} onClick={() => toggleStatus(student.id)}>
                            {student.status === 'Active' ? 'Suspend' : 'Unsuspend'}
                          </button>
                          <button className="btn btn-outline" style={{ padding: '6px' }} onClick={() => handleEditClick(student)}>
                            <Pencil size={13} />
                          </button>
                          <button className="btn btn-danger" style={{ padding: '6px', backgroundColor: 'var(--danger-color)', color: 'white' }} onClick={() => deleteStudent(student.id)}>
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '20px' }}>
              <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                Viewing page <strong>{currentPage}</strong> of {totalPages}
              </span>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button className="btn btn-outline" style={{ padding: '6px 12px', fontSize: '12px' }} disabled={currentPage === 1} onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}>
                  Prev
                </button>
                <button className="btn btn-outline" style={{ padding: '6px 12px', fontSize: '12px' }} disabled={currentPage === totalPages} onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}>
                  Next
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Live Classes Tab */}
        {activeTab === 'live-classes' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '30px' }}>
            <div className="dashboard-card-section">
              <h4 style={{ marginBottom: '18px', fontSize: '15px', fontWeight: '700' }}>Schedule Live Lecture</h4>
              <form onSubmit={addLiveClass}>
                <div className="form-group">
                  <label className="form-label" htmlFor="liveBatchSelect">Target Batch</label>
                  <select id="liveBatchSelect" className="form-select" value={selectedBatchId} onChange={(e) => setSelectedBatchId(e.target.value)} required>
                    <option value="">-- Choose Batch --</option>
                    {batches.map(b => (
                      <option key={b.id} value={b.id}>{b.name} ({b.code})</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="liveTitle">Lecture Title</label>
                  <input id="liveTitle" type="text" className="form-input" value={liveTitle} onChange={(e) => setLiveTitle(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="liveInstructor">Lead Faculty</label>
                  <input id="liveInstructor" type="text" className="form-input" value={liveInstructor} onChange={(e) => setLiveInstructor(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="liveDate">Date</label>
                  <input id="liveDate" type="date" className="form-input" value={liveDate} onChange={(e) => setLiveDate(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="liveTime">Time / Schedule</label>
                  <input id="liveTime" type="text" className="form-input" value={liveTime} onChange={(e) => setLiveTime(e.target.value)} placeholder="e.g. 10:00 AM - 11:30 AM" required />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="liveUrl">Google Meet Link</label>
                  <input id="liveUrl" type="url" className="form-input" value={liveUrl} onChange={(e) => setLiveUrl(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="liveStatusSelect">Class Status</label>
                  <select id="liveStatusSelect" className="form-select" value={liveStatus} onChange={(e) => setLiveStatus(e.target.value)}>
                    <option value="Upcoming">Upcoming</option>
                    <option value="Live">Live</option>
                    <option value="Completed">Completed</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="liveDescription">Description</label>
                  <textarea id="liveDescription" className="form-input" style={{ height: '80px', resize: 'none' }} value={liveDescription} onChange={(e) => setLiveDescription(e.target.value)} />
                </div>
                <div style={{ display: 'flex', gap: '16px', marginBottom: '20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <input id="liveToday" type="checkbox" checked={liveToday} onChange={(e) => setLiveToday(e.target.checked)} />
                    <label htmlFor="liveToday" className="form-label" style={{ marginBottom: 0 }}>Happening Today?</label>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <input id="livePublished" type="checkbox" checked={livePublished} onChange={(e) => setLivePublished(e.target.checked)} />
                    <label htmlFor="livePublished" className="form-label" style={{ marginBottom: 0 }}>Publish Stream</label>
                  </div>
                </div>
                <button type="submit" className="btn btn-primary btn-block">Confirm Live Lecture</button>
              </form>
            </div>

            <div className="dashboard-card-section">
              <h4 style={{ marginBottom: '18px', fontSize: '15px', fontWeight: '700' }}>Active Sessions Logs</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {liveClasses.map((item, idx) => (
                  <div key={idx} className="feed-item-premium" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '10px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <span className="badge-status paid" style={{ fontSize: '9px', marginBottom: '6px' }}>Instructor: {item.instructor}</span>
                        <h5 style={{ fontWeight: '700', fontSize: '15.5px', color: 'var(--text-primary)', margin: 0 }}>{item.title}</h5>
                      </div>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        <button className="btn btn-outline" style={{ padding: '6px' }} onClick={() => handleEditLiveClick(item)}>
                          <Pencil size={13} />
                        </button>
                        <button className="btn btn-danger" style={{ padding: '6px', backgroundColor: 'var(--danger-color)', color: 'white' }} onClick={() => deleteLiveClass(item._id)}>
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                    {item.description && (
                      <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0 }}>{item.description}</p>
                    )}
                    <div style={{ borderTop: '1px solid rgba(0,0,0,0.02)', paddingTop: '8px', display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-secondary)' }}>
                      <span>Schedule: {item.date} | {item.time}</span>
                      <a href={item.meet_link || item.join_url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary-color)', fontWeight: '700' }}>Meet Link</a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Attendance Tab */}
        {activeTab === 'attendance' && (
          <div>
            <div className="dashboard-card-section" style={{ marginBottom: '30px' }}>
              <h3 className="section-title-premium" style={{ marginBottom: '18px' }}>Log Daily Class Attendance</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Select Session / Lecture</label>
                  <select 
                    className="form-select" 
                    value={selectedClassId} 
                    onChange={(e) => { setSelectedClassId(e.target.value); fetchAttendanceSheet(e.target.value); }}
                  >
                    <option value="">Choose class...</option>
                    {liveClasses.map(c => <option key={c._id} value={c._id}>{c.title}</option>)}
                  </select>
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Attendance Date</label>
                  <input type="date" className="form-input" value={attendanceDate} onChange={(e) => setAttendanceDate(e.target.value)} />
                </div>
              </div>

              {selectedClassId && (
                <>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', margin: '20px 0' }}>
                    {attendanceRecords.map(rec => (
                      <div key={rec.student_id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: '#fafafd', borderRadius: '10px' }}>
                        <span style={{ fontSize: '13.5px', fontWeight: '600' }}>{rec.student_name} ({rec.rollNumber})</span>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button 
                            className={`btn ${rec.status === 'Present' ? 'btn-primary' : 'btn-outline'}`}
                            style={{ padding: '6px 12px', fontSize: '12px' }}
                            onClick={() => handleStatusChange(rec.student_id, 'Present')}
                          >
                            Present
                          </button>
                          <button 
                            className={`btn ${rec.status === 'Absent' ? 'btn-danger' : 'btn-outline'}`}
                            style={{ padding: '6px 12px', fontSize: '12px' }}
                            onClick={() => handleStatusChange(rec.student_id, 'Absent')}
                          >
                            Absent
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <button className="btn btn-primary btn-block" onClick={saveAttendanceSheet}>
                    Commit Attendance Register
                  </button>
                </>
              )}
            </div>

            <div className="dashboard-card-section">
              <h3 className="section-title-premium" style={{ marginBottom: '18px' }}>Institution Attendance Matrix</h3>
              <div className="table-container-premium">
                <table className="table-premium">
                  <thead>
                    <tr>
                      <th>Roll Number</th>
                      <th>Student Name</th>
                      <th>Attendance Rate</th>
                      <th>Present Classes</th>
                      <th>Absent Sessions</th>
                      <th>Audit logs</th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.map(student => (
                      <tr key={student.id}>
                        <td><strong>{student.rollNumber}</strong></td>
                        <td>{student.name}</td>
                        <td style={{ color: 'var(--primary-color)', fontWeight: '700' }}>{student.attendance?.percentage}%</td>
                        <td>{student.attendance?.present} days</td>
                        <td>{student.attendance?.absent} days</td>
                        <td>
                          <button className="btn btn-outline" style={{ padding: '6px 12px', fontSize: '12px' }} onClick={() => viewAttendance(student)}>
                            View Logs
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

        {/* Recorded Classes View */}
        {activeTab === 'recorded-classes' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '30px' }}>
            <div className="dashboard-card-section">
              <h4 style={{ marginBottom: '18px', fontSize: '15px', fontWeight: '700' }}>
                {editingRecordedClass ? '✏️ Edit Lesson' : '➕ Upload New Lesson'}
              </h4>
              <form onSubmit={addRecordedClass}>
                <div className="form-group">
                  <label className="form-label" htmlFor="recBatchSelect">Target Batch</label>
                  <select id="recBatchSelect" className="form-select" value={selectedBatchId} onChange={(e) => setSelectedBatchId(e.target.value)} required>
                    <option value="">-- Choose Batch --</option>
                    {batches.map(b => (
                      <option key={b.id} value={b.id}>{b.name} ({b.code})</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="recCourseTitle">Course Name</label>
                  <input id="recCourseTitle" type="text" className="form-input" value={recCourseTitle} onChange={(e) => setRecCourseTitle(e.target.value)} placeholder="e.g. Python Full Stack" required />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="recModule">Module Section</label>
                  <input id="recModule" type="text" className="form-input" value={recModule} onChange={(e) => setRecModule(e.target.value)} placeholder="e.g. Module 1 - Python Basics" required />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="recTitle">Lesson Title</label>
                  <input id="recTitle" type="text" className="form-input" value={recTitle} onChange={(e) => setRecTitle(e.target.value)} placeholder="e.g. Variables & Data Types" required />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="recVideoUrl">Video URL</label>
                  <input id="recVideoUrl" type="url" className="form-input" value={recVideoUrl} onChange={(e) => setRecVideoUrl(e.target.value)} placeholder="https://youtube.com/watch?v=..." />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="recThumbnailUrl">Thumbnail URL <span style={{ color: 'var(--text-secondary)', fontSize: 11 }}>(optional)</span></label>
                  <input id="recThumbnailUrl" type="url" className="form-input" value={recThumbnailUrl} onChange={(e) => setRecThumbnailUrl(e.target.value)} placeholder="https://img.youtube.com/vi/.../hqdefault.jpg" />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="recLessonDescription">Lesson Description <span style={{ color: 'var(--text-secondary)', fontSize: 11 }}>(optional)</span></label>
                  <textarea id="recLessonDescription" className="form-input" style={{ height: 70, resize: 'none' }} value={recLessonDescription} onChange={(e) => setRecLessonDescription(e.target.value)} placeholder="Brief overview of what students will learn..." />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="recNotesUrl">PDF Notes URL</label>
                  <input id="recNotesUrl" type="url" className="form-input" value={recNotesUrl} onChange={(e) => setRecNotesUrl(e.target.value)} placeholder="https://drive.google.com/file/..." />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="recAssignment">Assignment Title</label>
                  <input id="recAssignment" type="text" className="form-input" value={recAssignment} onChange={(e) => setRecAssignment(e.target.value)} placeholder="e.g. Variables & Operators Lab" />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="recQuiz">Quiz Name</label>
                  <input id="recQuiz" type="text" className="form-input" value={recQuiz} onChange={(e) => setRecQuiz(e.target.value)} placeholder="e.g. Python Basics Quiz" />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="recSortOrder">Sort Order <span style={{ color: 'var(--text-secondary)', fontSize: 11 }}>(lower = first)</span></label>
                  <input id="recSortOrder" type="number" className="form-input" value={recSortOrder} onChange={(e) => setRecSortOrder(e.target.value)} placeholder="e.g. 1, 2, 3..." min="1" />
                </div>
                <div className="form-group">
                  <label className="form-label">Visibility Access</label>
                  <div style={{ display: 'flex', gap: '16px', marginTop: '6px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13.5px', cursor: 'pointer' }}>
                      <input type="radio" name="recVisibility" value="everyone" checked={recVisibility === 'everyone'} onChange={() => setRecVisibility('everyone')} />
                      🌐 Everyone
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13.5px', cursor: 'pointer' }}>
                      <input type="radio" name="recVisibility" value="paid" checked={recVisibility === 'paid'} onChange={() => setRecVisibility('paid')} />
                      🔒 Paid Students Only
                    </label>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 10, marginTop: '20px' }}>
                  <button type="submit" className="btn btn-primary btn-block">
                    {editingRecordedClass ? 'Update Lesson' : 'Save LMS Lesson'}
                  </button>
                  {editingRecordedClass && (
                    <button type="button" className="btn btn-outline" onClick={() => {
                      setEditingRecordedClass(null);
                      setRecTitle(''); setRecModule('Module 1 - Python Basics'); setRecVideoUrl(''); setRecThumbnailUrl(''); setRecLessonDescription(''); setRecNotesUrl(''); setRecAssignment(''); setRecQuiz(''); setRecVisibility('everyone'); setRecSortOrder('');
                    }}>
                      Cancel
                    </button>
                  )}
                </div>
              </form>
            </div>

            <div className="dashboard-card-section">
              <h4 style={{ marginBottom: '18px', fontSize: '15px', fontWeight: '700' }}>Curriculum Library ({recordedClasses.length} lessons)</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {recordedClasses.length === 0 ? (
                  <div style={{ padding: 30, textAlign: 'center', color: 'var(--text-secondary)', fontSize: 13 }}>
                    No lessons uploaded yet. Add your first lesson using the form.
                  </div>
                ) : recordedClasses.map((item, idx) => (
                  <div key={idx} style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 12, padding: '14px 16px' }}>
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                      {/* Sort # badge */}
                      <div style={{ width: 36, height: 36, borderRadius: 8, background: 'var(--primary-light)', color: 'var(--primary-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 13, flexShrink: 0 }}>
                        {item.sort_order || idx + 1}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, flexWrap: 'wrap' }}>
                          <h5 style={{ fontWeight: '700', fontSize: '14px', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '55%' }}>{item.title}</h5>
                          <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                            <button 
                              className="btn btn-outline" 
                              style={{ padding: '4px 10px', fontSize: 11 }}
                              onClick={() => {
                                setEditingRecordedClass(item);
                                setRecTitle(item.title || '');
                                setRecModule(item.module || '');
                                setRecCourseTitle(item.course_title || '');
                                setRecVideoUrl(item.video_url || '');
                                setRecThumbnailUrl(item.thumbnail || '');
                                setRecLessonDescription(item.description || '');
                                setRecNotesUrl(item.notes_url || '');
                                setRecAssignment(item.assignment || '');
                                setRecQuiz(item.quiz || '');
                                setRecVisibility(item.visibility || 'everyone');
                                setRecSortOrder(item.sort_order?.toString() || '');
                                setSelectedBatchId(item.batch_id || '');
                              }}
                            >
                              Edit
                            </button>
                            <button className="btn btn-danger" style={{ padding: '4px', backgroundColor: 'var(--danger-color)', color: 'white' }} onClick={() => deleteRecordedClass(item._id)}>
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </div>
                        <p style={{ fontSize: '11.5px', color: 'var(--text-secondary)', margin: '4px 0 8px' }}>
                          {item.module} · {item.course_title}
                        </p>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' }}>
                          <button 
                            onClick={() => toggleRecordedClassVisibility(item._id, item.visibility)}
                            style={{ fontSize: '10px', fontWeight: 700, padding: '2px 8px', borderRadius: 10, border: 'none', cursor: 'pointer', background: item.visibility === 'paid' ? 'rgba(239,68,68,0.08)' : 'rgba(16,185,129,0.08)', color: item.visibility === 'paid' ? '#DC2626' : '#059669' }}
                          >
                            {item.visibility === 'paid' ? '🔒 Paid Only' : '🌐 Everyone'} (toggle)
                          </button>
                          {item.notes_url && <span style={{ fontSize: '10px', color: '#3B82F6', background: 'rgba(59,130,246,0.06)', padding: '2px 8px', borderRadius: 10 }}>📄 PDF Notes</span>}
                          {item.assignment && <span style={{ fontSize: '10px', color: '#8B5CF6', background: 'rgba(139,92,246,0.06)', padding: '2px 8px', borderRadius: 10 }}>📝 Assignment</span>}
                          {item.quiz && <span style={{ fontSize: '10px', color: '#F59E0B', background: 'rgba(245,158,11,0.06)', padding: '2px 8px', borderRadius: 10 }}>❓ Quiz</span>}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Notes Tab */}
        {activeTab === 'notes' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '30px' }}>
            <div className="dashboard-card-section">
              <h4 style={{ marginBottom: '18px', fontSize: '15px', fontWeight: '700' }}>Publish Study Materials</h4>
              <form onSubmit={addNote}>
                <div className="form-group">
                  <label className="form-label" htmlFor="noteBatchSelect">Target Batch</label>
                  <select id="noteBatchSelect" className="form-select" value={selectedBatchId} onChange={(e) => setSelectedBatchId(e.target.value)} required>
                    <option value="">-- Choose Batch --</option>
                    {batches.map(b => (
                      <option key={b.id} value={b.id}>{b.name} ({b.code})</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="noteTitle">Document Title</label>
                  <input id="noteTitle" type="text" className="form-input" value={noteTitle} onChange={(e) => setNoteTitle(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="noteSubject">Subject / Topic</label>
                  <input id="noteSubject" type="text" className="form-input" value={noteSubject} onChange={(e) => setNoteSubject(e.target.value)} placeholder="e.g. Node.js Basics" required />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="noteType">Format Type</label>
                  <select id="noteType" className="form-select" value={noteType} onChange={(e) => setNoteType(e.target.value)}>
                    <option value="PDF">PDF Document</option>
                    <option value="PPT">PPT Presentation</option>
                    <option value="DOCX">Word Document</option>
                    <option value="ZIP">ZIP Archive</option>
                    <option value="Google Drive Link">Google Drive Link</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="noteUrl">Resource Link</label>
                  <input id="noteUrl" type="url" className="form-input" value={noteUrl} onChange={(e) => setNoteUrl(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="noteDescription">Short Description</label>
                  <textarea id="noteDescription" className="form-input" style={{ height: '80px', resize: 'none' }} value={noteDescription} onChange={(e) => setNoteDescription(e.target.value)} />
                </div>
                <button type="submit" className="btn btn-primary btn-block">Publish Material</button>
              </form>
            </div>

            <div className="dashboard-card-section">
              <h4 style={{ marginBottom: '18px', fontSize: '15px', fontWeight: '700' }}>Study Materials List</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {notes.map((item, idx) => (
                  <div key={idx} className="feed-item-premium" style={{ gap: '16px' }}>
                    <div style={{ flex: 1 }}>
                      <span className="badge-status paid" style={{ fontSize: '9px', marginBottom: '6px' }}>{item.subject}</span>
                      <h5 style={{ fontWeight: '700', fontSize: '14.5px', color: 'var(--text-primary)', margin: 0 }}>{item.title}</h5>
                      <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Format: {item.type} | Posted: {item.uploaded_at}</span>
                    </div>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <a href={item.url} target="_blank" rel="noopener noreferrer" className="btn btn-outline" style={{ padding: '6px 12px', fontSize: '12px' }}>Link</a>
                      <button className="btn btn-danger" style={{ padding: '6px', backgroundColor: 'var(--danger-color)', color: 'white' }} onClick={() => deleteNote(item._id)}>
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Announcements Tab */}
        {activeTab === 'announcements' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '30px' }}>
            <div className="dashboard-card-section">
              <h4 style={{ marginBottom: '18px', fontSize: '15px', fontWeight: '700' }}>Publish Announcement</h4>
              <form onSubmit={addAnnouncement}>
                <div className="form-group">
                  <label className="form-label" htmlFor="annBatchSelect">Target Batch</label>
                  <select id="annBatchSelect" className="form-select" value={selectedBatchId} onChange={(e) => setSelectedBatchId(e.target.value)} required>
                    <option value="">-- Choose Batch --</option>
                    {batches.map(b => (
                      <option key={b.id} value={b.id}>{b.name} ({b.code})</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="annTitle">Notice Title</label>
                  <input id="annTitle" type="text" className="form-input" value={annTitle} onChange={(e) => setAnnTitle(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="annPriority">Priority Level</label>
                  <select id="annPriority" className="form-select" value={annPriority} onChange={(e) => setAnnPriority(e.target.value)}>
                    <option value="Low">Low Priority</option>
                    <option value="Medium">Medium Priority</option>
                    <option value="High">High Priority</option>
                  </select>
                </div>
                <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
                  <input id="annPinned" type="checkbox" checked={annPinned} onChange={(e) => setAnnPinned(e.target.checked)} />
                  <label htmlFor="annPinned" className="form-label" style={{ marginBottom: 0 }}>Pin Announcement?</label>
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="annContent">Message Content</label>
                  <textarea id="annContent" className="form-input" style={{ height: '100px', resize: 'none' }} value={annContent} onChange={(e) => setAnnContent(e.target.value)} required />
                </div>
                <button type="submit" className="btn btn-primary btn-block">Broadcast Notice</button>
              </form>
            </div>

            <div className="dashboard-card-section">
              <h4 style={{ marginBottom: '18px', fontSize: '15px', fontWeight: '700' }}>Broadcast Logs</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {announcements.map((item, idx) => (
                  <div key={idx} className="feed-item-premium" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                        <span className="badge-status paid" style={{ fontSize: '9px' }}>{item.priority}</span>
                        {item.is_pinned && <span style={{ fontSize: '10px', color: 'var(--primary-color)', fontWeight: '700' }}>📌 Pinned</span>}
                      </div>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        <button className="btn btn-outline" style={{ padding: '6px' }} onClick={() => handleEditAnnClick(item)}>
                          <Pencil size={12} />
                        </button>
                        <button className="btn btn-danger" style={{ padding: '6px', backgroundColor: 'var(--danger-color)', color: 'white' }} onClick={() => deleteAnnouncement(item._id)}>
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                    <h5 style={{ fontWeight: '700', fontSize: '14.5px', margin: 0 }}>{item.title}</h5>
                    <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0 }}>{item.content}</p>
                    <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>Broadcasted: {item.date}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Fees Management Tab */}
        {activeTab === 'fees-management' && (
          <div className="dashboard-card-section">
            <h3 className="section-title-premium" style={{ marginBottom: '18px' }}>Student Financial Ledger</h3>
            <div className="table-container-premium">
              <table className="table-premium">
                <thead>
                  <tr>
                    <th>Roll Number</th>
                    <th>Name</th>
                    <th>Total Package</th>
                    <th>Paid Amount</th>
                    <th>Dues Outstanding</th>
                    <th>Ledger Status</th>
                    <th>Payment Date</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((student) => (
                    <tr key={student.id}>
                      <td><strong>{student.rollNumber}</strong></td>
                      <td>{student.name}</td>
                      <td>${student.feesTotal || 1500}</td>
                      <td style={{ color: 'var(--success-color)' }}>${student.feesPaidAmount || 0}</td>
                      <td style={{ color: 'var(--danger-color)' }}>${student.feesRemainingAmount ?? (student.feesTotal || 1500)}</td>
                      <td>
                        <span className={`badge-status ${student.feesStatus === 'Paid' ? 'paid' : 'unpaid'}`}>
                          {student.feesStatus || 'Pending'}
                        </span>
                      </td>
                      <td>{student.feesPaymentDate || 'N/A'}</td>
                      <td>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button 
                            className={`btn ${student.feesStatus === 'Paid' ? 'btn-outline' : 'btn-primary'}`} 
                            style={{ padding: '6px 10px', fontSize: '11.5px' }}
                            onClick={() => toggleFees(student.id)}
                          >
                            Toggle Status
                          </button>
                          <button className="btn btn-outline" style={{ padding: '6px' }} onClick={() => handleEditFeesClick(student)}>
                            <Pencil size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Activity Scores Tab */}
        {activeTab === 'activity-score' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '30px' }}>
            <div className="dashboard-card-section">
              <h4 style={{ marginBottom: '18px', fontSize: '15px', fontWeight: '700' }}>Award Activity Points</h4>
              <form onSubmit={handleAwardActivity}>
                <div className="form-group">
                  <label className="form-label" htmlFor="actBatchSelect">Target Batch</label>
                  <select id="actBatchSelect" className="form-select" value={actBatchId} onChange={(e) => handleActBatchChange(e.target.value)} required>
                    <option value="">-- Choose Batch --</option>
                    {batches.map(b => (
                      <option key={b.id} value={b.id}>{b.name} ({b.code})</option>
                    ))}
                  </select>
                </div>
                
                <div className="form-group">
                  <label className="form-label" htmlFor="actStudentSelect">Select Student</label>
                  <select id="actStudentSelect" className="form-select" value={actStudentId} onChange={(e) => setActStudentId(e.target.value)} required>
                    <option value="">-- Choose Student --</option>
                    {batchStudents.map(s => (
                      <option key={s.id} value={s.id}>{s.name} ({s.rollNumber})</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="actDate">Date</label>
                  <input id="actDate" type="date" className="form-input" value={actDate} onChange={(e) => setActDate(e.target.value)} required />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="actMeeting">Google Meet Session / Lecture Name</label>
                  <input id="actMeeting" type="text" className="form-input" value={actMeeting} onChange={(e) => setActMeeting(e.target.value)} placeholder="e.g. Python Variables Class" required />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="actPreset">Activity Preset Type</label>
                  <select 
                    id="actPreset" 
                    className="form-select" 
                    value={actType} 
                    onChange={(e) => {
                      const type = e.target.value;
                      setActType(type);
                      if (type.includes("+10")) setActPoints(10);
                      else if (type.includes("+5")) setActPoints(5);
                      else if (type.includes("+3")) setActPoints(3);
                      else if (type.includes("+2")) setActPoints(2);
                      else if (type.includes("-5")) setActPoints(-5);
                    }}
                  >
                    <option value="+10 Answered Questions">Answered Questions (+10 pts)</option>
                    <option value="+5 Active Participation">Active Participation (+5 pts)</option>
                    <option value="+3 Attendance on Time">Attendance on Time (+3 pts)</option>
                    <option value="+5 Helped Others">Helped Others (+5 pts)</option>
                    <option value="+2 Camera On">Camera On (+2 pts)</option>
                    <option value="-5 Penalty/Deduction">Deduction (-5 pts)</option>
                    <option value="Custom">Custom Activity Type</option>
                  </select>
                </div>

                {actType === 'Custom' && (
                  <div className="form-group">
                    <label className="form-label" htmlFor="customActType">Custom Activity Title</label>
                    <input id="customActType" type="text" className="form-input" placeholder="e.g. Completed Extra Lab Task" onChange={(e) => setActType(e.target.value)} required />
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label" htmlFor="actPoints">Points</label>
                  <input id="actPoints" type="number" className="form-input" value={actPoints} onChange={(e) => setActPoints(parseInt(e.target.value) || 0)} required />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="actRemarks">Remarks</label>
                  <textarea id="actRemarks" className="form-input" style={{ height: '60px', resize: 'none' }} value={actRemarks} onChange={(e) => setActRemarks(e.target.value)} placeholder="Provide context..." />
                </div>

                <button type="submit" className="btn btn-primary btn-block">Award Activity Points</button>
              </form>
            </div>

            <div className="dashboard-card-section">
              <h4 style={{ marginBottom: '18px', fontSize: '15px', fontWeight: '700' }}>Activity Logs History</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '550px', overflowY: 'auto' }}>
                {activityLogs.length === 0 ? (
                  <div style={{ padding: 30, textAlign: 'center', color: 'var(--text-secondary)', fontSize: 13 }}>
                    No activity points awarded yet.
                  </div>
                ) : activityLogs.map((log) => (
                  <div key={log._id} className="feed-item-premium" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span className="badge-status paid" style={{ fontSize: '10px', background: log.points >= 0 ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)', color: log.points >= 0 ? '#10B981' : '#EF4444' }}>
                        {log.points >= 0 ? `+${log.points}` : log.points} Points
                      </span>
                      <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>{log.date}</span>
                    </div>
                    <h5 style={{ fontWeight: '700', fontSize: '14px', margin: 0 }}>
                      {log.student_name}
                    </h5>
                    <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', margin: 0 }}>
                      <strong>Activity:</strong> {log.activity_type} · <strong>Session:</strong> {log.meeting}
                    </p>
                    {log.remarks && (
                      <p style={{ fontSize: '12px', color: 'var(--text-tertiary)', fontStyle: 'italic', margin: 0 }}>
                        "{log.remarks}"
                      </p>
                    )}
                    <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>Batch: {log.batch_name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '30px' }}>
            <div className="dashboard-card-section">
              <h3 style={{ marginBottom: '18px', fontSize: '16px', fontWeight: '700' }}>Portal Customization</h3>
              <form onSubmit={savePortalSettings}>
                <div className="form-group">
                  <label className="form-label" htmlFor="portalName">Portal Title / Institution Name</label>
                  <input id="portalName" type="text" className="form-input" value={portalName} onChange={(e) => setPortalName(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="portalLogo">Portal Logo URL</label>
                  <input id="portalLogo" type="url" className="form-input" value={portalLogo} onChange={(e) => setPortalLogo(e.target.value)} placeholder="https://..." />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="portalLogoFile">Or upload Portal Logo</label>
                  <input id="portalLogoFile" type="file" accept="image/*" className="form-input" onChange={handlePortalLogoMock} />
                </div>
                <button type="submit" className="btn btn-primary" style={{ padding: '10px 24px' }}>Apply Configuration</button>
              </form>
            </div>

            <div className="dashboard-card-section" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
              <h4 style={{ marginBottom: '20px', fontSize: '14.5px', fontWeight: '700' }}>Logo Preview</h4>
              <div style={{ width: '120px', height: '120px', borderRadius: '16px', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', background: '#f8fafc', padding: '12px' }}>
                {portalLogo ? (
                  <img src={portalLogo} alt="Logo preview" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                ) : (
                  <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>No logo selected</span>
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Assign Students Modal */}
      {assigningBatch && (
        <CustomModal
          isOpen={!!assigningBatch}
          onClose={() => { setAssigningBatch(null); setSelectedStudentIds([]); }}
          title={`Assign Students to ${assigningBatch.name}`}
          type="info"
          confirmText="Save Assignments"
          onConfirm={saveStudentAssignments}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', maxHeight: '400px', overflowY: 'auto', padding: '6px 2px' }}>
            <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)' }}>
              Select students to enroll in this batch. Unchecked students will be removed from the batch.
            </p>
            {allStudentsForAssign.length === 0 ? (
              <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>No registered student accounts found.</p>
            ) : (
              allStudentsForAssign.map(student => {
                const isChecked = selectedStudentIds.includes(student.id);
                return (
                  <div key={student.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', background: 'var(--surface-alt)', borderRadius: '10px', border: '1px solid var(--border-color)', cursor: 'pointer' }} onClick={() => toggleStudentAssign(student.id)}>
                    <input type="checkbox" checked={isChecked} readOnly style={{ cursor: 'pointer' }} />
                    <div>
                      <strong style={{ display: 'block', fontSize: '13.5px', color: 'var(--text-primary)' }}>{student.name}</strong>
                      <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>ID: {student.rollNumber} | {student.email}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </CustomModal>
      )}

      {/* Audit Modal */}
      {attendanceStudent && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 className="modal-title" style={{ fontSize: '16.5px', fontWeight: '800' }}>Attendance Audit Logs</h3>
              <button className="navbar-action-btn" onClick={() => setAttendanceStudent(null)}>✕</button>
            </div>
            <p style={{ fontSize: '13.5px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
              Student: <strong>{attendanceStudent.name}</strong> | 
              Roll Number: <strong>{attendanceStudent.rollNumber}</strong> | Attendance Rate: <strong>{attendanceStudent.attendance?.percentage}%</strong>
            </p>
            <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--border-color)' }}>
                    <th style={{ padding: '8px' }}>Date</th>
                    <th style={{ padding: '8px' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {attendanceHistory.map((log, index) => (
                    <tr key={index} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '8px' }}>{new Date(log.date).toLocaleDateString('en-US', { dateStyle: 'medium' })}</td>
                      <td style={{ padding: '8px' }}>
                        <span className={`badge-status ${log.status === 'Present' ? 'paid' : 'unpaid'}`}>
                          {log.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Edit Student Modal */}
      {editingStudent && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 className="modal-title" style={{ fontSize: '16.5px', fontWeight: '800' }}>Edit Student Account</h3>
              <button className="navbar-action-btn" onClick={() => setEditingStudent(null)}>✕</button>
            </div>
            <form onSubmit={saveStudentEdit}>
              <div className="form-group">
                <label className="form-label" htmlFor="editName">Full Name</label>
                <input id="editName" type="text" className="form-input" value={editName} onChange={(e) => setEditName(e.target.value)} required />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="editEmail">Email Address</label>
                <input id="editEmail" type="email" className="form-input" value={editEmail} onChange={(e) => setEditEmail(e.target.value)} required />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="editRollNumber">Roll Number</label>
                <input id="editRollNumber" type="text" className="form-input" value={editRollNumber} onChange={(e) => setEditRollNumber(e.target.value)} required />
              </div>
              <button type="submit" className="btn btn-primary btn-block">Commit Changes</button>
            </form>
          </div>
        </div>
      )}

      {/* Edit Fees Modal */}
      {editingFeesStudent && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 className="modal-title" style={{ fontSize: '16.5px', fontWeight: '800' }}>Edit Fees Details</h3>
              <button className="navbar-action-btn" onClick={() => setEditingFeesStudent(null)}>✕</button>
            </div>
            <form onSubmit={saveFeesEdit}>
              <div className="form-group">
                <label className="form-label" htmlFor="editTotal">Total Fees ($)</label>
                <input id="editTotal" type="number" className="form-input" value={editTotal} onChange={(e) => setEditTotal(e.target.value)} required />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="editPaid">Paid Amount ($)</label>
                <input id="editPaid" type="number" className="form-input" value={editPaid} onChange={(e) => setEditPaid(e.target.value)} required />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="editStatus">Payment Status</label>
                <select id="editStatus" className="form-select" value={editStatus} onChange={(e) => setEditStatus(e.target.value)}>
                  <option value="Pending">Pending</option>
                  <option value="Paid">Paid</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="editPayDate">Payment Date</label>
                <input id="editPayDate" type="date" className="form-input" value={editPayDate} onChange={(e) => setEditPayDate(e.target.value)} />
              </div>
              <button type="submit" className="btn btn-primary btn-block">Confirm Ledger Changes</button>
            </form>
          </div>
        </div>
      )}

      {/* Edit Live Class Modal */}
      {editingLiveClass && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 className="modal-title" style={{ fontSize: '16.5px', fontWeight: '800' }}>Edit Live Lecture</h3>
              <button className="navbar-action-btn" onClick={() => setEditingLiveClass(null)}>✕</button>
            </div>
            <form onSubmit={saveLiveClassEdit}>
              <div className="form-group">
                <label className="form-label" htmlFor="editLiveTitle">Session Title</label>
                <input id="editLiveTitle" type="text" className="form-input" value={editLiveTitle} onChange={(e) => setEditLiveTitle(e.target.value)} required />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="editLiveInstructor">Trainer Name</label>
                <input id="editLiveInstructor" type="text" className="form-input" value={editLiveInstructor} onChange={(e) => setEditLiveInstructor(e.target.value)} required />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="editLiveDate">Date</label>
                <input id="editLiveDate" type="date" className="form-input" value={editLiveDate} onChange={(e) => setEditLiveDate(e.target.value)} required />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="editLiveTime">Time</label>
                <input id="editLiveTime" type="text" className="form-input" value={editLiveTime} onChange={(e) => setEditLiveTime(e.target.value)} required />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="editLiveMeetLink">Google Meet Link</label>
                <input id="editLiveMeetLink" type="url" className="form-input" value={editLiveMeetLink} onChange={(e) => setEditLiveMeetLink(e.target.value)} required />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="editLiveStatusSelect">Class Status</label>
                <select id="editLiveStatusSelect" className="form-select" value={editLiveStatus} onChange={(e) => setEditLiveStatus(e.target.value)}>
                  <option value="Upcoming">Upcoming</option>
                  <option value="Live">Live</option>
                  <option value="Completed">Completed</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="editLiveDescription">Description</label>
                <textarea id="editLiveDescription" className="form-input" style={{ height: '80px', resize: 'none' }} value={editLiveDescription} onChange={(e) => setEditLiveDescription(e.target.value)} />
              </div>
              <div style={{ display: 'flex', gap: '16px', marginBottom: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <input id="editLiveToday" type="checkbox" checked={editLiveToday} onChange={(e) => setEditLiveToday(e.target.checked)} />
                  <label htmlFor="editLiveToday" className="form-label" style={{ marginBottom: 0 }}>Happening Today?</label>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <input id="editLivePublished" type="checkbox" checked={editLivePublished} onChange={(e) => setEditLivePublished(e.target.checked)} />
                  <label htmlFor="editLivePublished" className="form-label" style={{ marginBottom: 0 }}>Published?</label>
                </div>
              </div>
              <button type="submit" className="btn btn-primary btn-block">Save Live Lecture</button>
            </form>
          </div>
        </div>
      )}

      {/* Edit Announcement Modal */}
      {editingAnnouncement && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 className="modal-title" style={{ fontSize: '16.5px', fontWeight: '800' }}>Edit Announcement Notice</h3>
              <button className="navbar-action-btn" onClick={() => setEditingAnnouncement(null)}>✕</button>
            </div>
            <form onSubmit={saveAnnouncementEdit}>
              <div className="form-group">
                <label className="form-label" htmlFor="editAnnTitle">Notice Title</label>
                <input id="editAnnTitle" type="text" className="form-input" value={editAnnTitle} onChange={(e) => setEditAnnTitle(e.target.value)} required />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="editAnnPriority">Priority Level</label>
                <select id="editAnnPriority" className="form-select" value={editAnnPriority} onChange={(e) => setEditAnnPriority(e.target.value)}>
                  <option value="Low">Low Priority</option>
                  <option value="Medium">Medium Priority</option>
                  <option value="High">High Priority</option>
                </select>
              </div>
              <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
                <input id="editAnnPinned" type="checkbox" checked={editAnnPinned} onChange={(e) => setEditAnnPinned(e.target.checked)} />
                <label htmlFor="editAnnPinned" className="form-label" style={{ marginBottom: 0 }}>Pin Announcement?</label>
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="editAnnContent">Message Content</label>
                <textarea id="editAnnContent" className="form-input" style={{ height: '100px', resize: 'none' }} value={editAnnContent} onChange={(e) => setEditAnnContent(e.target.value)} required />
              </div>
              <button type="submit" className="btn btn-primary btn-block">Save Announcement</button>
            </form>
          </div>
        </div>
      )}
      {/* Global alert/notification modal */}
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

export default AdminDashboard;
