import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  User, Mail, Phone, GraduationCap, MapPin, Building2, Briefcase,
  CheckCircle, Calendar, Award, BookOpen, Percent, Users, UserCheck,
  ChevronLeft, FileText, Clock, AlertCircle, Video, PlayCircle, Megaphone,
  CreditCard, ShieldCheck, DollarSign
} from 'lucide-react';
import {
  getStudent,
  getAttendanceForStudent,
  getPaymentsForStudent,
  getDocuments,
  classifyFirestoreError,
  formatCurrency,
  getStudentFeeDetails
} from '../services/firebaseService';
import { where, limit } from 'firebase/firestore';

const StudentDetailsPage = () => {
  const { studentId } = useParams();
  const navigate = useNavigate();

  // Fetch Student document
  const {
    data: student,
    isLoading: studentLoading,
    error: studentError
  } = useQuery({
    queryKey: ['adminStudentDetails', studentId],
    queryFn: () => getStudent(studentId),
    enabled: !!studentId,
  });

  // Fetch Attendance records for student
  const { data: attendanceRecords = [] } = useQuery({
    queryKey: ['studentAttendance', studentId],
    queryFn: () => getAttendanceForStudent(studentId),
    enabled: !!studentId,
  });

  // Fetch Payments for student
  const { data: paymentRecords = [] } = useQuery({
    queryKey: ['studentPayments', studentId],
    queryFn: () => getPaymentsForStudent(studentId),
    enabled: !!studentId,
  });

  // Fetch Activity Scores for student
  const { data: activityLogs = [] } = useQuery({
    queryKey: ['studentActivityScores', studentId],
    queryFn: () => getDocuments('activityScores', [where('studentId', '==', studentId), limit(50)]).catch(() => []),
    enabled: !!studentId,
  });

  // Calculate attendance summary from real records or student fields
  const attendanceStats = React.useMemo(() => {
    if (attendanceRecords.length > 0) {
      const present = attendanceRecords.filter(r => (r.status || '').toLowerCase() === 'present').length;
      const absent = attendanceRecords.filter(r => (r.status || '').toLowerCase() === 'absent').length;
      const total = attendanceRecords.length;
      const pct = total > 0 ? Math.round((present / total) * 100) : 0;
      return { present, absent, total, pct };
    }
    const pct = typeof student?.attendance?.percentage === 'number'
      ? student.attendance.percentage
      : (typeof student?.attendance === 'number' ? student.attendance : 0);
    const present = student?.attendance?.present || (pct > 0 ? Math.round((pct / 100) * 40) : 0);
    const absent = student?.attendance?.absent || 0;
    return { present, absent, total: present + absent, pct };
  }, [attendanceRecords, student]);

  if (studentLoading) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-secondary)' }}>
        <p style={{ fontWeight: 600 }}>Loading student details profile...</p>
      </div>
    );
  }

  if (studentError || !student) {
    return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        <div style={{ background: '#FEF2F2', border: '1px solid #FCA5A5', color: '#991B1B', borderRadius: 16, padding: 32, maxWidth: 500, margin: '0 auto' }}>
          <AlertCircle size={40} style={{ marginBottom: 12 }} />
          <h3 style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 800 }}>Student Not Found</h3>
          <p style={{ margin: '0 0 20px', fontSize: 13.5 }}>
            {studentError ? classifyFirestoreError(studentError).message : `No student found with ID: ${studentId}`}
          </p>
          <button className="btn btn-primary" onClick={() => navigate('/admin')}>
            Back to Roster
          </button>
        </div>
      </div>
    );
  }

  const profilePhoto = student.profilePhotoUrl || student.profile_pic || '';
  const fullName = student.name || 'Unnamed Student';
  const rollNo = student.rollNumber || student.student_id || studentId;
  const course = student.course || 'Fullstack Engineering';
  const batchName = student.batch_name || 'Not Assigned';
  const feeInfo = getStudentFeeDetails(student);
  const feesStatus = feeInfo.isPaid ? 'Paid' : (student.feesStatus || 'Pending Payment');
  const accountStatus = student.status || 'active';
  const totalFee = feeInfo.total;
  const paidFee = feeInfo.paid;
  const remainingFee = feeInfo.remaining;

  return (
    <div style={{ padding: '4px 0' }} className="animate-fade-in">
      {/* Back Button & Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <button
          onClick={() => navigate(-1)}
          style={{
            background: '#FFF',
            border: '1.5px solid var(--border-color)',
            borderRadius: 12,
            padding: '8px 14px',
            fontSize: 13,
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            color: 'var(--text-primary)'
          }}
        >
          <ChevronLeft size={16} /> Back
        </button>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>Student Profile & Record</h2>
          <p style={{ margin: 0, fontSize: 13, color: 'var(--text-secondary)' }}>ID: {rollNo}</p>
        </div>
      </div>

      {/* Main Profile Header Card */}
      <div style={{
        background: '#FFF',
        border: '1.5px solid var(--border-color)',
        borderRadius: 20,
        padding: 24,
        boxShadow: 'var(--shadow-card)',
        marginBottom: 24,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 20
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <div style={{
            width: 80,
            height: 80,
            borderRadius: '50%',
            overflow: 'hidden',
            background: 'var(--primary-light)',
            border: '3px solid white',
            boxShadow: 'var(--shadow-card)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            {profilePhoto ? (
              <img src={profilePhoto} alt={fullName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <div style={{
                width: '100%', height: '100%',
                background: 'linear-gradient(135deg, var(--primary-color) 0%, #4c22bc 100%)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 30, fontWeight: 800, color: '#fff'
              }}>
                {(fullName || 'S')[0].toUpperCase()}
              </div>
            )}
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <h3 style={{ fontSize: 20, fontWeight: 800, margin: 0 }}>{fullName}</h3>
              <span style={{
                fontSize: 11, fontWeight: 800, padding: '3px 10px', borderRadius: 20, textTransform: 'capitalize',
                background: accountStatus === 'active' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                color: accountStatus === 'active' ? '#10B981' : '#EF4444'
              }}>
                {accountStatus}
              </span>
            </div>
            <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text-secondary)' }}>
              {course} • {batchName}
            </p>
            <div style={{ display: 'flex', gap: 16, marginTop: 8, fontSize: 12.5, color: 'var(--text-secondary)' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <Mail size={13} color="var(--primary-color)" /> {student.email || 'No Email'}
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <Phone size={13} color="var(--primary-color)" /> {student.phone || 'No Mobile'}
              </span>
            </div>
          </div>
        </div>

        {/* Right Quick Badges */}
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <div style={{ background: 'var(--surface-alt)', padding: '12px 18px', borderRadius: 14, textAlign: 'center', border: '1px solid var(--border-color)' }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', display: 'block', uppercase: true }}>FEE STATUS</span>
            <span style={{ fontSize: 13, fontWeight: 800, color: feesStatus === 'Paid' ? '#10B981' : '#F59E0B' }}>{feesStatus}</span>
          </div>
          <div style={{ background: 'var(--surface-alt)', padding: '12px 18px', borderRadius: 14, textAlign: 'center', border: '1px solid var(--border-color)' }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', display: 'block', uppercase: true }}>ATTENDANCE</span>
            <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--primary-color)' }}>{attendanceStats.pct}%</span>
          </div>
        </div>
      </div>

      {/* Grid Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 24 }}>
        
        {/* LEFT COLUMN */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          
          {/* ACADEMIC DETAILS */}
          <div style={{ background: '#FFF', border: '1.5px solid var(--border-color)', borderRadius: 20, padding: 24, boxShadow: 'var(--shadow-card)' }}>
            <h3 style={{ fontSize: 16, fontWeight: 800, margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
              <GraduationCap size={18} color="var(--primary-color)" /> Academic Details
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div style={{ background: 'var(--surface-alt)', padding: 14, borderRadius: 12, border: '1px solid var(--border-color)' }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)' }}>Enrolled Course</span>
                <p style={{ margin: '4px 0 0', fontSize: 14, fontWeight: 800 }}>{course}</p>
              </div>
              <div style={{ background: 'var(--surface-alt)', padding: 14, borderRadius: 12, border: '1px solid var(--border-color)' }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)' }}>Assigned Batch</span>
                <p style={{ margin: '4px 0 0', fontSize: 14, fontWeight: 800 }}>{batchName}</p>
              </div>
              <div style={{ background: 'var(--surface-alt)', padding: 14, borderRadius: 12, border: '1px solid var(--border-color)' }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)' }}>Institution / College</span>
                <p style={{ margin: '4px 0 0', fontSize: 13.5, fontWeight: 700 }}>{student.college || 'Levlox Technical Institute'}</p>
              </div>
              <div style={{ background: 'var(--surface-alt)', padding: 14, borderRadius: 12, border: '1px solid var(--border-color)' }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)' }}>Enrollment Date</span>
                <p style={{ margin: '4px 0 0', fontSize: 13.5, fontWeight: 700 }}>{student.join_date || student.enrollmentDate || 'Standard Entry'}</p>
              </div>
            </div>
          </div>

          {/* PERSONAL DETAILS */}
          <div style={{ background: '#FFF', border: '1.5px solid var(--border-color)', borderRadius: 20, padding: 24, boxShadow: 'var(--shadow-card)' }}>
            <h3 style={{ fontSize: 16, fontWeight: 800, margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
              <User size={18} color="var(--primary-color)" /> Personal & Address Information
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', background: 'var(--surface-alt)', borderRadius: 10 }}>
                <span style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 600 }}>Date of Birth</span>
                <span style={{ fontSize: 13, fontWeight: 700 }}>{student.dob || student.date_of_birth || 'Not Specified'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', background: 'var(--surface-alt)', borderRadius: 10 }}>
                <span style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 600 }}>Gender</span>
                <span style={{ fontSize: 13, fontWeight: 700 }}>{student.gender || 'Not Specified'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', background: 'var(--surface-alt)', borderRadius: 10 }}>
                <span style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 600 }}>Current Location</span>
                <span style={{ fontSize: 13, fontWeight: 700 }}>{student.current_location || 'Not Specified'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', background: 'var(--surface-alt)', borderRadius: 10 }}>
                <span style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 600 }}>Permanent Address</span>
                <span style={{ fontSize: 13, fontWeight: 700 }}>{student.permanent_address || 'Not Specified'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', background: 'var(--surface-alt)', borderRadius: 10 }}>
                <span style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 600 }}>Guardian / Parent Contact</span>
                <span style={{ fontSize: 13, fontWeight: 700 }}>{student.guardian_phone || student.parent_phone || 'Not Specified'}</span>
              </div>
            </div>
          </div>

          {/* ATTENDANCE SUMMARY */}
          <div style={{ background: '#FFF', border: '1.5px solid var(--border-color)', borderRadius: 20, padding: 24, boxShadow: 'var(--shadow-card)' }}>
            <h3 style={{ fontSize: 16, fontWeight: 800, margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Calendar size={18} color="var(--primary-color)" /> Attendance Summary
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
              <div style={{ background: 'rgba(16,185,129,0.08)', padding: 14, borderRadius: 12, textAlign: 'center', border: '1px solid rgba(16,185,129,0.2)' }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#10B981' }}>Present Sessions</span>
                <p style={{ margin: '4px 0 0', fontSize: 20, fontWeight: 800, color: '#10B981' }}>{attendanceStats.present}</p>
              </div>
              <div style={{ background: 'rgba(239,68,68,0.08)', padding: 14, borderRadius: 12, textAlign: 'center', border: '1px solid rgba(239,68,68,0.2)' }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#EF4444' }}>Absent Sessions</span>
                <p style={{ margin: '4px 0 0', fontSize: 20, fontWeight: 800, color: '#EF4444' }}>{attendanceStats.absent}</p>
              </div>
              <div style={{ background: 'var(--primary-light)', padding: 14, borderRadius: 12, textAlign: 'center', border: '1px solid var(--primary-border)' }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--primary-color)' }}>Attendance Rate</span>
                <p style={{ margin: '4px 0 0', fontSize: 20, fontWeight: 800, color: 'var(--primary-color)' }}>{attendanceStats.pct}%</p>
              </div>
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          
          {/* FEES & FINANCIALS */}
          <div style={{ background: '#FFF', border: '1.5px solid var(--border-color)', borderRadius: 20, padding: 24, boxShadow: 'var(--shadow-card)' }}>
            <h3 style={{ fontSize: 16, fontWeight: 800, margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
              <CreditCard size={18} color="var(--primary-color)" /> Fee & Payment Details
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Total Fee:</span>
                <span style={{ fontSize: 14, fontWeight: 800 }}>{formatCurrency(totalFee)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Paid Amount:</span>
                <span style={{ fontSize: 14, fontWeight: 800, color: '#10B981' }}>{formatCurrency(paidFee)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Remaining Balance:</span>
                <span style={{ fontSize: 14, fontWeight: 800, color: remainingFee > 0 ? '#F59E0B' : '#10B981' }}>
                  {formatCurrency(remainingFee)}
                </span>
              </div>
            </div>

            {/* Payment history list */}
            {paymentRecords.length > 0 && (
              <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: 14 }}>
                <h4 style={{ fontSize: 13, fontWeight: 800, margin: '0 0 10px', color: 'var(--text-secondary)' }}>Payment Log</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {paymentRecords.map((p) => (
                    <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '8px 10px', background: 'var(--surface-alt)', borderRadius: 8 }}>
                      <span>{p.date || 'Payment'}</span>
                      <span style={{ fontWeight: 700, color: '#10B981' }}>+ ₹{p.amount || 0}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ACTIVITY & PERFORMANCE */}
          <div style={{ background: '#FFF', border: '1.5px solid var(--border-color)', borderRadius: 20, padding: 24, boxShadow: 'var(--shadow-card)' }}>
            <h3 style={{ fontSize: 16, fontWeight: 800, margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Award size={18} color="var(--primary-color)" /> Activity & Performance
            </h3>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 14, background: 'var(--primary-light)', borderRadius: 12, border: '1px solid var(--primary-border)', marginBottom: 16 }}>
              <div>
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--primary-color)' }}>Activity Points</span>
                <p style={{ margin: '2px 0 0', fontSize: 22, fontWeight: 800, color: 'var(--primary-color)' }}>
                  {student.activityPoints || 0} Pts
                </p>
              </div>
              <Award size={32} color="var(--primary-color)" />
            </div>

            {activityLogs.length > 0 && (
              <div>
                <h4 style={{ fontSize: 12.5, fontWeight: 800, margin: '0 0 10px', color: 'var(--text-secondary)' }}>Recent Activity Awards</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {activityLogs.slice(0, 5).map((log) => (
                    <div key={log.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '8px 10px', background: 'var(--surface-alt)', borderRadius: 8 }}>
                      <span>{log.activityType || 'Participation'}</span>
                      <span style={{ fontWeight: 700, color: 'var(--primary-color)' }}>+{log.points} pts</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  );
};

export default StudentDetailsPage;
