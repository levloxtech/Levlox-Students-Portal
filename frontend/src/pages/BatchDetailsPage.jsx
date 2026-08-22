import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Users, ChevronLeft, UserPlus, Trash2, Search, CheckCircle,
  Calendar, BookOpen, UserCheck, AlertCircle, Eye, RefreshCw, X
} from 'lucide-react';
import {
  getDocument,
  getStudentsByBatch,
  listStudents,
  assignStudentsToBatch,
  unassignStudentFromBatch,
  classifyFirestoreError
} from '../services/firebaseService';
import CustomModal from '../components/Modal';

const BatchDetailsPage = () => {
  const { batchId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [toast, setToast] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  // 1. Query Batch document from Firestore
  const {
    data: batch,
    isLoading: batchLoading,
    error: batchError,
    refetch: refetchBatch
  } = useQuery({
    queryKey: ['adminBatchDetails', batchId],
    queryFn: () => getDocument('batches', batchId),
    enabled: !!batchId,
  });

  // 2. Query Students in this batch
  const {
    data: batchStudents = [],
    isLoading: studentsLoading,
    refetch: refetchBatchStudents
  } = useQuery({
    queryKey: ['adminBatchStudents', batchId],
    queryFn: async () => {
      // First try resolving via getStudentsByBatch (student_ids array)
      const list = await getStudentsByBatch(batchId);
      if (list && list.length > 0) return list;
      // Fallback: list all students where batch_id === batchId
      const all = await listStudents();
      return all.filter(s => s.batch_id === batchId);
    },
    enabled: !!batchId,
  });

  // 3. Query ALL students for Assign Modal
  const { data: allStudents = [] } = useQuery({
    queryKey: ['allStudentsForAssign'],
    queryFn: () => listStudents(),
  });

  // Modal State for Assign Students
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignSearch, setAssignSearch] = useState('');
  const [selectedStudentIds, setSelectedStudentIds] = useState([]);
  const [assigning, setAssigning] = useState(false);

  const openAssignModal = () => {
    setErrorMessage('');
    setAssignSearch('');
    // Pre-select students currently in this batch
    const currentIds = (batch?.student_ids && batch.student_ids.length > 0)
      ? batch.student_ids
      : batchStudents.map(s => s.id);
    setSelectedStudentIds(currentIds);
    setShowAssignModal(true);
  };

  const handleCheckboxToggle = (studentId) => {
    setSelectedStudentIds(prev =>
      prev.includes(studentId)
        ? prev.filter(id => id !== studentId)
        : [...prev, studentId]
    );
  };

  const handleSaveAssignment = async () => {
    setAssigning(true);
    setErrorMessage('');
    try {
      await assignStudentsToBatch(batchId, selectedStudentIds);
      showToast('Batch roster updated successfully in Firestore ✓');
      queryClient.invalidateQueries(['adminBatchDetails', batchId]);
      queryClient.invalidateQueries(['adminBatchStudents', batchId]);
      queryClient.invalidateQueries(['adminBatches']);
      queryClient.invalidateQueries(['adminDashboardAll']);
      setShowAssignModal(false);
    } catch (err) {
      console.error('[BatchDetailsPage] assign failed:', err);
      setErrorMessage(classifyFirestoreError(err).message);
    } finally {
      setAssigning(false);
    }
  };

  // Unassign student action
  const handleUnassignStudent = async (studentId, studentName) => {
    if (!window.confirm(`Are you sure you want to remove "${studentName}" from this batch?`)) return;
    try {
      await unassignStudentFromBatch(batchId, studentId);
      showToast(`Removed ${studentName} from batch ✓`);
      queryClient.invalidateQueries(['adminBatchDetails', batchId]);
      queryClient.invalidateQueries(['adminBatchStudents', batchId]);
      queryClient.invalidateQueries(['adminBatches']);
      queryClient.invalidateQueries(['adminDashboardAll']);
    } catch (err) {
      console.error('[BatchDetailsPage] unassign failed:', err);
      alert(classifyFirestoreError(err).message);
    }
  };

  if (batchLoading) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-secondary)' }}>
        <p style={{ fontWeight: 600 }}>Loading batch details...</p>
      </div>
    );
  }

  if (batchError || !batch) {
    return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        <div style={{ background: '#FEF2F2', border: '1px solid #FCA5A5', color: '#991B1B', borderRadius: 16, padding: 32, maxWidth: 500, margin: '0 auto' }}>
          <AlertCircle size={40} style={{ marginBottom: 12 }} />
          <h3 style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 800 }}>Batch Not Found</h3>
          <p style={{ margin: '0 0 20px', fontSize: 13.5 }}>
            {batchError ? classifyFirestoreError(batchError).message : `No batch found with ID: ${batchId}`}
          </p>
          <button className="btn btn-primary" onClick={() => navigate('/admin')}>
            Back to Batches
          </button>
        </div>
      </div>
    );
  }

  const maxCapacity = Number(batch.max_students) || 30;
  const currentCount = batchStudents.length;

  // Filter available students for assign modal
  const filteredStudentsForAssign = allStudents.filter(s => {
    const q = assignSearch.toLowerCase();
    const name = (s.name || '').toLowerCase();
    const email = (s.email || '').toLowerCase();
    const roll = (s.rollNumber || s.id || '').toLowerCase();
    return name.includes(q) || email.includes(q) || roll.includes(q);
  });

  return (
    <div style={{ padding: '4px 0' }} className="animate-fade-in">
      {/* Toast Alert */}
      {toast && (
        <div style={{
          position: 'fixed',
          top: 24, right: 24,
          background: '#121118', color: '#fff',
          borderRadius: 12, padding: '12px 20px',
          fontSize: 13, fontWeight: 600, zIndex: 2000,
          boxShadow: '0 16px 32px rgba(0,0,0,0.2)',
          display: 'flex', alignItems: 'center', gap: 8,
          animation: 'slideIn 0.3s ease'
        }}>
          <CheckCircle size={15} color="#10B981" /> {toast}
        </div>
      )}

      {/* Back Button & Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            onClick={() => navigate('/admin')}
            style={{
              background: '#FFF', border: '1.5px solid var(--border-color)',
              borderRadius: 12, padding: '8px 14px', fontSize: 13,
              fontWeight: 700, cursor: 'pointer', display: 'flex',
              alignItems: 'center', gap: 6, color: 'var(--text-primary)'
            }}
          >
            <ChevronLeft size={16} /> Back to Batches
          </button>
          <div>
            <h2 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>{batch.name}</h2>
            <p style={{ margin: 0, fontSize: 13, color: 'var(--text-secondary)' }}>Code: {batch.code || 'BAT-001'}</p>
          </div>
        </div>

        <button className="btn btn-primary" onClick={openAssignModal}>
          <UserPlus size={16} /> Assign Students
        </button>
      </div>

      {/* BATCH INFORMATION CARD */}
      <div style={{
        background: '#FFF', border: '1.5px solid var(--border-color)',
        borderRadius: 20, padding: 24, boxShadow: 'var(--shadow-card)',
        marginBottom: 24
      }}>
        <h3 style={{ fontSize: 16, fontWeight: 800, margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
          <BookOpen size={18} color="var(--primary-color)" /> Batch Information
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
          <div style={{ background: 'var(--surface-alt)', padding: 14, borderRadius: 12, border: '1px solid var(--border-color)' }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', display: 'block' }}>COURSE</span>
            <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-primary)' }}>{batch.course_name || 'Fullstack Engineering'}</span>
          </div>

          <div style={{ background: 'var(--surface-alt)', padding: 14, borderRadius: 12, border: '1px solid var(--border-color)' }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', display: 'block' }}>TRAINER / INSTRUCTOR</span>
            <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-primary)' }}>{batch.trainer_name || 'Assigned Instructor'}</span>
          </div>

          <div style={{ background: 'var(--surface-alt)', padding: 14, borderRadius: 12, border: '1px solid var(--border-color)' }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', display: 'block' }}>BATCH STATUS</span>
            <span style={{
              fontSize: 12, fontWeight: 800, padding: '3px 8px', borderRadius: 6, display: 'inline-block', marginTop: 2,
              background: (batch.status || '').toLowerCase() === 'active' ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.1)',
              color: (batch.status || '').toLowerCase() === 'active' ? '#10B981' : '#F59E0B'
            }}>
              {batch.status || 'Active'}
            </span>
          </div>

          <div style={{ background: 'var(--surface-alt)', padding: 14, borderRadius: 12, border: '1px solid var(--border-color)' }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', display: 'block' }}>STUDENTS ENROLLED</span>
            <span style={{ fontSize: 16, fontWeight: 800, color: 'var(--primary-color)' }}>
              {currentCount} / {maxCapacity}
            </span>
          </div>

          <div style={{ background: 'var(--surface-alt)', padding: 14, borderRadius: 12, border: '1px solid var(--border-color)' }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', display: 'block' }}>TIMEFRAME</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
              {batch.start_date || 'N/A'} — {batch.end_date || 'N/A'}
            </span>
          </div>
        </div>
      </div>

      {/* STUDENTS IN THIS BATCH TABLE */}
      <div style={{
        background: '#FFF', border: '1.5px solid var(--border-color)',
        borderRadius: 20, padding: 24, boxShadow: 'var(--shadow-card)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h3 style={{ fontSize: 16, fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Users size={18} color="var(--primary-color)" /> Students Enrolled in this Batch ({batchStudents.length})
          </h3>
        </div>

        {studentsLoading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-secondary)' }}>Loading roster...</div>
        ) : batchStudents.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', background: 'var(--surface-alt)', borderRadius: 14 }}>
            <Users size={32} color="var(--text-tertiary)" style={{ marginBottom: 8 }} />
            <p style={{ margin: 0, fontWeight: 700, color: 'var(--text-secondary)' }}>No students assigned to this batch yet.</p>
            <button className="btn btn-secondary btn-sm" style={{ marginTop: 12 }} onClick={openAssignModal}>
              <UserPlus size={14} /> Assign Students Now
            </button>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13.5 }}>
              <thead>
                <tr style={{ borderBottom: '1.5px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                  <th style={{ padding: '12px 14px' }}>Student</th>
                  <th style={{ padding: '12px 14px' }}>Roll / ID</th>
                  <th style={{ padding: '12px 14px' }}>Mobile</th>
                  <th style={{ padding: '12px 14px' }}>Fee Status</th>
                  <th style={{ padding: '12px 14px' }}>Account Status</th>
                  <th style={{ padding: '12px 14px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {batchStudents.map((s) => {
                  const photo = s.profilePhotoUrl || s.profile_pic || '';
                  const sName = s.name || 'Unnamed Student';
                  return (
                    <tr key={s.id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                      <td style={{ padding: '12px 14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <div style={{
                            width: 36, height: 36, borderRadius: '50%', overflow: 'hidden',
                            background: 'var(--primary-light)', display: 'flex',
                            alignItems: 'center', justifyContent: 'center', flexShrink: 0
                          }}>
                            {photo ? (
                              <img src={photo} alt={sName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                              <span style={{ fontWeight: 800, color: 'var(--primary-color)', fontSize: 14 }}>
                                {(sName)[0].toUpperCase()}
                              </span>
                            )}
                          </div>
                          <div>
                            <Link
                              to={`/admin/students/${s.id}`}
                              style={{ fontWeight: 700, color: 'var(--text-primary)', textDecoration: 'none' }}
                            >
                              {sName}
                            </Link>
                            <span style={{ display: 'block', fontSize: 11.5, color: 'var(--text-secondary)' }}>{s.email || '—'}</span>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '12px 14px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                        {s.rollNumber || s.id}
                      </td>
                      <td style={{ padding: '12px 14px', fontWeight: 600 }}>
                        {s.phone || '—'}
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <span style={{
                          fontSize: 11, fontWeight: 800, padding: '3px 8px', borderRadius: 6,
                          background: s.feesStatus === 'Paid' ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.1)',
                          color: s.feesStatus === 'Paid' ? '#10B981' : '#F59E0B'
                        }}>
                          {s.feesStatus || 'Pending'}
                        </span>
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <span style={{
                          fontSize: 11, fontWeight: 800, padding: '3px 8px', borderRadius: 6, textTransform: 'capitalize',
                          background: s.status === 'active' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                          color: s.status === 'active' ? '#10B981' : '#EF4444'
                        }}>
                          {s.status || 'active'}
                        </span>
                      </td>
                      <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                          <button
                            onClick={() => navigate(`/admin/students/${s.id}`)}
                            title="View Details"
                            style={{ border: 'none', background: 'var(--surface-alt)', padding: 6, borderRadius: 6, cursor: 'pointer' }}
                          >
                            <Eye size={15} color="var(--primary-color)" />
                          </button>
                          <button
                            onClick={() => handleUnassignStudent(s.id, sName)}
                            title="Remove from Batch"
                            style={{ border: 'none', background: 'rgba(239,68,68,0.1)', padding: 6, borderRadius: 6, cursor: 'pointer' }}
                          >
                            <Trash2 size={15} color="#EF4444" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ASSIGN STUDENTS MODAL */}
      {showAssignModal && (
        <CustomModal isOpen={showAssignModal} onClose={() => setShowAssignModal(false)} title={`Assign Students to ${batch.name}`}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {errorMessage && (
              <div style={{ background: '#FEF2F2', border: '1px solid #FCA5A5', color: '#991B1B', borderRadius: 8, padding: 10, fontSize: 12.5, fontWeight: 600 }}>
                {errorMessage}
              </div>
            )}

            {/* Search */}
            <div className="search-bar-container" style={{ width: '100%' }}>
              <Search size={16} color="var(--text-tertiary)" />
              <input
                type="text"
                className="search-bar-input"
                placeholder="Search students by name, email, or roll..."
                value={assignSearch}
                onChange={(e) => setAssignSearch(e.target.value)}
              />
            </div>

            <p style={{ margin: 0, fontSize: 12.5, color: 'var(--text-secondary)', fontWeight: 600 }}>
              Selected: <strong style={{ color: 'var(--primary-color)' }}>{selectedStudentIds.length}</strong> / {maxCapacity} capacity
            </p>

            {/* Student list checkboxes */}
            <div style={{ maxHeight: 300, overflowY: 'auto', border: '1px solid var(--border-color)', borderRadius: 12, padding: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
              {filteredStudentsForAssign.map((st) => {
                const isSelected = selectedStudentIds.includes(st.id);
                return (
                  <label
                    key={st.id}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '8px 12px', borderRadius: 8, background: isSelected ? 'var(--primary-light)' : 'var(--surface-alt)',
                      cursor: 'pointer', border: isSelected ? '1px solid var(--primary-border)' : '1px solid transparent'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleCheckboxToggle(st.id)}
                        style={{ width: 16, height: 16, accentColor: 'var(--primary-color)' }}
                      />
                      <div>
                        <span style={{ fontWeight: 700, fontSize: 13, display: 'block' }}>{st.name}</span>
                        <span style={{ fontSize: 11.5, color: 'var(--text-secondary)' }}>
                          {st.course || 'No course'} • {st.batch_name ? `Current: ${st.batch_name}` : 'Unassigned'}
                        </span>
                      </div>
                    </div>
                  </label>
                );
              })}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 10 }}>
              <button type="button" className="btn btn-outline" onClick={() => setShowAssignModal(false)}>
                Cancel
              </button>
              <button type="button" className="btn btn-primary" onClick={handleSaveAssignment} disabled={assigning}>
                {assigning ? 'Saving to Firestore...' : 'Assign Selected'}
              </button>
            </div>
          </div>
        </CustomModal>
      )}
    </div>
  );
};

export default BatchDetailsPage;
