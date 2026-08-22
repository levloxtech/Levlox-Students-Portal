import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  BookOpen, Users, Plus, Pencil, Trash2, CheckCircle, 
  X, Search, Award, Shield, AlertCircle
} from 'lucide-react';
import {
  getCourses,
  addCourse,
  updateCourse,
  deleteCourse,
  getTrainers,
  addTrainer,
  updateTrainer,
  deleteTrainer,
  classifyFirestoreError
} from '../services/firebaseService';
import CustomModal from '../components/Modal';

const MasterDataPage = () => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('courses');

  // Search filter
  const [searchQuery, setSearchQuery] = useState('');

  // Toast / Error state
  const [toast, setToast] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  // ─── COURSES QUERY & MUTATIONS ──────────────────────────────────────────
  const { data: courses = [], isLoading: coursesLoading } = useQuery({
    queryKey: ['masterCourses'],
    queryFn: getCourses,
  });

  const [showCourseModal, setShowCourseModal] = useState(false);
  const [editingCourse, setEditingCourse] = useState(null);
  const [courseTitle, setCourseTitle] = useState('');
  const [courseCode, setCourseCode] = useState('');
  const [courseDuration, setCourseDuration] = useState('');
  const [courseDesc, setCourseDesc] = useState('');

  const openCourseModal = (course = null) => {
    setErrorMessage('');
    if (course) {
      setEditingCourse(course);
      setCourseTitle(course.title || course.name || '');
      setCourseCode(course.code || '');
      setCourseDuration(course.duration || '');
      setCourseDesc(course.description || '');
    } else {
      setEditingCourse(null);
      setCourseTitle('');
      setCourseCode('');
      setCourseDuration('');
      setCourseDesc('');
    }
    setShowCourseModal(true);
  };

  const handleSaveCourse = async (e) => {
    e.preventDefault();
    if (!courseTitle.trim()) {
      setErrorMessage('Course Title is required.');
      return;
    }
    try {
      const payload = {
        title: courseTitle.trim(),
        name: courseTitle.trim(),
        code: courseCode.trim(),
        duration: courseDuration.trim(),
        description: courseDesc.trim(),
      };
      if (editingCourse) {
        await updateCourse(editingCourse.id, payload);
        showToast('Course updated successfully ✓');
      } else {
        await addCourse(payload);
        showToast('New Course created successfully ✓');
      }
      queryClient.invalidateQueries(['masterCourses']);
      queryClient.invalidateQueries(['adminDashboardAll']);
      setShowCourseModal(false);
    } catch (err) {
      console.error(err);
      setErrorMessage(classifyFirestoreError(err).message);
    }
  };

  const handleDeleteCourse = async (courseId) => {
    if (!window.confirm('Are you sure you want to delete this course from Master Data?')) return;
    try {
      await deleteCourse(courseId);
      showToast('Course deleted ✓');
      queryClient.invalidateQueries(['masterCourses']);
      queryClient.invalidateQueries(['adminDashboardAll']);
    } catch (err) {
      console.error(err);
      alert(classifyFirestoreError(err).message);
    }
  };

  // ─── TRAINERS QUERY & MUTATIONS ─────────────────────────────────────────
  const { data: trainers = [], isLoading: trainersLoading } = useQuery({
    queryKey: ['masterTrainers'],
    queryFn: getTrainers,
  });

  const [showTrainerModal, setShowTrainerModal] = useState(false);
  const [editingTrainer, setEditingTrainer] = useState(null);
  const [trainerName, setTrainerName] = useState('');
  const [trainerEmail, setTrainerEmail] = useState('');
  const [trainerPhone, setTrainerPhone] = useState('');
  const [trainerSpecialization, setTrainerSpecialization] = useState('');
  const [trainerStatus, setTrainerStatus] = useState('Active');

  const openTrainerModal = (trainer = null) => {
    setErrorMessage('');
    if (trainer) {
      setEditingTrainer(trainer);
      setTrainerName(trainer.name || '');
      setTrainerEmail(trainer.email || '');
      setTrainerPhone(trainer.phone || '');
      setTrainerSpecialization(trainer.specialization || '');
      setTrainerStatus(trainer.status || 'Active');
    } else {
      setEditingTrainer(null);
      setTrainerName('');
      setTrainerEmail('');
      setTrainerPhone('');
      setTrainerSpecialization('');
      setTrainerStatus('Active');
    }
    setShowTrainerModal(true);
  };

  const handleSaveTrainer = async (e) => {
    e.preventDefault();
    if (!trainerName.trim()) {
      setErrorMessage('Trainer Name is required.');
      return;
    }
    try {
      const payload = {
        name: trainerName.trim(),
        email: trainerEmail.trim(),
        phone: trainerPhone.trim(),
        specialization: trainerSpecialization.trim(),
        status: trainerStatus,
      };
      if (editingTrainer) {
        await updateTrainer(editingTrainer.id, payload);
        showToast('Trainer updated successfully ✓');
      } else {
        await addTrainer(payload);
        showToast('Trainer added successfully ✓');
      }
      queryClient.invalidateQueries(['masterTrainers']);
      setShowTrainerModal(false);
    } catch (err) {
      console.error(err);
      setErrorMessage(classifyFirestoreError(err).message);
    }
  };

  const handleDeleteTrainer = async (trainerId) => {
    if (!window.confirm('Are you sure you want to delete this trainer?')) return;
    try {
      await deleteTrainer(trainerId);
      showToast('Trainer removed ✓');
      queryClient.invalidateQueries(['masterTrainers']);
    } catch (err) {
      console.error(err);
      alert(classifyFirestoreError(err).message);
    }
  };

  // Filtered lists
  const filteredCourses = courses.filter(c => {
    const q = searchQuery.toLowerCase();
    const title = (c.title || c.name || '').toLowerCase();
    const code = (c.code || '').toLowerCase();
    return title.includes(q) || code.includes(q);
  });

  const filteredTrainers = trainers.filter(t => {
    const q = searchQuery.toLowerCase();
    const name = (t.name || '').toLowerCase();
    const spec = (t.specialization || '').toLowerCase();
    return name.includes(q) || spec.includes(q);
  });

  return (
    <div style={{ padding: '4px 0' }} className="animate-fade-in">
      {/* Toast Alert */}
      {toast && (
        <div style={{
          position: 'fixed',
          top: 24,
          right: 24,
          background: '#121118',
          color: '#fff',
          borderRadius: 12,
          padding: '12px 20px',
          fontSize: 13,
          fontWeight: 600,
          zIndex: 2000,
          boxShadow: '0 16px 32px rgba(0,0,0,0.2)',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          animation: 'slideIn 0.3s ease'
        }}>
          <CheckCircle size={15} color="#10B981" /> {toast}
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h2 style={{ fontSize: 24, fontWeight: 800, margin: 0 }}>Master Data Management</h2>
          <p style={{ margin: '4px 0 0', fontSize: 13.5, color: 'var(--text-secondary)' }}>
            Manage core dropdown values (Courses, Trainers, Statuses) for the portal.
          </p>
        </div>
        <div>
          {activeTab === 'courses' && (
            <button className="btn btn-primary" onClick={() => openCourseModal()}>
              <Plus size={16} /> Add Course
            </button>
          )}
          {activeTab === 'trainers' && (
            <button className="btn btn-primary" onClick={() => openTrainerModal()}>
              <Plus size={16} /> Add Trainer
            </button>
          )}
        </div>
      </div>

      {/* Sub Tabs */}
      <div style={{ display: 'flex', gap: 12, borderBottom: '1px solid var(--border-color)', marginBottom: 24 }}>
        <button
          onClick={() => setActiveTab('courses')}
          style={{
            padding: '12px 20px',
            fontSize: 14,
            fontWeight: 700,
            color: activeTab === 'courses' ? 'var(--primary-color)' : 'var(--text-secondary)',
            borderBottom: activeTab === 'courses' ? '3px solid var(--primary-color)' : '3px solid transparent',
            background: 'none',
            borderTop: 'none', borderLeft: 'none', borderRight: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 8
          }}
        >
          <BookOpen size={16} /> Courses ({courses.length})
        </button>
        <button
          onClick={() => setActiveTab('trainers')}
          style={{
            padding: '12px 20px',
            fontSize: 14,
            fontWeight: 700,
            color: activeTab === 'trainers' ? 'var(--primary-color)' : 'var(--text-secondary)',
            borderBottom: activeTab === 'trainers' ? '3px solid var(--primary-color)' : '3px solid transparent',
            background: 'none',
            borderTop: 'none', borderLeft: 'none', borderRight: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 8
          }}
        >
          <Users size={16} /> Trainers ({trainers.length})
        </button>
        <button
          onClick={() => setActiveTab('statuses')}
          style={{
            padding: '12px 20px',
            fontSize: 14,
            fontWeight: 700,
            color: activeTab === 'statuses' ? 'var(--primary-color)' : 'var(--text-secondary)',
            borderBottom: activeTab === 'statuses' ? '3px solid var(--primary-color)' : '3px solid transparent',
            background: 'none',
            borderTop: 'none', borderLeft: 'none', borderRight: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 8
          }}
        >
          <Shield size={16} /> Fee & Account Statuses
        </button>
      </div>

      {/* Search Bar */}
      {activeTab !== 'statuses' && (
        <div style={{ marginBottom: 20 }}>
          <div className="search-bar-container" style={{ width: 320 }}>
            <Search size={16} color="var(--text-tertiary)" />
            <input
              type="text"
              className="search-bar-input"
              placeholder={`Search ${activeTab}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      )}

      {/* TAB 1: COURSES */}
      {activeTab === 'courses' && (
        <div>
          {coursesLoading ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-secondary)' }}>Loading Courses...</div>
          ) : filteredCourses.length === 0 ? (
            <div style={{ background: '#FFF', padding: 40, textAlign: 'center', borderRadius: 16, border: '1px solid var(--border-color)' }}>
              <BookOpen size={36} color="var(--text-tertiary)" style={{ marginBottom: 12 }} />
              <p style={{ fontWeight: 700, margin: 0, color: 'var(--text-secondary)' }}>No courses found in Master Data.</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 20 }}>
              {filteredCourses.map((c) => (
                <div
                  key={c.id}
                  style={{
                    background: '#FFF',
                    border: '1.5px solid var(--border-color)',
                    borderRadius: 16,
                    padding: 20,
                    boxShadow: 'var(--shadow-card)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between'
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                      <span style={{ fontSize: 11, fontWeight: 800, background: 'var(--primary-light)', color: 'var(--primary-color)', padding: '4px 10px', borderRadius: 8 }}>
                        {c.code || 'COURSE'}
                      </span>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button
                          onClick={() => openCourseModal(c)}
                          style={{ border: 'none', background: 'var(--surface-alt)', padding: 6, borderRadius: 6, cursor: 'pointer' }}
                        >
                          <Pencil size={14} color="var(--text-secondary)" />
                        </button>
                        <button
                          onClick={() => handleDeleteCourse(c.id)}
                          style={{ border: 'none', background: 'rgba(239,68,68,0.1)', padding: 6, borderRadius: 6, cursor: 'pointer' }}
                        >
                          <Trash2 size={14} color="#EF4444" />
                        </button>
                      </div>
                    </div>
                    <h3 style={{ fontSize: 16, fontWeight: 800, margin: '0 0 6px', color: 'var(--text-primary)' }}>
                      {c.title || c.name}
                    </h3>
                    <p style={{ fontSize: 12.5, color: 'var(--text-secondary)', margin: '0 0 12px', lineHeight: 1.4 }}>
                      {c.description || 'Standard institutional course curriculum.'}
                    </p>
                  </div>
                  <div style={{ borderTop: '1px solid var(--border-light)', paddingTop: 10, fontSize: 12, color: 'var(--text-tertiary)', fontWeight: 600 }}>
                    Duration: {c.duration || '6 Months'}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: TRAINERS */}
      {activeTab === 'trainers' && (
        <div>
          {trainersLoading ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-secondary)' }}>Loading Trainers...</div>
          ) : filteredTrainers.length === 0 ? (
            <div style={{ background: '#FFF', padding: 40, textAlign: 'center', borderRadius: 16, border: '1px solid var(--border-color)' }}>
              <Users size={36} color="var(--text-tertiary)" style={{ marginBottom: 12 }} />
              <p style={{ fontWeight: 700, margin: 0, color: 'var(--text-secondary)' }}>No trainers found in Master Data.</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 20 }}>
              {filteredTrainers.map((t) => (
                <div
                  key={t.id}
                  style={{
                    background: '#FFF',
                    border: '1.5px solid var(--border-color)',
                    borderRadius: 16,
                    padding: 20,
                    boxShadow: 'var(--shadow-card)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between'
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                      <span style={{
                        fontSize: 11, fontWeight: 800,
                        background: t.status === 'Active' ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.1)',
                        color: t.status === 'Active' ? '#10B981' : '#F59E0B',
                        padding: '3px 8px', borderRadius: 6
                      }}>
                        {t.status || 'Active'}
                      </span>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button
                          onClick={() => openTrainerModal(t)}
                          style={{ border: 'none', background: 'var(--surface-alt)', padding: 6, borderRadius: 6, cursor: 'pointer' }}
                        >
                          <Pencil size={14} color="var(--text-secondary)" />
                        </button>
                        <button
                          onClick={() => handleDeleteTrainer(t.id)}
                          style={{ border: 'none', background: 'rgba(239,68,68,0.1)', padding: 6, borderRadius: 6, cursor: 'pointer' }}
                        >
                          <Trash2 size={14} color="#EF4444" />
                        </button>
                      </div>
                    </div>
                    <h3 style={{ fontSize: 16, fontWeight: 800, margin: '0 0 4px', color: 'var(--text-primary)' }}>
                      {t.name}
                    </h3>
                    <p style={{ fontSize: 12.5, color: 'var(--primary-color)', fontWeight: 700, margin: '0 0 10px' }}>
                      {t.specialization || 'Lead Instructor'}
                    </p>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <span>Email: {t.email || '—'}</span>
                      <span>Phone: {t.phone || '—'}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: STATUSES & CONFIG */}
      {activeTab === 'statuses' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
          {/* Fee Statuses */}
          <div style={{ background: '#FFF', border: '1.5px solid var(--border-color)', borderRadius: 16, padding: 24 }}>
            <h3 style={{ fontSize: 16, fontWeight: 800, marginBottom: 16 }}>Fee Status Options</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                { label: 'Paid', bg: 'rgba(16,185,129,0.1)', color: '#10B981', desc: 'Student fee payment complete.' },
                { label: 'Pending Payment', bg: 'rgba(245,158,11,0.1)', color: '#F59E0B', desc: 'Payment requested/awaiting admin verification.' },
                { label: 'Partial', bg: 'rgba(59,130,246,0.1)', color: '#3B82F6', desc: 'Installment paid partially.' },
                { label: 'Overdue', bg: 'rgba(239,68,68,0.1)', color: '#EF4444', desc: 'Payment deadline crossed.' },
              ].map((s) => (
                <div key={s.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', background: 'var(--surface-alt)', borderRadius: 10 }}>
                  <div>
                    <span style={{ fontSize: 13, fontWeight: 800, color: s.color, background: s.bg, padding: '3px 10px', borderRadius: 6 }}>
                      {s.label}
                    </span>
                    <p style={{ margin: '6px 0 0', fontSize: 12, color: 'var(--text-secondary)' }}>{s.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Account Statuses */}
          <div style={{ background: '#FFF', border: '1.5px solid var(--border-color)', borderRadius: 16, padding: 24 }}>
            <h3 style={{ fontSize: 16, fontWeight: 800, marginBottom: 16 }}>Account Status Options</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                { label: 'active', bg: 'rgba(16,185,129,0.1)', color: '#10B981', desc: 'Full student portal access active.' },
                { label: 'disabled', bg: 'rgba(239,68,68,0.1)', color: '#EF4444', desc: 'Portal access suspended by admin.' },
                { label: 'pending', bg: 'rgba(245,158,11,0.1)', color: '#F59E0B', desc: 'Awaiting account setup / profile completion.' },
              ].map((s) => (
                <div key={s.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', background: 'var(--surface-alt)', borderRadius: 10 }}>
                  <div>
                    <span style={{ fontSize: 13, fontWeight: 800, color: s.color, background: s.bg, padding: '3px 10px', borderRadius: 6, textTransform: 'capitalize' }}>
                      {s.label}
                    </span>
                    <p style={{ margin: '6px 0 0', fontSize: 12, color: 'var(--text-secondary)' }}>{s.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* COURSE MODAL */}
      {showCourseModal && (
        <CustomModal isOpen={showCourseModal} onClose={() => setShowCourseModal(false)} title={editingCourse ? 'Edit Course' : 'Add New Course'}>
          <form onSubmit={handleSaveCourse} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {errorMessage && (
              <div style={{ background: '#FEF2F2', border: '1px solid #FCA5A5', color: '#991B1B', borderRadius: 8, padding: 10, fontSize: 12.5, fontWeight: 600 }}>
                {errorMessage}
              </div>
            )}
            <div>
              <label className="form-label">Course Title *</label>
              <input type="text" className="form-input" value={courseTitle} onChange={(e) => setCourseTitle(e.target.value)} placeholder="e.g. Fullstack Engineering" required />
            </div>
            <div>
              <label className="form-label">Course Code</label>
              <input type="text" className="form-input" value={courseCode} onChange={(e) => setCourseCode(e.target.value)} placeholder="e.g. FSD-2026" />
            </div>
            <div>
              <label className="form-label">Duration</label>
              <input type="text" className="form-input" value={courseDuration} onChange={(e) => setCourseDuration(e.target.value)} placeholder="e.g. 6 Months" />
            </div>
            <div>
              <label className="form-label">Description</label>
              <textarea className="form-input" value={courseDesc} onChange={(e) => setCourseDesc(e.target.value)} placeholder="Brief summary of course scope" style={{ minHeight: 60 }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 10 }}>
              <button type="button" className="btn btn-outline" onClick={() => setShowCourseModal(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary">Save Course</button>
            </div>
          </form>
        </CustomModal>
      )}

      {/* TRAINER MODAL */}
      {showTrainerModal && (
        <CustomModal isOpen={showTrainerModal} onClose={() => setShowTrainerModal(false)} title={editingTrainer ? 'Edit Trainer' : 'Add New Trainer'}>
          <form onSubmit={handleSaveTrainer} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {errorMessage && (
              <div style={{ background: '#FEF2F2', border: '1px solid #FCA5A5', color: '#991B1B', borderRadius: 8, padding: 10, fontSize: 12.5, fontWeight: 600 }}>
                {errorMessage}
              </div>
            )}
            <div>
              <label className="form-label">Trainer Name *</label>
              <input type="text" className="form-input" value={trainerName} onChange={(e) => setTrainerName(e.target.value)} placeholder="e.g. Rajesh Kumar" required />
            </div>
            <div>
              <label className="form-label">Specialization</label>
              <input type="text" className="form-input" value={trainerSpecialization} onChange={(e) => setTrainerSpecialization(e.target.value)} placeholder="e.g. React & Node.js Expert" />
            </div>
            <div>
              <label className="form-label">Email</label>
              <input type="email" className="form-input" value={trainerEmail} onChange={(e) => setTrainerEmail(e.target.value)} placeholder="trainer@levlox.com" />
            </div>
            <div>
              <label className="form-label">Phone</label>
              <input type="text" className="form-input" value={trainerPhone} onChange={(e) => setTrainerPhone(e.target.value)} placeholder="+91 9876543210" />
            </div>
            <div>
              <label className="form-label">Status</label>
              <select className="form-select" value={trainerStatus} onChange={(e) => setTrainerStatus(e.target.value)}>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 10 }}>
              <button type="button" className="btn btn-outline" onClick={() => setShowTrainerModal(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary">Save Trainer</button>
            </div>
          </form>
        </CustomModal>
      )}
    </div>
  );
};

export default MasterDataPage;
