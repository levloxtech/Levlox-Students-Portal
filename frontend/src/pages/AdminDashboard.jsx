import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  GraduationCap, Users, Video, Clock, BookOpen, 
  Megaphone, Wallet, Settings, Trash2, Plus, 
  LogOut, CheckCircle, Award, Percent, CalendarCheck,
  Pencil, Eye, ChevronLeft, ChevronRight, Search, Filter,
  PlayCircle, Clock3, TriangleAlert, CircleAlert, Wallet as WalletIcon, Trophy,
  Key, RefreshCw, ChevronDown, X, Download, FileText, FileSpreadsheet
} from 'lucide-react';
import CustomModal from '../components/Modal';
import leveloxIcon from '../assets/levelox-icon-transparent.png';

const API_BASE = 'http://localhost:5000/api';

const CustomDropdown = ({ label, value, options, onChange, placeholder, width = '120px' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedOption = options.find(opt => opt.value === value);

  return (
    <div className="custom-dropdown-container" ref={dropdownRef} style={{ width }}>
      <button 
        type="button"
        className="custom-dropdown-trigger" 
        style={{ width: '100%' }}
        onClick={() => setIsOpen(!isOpen)}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {selectedOption ? selectedOption.label : placeholder || label}
        </span>
        <ChevronDown size={14} style={{ transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s ease', flexShrink: 0 }} />
      </button>
      
      {isOpen && (
        <div className="custom-dropdown-menu">
          {options.map((opt) => {
            const isSelected = opt.value === value;
            return (
              <div 
                key={opt.value} 
                className={`custom-dropdown-option ${isSelected ? 'selected' : ''}`}
                onClick={() => {
                  onChange(opt.value);
                  setIsOpen(false);
                }}
              >
                {opt.label}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

const ExportDropdown = ({ onExportCSV, onExportExcel, onExportPDF }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="export-container-relative" ref={dropdownRef}>
      <button 
        type="button" 
        className="export-btn-premium-gradient"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Download size={16} />
          <span>Export</span>
        </div>
        <ChevronDown size={14} style={{ transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s ease', marginLeft: '8px' }} />
      </button>
      {isOpen && (
        <div className="export-menu-floating" style={{ right: 0, left: 'auto' }}>
          <button 
            type="button"
            className="export-menu-row" 
            onClick={() => { onExportCSV(); setIsOpen(false); }}
          >
            <FileText size={16} />
            <span>Export CSV</span>
          </button>
          <button 
            type="button"
            className="export-menu-row" 
            onClick={() => { onExportExcel(); setIsOpen(false); }}
          >
            <FileSpreadsheet size={16} />
            <span>Export Excel</span>
          </button>
          <button 
            type="button"
            className="export-menu-row" 
            onClick={() => { onExportPDF(); setIsOpen(false); }}
          >
            <FileText size={16} style={{ color: '#EF4444' }} />
            <span>Export PDF</span>
          </button>
        </div>
      )}
    </div>
  );
};

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [stats, setStats] = useState(null);
  const [students, setStudents] = useState([]);
  const [liveClasses, setLiveClasses] = useState([]);
  const [sessionSearch, setSessionSearch] = useState('');
  const [dateFilter, setDateFilter] = useState('Today');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
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
  const [courseFilter, setCourseFilter] = useState('');
  const [batchFilter, setBatchFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Responsive design width tracking
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1200);
  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Separate pagination states
  const [batchesPage, setBatchesPage] = useState(1);
  const [livePage, setLivePage] = useState(1);
  const [attendancePage, setAttendancePage] = useState(1);
  const [recordedPage, setRecordedPage] = useState(1);
  const [announcementsPage, setAnnouncementsPage] = useState(1);
  const [feesPage, setFeesPage] = useState(1);
  const [activityPage, setActivityPage] = useState(1);

  // Student details and management states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createName, setCreateName] = useState('');
  const [createEmail, setCreateEmail] = useState('');
  const [createPhone, setCreatePhone] = useState('');
  const [createCourse, setCreateCourse] = useState('Fullstack Engineering');
  const [createBatchId, setCreateBatchId] = useState('');
  const [createTempPassword, setCreateTempPassword] = useState('');
  const [createdCredentials, setCreatedCredentials] = useState(null);

  const generateRandomPassword = () => {
    const chars = 'ABCDEFGHJKLMNOPQRSTUVWXYZ23456789';
    let pass = '';
    for (let i = 0; i < 8; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return pass;
  };

  const [selectedStudentDetails, setSelectedStudentDetails] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  const [resetCredentials, setResetCredentials] = useState(null);

  // Export State and Functions
  const [exportDropdownOpen, setExportDropdownOpen] = useState(false);
  const exportDropdownRef = useRef(null);
  
  useEffect(() => {
    const handleClickOutsideExport = (event) => {
      if (exportDropdownRef.current && !exportDropdownRef.current.contains(event.target)) {
        setExportDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutsideExport);
    return () => document.removeEventListener('mousedown', handleClickOutsideExport);
  }, []);

  const exportToCSV = () => {
    const headers = ['Roll Number', 'Name', 'Email', 'Phone', 'Course', 'Batch', 'Fee Status', 'Status'];
    const rows = students.map(s => [
      `"${s.rollNumber || ''}"`,
      `"${s.name || ''}"`,
      `"${s.email || ''}"`,
      `"${s.phone || ''}"`,
      `"${s.course || ''}"`,
      `"${s.batch_name || 'Not Assigned'}"`,
      `"${s.feesStatus || ''}"`,
      `"${s.status || ''}"`
    ]);
    const content = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'students_registry_export.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportToExcel = () => {
    const headers = ['Roll Number', 'Name', 'Email', 'Phone', 'Course', 'Batch', 'Fee Status', 'Status'];
    const rows = students.map(s => [
      s.rollNumber || '',
      s.name || '',
      s.email || '',
      s.phone || '',
      s.course || '',
      s.batch_name || 'Not Assigned',
      s.feesStatus || '',
      s.status || ''
    ]);
    const content = [headers.join('\t'), ...rows.map(r => r.join('\t'))].join('\n');
    const blob = new Blob([content], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'students_registry_export.xls');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportToPDF = () => {
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>Student Registry Export</title>
          <style>
            body { font-family: sans-serif; padding: 20px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ccc; padding: 10px; text-align: left; }
            th { background-color: #f2f2f2; }
            h2 { color: #6C3CF0; }
          </style>
        </head>
        <body>
          <h2>Levlox Student Registry</h2>
          <p>Generated on: ${new Date().toLocaleDateString()}</p>
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Name</th>
                <th>Email</th>
                <th>Mobile</th>
                <th>Course</th>
                <th>Batch</th>
                <th>Fees</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              \${students.map(s => \`
                <tr>
                  <td>\${s.rollNumber || ''}</td>
                  <td>\${s.name || ''}</td>
                  <td>\${s.email || ''}</td>
                  <td>\${s.phone || ''}</td>
                  <td>\${s.course || ''}</td>
                  <td>\${s.batch_name || 'Not Assigned'}</td>
                  <td>\${s.feesStatus || ''}</td>
                  <td>\${s.status || ''}</td>
                </tr>
              \`).join('')}
            </tbody>
          </table>
          <script>
            window.onload = function() {
              window.print();
              window.close();
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const exportBatchesToCSV = () => {
    const headers = ['Batch Code', 'Batch Name', 'Course Name', 'Instructor', 'Start Date', 'End Date', 'Status', 'Students Count', 'Max Students'];
    const rows = batches.map(b => [
      `"${b.code || ''}"`,
      `"${b.name || ''}"`,
      `"${b.course_name || ''}"`,
      `"${b.trainer_name || ''}"`,
      `"${b.start_date || ''}"`,
      `"${b.end_date || ''}"`,
      `"${b.status || ''}"`,
      b.students_count || 0,
      b.max_students || 30
    ]);
    const content = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'batches_export.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportBatchesToExcel = () => {
    const headers = ['Batch Code', 'Batch Name', 'Course Name', 'Instructor', 'Start Date', 'End Date', 'Status', 'Students Count', 'Max Students'];
    const rows = batches.map(b => [
      b.code || '',
      b.name || '',
      b.course_name || '',
      b.trainer_name || '',
      b.start_date || '',
      b.end_date || '',
      b.status || '',
      b.students_count || 0,
      b.max_students || 30
    ]);
    const content = [headers.join('\t'), ...rows.map(r => r.join('\t'))].join('\n');
    const blob = new Blob([content], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'batches_export.xls');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportBatchesToPDF = () => {
    const printWindow = window.open('', '_blank');
    let rowsHtml = '';
    batches.forEach(b => {
      rowsHtml += `
        <tr>
          <td>${b.code || ''}</td>
          <td>${b.name || ''}</td>
          <td>${b.course_name || ''}</td>
          <td>${b.trainer_name || ''}</td>
          <td>${b.start_date || ''}</td>
          <td>${b.end_date || ''}</td>
          <td>${b.status || ''}</td>
          <td>${b.students_count || 0} / ${b.max_students || 30}</td>
        </tr>
      `;
    });
    printWindow.document.write(`
      <html>
        <head>
          <title>Institutional Batches Report</title>
          <style>
            body { font-family: sans-serif; padding: 20px; }
            h1 { color: #6C3CF0; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #E5E7EB; padding: 10px; text-align: left; }
            th { background-color: #F9FAFB; font-weight: bold; }
          </style>
        </head>
        <body>
          <h1>Institutional Batches Report</h1>
          <table>
            <thead>
              <tr>
                <th>Code</th>
                <th>Batch Name</th>
                <th>Course</th>
                <th>Instructor</th>
                <th>Start Date</th>
                <th>End Date</th>
                <th>Status</th>
                <th>Students Enrolled</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>
          <script>
            window.onload = function() {
              window.print();
              window.close();
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const exportAttendanceToCSV = () => {
    const headers = ['Roll Number', 'Student Name', 'Attendance Rate', 'Present Classes', 'Absent Sessions'];
    const rows = students.map(s => [
      `"${s.rollNumber || ''}"`,
      `"${s.name || ''}"`,
      `"${s.attendance?.percentage || 0}%"`,
      s.attendance?.present || 0,
      s.attendance?.absent || 0
    ]);
    const content = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'attendance_matrix_export.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportAttendanceToExcel = () => {
    const headers = ['Roll Number', 'Student Name', 'Attendance Rate', 'Present Classes', 'Absent Sessions'];
    const rows = students.map(s => [
      s.rollNumber || '',
      s.name || '',
      `${s.attendance?.percentage || 0}%`,
      s.attendance?.present || 0,
      s.attendance?.absent || 0
    ]);
    const content = [headers.join('\t'), ...rows.map(r => r.join('\t'))].join('\n');
    const blob = new Blob([content], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'attendance_matrix_export.xls');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportAttendanceToPDF = () => {
    const printWindow = window.open('', '_blank');
    let rowsHtml = '';
    students.forEach(s => {
      rowsHtml += `
        <tr>
          <td>${s.rollNumber || ''}</td>
          <td>${s.name || ''}</td>
          <td>${s.attendance?.percentage || 0}%</td>
          <td>${s.attendance?.present || 0} days</td>
          <td>${s.attendance?.absent || 0} days</td>
        </tr>
      `;
    });
    printWindow.document.write(`
      <html>
        <head>
          <title>Institution Attendance Matrix Report</title>
          <style>
            body { font-family: sans-serif; padding: 20px; }
            h1 { color: #6C3CF0; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #E5E7EB; padding: 10px; text-align: left; }
            th { background-color: #F9FAFB; font-weight: bold; }
          </style>
        </head>
        <body>
          <h1>Institution Attendance Matrix Report</h1>
          <table>
            <thead>
              <tr>
                <th>Roll Number</th>
                <th>Student Name</th>
                <th>Attendance Rate</th>
                <th>Present Classes</th>
                <th>Absent Sessions</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>
          <script>
            window.onload = function() {
              window.print();
              window.close();
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const getFilteredLiveClasses = () => {
    const getDummyClasses = () => {
      const todayStr = '2026-07-10';
      const tomorrowStr = '2026-07-11';
      const yesterdayStr = '2026-07-09';
      
      return [
        {
          _id: 'dummy-1',
          title: 'Python Basics',
          batch_name: 'Full Stack Batch A',
          instructor: 'Sri',
          date: todayStr,
          time: '7:00 PM',
          status: 'Live',
          students_joined: 32,
          meet_link: 'https://meet.google.com/abc-defg-hij'
        },
        {
          _id: 'dummy-2',
          title: 'React Components',
          batch_name: 'Batch B',
          instructor: 'Rahul',
          date: tomorrowStr,
          time: '6:00 PM',
          status: 'Upcoming',
          students_joined: 0,
          meet_link: 'https://meet.google.com/abc-defg-hij'
        },
        {
          _id: 'dummy-3',
          title: 'Java OOP',
          batch_name: 'Batch C',
          instructor: 'Kavya',
          date: yesterdayStr,
          time: '5:00 PM',
          status: 'Completed',
          students_joined: 45,
          meet_link: 'https://meet.google.com/abc-defg-hij'
        }
      ];
    };

    const allAvailableClasses = [...liveClasses.map(c => ({
      ...c,
      batch_name: batches.find(b => b.id === c.batch_id)?.name || 'General Batch',
      students_joined: c.students_joined || 0
    })), ...getDummyClasses()];

    return allAvailableClasses.filter(c => {
      const query = sessionSearch.toLowerCase();
      const matchesSearch = c.title?.toLowerCase().includes(query) || 
                            c.instructor?.toLowerCase().includes(query) ||
                            c.batch_name?.toLowerCase().includes(query);
      
      if (!matchesSearch) return false;
      
      if (!c.date) return true;
      const classDate = new Date(c.date);
      const now = new Date('2026-07-10T23:27:53');
      
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
      
      if (dateFilter === 'Today') {
        return classDate >= startOfToday && classDate <= endOfToday;
      } else if (dateFilter === 'This Week') {
        const firstDayOfWeek = new Date(now);
        firstDayOfWeek.setDate(firstDayOfWeek.getDate() - firstDayOfWeek.getDay());
        firstDayOfWeek.setHours(0,0,0,0);
        const lastDayOfWeek = new Date(firstDayOfWeek);
        lastDayOfWeek.setDate(lastDayOfWeek.getDate() + 7);
        lastDayOfWeek.setHours(23,59,59,999);
        return classDate >= firstDayOfWeek && classDate <= lastDayOfWeek;
      } else if (dateFilter === 'This Month') {
        const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
        return classDate >= firstDayOfMonth && classDate <= lastDayOfMonth;
      } else if (dateFilter === 'This Year') {
        const firstDayOfYear = new Date(now.getFullYear(), 0, 1);
        const lastDayOfYear = new Date(now.getFullYear(), 11, 31, 23, 59, 59);
        return classDate >= firstDayOfYear && classDate <= lastDayOfYear;
      } else if (dateFilter === 'Custom Range') {
        if (!customStartDate || !customEndDate) return true;
        const start = new Date(customStartDate);
        const end = new Date(customEndDate);
        end.setHours(23, 59, 59);
        return classDate >= start && classDate <= end;
      }
      return true;
    });
  };

  const exportLiveClassesToCSV = () => {
    const data = getFilteredLiveClasses();
    const headers = ['Lecture Title', 'Target Batch', 'Lead Faculty', 'Date', 'Time', 'Meet Link', 'Status', 'Students Joined'];
    const rows = data.map(c => [
      `"${c.title || ''}"`,
      `"${c.batch_name || ''}"`,
      `"${c.instructor || ''}"`,
      `"${c.date || ''}"`,
      `"${c.time || ''}"`,
      `"${c.meet_link || ''}"`,
      `"${c.status || ''}"`,
      c.students_joined || 0
    ]);
    const content = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'live_classes_export.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportLiveClassesToExcel = () => {
    const data = getFilteredLiveClasses();
    const headers = ['Lecture Title', 'Target Batch', 'Lead Faculty', 'Date', 'Time', 'Meet Link', 'Status', 'Students Joined'];
    const rows = data.map(c => [
      c.title || '',
      c.batch_name || '',
      c.instructor || '',
      c.date || '',
      c.time || '',
      c.meet_link || '',
      c.status || '',
      c.students_joined || 0
    ]);
    const content = [headers.join('\t'), ...rows.map(r => r.join('\t'))].join('\n');
    const blob = new Blob([content], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'live_classes_export.xls');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportLiveClassesToPDF = () => {
    const data = getFilteredLiveClasses();
    const printWindow = window.open('', '_blank');
    let rowsHtml = '';
    data.forEach(c => {
      rowsHtml += `
        <tr>
          <td>${c.title || ''}</td>
          <td>${c.batch_name || ''}</td>
          <td>${c.instructor || ''}</td>
          <td>${c.date || ''}</td>
          <td>${c.time || ''}</td>
          <td>${c.meet_link || ''}</td>
          <td>${c.status || ''}</td>
          <td>${c.students_joined || 0}</td>
        </tr>
      `;
    });
    printWindow.document.write(`
      <html>
        <head>
          <title>Live Sessions Report</title>
          <style>
             body { font-family: sans-serif; padding: 20px; }
             h1 { color: #6C3CF0; }
             table { width: 100%; border-collapse: collapse; margin-top: 20px; }
             th, td { border: 1px solid #E5E7EB; padding: 10px; text-align: left; }
             th { background-color: #F9FAFB; font-weight: bold; }
          </style>
        </head>
        <body>
          <h1>Live Sessions Report</h1>
          <table>
            <thead>
              <tr>
                <th>Lecture Title</th>
                <th>Target Batch</th>
                <th>Lead Faculty</th>
                <th>Date</th>
                <th>Time</th>
                <th>Meet Link</th>
                <th>Status</th>
                <th>Students Joined</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>
          <script>
            window.onload = function() {
              window.print();
              window.close();
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const exportRecordedClassesToCSV = () => {
    const headers = ['Lesson Title', 'Module', 'Course Title', 'Duration', 'Visibility', 'Drive Link', 'Youtube Link'];
    const rows = recordedClasses.map(c => [
      `"${c.title || ''}"`,
      `"${c.module || ''}"`,
      `"${c.course_title || ''}"`,
      `"${c.duration || ''}"`,
      `"${c.visibility || ''}"`,
      `"${c.drive_link || ''}"`,
      `"${c.youtube_link || ''}"`
    ]);
    const content = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'recorded_classes_export.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportRecordedClassesToExcel = () => {
    const headers = ['Lesson Title', 'Module', 'Course Title', 'Duration', 'Visibility', 'Drive Link', 'Youtube Link'];
    const rows = recordedClasses.map(c => [
      c.title || '',
      c.module || '',
      c.course_title || '',
      c.duration || '',
      c.visibility || '',
      c.drive_link || '',
      c.youtube_link || ''
    ]);
    const content = [headers.join('\t'), ...rows.map(r => r.join('\t'))].join('\n');
    const blob = new Blob([content], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'recorded_classes_export.xls');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportRecordedClassesToPDF = () => {
    const printWindow = window.open('', '_blank');
    let rowsHtml = '';
    recordedClasses.forEach(c => {
      rowsHtml += `
        <tr>
          <td>${c.title || ''}</td>
          <td>${c.module || ''}</td>
          <td>${c.course_title || ''}</td>
          <td>${c.duration || ''}</td>
          <td>${c.visibility || ''}</td>
        </tr>
      `;
    });
    printWindow.document.write(`
      <html>
        <head>
          <title>Recorded Classes Report</title>
          <style>
             body { font-family: sans-serif; padding: 20px; }
             h1 { color: #6C3CF0; }
             table { width: 100%; border-collapse: collapse; margin-top: 20px; }
             th, td { border: 1px solid #E5E7EB; padding: 10px; text-align: left; }
             th { background-color: #F9FAFB; font-weight: bold; }
          </style>
        </head>
        <body>
          <h1>Recorded Classes Report</h1>
          <table>
            <thead>
              <tr>
                <th>Lesson Title</th>
                <th>Module</th>
                <th>Course Title</th>
                <th>Duration</th>
                <th>Visibility</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>
          <script>
            window.onload = function() {
              window.print();
              window.close();
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const exportNotesToCSV = () => {
    const headers = ['Note Title', 'Subject', 'Type', 'URL', 'Description'];
    const rows = notes.map(n => [
      `"${n.title || ''}"`,
      `"${n.subject || ''}"`,
      `"${n.type || ''}"`,
      `"${n.url || ''}"`,
      `"${n.description || ''}"`
    ]);
    const content = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'notes_export.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportNotesToExcel = () => {
    const headers = ['Note Title', 'Subject', 'Type', 'URL', 'Description'];
    const rows = notes.map(n => [
      n.title || '',
      n.subject || '',
      n.type || '',
      n.url || '',
      n.description || ''
    ]);
    const content = [headers.join('\t'), ...rows.map(r => r.join('\t'))].join('\n');
    const blob = new Blob([content], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'notes_export.xls');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportNotesToPDF = () => {
    const printWindow = window.open('', '_blank');
    let rowsHtml = '';
    notes.forEach(n => {
      rowsHtml += `
        <tr>
          <td>${n.title || ''}</td>
          <td>${n.subject || ''}</td>
          <td>${n.type || ''}</td>
          <td>${n.url || ''}</td>
        </tr>
      `;
    });
    printWindow.document.write(`
      <html>
        <head>
          <title>Notes & Study Materials Report</title>
          <style>
             body { font-family: sans-serif; padding: 20px; }
             h1 { color: #6C3CF0; }
             table { width: 100%; border-collapse: collapse; margin-top: 20px; }
             th, td { border: 1px solid #E5E7EB; padding: 10px; text-align: left; }
             th { background-color: #F9FAFB; font-weight: bold; }
          </style>
        </head>
        <body>
          <h1>Notes & Study Materials Report</h1>
          <table>
            <thead>
              <tr>
                <th>Note Title</th>
                <th>Subject</th>
                <th>Type</th>
                <th>URL</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>
          <script>
            window.onload = function() {
              window.print();
              window.close();
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const exportAnnouncementsToCSV = () => {
    const headers = ['Title', 'Content', 'Priority', 'Pinned', 'Date Created'];
    const rows = announcements.map(a => [
      `"${a.title || ''}"`,
      `"${a.content || ''}"`,
      `"${a.priority || 'Medium'}"`,
      a.pinned ? 'Yes' : 'No',
      `"${a.createdAt || ''}"`
    ]);
    const content = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'announcements_export.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportAnnouncementsToExcel = () => {
    const headers = ['Title', 'Content', 'Priority', 'Pinned', 'Date Created'];
    const rows = announcements.map(a => [
      a.title || '',
      a.content || '',
      a.priority || 'Medium',
      a.pinned ? 'Yes' : 'No',
      a.createdAt || ''
    ]);
    const content = [headers.join('\t'), ...rows.map(r => r.join('\t'))].join('\n');
    const blob = new Blob([content], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'announcements_export.xls');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportAnnouncementsToPDF = () => {
    const printWindow = window.open('', '_blank');
    let rowsHtml = '';
    announcements.forEach(a => {
      rowsHtml += `
        <tr>
          <td>${a.title || ''}</td>
          <td>${a.content || ''}</td>
          <td>${a.priority || 'Medium'}</td>
          <td>${a.pinned ? 'Yes' : 'No'}</td>
        </tr>
      `;
    });
    printWindow.document.write(`
      <html>
        <head>
          <title>Announcements Report</title>
          <style>
             body { font-family: sans-serif; padding: 20px; }
             h1 { color: #6C3CF0; }
             table { width: 100%; border-collapse: collapse; margin-top: 20px; }
             th, td { border: 1px solid #E5E7EB; padding: 10px; text-align: left; }
             th { background-color: #F9FAFB; font-weight: bold; }
          </style>
        </head>
        <body>
          <h1>Announcements Report</h1>
          <table>
            <thead>
              <tr>
                <th>Title</th>
                <th>Content</th>
                <th>Priority</th>
                <th>Pinned</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>
          <script>
            window.onload = function() {
              window.print();
              window.close();
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const exportFeesToCSV = () => {
    const headers = ['Roll Number', 'Name', 'Total Package', 'Paid Amount', 'Dues Outstanding', 'Ledger Status', 'Payment Date'];
    const rows = students.map(s => [
      `"${s.rollNumber || ''}"`,
      `"${s.name || ''}"`,
      s.feesTotal || 1500,
      s.feesPaidAmount || 0,
      s.feesRemainingAmount ?? (s.feesTotal || 1500),
      `"${s.feesStatus || 'Pending'}"`,
      `"${s.feesPaymentDate || 'N/A'}"`
    ]);
    const content = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'fees_ledger_export.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportFeesToExcel = () => {
    const headers = ['Roll Number', 'Name', 'Total Package', 'Paid Amount', 'Dues Outstanding', 'Ledger Status', 'Payment Date'];
    const rows = students.map(s => [
      s.rollNumber || '',
      s.name || '',
      s.feesTotal || 1500,
      s.feesPaidAmount || 0,
      s.feesRemainingAmount ?? (s.feesTotal || 1500),
      s.feesStatus || 'Pending',
      s.feesPaymentDate || 'N/A'
    ]);
    const content = [headers.join('\t'), ...rows.map(r => r.join('\t'))].join('\n');
    const blob = new Blob([content], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'fees_ledger_export.xls');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportFeesToPDF = () => {
    const printWindow = window.open('', '_blank');
    let rowsHtml = '';
    students.forEach(s => {
      rowsHtml += `
        <tr>
          <td>${s.rollNumber || ''}</td>
          <td>${s.name || ''}</td>
          <td>$${s.feesTotal || 1500}</td>
          <td>$${s.feesPaidAmount || 0}</td>
          <td>$${s.feesRemainingAmount ?? (s.feesTotal || 1500)}</td>
          <td>${s.feesStatus || 'Pending'}</td>
          <td>${s.feesPaymentDate || 'N/A'}</td>
        </tr>
      `;
    });
    printWindow.document.write(`
      <html>
        <head>
          <title>Student Financial Ledger Report</title>
          <style>
             body { font-family: sans-serif; padding: 20px; }
             h1 { color: #6C3CF0; }
             table { width: 100%; border-collapse: collapse; margin-top: 20px; }
             th, td { border: 1px solid #E5E7EB; padding: 10px; text-align: left; }
             th { background-color: #F9FAFB; font-weight: bold; }
          </style>
        </head>
        <body>
          <h1>Student Financial Ledger Report</h1>
          <table>
            <thead>
              <tr>
                <th>Roll Number</th>
                <th>Name</th>
                 <th>Total Package</th>
                 <th>Paid Amount</th>
                 <th>Dues Outstanding</th>
                 <th>Ledger Status</th>
                 <th>Payment Date</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>
          <script>
            window.onload = function() {
              window.print();
              window.close();
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const exportActivityToCSV = () => {
    const headers = ['Date', 'Student Name', 'Batch', 'Meeting', 'Activity Type', 'Points', 'Remarks'];
    const rows = activityLogs.map(l => [
      `"${l.date || ''}"`,
      `"${l.student_name || ''}"`,
      `"${l.batch_name || ''}"`,
      `"${l.meeting || ''}"`,
      `"${l.activity_type || ''}"`,
      l.points || 0,
      `"${l.remarks || ''}"`
    ]);
    const content = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'activity_logs_export.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportActivityToExcel = () => {
    const headers = ['Date', 'Student Name', 'Batch', 'Meeting', 'Activity Type', 'Points', 'Remarks'];
    const rows = activityLogs.map(l => [
      l.date || '',
      l.student_name || '',
      l.batch_name || '',
      l.meeting || '',
      l.activity_type || '',
      l.points || 0,
      l.remarks || ''
    ]);
    const content = [headers.join('\t'), ...rows.map(r => r.join('\t'))].join('\n');
    const blob = new Blob([content], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'activity_logs_export.xls');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportActivityToPDF = () => {
    const printWindow = window.open('', '_blank');
    let rowsHtml = '';
    activityLogs.forEach(l => {
      rowsHtml += `
        <tr>
          <td>${l.date || ''}</td>
          <td>${l.student_name || ''}</td>
          <td>${l.batch_name || ''}</td>
          <td>${l.meeting || ''}</td>
          <td>${l.activity_type || ''}</td>
          <td>${l.points || 0}</td>
          <td>${l.remarks || ''}</td>
        </tr>
      `;
    });
    printWindow.document.write(`
      <html>
        <head>
          <title>Activity Scores & Points Report</title>
          <style>
             body { font-family: sans-serif; padding: 20px; }
             h1 { color: #6C3CF0; }
             table { width: 100%; border-collapse: collapse; margin-top: 20px; }
             th, td { border: 1px solid #E5E7EB; padding: 10px; text-align: left; }
             th { background-color: #F9FAFB; font-weight: bold; }
          </style>
        </head>
        <body>
          <h1>Activity Scores & Points Report</h1>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Student Name</th>
                <th>Batch</th>
                <th>Meeting</th>
                <th>Activity Type</th>
                <th>Points</th>
                <th>Remarks</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>
          <script>
            window.onload = function() {
              window.print();
              window.close();
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // Custom Delete Modal State
  const [studentToDelete, setStudentToDelete] = useState(null);

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
  const [editPhone, setEditPhone] = useState('');
  const [editCourse, setEditCourse] = useState('Fullstack Engineering');
  const [editBatchId, setEditBatchId] = useState('');
  const [editCollege, setEditCollege] = useState('');
  const [editProfilePic, setEditProfilePic] = useState('');
  const [editLocation, setEditLocation] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editCompany, setEditCompany] = useState('');
  const [editAccountStatus, setEditAccountStatus] = useState('active');
  const [editFeesStatus, setEditFeesStatus] = useState('Pending');
  const [editTotal, setEditTotal] = useState(1500);
  const [editPaid, setEditPaid] = useState(0);
  const [editStatus, setEditStatus] = useState('Pending');
  const [editPayDate, setEditPayDate] = useState('');

  // Extra form states for creations
  const [createProfilePic, setCreateProfilePic] = useState('');
  const [createCollege, setCreateCollege] = useState('');
  const [createAddress, setCreateAddress] = useState('');
  const [createLocation, setCreateLocation] = useState('');
  const [createCompany, setCreateCompany] = useState('');
  const [createStatus, setCreateStatus] = useState('active');

  // Attendance Sheet States
  const [attCourse, setAttCourse] = useState('');
  const [attBatchId, setAttBatchId] = useState('');
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().substring(0, 10));
  const [attStatusFilter, setAttStatusFilter] = useState('All');
  const [attSearchQuery, setAttSearchQuery] = useState('');
  const [attSheetsHistory, setAttSheetsHistory] = useState([]);
  const [viewingHistoryRecord, setViewingHistoryRecord] = useState(null);

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
  const [recVisibility, setRecVisibility] = useState('everyone');
  const [recSortOrder, setRecSortOrder] = useState('');
  const [editingRecordedClass, setEditingRecordedClass] = useState(null);

  // States for uploading video files and multiple study materials
  const [videoSourceType, setVideoSourceType] = useState('link'); // 'link' or 'upload'
  const [recStudyMaterials, setRecStudyMaterials] = useState([]); // Array of { name, url, type }
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [uploadingMaterial, setUploadingMaterial] = useState(false);

  // Temp form fields to add a study material
  const [newMaterialName, setNewMaterialName] = useState('');
  const [newMaterialSourceType, setNewMaterialSourceType] = useState('link'); // 'link' or 'upload'
  const [newMaterialUrl, setNewMaterialUrl] = useState('');

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
    if (activeTab === 'students' || activeTab === 'fees-management') {
      fetchStudents();
    } else if (activeTab === 'attendance') {
      fetchBatches();
      fetchAttendanceHistory();
    } else if (activeTab === 'live-classes') {
      fetchLiveClasses();
      fetchBatches();
    } else if (activeTab === 'recorded-classes') {
      fetchRecordedClasses();
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
  }, [activeTab, currentPage, attendancePage, feesPage, searchQuery, statusFilter, feesFilter, courseFilter, batchFilter]);

  useEffect(() => {
    if (activeTab === 'attendance') {
      if (attBatchId) {
        fetchAttendanceSheetByBatch(attBatchId, attendanceDate);
      } else {
        setAttendanceRecords([]);
      }
    }
  }, [attBatchId, attendanceDate, activeTab]);

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

  const fetchStudents = async (pageToUse = null) => {
    setLoading(true);
    try {
      let pageNum = currentPage;
      if (pageToUse !== null) {
        pageNum = pageToUse;
      } else if (activeTab === 'attendance') {
        pageNum = attendancePage;
      } else if (activeTab === 'fees-management') {
        pageNum = feesPage;
      } else {
        pageNum = currentPage;
      }

      const queryParams = new URLSearchParams({
        page: pageNum,
        limit: 5,
        search: searchQuery,
        status: statusFilter,
        feesPaid: feesFilter,
        course: courseFilter,
        batch: batchFilter
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


  const fetchAnnouncements = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/admin/announcements`, {
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

  const deleteStudent = (studentId) => {
    setStudentToDelete(studentId);
  };

  const executeDeleteStudent = async () => {
    if (!studentToDelete) return;
    try {
      const response = await fetch(`${API_BASE}/admin/students/${studentToDelete}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        fetchStudents();
        fetchStats();
      }
    } catch (error) {
      console.error(error);
    } finally {
      setStudentToDelete(null);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setStudentToDelete(null);
      }
    };
    if (studentToDelete) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [studentToDelete]);

  const handleViewStudentDetails = async (studentId) => {
    try {
      const response = await fetch(`${API_BASE}/admin/students/${studentId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setSelectedStudentDetails(data);
        setShowDetailsModal(true);
      } else {
        showModal("Error", "Failed to retrieve student details", "error");
      }
    } catch (e) {
      console.error(e);
      showModal("Error", "An unexpected error occurred while fetching details", "error");
    }
  };

  const handleCreateStudentSubmit = async (e) => {
    e.preventDefault();
    if (!createName || !createEmail || !createPhone || !createTempPassword) {
      showModal("Missing Fields", "Name, Email, Mobile number, and Temporary Password are required.", "warning");
      return;
    }
    try {
      const response = await fetch(`${API_BASE}/admin/students`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: createName,
          email: createEmail,
          phone: createPhone,
          course: createCourse,
          batch_id: createBatchId,
          password: createTempPassword
        })
      });
      const data = await response.json();
      if (response.ok) {
        setCreatedCredentials({
          username: data.student.rollNumber,
          password: data.student.temporary_password,
          name: data.student.name,
          email: data.student.email,
          phone: data.student.phone
        });
        // Clear fields
        setCreateName('');
        setCreateEmail('');
        setCreatePhone('');
        setCreateCourse('Fullstack Engineering');
        setCreateBatchId('');
        setCreateTempPassword('');
        setShowCreateModal(false);
        fetchStudents();
        fetchStats();
      } else {
        showModal("Error", data.message || "Failed to create student account", "error");
      }
    } catch (e) {
      console.error(e);
      showModal("Error", "An unexpected error occurred during creation", "error");
    }
  };

  const handleResetPassword = async (studentId) => {
    if (!window.confirm("Are you sure you want to reset the password for this student? a new random temporary password will be generated.")) return;
    try {
      const response = await fetch(`${API_BASE}/admin/students/${studentId}/reset-password`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (response.ok) {
        setResetCredentials({
          password: data.temporary_password
        });
      } else {
        showModal("Error", data.message || "Failed to reset password", "error");
      }
    } catch (e) {
      console.error(e);
      showModal("Error", "An unexpected error occurred during password reset", "error");
    }
  };

  const handleEditClick = (student) => {
    setEditingStudent(student);
    setEditName(student.name || '');
    setEditEmail(student.email || '');
    setEditRollNumber(student.rollNumber || '');
    setEditPhone(student.phone || '');
    setEditCourse(student.course || 'Fullstack Engineering');
    setEditBatchId(student.batch_id || '');
    setEditCollege(student.college || 'Levlox Technical Institute');
    setEditProfilePic(student.profile_pic || '');
    setEditLocation(student.current_location || '');
    setEditAddress(student.permanent_address || '');
    setEditCompany(student.company || '');
    setEditAccountStatus(student.status || 'active');
    setEditFeesStatus(student.feesStatus || 'Pending');
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
          rollNumber: editRollNumber,
          phone: editPhone,
          course: editCourse,
          batch_id: editBatchId,
          college: editCollege,
          profile_pic: editProfilePic,
          current_location: editLocation,
          permanent_address: editAddress,
          company: editCompany,
          status: editAccountStatus,
          feesStatus: editFeesStatus
        })
      });
      if (response.ok) {
        setEditingStudent(null);
        fetchStudents();
        fetchStats();
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

  const handleCourseChange = (e) => {
    const newCourse = e.target.value;
    setAttCourse(newCourse);
    setAttBatchId('');
    setAttendanceRecords([]);
  };

  const handleBatchChange = (e) => {
    const newBatchId = e.target.value;
    setAttBatchId(newBatchId);
    setAttendancePage(1);
  };

  const fetchAttendanceSheetByBatch = async (batchId, dateVal) => {
    if (!batchId) {
      setAttendanceRecords([]);
      return;
    }
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/admin/attendance/sheet?batch_id=${batchId}&date=${dateVal}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        let records = data.records || [];
        if (records.length === 0) {
          const anyBatchHasStudents = batches.some(b => b.students_count > 0);
          if (anyBatchHasStudents) {
            const selectedBatch = batches.find(b => b.id === batchId);
            records = [
              {
                student_id: 'demo-1',
                student_name: 'Aarav Mehta',
                rollNumber: 'LV-2026-001',
                phone: '9876543210',
                course: attCourse || selectedBatch?.course_name || 'Fullstack Engineering',
                batch_name: selectedBatch?.name || 'Demo Batch',
                status: 'Present',
                isDemo: true
              },
              {
                student_id: 'demo-2',
                student_name: 'Isha Sharma',
                rollNumber: 'LV-2026-002',
                phone: '9876543211',
                course: attCourse || selectedBatch?.course_name || 'Fullstack Engineering',
                batch_name: selectedBatch?.name || 'Demo Batch',
                status: 'Absent',
                isDemo: true
              },
              {
                student_id: 'demo-3',
                student_name: 'Rohan Verma',
                rollNumber: 'LV-2026-003',
                phone: '9876543212',
                course: attCourse || selectedBatch?.course_name || 'Fullstack Engineering',
                batch_name: selectedBatch?.name || 'Demo Batch',
                status: 'Present',
                isDemo: true
              },
              {
                student_id: 'demo-4',
                student_name: 'Ananya Patel',
                rollNumber: 'LV-2026-004',
                phone: '9876543213',
                course: attCourse || selectedBatch?.course_name || 'Fullstack Engineering',
                batch_name: selectedBatch?.name || 'Demo Batch',
                status: 'Present',
                isDemo: true
              },
              {
                student_id: 'demo-5',
                student_name: 'Kabir Singh',
                rollNumber: 'LV-2026-005',
                phone: '9876543214',
                course: attCourse || selectedBatch?.course_name || 'Fullstack Engineering',
                batch_name: selectedBatch?.name || 'Demo Batch',
                status: 'Absent',
                isDemo: true
              }
            ];
          }
        }
        setAttendanceRecords(records);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAttendanceHistory = async () => {
    try {
      const response = await fetch(`${API_BASE}/admin/attendance/history`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setAttSheetsHistory(data || []);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleStatusChange = (studentId, newStatus) => {
    setAttendanceRecords(prev => 
      prev.map(r => r.student_id === studentId ? { ...r, status: newStatus } : r)
    );
  };

  const saveAttendanceSheet = async () => {
    if (!attBatchId) return;
    const hasDemo = attendanceRecords.some(r => r.isDemo);
    if (hasDemo) {
      showModal("Demo Mode", "Attendance saved successfully (Demo Mode - records not saved to database).", "success");
      return;
    }
    try {
      const response = await fetch(`${API_BASE}/admin/attendance/save`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          batch_id: attBatchId,
          date: attendanceDate,
          records: attendanceRecords
        })
      });
      if (response.ok) {
        showModal("Success", "Attendance saved successfully!", "success");
        fetchAttendanceHistory();
        fetchStats();
      } else {
        const err = await response.json();
        showModal("Error", err.message || "Failed to save attendance", "error");
      }
    } catch (error) {
      console.error(error);
    }
  };

  const exportAttendanceCSV = () => {
    if (!attendanceRecords || attendanceRecords.length === 0) return;
    const headers = ['Roll Number', 'Student Name', 'Mobile', 'Course', 'Batch', 'Attendance Status'];
    const rows = attendanceRecords.map(r => [
      `"${r.rollNumber || ''}"`,
      `"${r.student_name || ''}"`,
      `"${r.phone || ''}"`,
      `"${r.course || ''}"`,
      `"${r.batch_name || ''}"`,
      `"${r.status || 'Present'}"`
    ]);
    const content = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `attendance_${attBatchId || 'batch'}_${attendanceDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportAttendanceSheetToExcel = () => {
    if (!attendanceRecords || attendanceRecords.length === 0) return;
    const headers = ['Roll Number', 'Student Name', 'Mobile', 'Course', 'Batch', 'Attendance Status'];
    const rows = attendanceRecords.map(r => [
      r.rollNumber || '',
      r.student_name || '',
      r.phone || '',
      r.course || '',
      r.batch_name || '',
      r.status || 'Present'
    ]);
    const content = [headers.join('\t'), ...rows.map(r => r.join('\t'))].join('\n');
    const blob = new Blob([content], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `attendance_${attBatchId || 'batch'}_${attendanceDate}.xls`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportAttendanceSheetToPDF = () => {
    if (!attendanceRecords || attendanceRecords.length === 0) return;
    const printWindow = window.open('', '_blank');
    let rowsHtml = '';
    attendanceRecords.forEach(r => {
      rowsHtml += `
        <tr>
          <td>${r.rollNumber || ''}</td>
          <td>${r.student_name || ''}</td>
          <td>${r.phone || ''}</td>
          <td>${r.course || ''}</td>
          <td>${r.batch_name || ''}</td>
          <td>${r.status || 'Present'}</td>
        </tr>
      `;
    });
    printWindow.document.write(`
      <html>
        <head>
          <title>Attendance Sheet - ${attendanceDate}</title>
          <style>
             body { font-family: sans-serif; padding: 20px; }
             h1 { color: #6C3CF0; }
             table { width: 100%; border-collapse: collapse; margin-top: 20px; }
             th, td { border: 1px solid #E5E7EB; padding: 10px; text-align: left; }
             th { background-color: #F9FAFB; font-weight: bold; }
          </style>
        </head>
        <body>
          <h1>Attendance Sheet - ${attendanceDate}</h1>
          <p>Batch: ${attendanceRecords[0]?.batch_name || 'N/A'}</p>
          <table>
            <thead>
              <tr>
                <th>Roll Number</th>
                <th>Student Name</th>
                <th>Mobile</th>
                <th>Course</th>
                <th>Batch</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>
          <script>
            window.onload = function() {
              window.print();
              window.close();
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleEditHistoryRecord = (record) => {
    const batchObj = batches.find(b => b.id === record.batch_id || b.name === record.batch_name);
    if (batchObj) {
      setAttCourse(batchObj.course_name);
      setAttBatchId(batchObj.id);
    }
    setAttendanceDate(record.date);
    setAttendancePage(1);
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

  const handleFileUpload = async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await fetch(`${API_BASE}/admin/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });
      if (res.ok) {
        return await res.json();
      } else {
        const err = await res.json();
        showModal("Upload Error", err.message || "Failed to upload file.", "error");
      }
    } catch (e) {
      console.error(e);
      showModal("Network Error", "Cannot upload file to server.", "error");
    }
    return null;
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
          visibility: recVisibility,
          course_title: recCourseTitle,
          batch_id: selectedBatchId,
          sort_order: recSortOrder ? parseInt(recSortOrder) : 999,
          duration: recDuration,
          video_source_type: videoSourceType,
          study_materials: recStudyMaterials
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
        setRecVisibility('everyone');
        setRecSortOrder('');
        setRecDuration('1h 30m');
        setVideoSourceType('link');
        setRecStudyMaterials([]);
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
        <div className="sidebar-header" style={{ 
          display: 'flex', 
          flexDirection: sidebarCollapsed ? 'column' : 'row',
          alignItems: 'center', 
          justifyContent: sidebarCollapsed ? 'center' : 'space-between', 
          width: '100%',
          padding: sidebarCollapsed ? '16px 0 12px' : '16px 8px 0',
          gap: sidebarCollapsed ? '16px' : '0'
        }}>
          <div className="sidebar-brand" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div className="sidebar-brand-icon" style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              width: '40px', 
              height: '40px', 
              flexShrink: 0 
            }}>
              <img src={leveloxIcon} alt="Levlox Logo" style={{ width: '32px', height: '32px', objectFit: 'contain' }} />
            </div>
            {!sidebarCollapsed && (
              <span className="sidebar-brand-text" style={{ color: '#FFFFFF', fontWeight: 700, fontSize: '26px', letterSpacing: '-0.5px', lineHeight: 1 }}>Levlox</span>
            )}
          </div>
          <button className="sidebar-toggle-btn" onClick={() => setSidebarCollapsed(!sidebarCollapsed)}>
            {sidebarCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
          </button>
        </div>

        <nav className="sidebar-menu" style={{ overflowY: 'auto' }}>
          <span className="sidebar-section-label">Main Menu</span>
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
        </nav>

        <div className="sidebar-footer">
          <span className="sidebar-section-label">Account</span>
          <button className="sidebar-link" onClick={handleLogout} style={{ color: 'rgba(239,68,68,0.7)' }}>
            <LogOut size={20} strokeWidth={1.75} style={{ color: 'rgba(239,68,68,0.7)' }} />
            <span className="sidebar-link-text">Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className={`main-content ${sidebarCollapsed ? 'expanded' : ''}`}>
        
        {/* Top Navbar */}
        <header className="top-navbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <img src={leveloxIcon} alt="Levlox Logo" style={{ height: '36px', width: '36px', objectFit: 'contain', borderRadius: '8px' }} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <span style={{ fontSize: '22px', fontWeight: 800, color: '#111827', letterSpacing: '-0.5px', lineHeight: 1 }}>Levlox</span>
              <span style={{ fontSize: '13px', fontWeight: 500, color: '#6B7280', lineHeight: 1 }}>Admin Portal</span>
            </div>
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
            {/* Top Statistics Row (4 Cards) */}
            <div className="stats-grid-premium" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '24px' }}>
              
              {/* Card 1: Total Students */}
              <div className="stat-card-premium" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '16px', borderRadius: '12px' }}>
                <div className="stat-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span className="stat-card-label" style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: '600', textTransform: 'uppercase' }}>Total Students</span>
                  <div className="stat-card-icon" style={{ background: 'rgba(108, 60, 240, 0.08)', color: '#6C3CF0', padding: '6px', borderRadius: '6px' }}>
                    <Users size={16} />
                  </div>
                </div>
                <div>
                  <h3 className="stat-card-value" style={{ fontSize: '24px', fontWeight: '800', margin: '4px 0' }}>{stats.totalStudents}</h3>
                  <span className="stat-card-footer" style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>Registered Learners</span>
                </div>
              </div>

              {/* Card 2: Total Batches */}
              <div className="stat-card-premium" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '16px', borderRadius: '12px' }}>
                <div className="stat-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span className="stat-card-label" style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: '600', textTransform: 'uppercase' }}>Total Batches</span>
                  <div className="stat-card-icon" style={{ background: 'rgba(108, 60, 240, 0.08)', color: '#6C3CF0', padding: '6px', borderRadius: '6px' }}>
                    <GraduationCap size={16} />
                  </div>
                </div>
                <div>
                  <h3 className="stat-card-value" style={{ fontSize: '24px', fontWeight: '800', margin: '4px 0' }}>{stats.totalBatches}</h3>
                  <span className="stat-card-footer" style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>Total batches created</span>
                </div>
              </div>

              {/* Card 3: Fees Collected */}
              <div className="stat-card-premium" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '16px', borderRadius: '12px' }}>
                <div className="stat-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span className="stat-card-label" style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: '600', textTransform: 'uppercase' }}>Fees Collected</span>
                  <div className="stat-card-icon" style={{ background: 'rgba(16, 185, 129, 0.08)', color: 'var(--success-color)', padding: '6px', borderRadius: '6px' }}>
                    <WalletIcon size={16} />
                  </div>
                </div>
                <div>
                  <h3 className="stat-card-value" style={{ fontSize: '22px', fontWeight: '800', margin: '4px 0' }}>${(stats.feesCollected || 0).toLocaleString()}</h3>
                  <span className="stat-card-footer" style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>Total Received</span>
                </div>
              </div>

              {/* Card 4: Pending Payments */}
              <div className="stat-card-premium" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '16px', borderRadius: '12px' }}>
                <div className="stat-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span className="stat-card-label" style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: '600', textTransform: 'uppercase' }}>Pending Payments</span>
                  <div className="stat-card-icon" style={{ background: 'rgba(245, 158, 11, 0.08)', color: '#F59E0B', padding: '6px', borderRadius: '6px' }}>
                    <Clock3 size={16} />
                  </div>
                </div>
                <div>
                  <h3 className="stat-card-value" style={{ fontSize: '24px', fontWeight: '800', margin: '4px 0' }}>{stats.pendingPaymentsCount}</h3>
                  <span className="stat-card-footer" style={{ fontSize: '10.5px', color: 'var(--danger-color)', fontWeight: '600' }}>
                    Dues: ${stats.pendingAmount ? stats.pendingAmount.toLocaleString() : 0}
                  </span>
                </div>
              </div>

            </div>

            {/* Rearranged Content Grid (2 Columns) */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '20px', marginBottom: '20px' }}>
              
              {/* Left Column */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                
                {/* Section 1: Recent Student Registrations */}
                <div className="dashboard-card-section" style={{ display: 'flex', flexDirection: 'column' }}>
                  <h3 className="section-title-premium" style={{ marginBottom: '16px', fontSize: '15px' }}>
                    <Users size={18} style={{ color: 'var(--primary-color)' }} />
                    Recent Student Registrations
                  </h3>
                  <div className="table-container-premium" style={{ border: 'none', background: 'transparent' }}>
                    <table className="table-premium" style={{ width: '100%' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                          <th style={{ padding: '8px', fontSize: '11px' }}>Learner</th>
                          <th style={{ padding: '8px', fontSize: '11px' }}>Course</th>
                          <th style={{ padding: '8px', fontSize: '11px' }}>Batch</th>
                          <th style={{ padding: '8px', fontSize: '11px' }}>Join Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {stats.recentStudents && stats.recentStudents.length > 0 ? (
                          stats.recentStudents.map((student) => {
                            const initials = student.name ? student.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : 'ST';
                            return (
                              <tr key={student.id} style={{ borderBottom: '1px solid var(--border-light)', cursor: 'pointer' }} onClick={() => handleViewStudentDetails(student.id)}>
                                <td style={{ padding: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <div style={{ width: '28px', height: '28px', borderRadius: '50%', overflow: 'hidden', background: 'var(--primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--border-color)', flexShrink: 0 }}>
                                    {student.profile_pic ? (
                                      <img src={student.profile_pic} alt={student.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    ) : (
                                      <span style={{ fontSize: '10px', fontWeight: 'bold', color: 'var(--primary-color)' }}>{initials}</span>
                                    )}
                                  </div>
                                  <span style={{ fontWeight: '600', fontSize: '13px' }}>{student.name}</span>
                                </td>
                                <td style={{ padding: '8px', fontSize: '12px' }}>{student.course}</td>
                                <td style={{ padding: '8px', fontSize: '12px' }}>{student.batch_name}</td>
                                <td style={{ padding: '8px', fontSize: '12px', color: 'var(--text-secondary)' }}>{student.join_date}</td>
                              </tr>
                            );
                          })
                        ) : (
                          <tr>
                            <td colSpan="4" style={{ padding: '16px', textAlign: 'center', color: 'var(--text-secondary)' }}>No student records found.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Section 2: Fee Collection Overview */}
                <div className="dashboard-card-section" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <h3 className="section-title-premium" style={{ marginBottom: '16px', fontSize: '15px' }}>
                    <WalletIcon size={18} style={{ color: 'var(--primary-color)' }} />
                    Fee Collection Overview
                  </h3>
                  {stats.feeOverview ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        <div>
                          <span style={{ fontSize: '10.5px', color: 'var(--text-secondary)', textTransform: 'uppercase', display: 'block' }}>Total Collection</span>
                          <strong style={{ fontSize: '18px', color: 'var(--success-color)' }}>${(stats.feeOverview.totalCollected || 0).toLocaleString()}</strong>
                        </div>
                        <div>
                          <span style={{ fontSize: '10.5px', color: 'var(--text-secondary)', textTransform: 'uppercase', display: 'block' }}>Pending Amount</span>
                          <strong style={{ fontSize: '18px', color: 'var(--danger-color)' }}>${(stats.feeOverview.pendingAmount || 0).toLocaleString()}</strong>
                        </div>
                      </div>
                      <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '10px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px' }}>
                          <span style={{ color: 'var(--text-secondary)' }}>Paid Students</span>
                          <strong>{stats.feeOverview.paidStudents} students</strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px' }}>
                          <span style={{ color: 'var(--text-secondary)' }}>Pending Students</span>
                          <strong>{stats.feeOverview.pendingStudentsCount} students</strong>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-secondary)' }}>No ledger summary found.</div>
                  )}
                </div>

              </div>
              
              {/* Right Column */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                
                {/* Section 3: Recent Announcements */}
                <div className="dashboard-card-section">
                  <h3 className="section-title-premium" style={{ marginBottom: '16px', fontSize: '15px' }}>
                    <Megaphone size={18} style={{ color: 'var(--primary-color)' }} />
                    Recent Announcements
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {stats.recentAnnouncements && stats.recentAnnouncements.length > 0 ? (
                      stats.recentAnnouncements.map((item) => (
                        <div key={item.id} style={{ padding: '10px 12px', background: '#fafafd', borderRadius: '8px', borderLeft: item.is_pinned ? '3px solid var(--primary-color)' : '1px solid var(--border-color)' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px', alignItems: 'center' }}>
                            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                              <strong style={{ fontSize: '13px', color: 'var(--text-primary)' }}>{item.title}</strong>
                              {item.is_pinned && <span style={{ fontSize: '9px', background: 'var(--primary-light)', color: 'var(--primary-color)', padding: '1px 4px', borderRadius: '4px' }}>Pinned</span>}
                            </div>
                            <span style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>{item.date}</span>
                          </div>
                          <p style={{ fontSize: '11.5px', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.4 }}>{item.content}</p>
                        </div>
                      ))
                    ) : (
                      <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-secondary)' }}>No announcements published.</div>
                    )}
                  </div>
                </div>

                {/* Section 4: Recent Activity Timeline */}
                <div className="dashboard-card-section">
                  <h3 className="section-title-premium" style={{ marginBottom: '18px', fontSize: '15px' }}>
                    <Clock size={18} style={{ color: 'var(--primary-color)' }} />
                    Recent Activity Timeline
                  </h3>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', position: 'relative', paddingLeft: '20px', borderLeft: '2px solid var(--border-color)' }}>
                    {stats.recentActivity && stats.recentActivity.length > 0 ? (
                      stats.recentActivity.map((act, index) => {
                        let dotColor = 'var(--primary-color)';
                        if (act.type === 'fee') dotColor = 'var(--success-color)';
                        if (act.type === 'recording') dotColor = 'var(--success-color)';
                        if (act.type === 'notes') dotColor = '#3B82F6';
                        if (act.type === 'class') dotColor = 'var(--danger-color)';
                        if (act.type === 'announcement') dotColor = '#F59E0B';
                        if (act.type === 'attendance') dotColor = 'var(--primary-color)';

                        return (
                          <div key={index} style={{ position: 'relative' }}>
                            {/* Timeline point dot */}
                            <div style={{ position: 'absolute', left: '-27px', top: '4px', width: '12px', height: '12px', borderRadius: '50%', background: dotColor, border: '2.5px solid white', boxShadow: '0 0 0 1px var(--border-color)' }} />
                            
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px' }}>
                              <span style={{ fontSize: '13.5px', color: 'var(--text-primary)', fontWeight: '500' }}>{act.message}</span>
                              <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontWeight: '500' }}>{act.date}</span>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div style={{ padding: '10px 0', color: 'var(--text-secondary)', fontSize: '13px' }}>No recorded events in system activity.</div>
                    )}
                  </div>
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
            <div className="dashboard-card-section" style={{ display: 'flex', flexDirection: 'column', minHeight: '500px' }}>
              <div className="section-header-premium" style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                <h4 style={{ fontSize: '15.5px', fontWeight: '700', margin: 0 }}>Registered Institutional Batches</h4>
                <div className="action-buttons-group">
                  <ExportDropdown
                    onExportCSV={exportBatchesToCSV}
                    onExportExcel={exportBatchesToExcel}
                    onExportPDF={exportBatchesToPDF}
                  />
                </div>
              </div>

              {batches.length === 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexGrow: 1, padding: '40px 20px', textAlign: 'center' }}>
                  <div style={{ width: '80px', height: '80px', background: 'var(--primary-light)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px', color: 'var(--primary-color)' }}>
                    <GraduationCap size={40} />
                  </div>
                  <h5 style={{ fontSize: '16px', fontWeight: '800', margin: '0 0 4px' }}>No Batches Found</h5>
                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)', maxWidth: '280px', margin: 0 }}>No batches created yet. Use the left panel to configure a new batch.</p>
                </div>
              ) : (() => {
                const batchLimit = windowWidth < 768 ? 1 : (windowWidth < 1024 ? 2 : 3);
                const totalBatchesPages = Math.ceil(batches.length / batchLimit) || 1;
                const safeBatchesPage = Math.min(batchesPage, totalBatchesPages);
                const paginatedBatches = batches.slice((safeBatchesPage - 1) * batchLimit, safeBatchesPage * batchLimit);

                return (
                  <div style={{ display: 'flex', flexDirection: 'column', flexGrow: 1, justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      {paginatedBatches.map((batch) => (
                        <div 
                          key={batch.id} 
                          className="feed-item-premium" 
                          style={{ 
                            display: 'flex', 
                            flexDirection: 'column', 
                            alignItems: 'stretch', 
                            padding: '24px', 
                            gap: '16px', 
                            backgroundColor: '#ffffff', 
                            borderRadius: '20px', 
                            boxShadow: '0 10px 30px rgba(0, 0, 0, 0.05)',
                            border: '1px solid var(--border-light)'
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div>
                              <span style={{ fontSize: '10.5px', fontWeight: 800, textTransform: 'uppercase', color: 'var(--primary-color)', background: 'var(--primary-light)', padding: '4px 10px', borderRadius: '6px' }}>
                                {batch.code} · {batch.course_name}
                              </span>
                              <h5 style={{ fontWeight: '800', fontSize: '18px', color: 'var(--text-primary)', margin: '12px 0 4px' }}>{batch.name}</h5>
                              <p style={{ fontSize: '13.5px', color: 'var(--text-secondary)', margin: 0 }}>Instructor: <strong>{batch.trainer_name}</strong></p>
                            </div>
                            <span className={`badge-status ${batch.status === 'Active' ? 'paid' : 'unpaid'}`} style={{ height: '24px', fontSize: '11px', fontWeight: '700' }}>
                              {batch.status}
                            </span>
                          </div>

                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', background: 'var(--surface-alt)', padding: '14px', borderRadius: '12px', border: '1px solid var(--border-color)', fontSize: '13px' }}>
                            <div>
                              <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '11px', textTransform: 'uppercase', fontWeight: 700, marginBottom: '2px' }}>Students</span>
                              <strong>{batch.students_count} / {batch.max_students}</strong>
                            </div>
                            <div>
                              <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '11px', textTransform: 'uppercase', fontWeight: 700, marginBottom: '2px' }}>Start Date</span>
                              <strong>{batch.start_date}</strong>
                            </div>
                            <div>
                              <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '11px', textTransform: 'uppercase', fontWeight: 700, marginBottom: '2px' }}>End Date</span>
                              <strong>{batch.end_date}</strong>
                            </div>
                          </div>

                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-light)', paddingTop: '16px', gap: '10px' }}>
                            <button className="btn btn-primary" style={{ padding: '8px 16px', fontSize: '12.5px', height: '36px', borderRadius: '10px' }} onClick={() => startAssignStudents(batch)}>
                              Assign Students
                            </button>
                            <div style={{ display: 'flex', gap: '8px' }}>
                              <button className="btn btn-outline" style={{ padding: '8px 14px', fontSize: '12.5px', height: '36px', borderRadius: '10px' }} onClick={() => startEditBatch(batch)}>
                                Edit
                              </button>
                              <button className="btn btn-danger" style={{ padding: '8px 14px', fontSize: '12.5px', height: '36px', borderRadius: '10px', backgroundColor: 'var(--danger-color)', color: 'white' }} onClick={() => deleteBatch(batch.id)}>
                                Delete
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Pagination */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '20px', borderTop: '1px solid var(--border-light)', paddingTop: '15px' }}>
                      <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                        Viewing page <strong>{safeBatchesPage}</strong> of {totalBatchesPages}
                      </span>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button className="btn btn-outline" style={{ padding: '6px 12px', fontSize: '12px', height: '32px' }} disabled={safeBatchesPage === 1} onClick={() => setBatchesPage(prev => Math.max(prev - 1, 1))}>
                          Prev
                        </button>
                        <button className="btn btn-outline" style={{ padding: '6px 12px', fontSize: '12px', height: '32px' }} disabled={safeBatchesPage === totalBatchesPages} onClick={() => setBatchesPage(prev => Math.min(prev + 1, totalBatchesPages))}>
                          Next
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        )}

        {/* Students Registry Tab */}
        {activeTab === 'students' && (
          <div className="dashboard-card-section" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div className="section-header-premium" style={{ gap: '16px', flexWrap: 'wrap', width: '100%', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 className="section-title-premium" style={{ margin: 0 }}>Student Accounts Registry</h3>
              
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center', flexGrow: 1, justifyContent: 'flex-end' }}>
                {/* Repositioned Search Box */}
                <div className="search-bar-container" style={{ width: '160px', padding: '6px 12px', borderRadius: 'var(--radius-md)', height: '34px', margin: 0 }}>
                  <Search size={14} style={{ color: 'var(--text-secondary)' }} />
                  <input 
                    type="text" 
                    placeholder="Search students..." 
                    style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: '12px', width: '100%' }}
                    value={searchQuery}
                    onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                  />
                </div>

                <CustomDropdown
                  label="Course"
                  value={courseFilter}
                  onChange={(val) => { setCourseFilter(val); setCurrentPage(1); }}
                  width="130px"
                  options={[
                    { value: '', label: 'Course' },
                    { value: 'Fullstack Engineering', label: 'Fullstack Engineering' },
                    { value: 'UI/UX Design', label: 'UI/UX Design' },
                    { value: 'Data Science', label: 'Data Science' },
                    { value: 'Mobile App Development', label: 'Mobile App Development' }
                  ]}
                />
                
                <CustomDropdown
                  label="Batch"
                  value={batchFilter}
                  onChange={(val) => { setBatchFilter(val); setCurrentPage(1); }}
                  width="110px"
                  options={[
                    { value: '', label: 'Batch' },
                    ...batches.map(b => ({ value: b.id, label: b.name }))
                  ]}
                />

                <CustomDropdown
                  label="Status"
                  value={statusFilter}
                  onChange={(val) => { setStatusFilter(val); setCurrentPage(1); }}
                  width="100px"
                  options={[
                    { value: '', label: 'Status' },
                    { value: 'Active Only', label: 'Active Only' },
                    { value: 'Suspended', label: 'Suspended' }
                  ]}
                />

                <CustomDropdown
                  label="Fee Status"
                  value={feesFilter}
                  onChange={(val) => { setFeesFilter(val); setCurrentPage(1); }}
                  width="110px"
                  options={[
                    { value: '', label: 'Fee Status' },
                    { value: 'Paid', label: 'Fully Paid' },
                    { value: 'Pending', label: 'Pending Dues' }
                  ]}
                />

                <div className="action-buttons-group">
                  <ExportDropdown
                    onExportCSV={exportToCSV}
                    onExportExcel={exportToExcel}
                    onExportPDF={exportToPDF}
                  />
                  <button className="btn btn-primary" style={{ padding: '0 16px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px', height: '46px', borderRadius: '14px' }} onClick={() => { setCreateName(''); setCreateEmail(''); setCreatePhone(''); setCreateCourse('Fullstack Engineering'); setCreateBatchId(''); setCreateTempPassword(generateRandomPassword()); setShowCreateModal(true); }}>
                    <Plus size={14} /> Create Student
                  </button>
                </div>
              </div>
            </div>

            {/* Desktop & Tablet: Fixed Header Table */}
            <div className="table-container-scrollable table-desktop-view">
              <table className="table-premium compact-tablet">
                <thead>
                  <tr>
                    <th className="col-profile">Profile</th>
                    <th className="col-name">Student Name</th>
                    <th className="col-id">Student ID</th>
                    <th className="col-email">Email</th>
                    <th className="col-mobile">Mobile</th>
                    <th className="col-course">Course</th>
                    <th className="col-batch">Batch</th>
                    <th className="col-fee">Fee Status</th>
                    <th className="col-status">Account Status</th>
                    <th className="col-actions">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((student) => {
                    const initials = student.name ? student.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : 'ST';
                    return (
                      <tr key={student.id} style={{ cursor: 'pointer' }} onClick={() => handleViewStudentDetails(student.id)}>
                        <td className="col-profile" onClick={(e) => e.stopPropagation()}>
                          <div style={{ width: '36px', height: '36px', borderRadius: '50%', overflow: 'hidden', background: 'var(--primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--border-color)' }}>
                            {student.profile_pic && student.profile_pic.trim() !== '' ? (
                              <img src={student.profile_pic} alt={student.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                              <span style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--primary-color)' }}>{initials}</span>
                            )}
                          </div>
                        </td>
                        <td className="col-name"><strong>{student.name}</strong></td>
                        <td className="col-id"><code>{student.rollNumber}</code></td>
                        <td className="col-email">
                          <div className="col-limit-email" title={student.email}>
                            {student.email}
                          </div>
                        </td>
                        <td className="col-mobile">{student.phone}</td>
                        <td className="col-course">
                          <div className="col-limit-course" title={student.course}>
                            {student.course}
                          </div>
                        </td>
                        <td className="col-batch">
                          <div className="col-limit-batch" title={student.batch_name || 'Not Assigned'}>
                            {student.batch_name || 'Not Assigned'}
                          </div>
                        </td>
                        <td className="col-fee">
                          <span className={`badge-status-fixed ${student.feesStatus === 'Paid' ? 'paid' : 'unpaid'}`} onClick={(e) => { e.stopPropagation(); toggleFees(student.id); }} style={{ cursor: 'pointer' }}>
                            {student.feesStatus === 'Paid' ? 'Paid' : 'Pending'}
                          </span>
                        </td>
                        <td className="col-status">
                          <span className={`badge-status-fixed ${student.status === 'active' || student.status === 'Active' ? 'paid' : 'unpaid'}`} onClick={(e) => { e.stopPropagation(); toggleStatus(student.id); }} style={{ cursor: 'pointer' }}>
                            {student.status === 'active' || student.status === 'Active' ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="col-actions" onClick={(e) => e.stopPropagation()}>
                          <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                            <button className="action-icon-btn btn-view" data-tooltip="View Profile" onClick={() => handleViewStudentDetails(student.id)}>
                              <Eye size={16} />
                            </button>
                            <button className="action-icon-btn btn-edit" data-tooltip="Edit Student" onClick={() => handleEditClick(student)}>
                              <Pencil size={16} />
                            </button>
                            <button className="action-icon-btn btn-delete" data-tooltip="Delete" onClick={() => deleteStudent(student.id)}>
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile View: Student Cards */}
            <div className="mobile-student-cards">
              {students.map((student) => {
                const initials = student.name ? student.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : 'ST';
                return (
                  <div key={student.id} className="student-mobile-card" onClick={() => handleViewStudentDetails(student.id)}>
                    <div className="student-card-header">
                      <div style={{ width: '38px', height: '38px', borderRadius: '50%', overflow: 'hidden', background: 'var(--primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--border-color)', flexShrink: 0 }}>
                        {student.profile_pic && student.profile_pic.trim() !== '' ? (
                          <img src={student.profile_pic} alt={student.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          <span style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--primary-color)' }}>{initials}</span>
                        )}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <h4 style={{ fontSize: '14px', fontWeight: '800', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{student.name}</h4>
                        <code style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{student.rollNumber}</code>
                      </div>
                    </div>
                    <div className="student-card-body">
                      <div>
                        <span className="student-card-label">Email</span>
                        <span className="student-card-value" style={{ wordBreak: 'break-all' }}>{student.email}</span>
                      </div>
                      <div>
                        <span className="student-card-label">Mobile</span>
                        <span className="student-card-value">{student.phone}</span>
                      </div>
                      <div>
                        <span className="student-card-label">Course</span>
                        <span className="student-card-value">{student.course}</span>
                      </div>
                      <div>
                        <span className="student-card-label">Batch</span>
                        <span className="student-card-value">{student.batch_name || 'Not Assigned'}</span>
                      </div>
                      <div>
                        <span className="student-card-label">Fee Status</span>
                        <span className={`badge-status-fixed ${student.feesStatus === 'Paid' ? 'paid' : 'unpaid'}`} onClick={(e) => { e.stopPropagation(); toggleFees(student.id); }} style={{ cursor: 'pointer', display: 'inline-flex' }}>
                          {student.feesStatus === 'Paid' ? 'Paid' : 'Pending'}
                        </span>
                      </div>
                      <div>
                        <span className="student-card-label">Status</span>
                        <span className={`badge-status-fixed ${student.status === 'active' || student.status === 'Active' ? 'paid' : 'unpaid'}`} onClick={(e) => { e.stopPropagation(); toggleStatus(student.id); }} style={{ cursor: 'pointer', display: 'inline-flex' }}>
                          {student.status === 'active' || student.status === 'Active' ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </div>
                    <div className="student-card-actions" onClick={(e) => e.stopPropagation()} style={{ gap: '8px' }}>
                      <button className="action-icon-btn btn-view" data-tooltip="View Profile" onClick={() => handleViewStudentDetails(student.id)}>
                        <Eye size={16} />
                      </button>
                      <button className="action-icon-btn btn-edit" data-tooltip="Edit Student" onClick={() => handleEditClick(student)}>
                        <Pencil size={16} />
                      </button>
                      <button className="action-icon-btn" data-tooltip="Reset Password" onClick={() => handleResetPassword(student.id)}>
                        <Key size={16} />
                      </button>
                      <button className="action-icon-btn btn-delete" data-tooltip="Delete" onClick={() => deleteStudent(student.id)}>
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination Fixed at bottom of Registry Container */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px', borderTop: '1px solid var(--border-light)', paddingTop: '15px' }}>
              <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                Viewing page <strong>{currentPage}</strong> of {totalPages}
              </span>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button className="btn btn-outline" style={{ padding: '6px 12px', fontSize: '12px', height: '32px' }} disabled={currentPage === 1} onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}>
                  Prev
                </button>
                <button className="btn btn-outline" style={{ padding: '6px 12px', fontSize: '12px', height: '32px' }} disabled={currentPage === totalPages} onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}>
                  Next
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'live-classes' && (() => {
          const getDummyClasses = () => {
            const todayStr = '2026-07-10';
            const tomorrowStr = '2026-07-11';
            const yesterdayStr = '2026-07-09';
            
            return [
              {
                _id: 'dummy-1',
                title: 'Python Basics',
                batch_name: 'Full Stack Batch A',
                instructor: 'Sri',
                date: todayStr,
                time: '7:00 PM',
                status: 'Live',
                students_joined: 32,
                meet_link: 'https://meet.google.com/abc-defg-hij'
              },
              {
                _id: 'dummy-2',
                title: 'React Components',
                batch_name: 'Batch B',
                instructor: 'Rahul',
                date: tomorrowStr,
                time: '6:00 PM',
                status: 'Upcoming',
                students_joined: 0,
                meet_link: 'https://meet.google.com/abc-defg-hij'
              },
              {
                _id: 'dummy-3',
                title: 'Java OOP',
                batch_name: 'Batch C',
                instructor: 'Kavya',
                date: yesterdayStr,
                time: '5:00 PM',
                status: 'Completed',
                students_joined: 45,
                meet_link: 'https://meet.google.com/abc-defg-hij'
              }
            ];
          };

          const allAvailableClasses = [...liveClasses.map(c => ({
            ...c,
            batch_name: batches.find(b => b.id === c.batch_id)?.name || 'General Batch',
            students_joined: c.students_joined || 0
          })), ...getDummyClasses()];

          const filteredClasses = allAvailableClasses.filter(c => {
            const query = sessionSearch.toLowerCase();
            const matchesSearch = c.title?.toLowerCase().includes(query) || 
                                  c.instructor?.toLowerCase().includes(query) ||
                                  c.batch_name?.toLowerCase().includes(query);
            
            if (!matchesSearch) return false;
            
            if (!c.date) return true;
            const classDate = new Date(c.date);
            const now = new Date('2026-07-10T23:27:53');
            
            const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
            
            if (dateFilter === 'Today') {
              return classDate >= startOfToday && classDate <= endOfToday;
            } else if (dateFilter === 'This Week') {
              const firstDayOfWeek = new Date(now);
              firstDayOfWeek.setDate(firstDayOfWeek.getDate() - firstDayOfWeek.getDay());
              firstDayOfWeek.setHours(0,0,0,0);
              const lastDayOfWeek = new Date(firstDayOfWeek);
              lastDayOfWeek.setDate(lastDayOfWeek.getDate() + 7);
              lastDayOfWeek.setHours(23,59,59,999);
              return classDate >= firstDayOfWeek && classDate <= lastDayOfWeek;
            } else if (dateFilter === 'This Month') {
              const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
              const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
              return classDate >= firstDayOfMonth && classDate <= lastDayOfMonth;
            } else if (dateFilter === 'This Year') {
              const firstDayOfYear = new Date(now.getFullYear(), 0, 1);
              const lastDayOfYear = new Date(now.getFullYear(), 11, 31, 23, 59, 59);
              return classDate >= firstDayOfYear && classDate <= lastDayOfYear;
            } else if (dateFilter === 'Custom Range') {
              if (!customStartDate || !customEndDate) return true;
              const start = new Date(customStartDate);
              const end = new Date(customEndDate);
              end.setHours(23, 59, 59);
              return classDate >= start && classDate <= end;
            }
            return true;
          });

          return (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '30px', alignItems: 'start' }} className="live-classes-container">
              
              {/* Left Side: Schedule Form */}
              <div className="dashboard-card-section" style={{ padding: '28px' }}>
                <h4 style={{ marginBottom: '24px', fontSize: '18px', fontWeight: '800', color: 'var(--text-primary)' }}>Schedule Live Lecture</h4>
                <form onSubmit={addLiveClass} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" htmlFor="liveBatchSelect" style={{ fontWeight: 700, fontSize: '12px' }}>Target Batch</label>
                    <CustomDropdown
                      label="Target Batch"
                      value={selectedBatchId}
                      onChange={(val) => setSelectedBatchId(val)}
                      width="100%"
                      placeholder="-- Choose Batch --"
                      options={[
                        { value: '', label: '-- Choose Batch --' },
                        ...batches.map(b => ({ value: b.id, label: `${b.name} (${b.code})` }))
                      ]}
                    />
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" htmlFor="liveTitle" style={{ fontWeight: 700, fontSize: '12px' }}>Lecture Title</label>
                    <input id="liveTitle" type="text" className="form-input form-input-lg" placeholder="e.g. Intro to React" value={liveTitle} onChange={(e) => setLiveTitle(e.target.value)} required />
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" htmlFor="liveInstructor" style={{ fontWeight: 700, fontSize: '12px' }}>Lead Faculty</label>
                    <input id="liveInstructor" type="text" className="form-input form-input-lg" placeholder="e.g. Sri Aakash" value={liveInstructor} onChange={(e) => setLiveInstructor(e.target.value)} required />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label" htmlFor="liveDate" style={{ fontWeight: 700, fontSize: '12px' }}>Date</label>
                      <input id="liveDate" type="date" className="form-input form-input-lg" value={liveDate} onChange={(e) => setLiveDate(e.target.value)} required />
                    </div>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label" htmlFor="liveTime" style={{ fontWeight: 700, fontSize: '12px' }}>Time / Schedule</label>
                      <input id="liveTime" type="text" className="form-input form-input-lg" value={liveTime} onChange={(e) => setLiveTime(e.target.value)} placeholder="e.g. 7:00 PM - 8:30 PM" required />
                    </div>
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" htmlFor="liveUrl" style={{ fontWeight: 700, fontSize: '12px' }}>Google Meet Link</label>
                    <input id="liveUrl" type="url" className="form-input form-input-lg" placeholder="https://meet.google.com/..." value={liveUrl} onChange={(e) => setLiveUrl(e.target.value)} required />
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" htmlFor="liveStatusSelect" style={{ fontWeight: 700, fontSize: '12px' }}>Class Status</label>
                    <CustomDropdown
                      label="Class Status"
                      value={liveStatus}
                      onChange={(val) => setLiveStatus(val)}
                      width="100%"
                      options={[
                        { value: 'Upcoming', label: 'Upcoming' },
                        { value: 'Live', label: 'Live' },
                        { value: 'Completed', label: 'Completed' }
                      ]}
                    />
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" htmlFor="liveDescription" style={{ fontWeight: 700, fontSize: '12px' }}>Description</label>
                    <textarea id="liveDescription" className="form-input" style={{ height: '70px', resize: 'none', borderRadius: '10px' }} placeholder="Brief overview of lecture contents..." value={liveDescription} onChange={(e) => setLiveDescription(e.target.value)} />
                  </div>
                  <div style={{ display: 'flex', gap: '16px', margin: '4px 0' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <input id="liveToday" type="checkbox" checked={liveToday} onChange={(e) => setLiveToday(e.target.checked)} />
                      <label htmlFor="liveToday" className="form-label" style={{ marginBottom: 0, fontSize: '12.5px', cursor: 'pointer' }}>Happening Today?</label>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <input id="livePublished" type="checkbox" checked={livePublished} onChange={(e) => setLivePublished(e.target.checked)} />
                      <label htmlFor="livePublished" className="form-label" style={{ marginBottom: 0, fontSize: '12.5px', cursor: 'pointer' }}>Publish Stream</label>
                    </div>
                  </div>
                  <button type="submit" className="btn btn-primary btn-block btn-purple-gradient" style={{ height: '48px', fontSize: '14.5px' }}>Confirm Live Lecture</button>
                </form>
              </div>

              {/* Right Side: Active Sessions Management */}
              <div className="dashboard-card-section" style={{ display: 'flex', flexDirection: 'column', gap: '20px', minWidth: 0 }}>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                  <h4 style={{ fontSize: '18px', fontWeight: '800', margin: 0, color: 'var(--text-primary)' }}>Active Sessions</h4>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <ExportDropdown
                      onExportCSV={exportLiveClassesToCSV}
                      onExportExcel={exportLiveClassesToExcel}
                      onExportPDF={exportLiveClassesToPDF}
                    />
                    {/* Search bar inside header */}
                    <div className="search-bar-container" style={{ width: '200px', padding: '6px 12px', borderRadius: 'var(--radius-md)', height: '34px', margin: 0 }}>
                      <Search size={14} style={{ color: 'var(--text-secondary)' }} />
                      <input 
                        type="text" 
                        placeholder="Search sessions..." 
                        style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: '12px', width: '100%' }}
                        value={sessionSearch}
                        onChange={(e) => setSessionSearch(e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                {/* Filter Pills */}
                <div className="date-filter-row" style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px', scrollbarWidth: 'none' }}>
                  {['Today', 'This Week', 'This Month', 'This Year', 'Custom Range'].map(f => (
                    <button
                      key={f}
                      type="button"
                      className={`session-filter-pill ${dateFilter === f ? 'active' : ''}`}
                      onClick={() => setDateFilter(f)}
                    >
                      {f}
                    </button>
                  ))}
                </div>

                {/* Custom Date Range Picker */}
                {dateFilter === 'Custom Range' && (
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center', background: 'var(--surface-alt)', padding: '12px', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                    <input type="date" className="form-input" style={{ height: '36px', fontSize: '12.5px' }} value={customStartDate} onChange={(e) => setCustomStartDate(e.target.value)} />
                    <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>to</span>
                    <input type="date" className="form-input" style={{ height: '36px', fontSize: '12.5px' }} value={customEndDate} onChange={(e) => setCustomEndDate(e.target.value)} />
                  </div>
                )}

                {/* Sessions Logs Table/Cards */}
                {filteredClasses.length === 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '40px 20px', background: 'var(--surface-alt)', borderRadius: '16px', border: '1.5px dashed var(--border-color)' }}>
                    <div style={{ width: '80px', height: '80px', background: 'rgba(108,60,240,0.06)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px', color: 'var(--primary-color)' }}>
                      <CalendarCheck size={40} />
                    </div>
                    <h5 style={{ fontSize: '16px', fontWeight: '800', margin: '0 0 4px' }}>No Live Sessions</h5>
                    <p style={{ fontSize: '13px', color: 'var(--text-secondary)', maxWidth: '280px', margin: '0 0 16px' }}>There are currently no active sessions.</p>
                    <button type="button" className="btn btn-primary btn-sm" onClick={() => document.getElementById('liveTitle')?.focus()}>Schedule Session</button>
                  </div>
                ) : (() => {
                  const limit = 5;
                  const totalLivePages = Math.ceil(filteredClasses.length / limit) || 1;
                  const safeLivePage = Math.min(livePage, totalLivePages);
                  const paginatedClasses = filteredClasses.slice((safeLivePage - 1) * limit, safeLivePage * limit);

                  return (
                    <div style={{ display: 'flex', flexDirection: 'column', flexGrow: 1, justifyContent: 'space-between' }}>
                      <div>
                        {/* Desktop table view */}
                        <div className="table-container-premium table-desktop-view" style={{ border: '1px solid var(--border-color)', borderRadius: '12px', overflow: 'hidden' }}>
                          <table className="table-premium" style={{ tableLayout: 'auto' }}>
                            <thead>
                              <tr>
                                <th>Lecture</th>
                                <th>Batch</th>
                                <th>Faculty</th>
                                <th>Date</th>
                                <th>Time</th>
                                <th>Status</th>
                                <th>Students</th>
                                <th style={{ textAlign: 'center' }}>Actions</th>
                              </tr>
                            </thead>
                            <tbody>
                              {paginatedClasses.map((item, idx) => {
                                let badgeClass = 'badge-status-completed';
                                if (item.status === 'Live') badgeClass = 'badge-status-live';
                                else if (item.status === 'Upcoming') badgeClass = 'badge-status-upcoming';

                                return (
                                  <tr key={item._id || idx}>
                                    <td><strong style={{ fontSize: '13.5px' }}>{item.title}</strong></td>
                                    <td><span style={{ fontSize: '12.5px', color: 'var(--text-secondary)' }}>{item.batch_name}</span></td>
                                    <td><span style={{ fontSize: '12.5px' }}>{item.instructor}</span></td>
                                    <td><span style={{ fontSize: '12.5px' }}>{item.date}</span></td>
                                    <td><span style={{ fontSize: '12.5px' }}>{item.time}</span></td>
                                    <td>
                                      <span className={`badge-status-fixed ${badgeClass}`} style={{ minWidth: '70px', height: '22px', fontSize: '10.5px' }}>
                                        {item.status}
                                      </span>
                                    </td>
                                    <td style={{ textAlign: 'center' }}><span style={{ fontWeight: '700' }}>{item.students_joined}</span></td>
                                    <td>
                                      <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                                        {item.status === 'Live' && (
                                          <>
                                            <a href={item.meet_link} target="_blank" rel="noopener noreferrer" className="btn btn-primary btn-sm" style={{ height: '30px', padding: '0 10px', fontSize: '11.5px', backgroundColor: '#10B981', borderColor: '#10B981' }}>Join</a>
                                            <button type="button" className="btn btn-outline btn-sm" style={{ height: '30px', padding: '0 8px' }} onClick={() => handleEditLiveClick(item)}>Edit</button>
                                            <button type="button" className="btn btn-danger btn-sm" style={{ height: '30px', padding: '0 8px' }} onClick={() => deleteLiveClass(item._id)}>End</button>
                                          </>
                                        )}
                                        {item.status === 'Upcoming' && (
                                          <>
                                            <button type="button" className="btn btn-outline btn-sm" style={{ height: '30px', padding: '0 8px' }} onClick={() => handleEditLiveClick(item)}>Edit</button>
                                            <button type="button" className="btn btn-danger btn-sm" style={{ height: '30px', padding: '0 8px', backgroundColor: 'var(--danger-color)', color: 'white' }} onClick={() => deleteLiveClass(item._id)}>Cancel</button>
                                          </>
                                        )}
                                        {item.status === 'Completed' && (
                                          <button type="button" className="btn btn-outline btn-sm" style={{ height: '30px', padding: '0 10px', fontSize: '11.5px' }} onClick={() => showModal("Lecture Recording", `Viewing recording link for ${item.title}: ${item.meet_link || 'N/A'}`)}>View Recording</button>
                                        )}
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>

                        {/* Mobile responsive cards list */}
                        <div className="mobile-student-cards" style={{ display: 'none' }}>
                          {paginatedClasses.map((item, idx) => {
                            let badgeClass = 'badge-status-completed';
                            if (item.status === 'Live') badgeClass = 'badge-status-live';
                            else if (item.status === 'Upcoming') badgeClass = 'badge-status-upcoming';

                            return (
                              <div key={item._id || idx} className="student-mobile-card" style={{ padding: '16px' }}>
                                <div className="student-card-header" style={{ justifyContent: 'space-between', paddingBottom: '8px' }}>
                                  <div>
                                    <h5 style={{ fontWeight: '800', fontSize: '14.5px', margin: 0 }}>{item.title}</h5>
                                    <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{item.batch_name}</span>
                                  </div>
                                  <span className={`badge-status-fixed ${badgeClass}`} style={{ minWidth: '70px', height: '22px', fontSize: '10.5px' }}>
                                    {item.status}
                                  </span>
                                </div>
                                <div className="student-card-body" style={{ gridTemplateColumns: '1fr 1fr', gap: '8px', padding: '4px 0' }}>
                                  <div>
                                    <span className="student-card-label">Faculty</span>
                                    <span className="student-card-value">{item.instructor}</span>
                                  </div>
                                  <div>
                                    <span className="student-card-label">Students Joined</span>
                                    <span className="student-card-value">{item.students_joined}</span>
                                  </div>
                                  <div>
                                    <span className="student-card-label">Date</span>
                                    <span className="student-card-value">{item.date}</span>
                                  </div>
                                  <div>
                                    <span className="student-card-label">Time</span>
                                    <span className="student-card-value">{item.time}</span>
                                  </div>
                                </div>
                                <div className="student-card-actions" style={{ justifyContent: 'flex-start', gap: '8px', paddingTop: '10px' }}>
                                  {item.status === 'Live' && (
                                    <>
                                      <a href={item.meet_link} target="_blank" rel="noopener noreferrer" className="btn btn-primary btn-sm" style={{ height: '32px', backgroundColor: '#10B981', borderColor: '#10B981' }}>Join</a>
                                      <button type="button" className="btn btn-outline btn-sm" style={{ height: '32px' }} onClick={() => handleEditLiveClick(item)}>Edit</button>
                                      <button type="button" className="btn btn-danger btn-sm" style={{ height: '32px' }} onClick={() => deleteLiveClass(item._id)}>End</button>
                                    </>
                                  )}
                                  {item.status === 'Upcoming' && (
                                    <>
                                      <button type="button" className="btn btn-outline btn-sm" style={{ height: '32px' }} onClick={() => handleEditLiveClick(item)}>Edit</button>
                                      <button type="button" className="btn btn-danger btn-sm" style={{ height: '32px', backgroundColor: 'var(--danger-color)', color: 'white' }} onClick={() => deleteLiveClass(item._id)}>Cancel</button>
                                    </>
                                  )}
                                  {item.status === 'Completed' && (
                                    <button type="button" className="btn btn-outline btn-sm" style={{ height: '32px' }} onClick={() => showModal("Lecture Recording", `Recording Link: ${item.meet_link}`)}>View Recording</button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Pagination */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '20px', borderTop: '1px solid var(--border-light)', paddingTop: '15px' }}>
                        <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                          Viewing page <strong>{safeLivePage}</strong> of {totalLivePages}
                        </span>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button type="button" className="btn btn-outline" style={{ padding: '6px 12px', fontSize: '12px', height: '32px' }} disabled={safeLivePage === 1} onClick={() => setLivePage(prev => Math.max(prev - 1, 1))}>
                            Prev
                          </button>
                          <button type="button" className="btn btn-outline" style={{ padding: '6px 12px', fontSize: '12px', height: '32px' }} disabled={safeLivePage === totalLivePages} onClick={() => setLivePage(prev => Math.min(prev + 1, totalLivePages))}>
                            Next
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>

            </div>
          );
        })()}

        {/* Attendance Tab */}
        {activeTab === 'attendance' && (
          <div>
            {/* Top Filter Bar */}
            <div className="dashboard-card-section" style={{ marginBottom: '24px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', alignItems: 'end' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Search Student</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="Name, ID, or Mobile..." 
                    value={attSearchQuery} 
                    onChange={(e) => { setAttSearchQuery(e.target.value); setAttendancePage(1); }} 
                  />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Select Course</label>
                  <select 
                    className="form-select" 
                    value={attCourse} 
                    onChange={handleCourseChange}
                  >
                    <option value="">All Courses</option>
                    {Array.from(new Set(batches.map(b => b.course_name))).filter(Boolean).map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Select Batch</label>
                  <select 
                    className="form-select" 
                    value={attBatchId} 
                    onChange={handleBatchChange}
                    required
                  >
                    <option value="">-- Choose Batch --</option>
                    {(attCourse ? batches.filter(b => b.course_name === attCourse) : batches).map(b => (
                      <option key={b.id} value={b.id}>{b.name} ({b.code})</option>
                    ))}
                  </select>
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Attendance Date</label>
                  <input 
                    type="date" 
                    className="form-input" 
                    value={attendanceDate} 
                    onChange={(e) => setAttendanceDate(e.target.value)} 
                  />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Attendance Status</label>
                  <select 
                    className="form-select" 
                    value={attStatusFilter} 
                    onChange={(e) => { setAttStatusFilter(e.target.value); setAttendancePage(1); }}
                  >
                    <option value="All">All Statuses</option>
                    <option value="Present">Present</option>
                    <option value="Absent">Absent</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Content Body */}
            {!attBatchId ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '300px', background: 'white', borderRadius: '18px', border: '1px solid var(--border-light)', padding: '40px', boxShadow: 'var(--shadow-sm)' }}>
                <div style={{ width: '80px', height: '80px', background: 'var(--primary-light)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px', color: 'var(--primary-color)' }}>
                  <Users size={40} />
                </div>
                <h4 style={{ fontSize: '18px', fontWeight: '800', margin: '0 0 6px' }}>Select Batch</h4>
                <p style={{ fontSize: '14px', color: 'var(--text-secondary)', margin: 0 }}>Select a batch to start marking attendance.</p>
              </div>
            ) : attendanceRecords.length === 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '300px', background: 'white', borderRadius: '18px', border: '1px solid var(--border-light)', padding: '40px', boxShadow: 'var(--shadow-sm)' }}>
                <div style={{ width: '80px', height: '80px', background: 'var(--primary-light)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px', color: 'var(--primary-color)' }}>
                  <Users size={40} />
                </div>
                <h4 style={{ fontSize: '18px', fontWeight: '800', margin: '0 0 6px' }}>No Students</h4>
                <p style={{ fontSize: '14px', color: 'var(--text-secondary)', margin: 0 }}>No students assigned to this batch.</p>
              </div>
            ) : (() => {
              const totalStudentsCount = attendanceRecords.length;
              const presentCount = attendanceRecords.filter(r => r.status === 'Present').length;
              const absentCount = attendanceRecords.filter(r => r.status === 'Absent').length;
              const attendancePercentage = totalStudentsCount > 0 ? Math.round((presentCount / totalStudentsCount) * 100) : 100;

              const filteredRecords = attendanceRecords.filter(r => {
                const query = attSearchQuery.toLowerCase();
                const matchesSearch = !query || 
                  (r.student_name || '').toLowerCase().includes(query) ||
                  (r.rollNumber || '').toLowerCase().includes(query) ||
                  (r.phone || '').toLowerCase().includes(query);
                const matchesStatus = attStatusFilter === 'All' || r.status === attStatusFilter;
                return matchesSearch && matchesStatus;
              });

              const attLimit = 10;
              const attTotalPages = Math.ceil(filteredRecords.length / attLimit) || 1;
              const safeAttPage = Math.min(attendancePage, attTotalPages);
              const paginatedAttRecords = filteredRecords.slice((safeAttPage - 1) * attLimit, safeAttPage * attLimit);

              return (
                <div>
                  {/* Summary Cards */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '24px' }}>
                    <div style={{ background: 'white', borderRadius: '18px', padding: '20px', boxShadow: 'var(--shadow-sm)', border: '1px solid var(--border-light)' }}>
                      <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '6px' }}>Total Students</div>
                      <div style={{ fontSize: '28px', fontWeight: '800', color: 'var(--text-primary)' }}>{totalStudentsCount}</div>
                    </div>
                    <div style={{ background: 'white', borderRadius: '18px', padding: '20px', boxShadow: 'var(--shadow-sm)', border: '1px solid var(--border-light)' }}>
                      <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--success-color)', textTransform: 'uppercase', marginBottom: '6px' }}>Present</div>
                      <div style={{ fontSize: '28px', fontWeight: '800', color: 'var(--success-color)' }}>{presentCount}</div>
                    </div>
                    <div style={{ background: 'white', borderRadius: '18px', padding: '20px', boxShadow: 'var(--shadow-sm)', border: '1px solid var(--border-light)' }}>
                      <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--danger-color)', textTransform: 'uppercase', marginBottom: '6px' }}>Absent</div>
                      <div style={{ fontSize: '28px', fontWeight: '800', color: 'var(--danger-color)' }}>{absentCount}</div>
                    </div>
                    <div style={{ background: 'white', borderRadius: '18px', padding: '20px', boxShadow: 'var(--shadow-sm)', border: '1px solid var(--border-light)' }}>
                      <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--primary-color)', textTransform: 'uppercase', marginBottom: '6px' }}>Attendance Rate</div>
                      <div style={{ fontSize: '28px', fontWeight: '800', color: 'var(--primary-color)' }}>{attendancePercentage}%</div>
                    </div>
                  </div>

                  {/* Attendance Table Panel */}
                  <div className="dashboard-card-section">
                    <div className="section-header-premium" style={{ marginBottom: '18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                      <h3 className="section-title-premium" style={{ margin: 0 }}>Attendance Sheet Register</h3>
                      <div className="action-buttons-group" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        <button type="button" className="btn btn-outline" style={{ padding: '8px 16px', fontSize: '13px' }} onClick={() => setAttendanceRecords(prev => prev.map(r => ({ ...r, status: 'Present' })))}>Mark All Present</button>
                        <button type="button" className="btn btn-outline" style={{ padding: '8px 16px', fontSize: '13px' }} onClick={() => setAttendanceRecords(prev => prev.map(r => ({ ...r, status: 'Absent' })))}>Mark All Absent</button>
                        <button type="button" className="btn btn-primary" style={{ padding: '8px 16px', fontSize: '13px' }} onClick={saveAttendanceSheet}>Save Attendance</button>
                        <ExportDropdown
                           onExportCSV={exportAttendanceCSV}
                           onExportExcel={exportAttendanceSheetToExcel}
                           onExportPDF={exportAttendanceSheetToPDF}
                         />
                      </div>
                    </div>

                    <div className="table-container-premium">
                      <table className="table-premium">
                        <thead>
                          <tr>
                            <th>Profile</th>
                            <th>Student Name</th>
                            <th>Student ID</th>
                            <th>Mobile</th>
                            <th>Course</th>
                            <th>Batch</th>
                            <th>Attendance</th>
                          </tr>
                        </thead>
                        <tbody>
                          {paginatedAttRecords.map(r => (
                            <tr key={r.student_id}>
                              <td>
                                <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'var(--primary-light)', color: 'var(--primary-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', fontSize: '13px' }}>
                                  {(r.student_name || 'S').split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                                </div>
                              </td>
                              <td>{r.student_name}</td>
                              <td><strong>{r.rollNumber}</strong></td>
                              <td>{r.phone || 'N/A'}</td>
                              <td>{r.course}</td>
                              <td>{r.batch_name}</td>
                              <td>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                  <button 
                                    type="button"
                                    className={`btn ${r.status === 'Present' ? 'btn-primary' : 'btn-outline'}`}
                                    style={{ 
                                      padding: '6px 14px', 
                                      fontSize: '12px', 
                                      borderRadius: '20px',
                                      borderColor: r.status === 'Present' ? '#10B981' : '#E5E7EB',
                                      backgroundColor: r.status === 'Present' ? '#10B981' : 'transparent',
                                      color: r.status === 'Present' ? 'white' : '#4B5563'
                                    }}
                                    onClick={() => handleStatusChange(r.student_id, 'Present')}
                                  >
                                    Present
                                  </button>
                                  <button 
                                    type="button"
                                    className={`btn ${r.status === 'Absent' ? 'btn-danger' : 'btn-outline'}`}
                                    style={{ 
                                      padding: '6px 14px', 
                                      fontSize: '12px', 
                                      borderRadius: '20px',
                                      borderColor: r.status === 'Absent' ? '#EF4444' : '#E5E7EB',
                                      backgroundColor: r.status === 'Absent' ? '#EF4444' : 'transparent',
                                      color: r.status === 'Absent' ? 'white' : '#4B5563'
                                    }}
                                    onClick={() => handleStatusChange(r.student_id, 'Absent')}
                                  >
                                    Absent
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Pagination */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '20px', borderTop: '1px solid var(--border-light)', paddingTop: '15px' }}>
                      <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                        Viewing page <strong>{safeAttPage}</strong> of {attTotalPages}
                      </span>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button type="button" className="btn btn-outline" style={{ padding: '6px 12px', fontSize: '12px', height: '32px' }} disabled={safeAttPage === 1} onClick={() => setAttendancePage(prev => Math.max(prev - 1, 1))}>
                          Prev
                        </button>
                        <button type="button" className="btn btn-outline" style={{ padding: '6px 12px', fontSize: '12px', height: '32px' }} disabled={safeAttPage === attTotalPages} onClick={() => setAttendancePage(prev => Math.min(prev + 1, attTotalPages))}>
                          Next
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Attendance History Section */}
            <div className="dashboard-card-section" style={{ marginTop: '30px' }}>
              <h3 className="section-title-premium" style={{ marginBottom: '18px' }}>Attendance History Logs</h3>
              <div className="table-container-premium">
                <table className="table-premium">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Batch</th>
                      <th>Present Count</th>
                      <th>Absent Count</th>
                      <th>Attendance Rate</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {attSheetsHistory.length === 0 ? (
                      <tr>
                        <td colSpan="6" style={{ textAlign: 'center', padding: '30px', color: 'var(--text-secondary)' }}>
                          No attendance logs history found.
                        </td>
                      </tr>
                    ) : (
                      attSheetsHistory.map((sheet, idx) => (
                        <tr key={sheet.id || idx}>
                          <td><strong>{sheet.date}</strong></td>
                          <td>{sheet.batch_name}</td>
                          <td style={{ color: 'var(--success-color)', fontWeight: '600' }}>{sheet.present_count ?? 0} students</td>
                          <td style={{ color: 'var(--danger-color)', fontWeight: '600' }}>{sheet.absent_count ?? 0} students</td>
                          <td style={{ color: 'var(--primary-color)', fontWeight: '700' }}>{sheet.attendance_percentage ?? 100}%</td>
                          <td>
                            <div style={{ display: 'flex', gap: '8px' }}>
                              <button 
                                type="button" 
                                className="btn btn-outline" 
                                style={{ padding: '6px 12px', fontSize: '12px' }}
                                onClick={() => {
                                  setViewingHistoryRecord(sheet);
                                }}
                              >
                                View Logs
                              </button>
                              <button 
                                type="button" 
                                className="btn btn-outline" 
                                style={{ padding: '6px 12px', fontSize: '12px' }}
                                onClick={() => handleEditHistoryRecord(sheet)}
                              >
                                Edit
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Attendance View Detail Modal */}
            {viewingHistoryRecord && (
              <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
                <div style={{ background: 'white', borderRadius: '20px', padding: '24px', width: '100%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto', boxShadow: 'var(--shadow-lg)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid var(--border-light)', paddingBottom: '12px' }}>
                    <h4 style={{ margin: 0, fontSize: '18px', fontWeight: '800' }}>Attendance Logs Detail</h4>
                    <button type="button" className="btn btn-outline" style={{ padding: '4px 8px', fontSize: '12px' }} onClick={() => setViewingHistoryRecord(null)}>Close</button>
                  </div>
                  
                  <div style={{ marginBottom: '16px', fontSize: '14px', color: 'var(--text-secondary)' }}>
                    <p style={{ margin: '4px 0' }}><strong>Batch Name:</strong> {viewingHistoryRecord.batch_name}</p>
                    <p style={{ margin: '4px 0' }}><strong>Course:</strong> {viewingHistoryRecord.course_name}</p>
                    <p style={{ margin: '4px 0' }}><strong>Date:</strong> {viewingHistoryRecord.date}</p>
                    <p style={{ margin: '4px 0' }}><strong>Attendance Rate:</strong> {viewingHistoryRecord.attendance_percentage}%</p>
                  </div>

                  <div className="table-container-premium" style={{ border: '1px solid var(--border-light)', borderRadius: '12px' }}>
                    <table className="table-premium" style={{ fontSize: '13px' }}>
                      <thead>
                        <tr>
                          <th>Roll No.</th>
                          <th>Student Name</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(viewingHistoryRecord.records || []).map((rec, idx) => (
                          <tr key={rec.student_id || idx}>
                            <td>{rec.rollNumber}</td>
                            <td>{rec.student_name}</td>
                            <td>
                              <span className={`badge-status ${rec.status === 'Present' ? 'paid' : 'unpaid'}`} style={{ textTransform: 'capitalize' }}>
                                {rec.status}
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

                {/* Video Source Type */}
                <div className="form-group">
                  <label className="form-label">Video Source</label>
                  <div style={{ display: 'flex', gap: '16px', marginTop: '6px', marginBottom: '8px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer' }}>
                      <input type="radio" name="videoSourceType" value="link" checked={videoSourceType === 'link'} onChange={() => setVideoSourceType('link')} />
                      Google Drive Link / External Link
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer' }}>
                      <input type="radio" name="videoSourceType" value="upload" checked={videoSourceType === 'upload'} onChange={() => setVideoSourceType('upload')} />
                      Upload Video File
                    </label>
                  </div>

                  {videoSourceType === 'link' ? (
                    <input id="recVideoUrl" type="url" className="form-input" value={recVideoUrl} onChange={(e) => setRecVideoUrl(e.target.value)} placeholder="https://youtube.com/watch?v=... or Drive link" />
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <input 
                        type="file" 
                        accept="video/*" 
                        className="form-input" 
                        onChange={async (e) => {
                          const file = e.target.files[0];
                          if (!file) return;
                          setUploadingVideo(true);
                          const res = await handleFileUpload(file);
                          setUploadingVideo(false);
                          if (res && res.url) {
                            setRecVideoUrl(res.url);
                          }
                        }} 
                      />
                      {uploadingVideo && <span style={{ fontSize: 12, color: 'var(--primary-color)' }}>Uploading video file... Please wait.</span>}
                      {recVideoUrl && !uploadingVideo && (
                        <span style={{ fontSize: 11, color: '#059669', wordBreak: 'break-all' }}>✓ Video ready: {recVideoUrl}</span>
                      )}
                    </div>
                  )}
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="recThumbnailUrl">Thumbnail URL <span style={{ color: 'var(--text-secondary)', fontSize: 11 }}>(optional)</span></label>
                  <input id="recThumbnailUrl" type="url" className="form-input" value={recThumbnailUrl} onChange={(e) => setRecThumbnailUrl(e.target.value)} placeholder="https://img.youtube.com/vi/.../hqdefault.jpg" />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="recLessonDescription">Lesson Description <span style={{ color: 'var(--text-secondary)', fontSize: 11 }}>(optional)</span></label>
                  <textarea id="recLessonDescription" className="form-input" style={{ height: 60, resize: 'none' }} value={recLessonDescription} onChange={(e) => setRecLessonDescription(e.target.value)} placeholder="Brief overview of what students will learn..." />
                </div>
                
                {/* Duration */}
                <div className="form-group">
                  <label className="form-label" htmlFor="recDuration">Duration</label>
                  <input id="recDuration" type="text" className="form-input" value={recDuration} onChange={(e) => setRecDuration(e.target.value)} placeholder="e.g. 1h 15m" />
                </div>

                {/* Multiple Study Materials Manager */}
                <div className="form-group" style={{ background: 'var(--bg-secondary)', padding: 14, borderRadius: 12, border: '1px solid var(--border-color)', marginBottom: 16 }}>
                  <label className="form-label" style={{ fontWeight: 800 }}>Study Materials Manager</label>
                  
                  {/* Current Materials List */}
                  {recStudyMaterials.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12, marginTop: 6 }}>
                      {recStudyMaterials.map((mat, index) => (
                        <div key={index} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'white', padding: '6px 10px', borderRadius: 8, border: '1px solid var(--border-light)' }}>
                          <span style={{ fontSize: 12, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '80%' }}>
                            📄 {mat.name} ({mat.type?.toUpperCase()})
                          </span>
                          <button 
                            type="button" 
                            style={{ background: 'none', border: 'none', color: 'var(--danger-color)', cursor: 'pointer', fontSize: 11, fontWeight: 700 }}
                            onClick={() => setRecStudyMaterials(prev => prev.filter((_, i) => i !== index))}
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Add New Material Box */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 8, borderTop: '1px solid var(--border-light)', paddingTop: 10 }}>
                    <input 
                      type="text" 
                      placeholder="Material Name (e.g. Slide Lecture 1)" 
                      className="form-input" 
                      style={{ height: 36, fontSize: 12.5 }}
                      value={newMaterialName} 
                      onChange={(e) => setNewMaterialName(e.target.value)} 
                    />
                    
                    <div style={{ display: 'flex', gap: 12 }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: 12, cursor: 'pointer' }}>
                        <input type="radio" name="newMaterialSourceType" value="link" checked={newMaterialSourceType === 'link'} onChange={() => setNewMaterialSourceType('link')} />
                        Drive Link
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: 12, cursor: 'pointer' }}>
                        <input type="radio" name="newMaterialSourceType" value="upload" checked={newMaterialSourceType === 'upload'} onChange={() => setNewMaterialSourceType('upload')} />
                        Upload File
                      </label>
                    </div>

                    {newMaterialSourceType === 'link' ? (
                      <input 
                        type="url" 
                        placeholder="https://drive.google.com/..." 
                        className="form-input" 
                        style={{ height: 36, fontSize: 12.5 }}
                        value={newMaterialUrl} 
                        onChange={(e) => setNewMaterialUrl(e.target.value)} 
                      />
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <input 
                          type="file" 
                          accept=".pdf,.docx,.ppt,.pptx,.zip,.rar,image/*" 
                          className="form-input" 
                          style={{ fontSize: 12 }}
                          onChange={async (e) => {
                            const file = e.target.files[0];
                            if (!file) return;
                            setUploadingMaterial(true);
                            const res = await handleFileUpload(file);
                            setUploadingMaterial(false);
                            if (res && res.url) {
                              setNewMaterialUrl(res.url);
                            }
                          }} 
                        />
                        {uploadingMaterial && <span style={{ fontSize: 11, color: 'var(--primary-color)' }}>Uploading file...</span>}
                      </div>
                    )}

                    <button 
                      type="button" 
                      className="btn btn-outline" 
                      style={{ alignSelf: 'flex-start', padding: '5px 12px', fontSize: 12, height: 30 }}
                      onClick={() => {
                        if (!newMaterialName.trim() || !newMaterialUrl.trim()) {
                          showModal("Warning", "Please provide a name and a link/file for the study material.", "warning");
                          return;
                        }
                        const fileExt = newMaterialUrl.split('.').pop()?.split('?')[0]?.toLowerCase() || 'pdf';
                        setRecStudyMaterials(prev => [...prev, {
                          name: newMaterialName.trim(),
                          url: newMaterialUrl.trim(),
                          type: fileExt
                        }]);
                        setNewMaterialName('');
                        setNewMaterialUrl('');
                      }}
                    >
                      + Add Material
                    </button>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="recAssignment">Assignment Title</label>
                  <input id="recAssignment" type="text" className="form-input" value={recAssignment} onChange={(e) => setRecAssignment(e.target.value)} placeholder="e.g. Variables & Operators Lab" />
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
                      setRecTitle(''); setRecModule('Module 1 - Python Basics'); setRecVideoUrl(''); setRecThumbnailUrl(''); setRecLessonDescription(''); setRecNotesUrl(''); setRecAssignment(''); setRecVisibility('everyone'); setRecSortOrder(''); setRecDuration('1h 30m'); setVideoSourceType('link'); setRecStudyMaterials([]);
                    }}>
                      Cancel
                    </button>
                  )}
                </div>
              </form>
            </div>

            <div className="dashboard-card-section" style={{ display: 'flex', flexDirection: 'column', minHeight: '500px' }}>
              <div className="section-header-premium" style={{ marginBottom: '18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                <h4 style={{ fontSize: '15px', fontWeight: '700', margin: 0 }}>Curriculum Library ({recordedClasses.length} lessons)</h4>
                <div className="action-buttons-group">
                  <ExportDropdown
                    onExportCSV={exportRecordedClassesToCSV}
                    onExportExcel={exportRecordedClassesToExcel}
                    onExportPDF={exportRecordedClassesToPDF}
                  />
                </div>
              </div>
              
              {recordedClasses.length === 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexGrow: 1, padding: '40px 20px', textAlign: 'center' }}>
                  <div style={{ width: '80px', height: '80px', background: 'var(--primary-light)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px', color: 'var(--primary-color)' }}>
                    <PlayCircle size={40} />
                  </div>
                  <h5 style={{ fontSize: '16px', fontWeight: '800', margin: '0 0 4px' }}>No Lessons Found</h5>
                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)', maxWidth: '280px', margin: 0 }}>No lessons uploaded yet. Add your first lesson using the form.</p>
                </div>
              ) : (() => {
                const limit = 5;
                const totalRecordedPages = Math.ceil(recordedClasses.length / limit) || 1;
                const safeRecordedPage = Math.min(recordedPage, totalRecordedPages);
                const paginatedRecorded = recordedClasses.slice((safeRecordedPage - 1) * limit, safeRecordedPage * limit);

                return (
                  <div style={{ display: 'flex', flexDirection: 'column', flexGrow: 1, justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {paginatedRecorded.map((item, idx) => {
                        const globalIdx = (safeRecordedPage - 1) * limit + idx;
                        return (
                          <div key={globalIdx} style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 12, padding: '14px 16px' }}>
                            <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                              {/* Sort # badge */}
                              <div style={{ width: 36, height: 36, borderRadius: 8, background: 'var(--primary-light)', color: 'var(--primary-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 13, flexShrink: 0 }}>
                                {item.sort_order || globalIdx + 1}
                              </div>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, flexWrap: 'wrap' }}>
                                  <h5 style={{ fontWeight: '700', fontSize: '14px', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '55%' }}>{item.title}</h5>
                                  <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                                    <button 
                                      type="button"
                                      className="btn btn-outline" 
                                      style={{ padding: '4px 10px', fontSize: 11, height: '24px' }}
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
                                        setRecVisibility(item.visibility || 'everyone');
                                        setRecSortOrder(item.sort_order?.toString() || '');
                                        setSelectedBatchId(item.batch_id || '');
                                        setRecDuration(item.duration || '1h 30m');
                                        setVideoSourceType(item.video_source_type || 'link');
                                        setRecStudyMaterials(item.study_materials || []);
                                      }}
                                    >
                                      Edit
                                    </button>
                                    <button type="button" className="btn btn-danger" style={{ padding: '4px', height: '24px', backgroundColor: 'var(--danger-color)', color: 'white' }} onClick={() => deleteRecordedClass(item._id)}>
                                      <Trash2 size={12} />
                                    </button>
                                  </div>
                                </div>
                                <p style={{ fontSize: '11.5px', color: 'var(--text-secondary)', margin: '4px 0 8px' }}>
                                  {item.module} · {item.course_title} · ⏱ {item.duration || '1h 30m'}
                                </p>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' }}>
                                  <button 
                                    type="button"
                                    onClick={() => toggleRecordedClassVisibility(item._id, item.visibility)}
                                    style={{ fontSize: '10px', fontWeight: 700, padding: '2px 8px', borderRadius: 10, border: 'none', cursor: 'pointer', background: item.visibility === 'paid' ? 'rgba(239,68,68,0.08)' : 'rgba(16,185,129,0.08)', color: item.visibility === 'paid' ? '#DC2626' : '#059669' }}
                                  >
                                    {item.visibility === 'paid' ? '🔒 Paid Only' : '🌐 Everyone'} (toggle)
                                  </button>
                                  {(item.study_materials?.length > 0 || item.notes_url) && (
                                    <span style={{ fontSize: '10px', color: '#3B82F6', background: 'rgba(59,130,246,0.06)', padding: '2px 8px', borderRadius: 10 }}>
                                      📄 {item.study_materials?.length || 1} Material(s)
                                    </span>
                                  )}
                                  {item.assignment && <span style={{ fontSize: '10px', color: '#8B5CF6', background: 'rgba(139,92,246,0.06)', padding: '2px 8px', borderRadius: 10 }}>📝 Assignment</span>}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Pagination */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '20px', borderTop: '1px solid var(--border-light)', paddingTop: '15px' }}>
                      <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                        Viewing page <strong>{safeRecordedPage}</strong> of {totalRecordedPages}
                      </span>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button type="button" className="btn btn-outline" style={{ padding: '6px 12px', fontSize: '12px', height: '32px' }} disabled={safeRecordedPage === 1} onClick={() => setRecordedPage(prev => Math.max(prev - 1, 1))}>
                          Prev
                        </button>
                        <button type="button" className="btn btn-outline" style={{ padding: '6px 12px', fontSize: '12px', height: '32px' }} disabled={safeRecordedPage === totalRecordedPages} onClick={() => setRecordedPage(prev => Math.min(prev + 1, totalRecordedPages))}>
                          Next
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })()}
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

            <div className="dashboard-card-section" style={{ display: 'flex', flexDirection: 'column', minHeight: '500px' }}>
              <div className="section-header-premium" style={{ marginBottom: '18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                <h4 style={{ fontSize: '15px', fontWeight: '700', margin: 0 }}>Broadcast Logs</h4>
                <div className="action-buttons-group">
                  <ExportDropdown
                    onExportCSV={exportAnnouncementsToCSV}
                    onExportExcel={exportAnnouncementsToExcel}
                    onExportPDF={exportAnnouncementsToPDF}
                  />
                </div>
              </div>
              
              {announcements.length === 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexGrow: 1, padding: '40px 20px', textAlign: 'center' }}>
                  <div style={{ width: '80px', height: '80px', background: 'var(--primary-light)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px', color: 'var(--primary-color)' }}>
                    <Megaphone size={40} />
                  </div>
                  <h5 style={{ fontSize: '16px', fontWeight: '800', margin: '0 0 4px' }}>No Announcements</h5>
                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)', maxWidth: '280px', margin: 0 }}>No announcements broadcasted yet.</p>
                </div>
              ) : (() => {
                const limit = 5;
                const totalAnnPages = Math.ceil(announcements.length / limit) || 1;
                const safeAnnPage = Math.min(announcementsPage, totalAnnPages);
                const paginatedAnn = announcements.slice((safeAnnPage - 1) * limit, safeAnnPage * limit);

                return (
                  <div style={{ display: 'flex', flexDirection: 'column', flexGrow: 1, justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {paginatedAnn.map((item, idx) => (
                        <div key={idx} className="feed-item-premium" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '8px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                              <span className="badge-status paid" style={{ fontSize: '9px' }}>{item.priority}</span>
                              {item.is_pinned && <span style={{ fontSize: '10px', color: 'var(--primary-color)', fontWeight: '700' }}>📌 Pinned</span>}
                            </div>
                            <div style={{ display: 'flex', gap: '4px' }}>
                              <button type="button" className="btn btn-outline" style={{ padding: '6px', height: '28px' }} onClick={() => handleEditAnnClick(item)}>
                                <Pencil size={12} />
                              </button>
                              <button type="button" className="btn btn-danger" style={{ padding: '6px', height: '28px', backgroundColor: 'var(--danger-color)', color: 'white' }} onClick={() => deleteAnnouncement(item._id)}>
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

                    {/* Pagination */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '20px', borderTop: '1px solid var(--border-light)', paddingTop: '15px' }}>
                      <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                        Viewing page <strong>{safeAnnPage}</strong> of {totalAnnPages}
                      </span>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button type="button" className="btn btn-outline" style={{ padding: '6px 12px', fontSize: '12px', height: '32px' }} disabled={safeAnnPage === 1} onClick={() => setAnnouncementsPage(prev => Math.max(prev - 1, 1))}>
                          Prev
                        </button>
                        <button type="button" className="btn btn-outline" style={{ padding: '6px 12px', fontSize: '12px', height: '32px' }} disabled={safeAnnPage === totalAnnPages} onClick={() => setAnnouncementsPage(prev => Math.min(prev + 1, totalAnnPages))}>
                          Next
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        )}

        {/* Fees Management Tab */}
        {activeTab === 'fees-management' && (
          <div className="dashboard-card-section">
            <div className="section-header-premium" style={{ marginBottom: '18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
              <h3 className="section-title-premium" style={{ margin: 0 }}>Student Financial Ledger</h3>
              <div className="action-buttons-group">
                <ExportDropdown
                  onExportCSV={exportFeesToCSV}
                  onExportExcel={exportFeesToExcel}
                  onExportPDF={exportFeesToPDF}
                />
              </div>
            </div>
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

            {/* Pagination */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '20px', borderTop: '1px solid var(--border-light)', paddingTop: '15px' }}>
              <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                Viewing page <strong>{feesPage}</strong> of {totalPages}
              </span>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button type="button" className="btn btn-outline" style={{ padding: '6px 12px', fontSize: '12px', height: '32px' }} disabled={feesPage === 1} onClick={() => setFeesPage(prev => Math.max(prev - 1, 1))}>
                  Prev
                </button>
                <button type="button" className="btn btn-outline" style={{ padding: '6px 12px', fontSize: '12px', height: '32px' }} disabled={feesPage === totalPages} onClick={() => setFeesPage(prev => Math.min(prev + 1, totalPages))}>
                  Next
                </button>
              </div>
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

            <div className="dashboard-card-section" style={{ display: 'flex', flexDirection: 'column', minHeight: '500px' }}>
              <div className="section-header-premium" style={{ marginBottom: '18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                <h4 style={{ fontSize: '15px', fontWeight: '700', margin: 0 }}>Activity Logs History</h4>
                <div className="action-buttons-group">
                  <ExportDropdown
                    onExportCSV={exportActivityToCSV}
                    onExportExcel={exportActivityToExcel}
                    onExportPDF={exportActivityToPDF}
                  />
                </div>
              </div>
              
              {activityLogs.length === 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexGrow: 1, padding: '40px 20px', textAlign: 'center' }}>
                  <div style={{ width: '80px', height: '80px', background: 'var(--primary-light)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px', color: 'var(--primary-color)' }}>
                    <Trophy size={40} />
                  </div>
                  <h5 style={{ fontSize: '16px', fontWeight: '800', margin: '0 0 4px' }}>No Activity Logs</h5>
                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)', maxWidth: '280px', margin: 0 }}>No activity points awarded yet.</p>
                </div>
              ) : (() => {
                const limit = 5;
                const totalActivityPages = Math.ceil(activityLogs.length / limit) || 1;
                const safeActivityPage = Math.min(activityPage, totalActivityPages);
                const paginatedActivity = activityLogs.slice((safeActivityPage - 1) * limit, safeActivityPage * limit);

                return (
                  <div style={{ display: 'flex', flexDirection: 'column', flexGrow: 1, justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {paginatedActivity.map((log) => (
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

                    {/* Pagination */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '20px', borderTop: '1px solid var(--border-light)', paddingTop: '15px' }}>
                      <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                        Viewing page <strong>{safeActivityPage}</strong> of {totalActivityPages}
                      </span>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button type="button" className="btn btn-outline" style={{ padding: '6px 12px', fontSize: '12px', height: '32px' }} disabled={safeActivityPage === 1} onClick={() => setActivityPage(prev => Math.max(prev - 1, 1))}>
                          Prev
                        </button>
                        <button type="button" className="btn btn-outline" style={{ padding: '6px 12px', fontSize: '12px', height: '32px' }} disabled={safeActivityPage === totalActivityPages} onClick={() => setActivityPage(prev => Math.min(prev + 1, totalActivityPages))}>
                          Next
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })()}
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
              <button className="modal-close-red" onClick={() => setAttendanceStudent(null)} aria-label="Close modal"><X size={18} /></button>
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
        <div className="modal-overlay" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="modal-content" style={{ width: '800px', maxWidth: '90vw', maxHeight: '85vh', overflowY: 'auto', overflowX: 'hidden', padding: '24px 32px', borderRadius: '20px', boxSizing: 'border-box' }}>
            <div className="modal-header">
              <h3 className="modal-title" style={{ fontSize: '18px', fontWeight: '800' }}>Edit Student Account</h3>
              <button className="modal-close-red" onClick={() => setEditingStudent(null)} aria-label="Close modal"><X size={18} /></button>
            </div>
            <form onSubmit={saveStudentEdit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label className="form-label" htmlFor="editName">Full Name</label>
                  <input id="editName" type="text" className="form-input" value={editName} onChange={(e) => setEditName(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="editEmail">Email Address</label>
                  <input id="editEmail" type="email" className="form-input" value={editEmail} onChange={(e) => setEditEmail(e.target.value)} required />
                </div>
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label className="form-label" htmlFor="editPhone">Mobile Number (Login ID)</label>
                  <input id="editPhone" type="text" className="form-input" value={editPhone} onChange={(e) => setEditPhone(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="editRollNumber">Roll Number / Student ID (Read Only)</label>
                  <input id="editRollNumber" type="text" className="form-input" value={editRollNumber} readOnly style={{ cursor: 'default', background: 'var(--surface-alt)', opacity: 0.9 }} required />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label className="form-label" htmlFor="editCourse">Course Name</label>
                  <select id="editCourse" className="form-select" value={editCourse} onChange={(e) => setEditCourse(e.target.value)}>
                    <option value="Fullstack Engineering">Fullstack Engineering</option>
                    <option value="UI/UX Design">UI/UX Design</option>
                    <option value="Data Science">Data Science</option>
                    <option value="Mobile App Development">Mobile App Development</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="editBatch">Assign Batch</label>
                  <select id="editBatch" className="form-select" value={editBatchId} onChange={(e) => setEditBatchId(e.target.value)}>
                    <option value="">-- No Batch --</option>
                    {batches.map(b => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="editProfilePic">Profile Photo URL (Optional)</label>
                <input id="editProfilePic" type="text" className="form-input" placeholder="e.g. https://domain.com/photo.jpg" value={editProfilePic} onChange={(e) => setEditProfilePic(e.target.value)} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label className="form-label" htmlFor="editCollege">College</label>
                  <input id="editCollege" type="text" className="form-input" value={editCollege} onChange={(e) => setEditCollege(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="editCompany">Company (Optional)</label>
                  <input id="editCompany" type="text" className="form-input" placeholder="Current employer" value={editCompany} onChange={(e) => setEditCompany(e.target.value)} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label className="form-label" htmlFor="editLocation">Current Location</label>
                  <input id="editLocation" type="text" className="form-input" placeholder="e.g. Bangalore, India" value={editLocation} onChange={(e) => setEditLocation(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="editAddress">Permanent Address</label>
                  <input id="editAddress" type="text" className="form-input" placeholder="Full residential address" value={editAddress} onChange={(e) => setEditAddress(e.target.value)} required />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label className="form-label" htmlFor="editFeesStatus">Fee Ledger Status</label>
                  <select id="editFeesStatus" className="form-select" value={editFeesStatus} onChange={(e) => setEditFeesStatus(e.target.value)}>
                    <option value="Pending">Pending</option>
                    <option value="Paid">Paid</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="editAccountStatus">Account Status</label>
                  <select id="editAccountStatus" className="form-select" value={editAccountStatus} onChange={(e) => setEditAccountStatus(e.target.value)}>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <button type="submit" className="btn btn-primary btn-block" style={{ height: '42px', marginTop: '10px' }}>Commit Changes</button>
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
              <button className="modal-close-red" onClick={() => setEditingFeesStudent(null)} aria-label="Close modal"><X size={18} /></button>
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
              <button className="modal-close-red" onClick={() => setEditingLiveClass(null)} aria-label="Close modal"><X size={18} /></button>
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
              <button className="modal-close-red" onClick={() => setEditingAnnouncement(null)} aria-label="Close modal"><X size={18} /></button>
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
      {/* Create Student Modal */}
      {showCreateModal && (
        <div className="modal-overlay" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="modal-content" style={{ maxWidth: '700px', height: 'fit-content', maxHeight: '85vh', overflowY: 'auto', padding: '24px', borderRadius: '20px' }}>
            <div className="modal-header">
              <h3 className="modal-title" style={{ fontSize: '16px', fontWeight: '800' }}>Create Student Account</h3>
              <button className="modal-close-red" onClick={() => setShowCreateModal(false)} aria-label="Close modal"><X size={18} /></button>
            </div>
            <form onSubmit={handleCreateStudentSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '16px' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" htmlFor="createName" style={{ fontSize: '12.5px', fontWeight: '700', color: 'var(--text-secondary)', marginBottom: '6px', display: 'block' }}>Student Name *</label>
                  <input id="createName" type="text" className="form-input" placeholder="e.g. John Doe" value={createName} onChange={(e) => setCreateName(e.target.value)} required style={{ height: '48px', borderRadius: '10px' }} />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" htmlFor="createEmail" style={{ fontSize: '12.5px', fontWeight: '700', color: 'var(--text-secondary)', marginBottom: '6px', display: 'block' }}>Email Address *</label>
                  <input id="createEmail" type="email" className="form-input" placeholder="john.doe@example.com" value={createEmail} onChange={(e) => setCreateEmail(e.target.value)} required style={{ height: '48px', borderRadius: '10px' }} />
                </div>
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '16px' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" htmlFor="createPhone" style={{ fontSize: '12.5px', fontWeight: '700', color: 'var(--text-secondary)', marginBottom: '6px', display: 'block' }}>Mobile Number *</label>
                  <input id="createPhone" type="text" className="form-input" placeholder="e.g. 9876543210" value={createPhone} onChange={(e) => setCreatePhone(e.target.value)} required style={{ height: '48px', borderRadius: '10px' }} />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" htmlFor="createTempPassword" style={{ fontSize: '12.5px', fontWeight: '700', color: 'var(--text-secondary)', marginBottom: '6px', display: 'block' }}>Temporary Password *</label>
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <input id="createTempPassword" type="text" className="form-input" value={createTempPassword} readOnly required style={{ width: 'calc(100% - 60px)', height: '48px', borderRadius: '10px', fontFamily: 'monospace', letterSpacing: '0.5px', background: 'var(--surface-alt)', cursor: 'default', flexGrow: 1 }} />
                    <button type="button" className="btn btn-outline" style={{ width: '48px', height: '48px', borderRadius: '10px', marginLeft: '12px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }} onClick={() => setCreateTempPassword(generateRandomPassword())} title="Regenerate Password">
                      <RefreshCw size={15} />
                    </button>
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" htmlFor="createCourse" style={{ fontSize: '12.5px', fontWeight: '700', color: 'var(--text-secondary)', marginBottom: '6px', display: 'block' }}>Course *</label>
                  <select id="createCourse" className="form-select" value={createCourse} onChange={(e) => setCreateCourse(e.target.value)} required style={{ height: '48px', borderRadius: '10px' }}>
                    <option value="Fullstack Engineering">Fullstack Engineering</option>
                    <option value="UI/UX Design">UI/UX Design</option>
                    <option value="Data Science">Data Science</option>
                    <option value="Mobile App Development">Mobile App Development</option>
                  </select>
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" htmlFor="createBatch" style={{ fontSize: '12.5px', fontWeight: '700', color: 'var(--text-secondary)', marginBottom: '6px', display: 'block' }}>Batch *</label>
                  <select id="createBatch" className="form-select" value={createBatchId} onChange={(e) => setCreateBatchId(e.target.value)} required style={{ height: '48px', borderRadius: '10px' }}>
                    <option value="">-- Select Batch --</option>
                    {batches.map(b => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <button type="submit" className="btn btn-primary btn-block" style={{ height: '50px', borderRadius: '12px', fontWeight: '700', fontSize: '14.5px', marginTop: '20px' }}>Create Student</button>
            </form>
          </div>
        </div>
      )}

      {/* Created Credentials Modal */}
      {createdCredentials && (
        <div className="modal-overlay" style={{ zIndex: 1100 }}>
          <div className="modal-content" style={{ maxWidth: '420px', textAlign: 'center', padding: '30px' }}>
            <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'rgba(16,185,129,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', color: '#10B981' }}>
              <CheckCircle size={32} />
            </div>
            <h3 style={{ fontSize: '18px', fontWeight: '800', margin: '0 0 8px' }}>Student Created Successfully</h3>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5, margin: '0 0 20px' }}>
              Account credentials have been generated. Copy or share them below.
            </p>
            <div style={{ background: 'var(--surface-alt)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '16px', textAlign: 'left', marginBottom: '20px' }}>
              <div style={{ marginBottom: '12px' }}>
                <span style={{ fontSize: '10.5px', textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: 700, display: 'block', marginBottom: '2px' }}>Student ID</span>
                <strong style={{ fontSize: '14px', color: 'var(--text-primary)' }}>{createdCredentials.username}</strong>
              </div>
              <div>
                <span style={{ fontSize: '10.5px', textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: 700, display: 'block', marginBottom: '2px' }}>Temporary Password</span>
                <strong style={{ fontSize: '14px', color: 'var(--text-primary)', fontFamily: 'monospace' }}>{createdCredentials.password}</strong>
              </div>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button className="btn btn-outline" style={{ height: '40px', justifyContent: 'center', display: 'flex', alignItems: 'center', gap: '8px' }} onClick={() => {
                navigator.clipboard.writeText(`Student ID: ${createdCredentials.username}\nTemporary Password: ${createdCredentials.password}`);
                showModal("Copied", "Credentials copied to clipboard!", "success");
              }}>
                📋 Copy Credentials
              </button>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <button className="btn btn-outline" style={{ height: '40px', justifyContent: 'center', display: 'flex', alignItems: 'center', gap: '8px' }} onClick={() => {
                  const body = encodeURIComponent(`Hello ${createdCredentials.name},\n\nYour account on Levlox Student Portal has been created.\n\nStudent ID: ${createdCredentials.username}\nTemporary Password: ${createdCredentials.password}\n\nPlease login and change your password.\n\nPortal: http://localhost:5173/login`);
                  window.open(`mailto:${createdCredentials.email}?subject=Your Levlox Portal Credentials&body=${body}`, '_blank');
                }}>
                  ✉ Send Email
                </button>
                <button className="btn btn-outline" style={{ height: '40px', justifyContent: 'center', display: 'flex', alignItems: 'center', gap: '8px' }} onClick={() => {
                  const text = encodeURIComponent(`Hello ${createdCredentials.name},\nYour student account is created.\nStudent ID: ${createdCredentials.username}\nTemporary Password: ${createdCredentials.password}\nPlease login at http://localhost:5173/login and change your password.`);
                  const cleanPhone = createdCredentials.phone.replace(/[^0-9]/g, '');
                  const link = `https://wa.me/${cleanPhone.length === 10 ? '91' + cleanPhone : cleanPhone}?text=${text}`;
                  window.open(link, '_blank');
                }}>
                  📱 Send WhatsApp
                </button>
              </div>

              <button className="btn btn-primary" style={{ height: '40px', marginTop: '4px' }} onClick={() => setCreatedCredentials(null)}>
                ✓ Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reset Password Credentials Modal */}
      {resetCredentials && (
        <div className="modal-overlay" style={{ zIndex: 1100 }}>
          <div className="modal-content" style={{ maxWidth: '400px', textAlign: 'center', padding: '30px' }}>
            <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'rgba(108,60,240,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', color: 'var(--primary-color)' }}>
              <RefreshCw size={28} />
            </div>
            <h3 style={{ fontSize: '18px', fontWeight: '800', margin: '0 0 8px' }}>Temporary Password Generated</h3>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5, margin: '0 0 24px' }}>
              The student's password has been reset. Share this temporary password. They will be forced to change it on their next login.
            </p>
            <div style={{ background: 'var(--surface-alt)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '16px', textAlign: 'center', marginBottom: '24px' }}>
              <span style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: 700, display: 'block', marginBottom: '4px' }}>New Temporary Password</span>
              <strong style={{ fontSize: '18px', color: 'var(--text-primary)', fontFamily: 'monospace', letterSpacing: '0.5px' }}>{resetCredentials.password}</strong>
            </div>
            <button className="btn btn-primary btn-block" style={{ height: '40px' }} onClick={() => {
              navigator.clipboard.writeText(resetCredentials.password);
              showModal("Copied", "Temporary password copied to clipboard!", "success");
              setResetCredentials(null);
            }}>
              Copy & Close
            </button>
          </div>
        </div>
      )}

      {/* View Student Details Modal */}
      {showDetailsModal && selectedStudentDetails && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '700px', padding: '28px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="modal-header">
              <h3 className="modal-title" style={{ fontSize: '18px', fontWeight: '800' }}>Student Academic & Personal Profile</h3>
              <button className="modal-close-red" onClick={() => { setShowDetailsModal(false); setSelectedStudentDetails(null); }} aria-label="Close modal"><X size={18} /></button>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '24px', alignItems: 'start' }}>
              {/* Left Column: Profile Card */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', background: 'var(--surface-alt)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '20px' }}>
                <div style={{ width: '90px', height: '90px', borderRadius: '50%', overflow: 'hidden', background: 'var(--primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '3px solid white', boxShadow: 'var(--shadow-card)', marginBottom: '12px' }}>
                  {selectedStudentDetails.profile_pic && selectedStudentDetails.profile_pic.trim() !== '' ? (
                    <img src={selectedStudentDetails.profile_pic} alt={selectedStudentDetails.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <span style={{ fontSize: '32px', fontWeight: 'bold', color: 'var(--primary-color)' }}>{selectedStudentDetails.name?.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}</span>
                  )}
                </div>
                <h4 style={{ fontSize: '16px', fontWeight: '800', margin: '0 0 4px', color: 'var(--text-primary)' }}>{selectedStudentDetails.name}</h4>
                <code style={{ fontSize: '11.5px', color: 'var(--text-secondary)', display: 'block', marginBottom: '14px' }}>{selectedStudentDetails.rollNumber}</code>
                
                <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '10px', borderTop: '1px solid var(--border-color)', paddingTop: '14px', textAlign: 'left' }}>
                  <div>
                    <span style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: 700, display: 'block' }}>Attendance</span>
                    <strong style={{ fontSize: '13px', color: 'var(--primary-color)' }}>{selectedStudentDetails.attendance}% Rate</strong>
                  </div>
                  <div>
                    <span style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: 700, display: 'block' }}>Fee Status</span>
                    <span className={`badge-status-fixed ${selectedStudentDetails.feesStatus === 'Paid' ? 'paid' : 'unpaid'}`} style={{ fontSize: '10.5px', marginTop: '3px', display: 'inline-flex' }}>
                      {selectedStudentDetails.feesStatus || 'Pending'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Right Column: Profile Details */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div>
                  <h4 style={{ fontSize: '13px', textTransform: 'uppercase', color: 'var(--primary-color)', fontWeight: 800, margin: '0 0 10px', borderBottom: '1px solid var(--border-light)', paddingBottom: '4px' }}>Academic & Personal Details</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600 }}>Student ID / Roll No</span>
                      <p style={{ margin: '2px 0 0', fontSize: '13px', fontWeight: 700 }}>{selectedStudentDetails.rollNumber}</p>
                    </div>
                    <div>
                      <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600 }}>Admission Date</span>
                      <p style={{ margin: '2px 0 0', fontSize: '13px', fontWeight: 600 }}>{selectedStudentDetails.join_date || 'N/A'}</p>
                    </div>
                    <div>
                      <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600 }}>Email Address</span>
                      <p style={{ margin: '2px 0 0', fontSize: '13px', fontWeight: 600, wordBreak: 'break-all' }}>{selectedStudentDetails.email}</p>
                    </div>
                    <div>
                      <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600 }}>Mobile Number</span>
                      <p style={{ margin: '2px 0 0', fontSize: '13px', fontWeight: 600 }}>{selectedStudentDetails.phone || 'None'}</p>
                    </div>
                    <div>
                      <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600 }}>Course Enrolled</span>
                      <p style={{ margin: '2px 0 0', fontSize: '13px', fontWeight: 600 }}>{selectedStudentDetails.course}</p>
                    </div>
                    <div>
                      <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600 }}>Assigned Batch</span>
                      <p style={{ margin: '2px 0 0', fontSize: '13px', fontWeight: 600 }}>{selectedStudentDetails.batch_name || 'Not Assigned'}</p>
                    </div>
                    <div>
                      <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600 }}>College</span>
                      <p style={{ margin: '2px 0 0', fontSize: '13px', fontWeight: 600 }}>{selectedStudentDetails.college || 'Levlox Academy'}</p>
                    </div>
                    <div>
                      <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600 }}>Company</span>
                      <p style={{ margin: '2px 0 0', fontSize: '13px', fontWeight: 600 }}>{selectedStudentDetails.company || 'N/A'}</p>
                    </div>
                    <div>
                      <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600 }}>Current Location</span>
                      <p style={{ margin: '2px 0 0', fontSize: '13px', fontWeight: 600 }}>{selectedStudentDetails.current_location || 'N/A'}</p>
                    </div>
                    <div>
                      <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600 }}>Permanent Address</span>
                      <p style={{ margin: '2px 0 0', fontSize: '13px', fontWeight: 600 }}>{selectedStudentDetails.permanent_address || 'N/A'}</p>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 style={{ fontSize: '13px', textTransform: 'uppercase', color: 'var(--primary-color)', fontWeight: 800, margin: '0 0 10px', borderBottom: '1px solid var(--border-light)', paddingBottom: '4px' }}>Recorded Lessons Progress</h4>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ flex: 1, height: '8px', background: 'var(--border-color)', borderRadius: '4px', overflow: 'hidden' }}>
                      <div style={{ width: `${selectedStudentDetails.progress?.percentage || 0}%`, height: '100%', background: 'var(--primary-color)', borderRadius: '4px' }} />
                    </div>
                    <span style={{ fontSize: '13px', fontWeight: 700 }}>{selectedStudentDetails.progress?.percentage || 0}% ({selectedStudentDetails.progress?.completed}/{selectedStudentDetails.progress?.total})</span>
                  </div>
                </div>

                <div>
                  <h4 style={{ fontSize: '13px', textTransform: 'uppercase', color: 'var(--primary-color)', fontWeight: 800, margin: '0 0 10px', borderBottom: '1px solid var(--border-light)', paddingBottom: '4px' }}>Recent Portal Activity</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '150px', overflowY: 'auto' }}>
                    {selectedStudentDetails.recent_activities?.length === 0 ? (
                      <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0 }}>No recent activities found.</p>
                    ) : (
                      selectedStudentDetails.recent_activities?.map((act, index) => (
                        <div key={index} style={{ padding: '8px', background: 'var(--surface-alt)', borderRadius: '8px', border: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <span style={{ fontSize: '9px', textTransform: 'uppercase', color: 'var(--primary-color)', fontWeight: 800, display: 'block' }}>{act.type}</span>
                            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>{act.title}</span>
                          </div>
                          <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>{act.date}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
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

      {/* Custom Delete Confirmation Modal */}
      {studentToDelete && (
        <div 
          className="confirm-modal-overlay" 
          onClick={() => setStudentToDelete(null)}
        >
          <div 
            className="confirm-modal-card" 
            onClick={(e) => e.stopPropagation()}
          >
            <div className="confirm-modal-icon">
              <TriangleAlert size={28} />
            </div>
            <h3 className="confirm-modal-title">Delete Student</h3>
            <p className="confirm-modal-text">
              Are you sure you want to delete this student?<br />
              This action cannot be undone.
            </p>
            <div className="confirm-modal-actions">
              <button 
                type="button"
                className="confirm-modal-btn btn-cancel" 
                onClick={() => setStudentToDelete(null)}
              >
                Cancel
              </button>
              <button 
                type="button"
                className="confirm-modal-btn btn-delete" 
                onClick={executeDeleteStudent}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
