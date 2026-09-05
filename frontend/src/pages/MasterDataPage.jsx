import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  BookOpen, Users, Plus, Pencil, Trash2, CheckCircle, 
  X, Search, Award, Shield, AlertCircle, Mail, RotateCcw, Save, Eye, Info
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
  getEmailTemplates,
  updateEmailTemplates,
  DEFAULT_STUDENT_WELCOME_TEMPLATE,
  interpolateEmailTemplate,
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

  // ─── EMAIL TEMPLATE STATE & QUERY ───────────────────────────────────────
  const { data: emailTemplatesData, isLoading: templatesLoading } = useQuery({
    queryKey: ['masterEmailTemplates'],
    queryFn: getEmailTemplates,
  });

  const [templateSubject, setTemplateSubject] = useState('');
  const [templateBody, setTemplateBody] = useState('');
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [showResetConfirmModal, setShowResetConfirmModal] = useState(false);

  useEffect(() => {
    if (emailTemplatesData?.studentWelcome) {
      setTemplateSubject(emailTemplatesData.studentWelcome.subject || DEFAULT_STUDENT_WELCOME_TEMPLATE.subject);
      setTemplateBody(emailTemplatesData.studentWelcome.body || DEFAULT_STUDENT_WELCOME_TEMPLATE.body);
    }
  }, [emailTemplatesData]);

  const handleSaveTemplate = async (e) => {
    if (e) e.preventDefault();
    setSavingTemplate(true);
    try {
      await updateEmailTemplates({
        studentWelcome: {
          subject: templateSubject,
          body: templateBody
        }
      });
      queryClient.invalidateQueries(['masterEmailTemplates']);
      showToast('Student Welcome Email template saved successfully ✓');
    } catch (err) {
      console.error(err);
      alert(classifyFirestoreError(err).message);
    } finally {
      setSavingTemplate(false);
    }
  };

  const handleResetTemplateToDefault = async () => {
    setSavingTemplate(true);
    setShowResetConfirmModal(false);
    try {
      setTemplateSubject(DEFAULT_STUDENT_WELCOME_TEMPLATE.subject);
      setTemplateBody(DEFAULT_STUDENT_WELCOME_TEMPLATE.body);
      await updateEmailTemplates({
        studentWelcome: {
          subject: DEFAULT_STUDENT_WELCOME_TEMPLATE.subject,
          body: DEFAULT_STUDENT_WELCOME_TEMPLATE.body
        }
      });
      queryClient.invalidateQueries(['masterEmailTemplates']);
      showToast('Template reset to default Levlox configuration ✓');
    } catch (err) {
      console.error(err);
      alert(classifyFirestoreError(err).message);
    } finally {
      setSavingTemplate(false);
    }
  };

  const insertPlaceholder = (ph) => {
    setTemplateBody(prev => prev + ph);
  };

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
      showToast('Course removed ✓');
      queryClient.invalidateQueries(['masterCourses']);
      queryClient.invalidateQueries(['adminDashboardAll']);
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

  // Sample data for previewing email interpolation
  const samplePreviewData = {
    studentName: 'Demo Student',
    studentId: 'LVX000001',
    email: 'demo@example.com',
    temporaryPassword: '********',
    course: 'Python-FSD',
    batch: 'Full Stack'
  };

  const interpolatedPreviewSubject = interpolateEmailTemplate(templateSubject, samplePreviewData);
  const interpolatedPreviewBody = interpolateEmailTemplate(templateBody, samplePreviewData);

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
          <h2 style={{ fontSize: 24, fontWeight: 800, margin: 0 }}>Master Data & Reusable Configuration</h2>
          <p style={{ margin: '4px 0 0', fontSize: 13.5, color: 'var(--text-secondary)' }}>
            Manage master course definitions, email templates, and system configurations shared across the portal.
          </p>
        </div>
        <div>
          {activeTab === 'courses' && (
            <button className="btn btn-primary" onClick={() => openCourseModal()}>
              <Plus size={16} /> Add Master Course
            </button>
          )}
        </div>
      </div>

      {/* Sub Tabs */}
      <div style={{ display: 'flex', gap: 12, borderBottom: '1px solid var(--border-color)', marginBottom: 24, flexWrap: 'wrap' }}>
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
          <BookOpen size={16} /> Master Courses ({courses.length})
        </button>

        <button
          onClick={() => setActiveTab('email-templates')}
          style={{
            padding: '12px 20px',
            fontSize: 14,
            fontWeight: 700,
            color: activeTab === 'email-templates' ? 'var(--primary-color)' : 'var(--text-secondary)',
            borderBottom: activeTab === 'email-templates' ? '3px solid var(--primary-color)' : '3px solid transparent',
            background: 'none',
            borderTop: 'none', borderLeft: 'none', borderRight: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 8
          }}
        >
          <Mail size={16} /> Email Templates
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

      {/* COURSES TAB */}
      {activeTab === 'courses' && (
        <div>
          <div style={{ marginBottom: 20, maxWidth: 360 }}>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                className="form-input"
                placeholder="Search courses..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{ paddingLeft: 38 }}
              />
              <Search size={16} color="var(--text-secondary)" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }} />
            </div>
          </div>

          {coursesLoading ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-secondary)' }}>Loading courses...</div>
          ) : filteredCourses.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', background: '#FFF', border: '1px dashed var(--border-color)', borderRadius: 16 }}>
              <p style={{ margin: 0, fontWeight: 600, color: 'var(--text-secondary)' }}>No master courses found.</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 20 }}>
              {filteredCourses.map(course => (
                <div key={course.id} className="clickable-card-hover" style={{ background: '#FFF', border: '1.5px solid var(--border-color)', borderRadius: 16, padding: 20, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                      <span style={{ fontSize: 11, fontWeight: 800, background: 'rgba(99, 102, 241, 0.1)', color: 'var(--primary-color)', padding: '4px 10px', borderRadius: 6 }}>
                        {course.code || 'COURSE'}
                      </span>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="btn-icon" onClick={() => openCourseModal(course)} title="Edit Course">
                          <Pencil size={15} color="var(--text-secondary)" />
                        </button>
                        <button className="btn-icon" onClick={() => handleDeleteCourse(course.id)} title="Delete Course">
                          <Trash2 size={15} color="#EF4444" />
                        </button>
                      </div>
                    </div>
                    <h3 style={{ fontSize: 17, fontWeight: 800, margin: '0 0 8px', color: '#121118' }}>
                      {course.title || course.name}
                    </h3>
                    <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '0 0 16px', lineHeight: 1.5 }}>
                      {course.description || 'No description provided.'}
                    </p>
                  </div>
                  <div style={{ paddingTop: 12, borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>
                    <span>Duration: {course.duration || 'Flexible'}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* EMAIL TEMPLATES TAB */}
      {activeTab === 'email-templates' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 24 }}>
          {/* EDITOR CARD */}
          <div style={{ background: '#FFF', border: '1.5px solid var(--border-color)', borderRadius: 20, padding: 24, boxShadow: 'var(--shadow-card)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, borderBottom: '1px solid var(--border-color)', paddingBottom: 12 }}>
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 800, margin: 0, color: '#121118', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Mail size={18} color="var(--primary-color)" /> Student Welcome Email
                </h3>
                <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--text-secondary)' }}>
                  Configures the email template sent when Admin creates a new student.
                </p>
              </div>
              <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 8px', background: 'rgba(16,185,129,0.1)', color: '#10B981', borderRadius: 6 }}>
                Active Template
              </span>
            </div>

            <form onSubmit={handleSaveTemplate} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              {/* Subject */}
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontWeight: 700 }}>Subject</label>
                <input
                  type="text"
                  className="form-input"
                  value={templateSubject}
                  onChange={e => setTemplateSubject(e.target.value)}
                  placeholder="Enter email subject line..."
                  required
                />
              </div>

              {/* Message Body */}
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontWeight: 700 }}>Message Body</label>
                <textarea
                  className="form-input"
                  value={templateBody}
                  onChange={e => setTemplateBody(e.target.value)}
                  placeholder="Enter email message body..."
                  style={{ minHeight: 220, fontFamily: 'monospace', fontSize: 13, lineHeight: 1.5 }}
                  required
                />
              </div>

              {/* Available Variables */}
              <div style={{ background: 'var(--surface-alt)', border: '1px solid var(--border-color)', borderRadius: 12, padding: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8, fontSize: 12, fontWeight: 800, color: 'var(--primary-color)' }}>
                  <Info size={14} /> Available Variables
                </div>
                <p style={{ margin: '0 0 10px', fontSize: 11.5, color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                  Click any placeholder variable below to append it into your message template:
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {[
                    '{{studentName}}',
                    '{{studentId}}',
                    '{{email}}',
                    '{{temporaryPassword}}',
                    '{{course}}',
                    '{{batch}}'
                  ].map(ph => (
                    <button
                      key={ph}
                      type="button"
                      onClick={() => insertPlaceholder(ph)}
                      style={{
                        background: '#FFF',
                        border: '1px solid var(--primary-color)',
                        color: 'var(--primary-color)',
                        fontSize: 11.5,
                        fontWeight: 700,
                        padding: '4px 8px',
                        borderRadius: 6,
                        cursor: 'pointer',
                        transition: 'all 0.15s'
                      }}
                      title="Click to insert"
                    >
                      + {ph}
                    </button>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: 12, marginTop: 4 }}>
                <button
                  type="submit"
                  disabled={savingTemplate}
                  className="btn btn-primary"
                  style={{ flex: 1, height: 42, justifyContent: 'center' }}
                >
                  <Save size={16} /> {savingTemplate ? 'Saving...' : 'Save Template'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowResetConfirmModal(true)}
                  disabled={savingTemplate}
                  className="btn btn-outline"
                  style={{ height: 42, justifyContent: 'center' }}
                >
                  <RotateCcw size={15} /> Reset to Default
                </button>
              </div>
            </form>
          </div>

          {/* LIVE PREVIEW CARD */}
          <div style={{ background: '#FFF', border: '1.5px solid var(--border-color)', borderRadius: 20, padding: 24, boxShadow: 'var(--shadow-card)', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, borderBottom: '1px solid var(--border-color)', paddingBottom: 12 }}>
              <h3 style={{ fontSize: 16, fontWeight: 800, margin: 0, color: '#121118', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Eye size={18} color="var(--primary-color)" /> Live Email Preview
              </h3>
              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)' }}>
                Sample Student Data
              </span>
            </div>

            {/* Subject Preview */}
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: 4 }}>
                Subject Preview
              </div>
              <div style={{ padding: '10px 14px', background: 'var(--surface-alt)', border: '1px solid var(--border-color)', borderRadius: 10, fontSize: 13.5, fontWeight: 700, color: '#121118' }}>
                {interpolatedPreviewSubject || <span style={{ color: '#9CA3AF' }}>(Empty Subject)</span>}
              </div>
            </div>

            {/* Body Preview */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: 4 }}>
                Message Body Preview
              </div>
              <div style={{
                flex: 1,
                padding: 16,
                background: '#F9FAFB',
                border: '1px solid var(--border-color)',
                borderRadius: 12,
                fontSize: 13,
                lineHeight: 1.6,
                whiteSpace: 'pre-wrap',
                color: '#374151',
                fontFamily: 'system-ui, -apple-system, sans-serif'
              }}>
                {interpolatedPreviewBody || <span style={{ color: '#9CA3AF' }}>(Empty Message Body)</span>}
              </div>
            </div>

            <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid var(--border-color)', fontSize: 11.5, color: 'var(--text-secondary)', fontStyle: 'italic' }}>
              🔒 Note: Passwords are automatically masked in the preview mode for privacy & security.
            </div>
          </div>
        </div>
      )}

      {/* STATUSES TAB */}
      {activeTab === 'statuses' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 24 }}>
          {/* Fee Statuses */}
          <div style={{ background: '#FFF', border: '1.5px solid var(--border-color)', borderRadius: 16, padding: 24 }}>
            <h3 style={{ fontSize: 16, fontWeight: 800, marginBottom: 16 }}>Fee Status Options</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                { label: 'Paid', bg: 'rgba(16,185,129,0.1)', color: '#10B981', desc: 'Student has cleared full fee obligation.' },
                { label: 'Partial Payment', bg: 'rgba(245,158,11,0.1)', color: '#F59E0B', desc: 'Student has paid installment, balance remains.' },
                { label: 'Pending Payment', bg: 'rgba(239,68,68,0.1)', color: '#EF4444', desc: 'Payment not yet received.' },
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

      {/* RESET CONFIRMATION MODAL */}
      {showResetConfirmModal && (
        <CustomModal isOpen={showResetConfirmModal} onClose={() => setShowResetConfirmModal(false)} title="Reset Email Template">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'rgba(245, 158, 11, 0.1)', border: '1px solid #F59E0B', padding: 14, borderRadius: 12, color: '#B45309' }}>
              <AlertCircle size={24} style={{ flexShrink: 0 }} />
              <p style={{ margin: 0, fontSize: 13, lineHeight: 1.4, fontWeight: 600 }}>
                Reset Student Welcome Email to the default Levlox template? Any custom modifications will be replaced.
              </p>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 10 }}>
              <button type="button" className="btn btn-outline" onClick={() => setShowResetConfirmModal(false)}>Cancel</button>
              <button type="button" className="btn btn-primary" style={{ background: '#EF4444', borderColor: '#EF4444' }} onClick={handleResetTemplateToDefault}>Confirm Reset</button>
            </div>
          </div>
        </CustomModal>
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
    </div>
  );
};

export default MasterDataPage;

