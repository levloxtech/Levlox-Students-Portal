import React, { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { 
  BookOpen, Users, Plus, Pencil, Trash2, CheckCircle, 
  X, Search, Award, Shield, AlertCircle, Mail, RotateCcw, Save, Eye, Info,
  Hash, Clock, Tag, Layers, CheckSquare, Settings
} from 'lucide-react';
import {
  getCourses,
  addCourse,
  updateCourse,
  deleteCourse,
  getEmailTemplates,
  updateEmailTemplates,
  DEFAULT_STUDENT_WELCOME_TEMPLATE,
  interpolateEmailTemplate,
  DEFAULT_ID_CONFIGS,
  setDocument,
  getDocument,
  classifyFirestoreError
} from '../services/firebaseService';
import CustomModal from '../components/Modal';

const MasterDataPage = () => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('id-config');

  // Toast / Error state
  const [toast, setToast] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  // ─── 1. ID CONFIGURATIONS ───────────────────────────────────────────────
  const [idConfigs, setIdConfigs] = useState(DEFAULT_ID_CONFIGS);
  const [editingEntity, setEditingEntity] = useState(null);
  const [idPrefix, setIdPrefix] = useState('');
  const [idNextNum, setIdNextNum] = useState('');
  const [idPadding, setIdPadding] = useState('');
  const [idSeparator, setIdSeparator] = useState('');
  const [savingIdConfig, setSavingIdConfig] = useState(false);

  useEffect(() => {
    const loadConfigs = async () => {
      const entities = ['student', 'trainer', 'batch', 'course'];
      const loaded = {};
      for (const ent of entities) {
        const d = await getDocument('masterData', `idConfig_${ent}`).catch(() => null);
        if (d) loaded[ent] = { ...DEFAULT_ID_CONFIGS[ent], ...d };
        else loaded[ent] = DEFAULT_ID_CONFIGS[ent];
      }
      setIdConfigs(loaded);
    };
    loadConfigs();
  }, []);

  const openIdConfigModal = (entityKey) => {
    const cfg = idConfigs[entityKey] || DEFAULT_ID_CONFIGS[entityKey];
    setEditingEntity(entityKey);
    setIdPrefix(cfg.prefix || '');
    setIdNextNum(cfg.nextNumber || '');
    setIdPadding(cfg.padding || '4');
    setIdSeparator(cfg.separator || '');
    setErrorMessage('');
  };

  const handleSaveIdConfig = async (e) => {
    e.preventDefault();
    if (!editingEntity) return;
    setSavingIdConfig(true);
    try {
      const payload = {
        prefix: idPrefix.trim().toUpperCase(),
        nextNumber: Number(idNextNum) || 1000,
        padding: Number(idPadding) || 4,
        separator: idSeparator,
      };
      await setDocument('masterData', `idConfig_${editingEntity}`, payload);
      setIdConfigs(prev => ({ ...prev, [editingEntity]: payload }));
      showToast(`${editingEntity.toUpperCase()} ID Configuration updated ✓`);
      setEditingEntity(null);
    } catch (err) {
      console.error(err);
      setErrorMessage(classifyFirestoreError(err).message);
    } finally {
      setSavingIdConfig(false);
    }
  };

  // ─── 2. COURSES ────────────────────────────────────────────────────────
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

  // ─── 10. EMAIL TEMPLATES ────────────────────────────────────────────────
  const { data: emailTemplatesData } = useQuery({
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
      showToast('Student Welcome Email template saved ✓');
    } catch (err) {
      console.error(err);
      alert(classifyFirestoreError(err).message);
    } finally {
      setSavingTemplate(false);
    }
  };

  const samplePreviewData = {
    studentName: 'Demo Student',
    studentId: 'LVX070129',
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
          position: 'fixed', top: 24, right: 24, background: '#121118', color: '#fff',
          borderRadius: 12, padding: '12px 20px', fontSize: 13, fontWeight: 600, zIndex: 2000,
          boxShadow: '0 16px 32px rgba(0,0,0,0.2)', display: 'flex', alignItems: 'center', gap: 8
        }}>
          <CheckCircle size={15} color="#10B981" /> {toast}
        </div>
      )}

      {/* Page Header */}
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 24, fontWeight: 800, margin: 0 }}>Master Data & Central Configuration</h2>
        <p style={{ margin: '4px 0 0', fontSize: 13.5, color: 'var(--text-secondary)' }}>
          Central configuration and reference data used across the Levlox Students Portal.
        </p>
      </div>

      {/* 10 Tab Navigation */}
      <div style={{ display: 'flex', gap: 8, borderBottom: '1px solid var(--border-color)', marginBottom: 24, overflowX: 'auto', paddingBottom: 4 }}>
        {[
          { key: 'id-config', label: 'ID Configuration', icon: Hash },
          { key: 'courses', label: 'Courses', icon: BookOpen },
          { key: 'student-statuses', label: 'Student Statuses', icon: Users },
          { key: 'batch-statuses', label: 'Batch Statuses', icon: Layers },
          { key: 'trainer-statuses', label: 'Trainer Statuses', icon: Award },
          { key: 'fee-statuses', label: 'Fee Statuses', icon: Shield },
          { key: 'attendance-statuses', label: 'Attendance Statuses', icon: CheckSquare },
          { key: 'announcement-types', label: 'Announcement Types', icon: Tag },
          { key: 'activity-types', label: 'Activity Score Types', icon: Award },
          { key: 'email-templates', label: 'Email Templates', icon: Mail },
        ].map(t => {
          const Icon = t.icon;
          const isActive = activeTab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              style={{
                padding: '10px 16px', fontSize: 13, fontWeight: 700,
                color: isActive ? 'var(--primary-color)' : 'var(--text-secondary)',
                borderBottom: isActive ? '3px solid var(--primary-color)' : '3px solid transparent',
                background: 'none', borderTop: 'none', borderLeft: 'none', borderRight: 'none',
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, whitespace: 'nowrap'
              }}
            >
              <Icon size={15} /> {t.label}
            </button>
          );
        })}
      </div>

      {/* ─── TAB 1: ID CONFIGURATION ────────────────────────────────────────── */}
      {activeTab === 'id-config' && (
        <div>
          <div style={{ background: '#FFF', border: '1.5px solid var(--border-color)', borderRadius: 16, padding: 24, marginBottom: 20 }}>
            <h3 style={{ fontSize: 16, fontWeight: 800, margin: '0 0 8px' }}>Automatic Entity ID Formatting</h3>
            <p style={{ margin: 0, fontSize: 13, color: 'var(--text-secondary)' }}>
              Configure automatic ID rules for Student, Trainer, Batch, and Course records. Generated atomically via Firestore transactions.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>
            {Object.entries(idConfigs).map(([entKey, cfg]) => {
              const numStr = String(cfg.nextNumber || 1000).padStart(cfg.padding || 4, '0');
              const exampleId = `${cfg.prefix || ''}${cfg.separator || ''}${numStr}`;
              return (
                <div key={entKey} style={{ background: '#FFF', border: '1.5px solid var(--border-color)', borderRadius: 16, padding: 20, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                      <span style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', background: 'rgba(108,60,240,0.1)', color: 'var(--primary-color)', padding: '4px 10px', borderRadius: 6 }}>
                        {entKey.toUpperCase()} ID
                      </span>
                      <button className="btn-icon" onClick={() => openIdConfigModal(entKey)} title="Edit Config">
                        <Pencil size={15} color="var(--text-secondary)" />
                      </button>
                    </div>
                    <h4 style={{ fontSize: 18, fontWeight: 800, margin: '0 0 6px', color: '#121118', fontFamily: 'monospace' }}>
                      {exampleId}
                    </h4>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: 4, marginTop: 10 }}>
                      <span>Prefix: <strong>{cfg.prefix || 'None'}</strong></span>
                      <span>Next Number: <strong>{cfg.nextNumber}</strong></span>
                      <span>Padding: <strong>{cfg.padding} digits</strong></span>
                      <span>Separator: <strong>{cfg.separator || '(none)'}</strong></span>
                    </div>
                  </div>
                  <button className="btn btn-outline" style={{ width: '100%', marginTop: 16, fontSize: 12 }} onClick={() => openIdConfigModal(entKey)}>
                    Configure Rule
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ─── TAB 2: COURSES ─────────────────────────────────────────────────── */}
      {activeTab === 'courses' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
            <h3 style={{ fontSize: 16, fontWeight: 800, margin: 0 }}>Master Course Definitions</h3>
            <button className="btn btn-primary" onClick={() => openCourseModal()}>
              <Plus size={16} /> Add Master Course
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 20 }}>
            {courses.map(c => (
              <div key={c.id} style={{ background: '#FFF', border: '1.5px solid var(--border-color)', borderRadius: 16, padding: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontSize: 11, fontWeight: 800, background: 'rgba(99, 102, 241, 0.1)', color: 'var(--primary-color)', padding: '4px 10px', borderRadius: 6 }}>
                    {c.code || 'CRS-0101'}
                  </span>
                  <button className="btn-icon" onClick={() => openCourseModal(c)}><Pencil size={15} /></button>
                </div>
                <h4 style={{ fontSize: 16, fontWeight: 800, margin: '0 0 6px' }}>{c.title || c.name}</h4>
                <p style={{ fontSize: 12.5, color: 'var(--text-secondary)', margin: 0 }}>{c.description || 'Institutional curriculum.'}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── TAB 3 - 9: STATUS REFERENCE TABLES ─────────────────────────────── */}
      {['student-statuses', 'batch-statuses', 'trainer-statuses', 'fee-statuses', 'attendance-statuses', 'announcement-types', 'activity-types'].includes(activeTab) && (
        <div style={{ background: '#FFF', border: '1.5px solid var(--border-color)', borderRadius: 16, padding: 24 }}>
          <h3 style={{ fontSize: 16, fontWeight: 800, marginBottom: 16, textTransform: 'capitalize' }}>
            {activeTab.replace('-', ' ')} Options & Definitions
          </h3>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 20 }}>
            Canonical reference options configured for portal operations. Used across filters, dropdowns, and business logic.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {(
              activeTab === 'student-statuses' ? [
                { code: 'active', label: 'Active', desc: 'Full student portal access active.' },
                { code: 'disabled', label: 'Disabled', desc: 'Portal access suspended by administrator.' }
              ] : activeTab === 'batch-statuses' ? [
                { code: 'Upcoming', label: 'Upcoming', desc: 'Batch scheduled to start.' },
                { code: 'Active', label: 'Active', desc: 'Batch currently running.' },
                { code: 'Completed', label: 'Completed', desc: 'Batch finished successfully.' }
              ] : activeTab === 'trainer-statuses' ? [
                { code: 'Active', label: 'Active', desc: 'Available for batch assignment.' },
                { code: 'Inactive', label: 'Inactive', desc: 'Currently not taking active batches.' }
              ] : activeTab === 'fee-statuses' ? [
                { code: 'Paid', label: 'Paid', desc: 'Full fee obligation cleared.' },
                { code: 'Pending Payment', label: 'Pending Payment', desc: 'Awaiting fee payment.' }
              ] : activeTab === 'attendance-statuses' ? [
                { code: 'Present', label: 'Present', desc: 'Attended session.' },
                { code: 'Absent', label: 'Absent', desc: 'Missed session.' }
              ] : activeTab === 'announcement-types' ? [
                { code: 'Notice', label: 'Notice', desc: 'General informational update.' },
                { code: 'Alert', label: 'Alert', desc: 'High priority alert notice.' },
                { code: 'Event', label: 'Event', desc: 'Institutional event notice.' }
              ] : [
                { code: 'ASSIGNMENT', label: 'Assignment Completed', desc: '+10 pts default bonus' },
                { code: 'ATTENDANCE', label: 'Perfect Attendance', desc: '+20 pts default bonus' },
                { code: 'QUIZ', label: 'Quiz Winner', desc: '+15 pts default bonus' },
                { code: 'PARTICIPATION', label: 'Class Participation', desc: '+5 pts default bonus' }
              ]
            ).map(opt => (
              <div key={opt.code} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: 'var(--surface-alt)', borderRadius: 10 }}>
                <div>
                  <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--primary-color)' }}>{opt.label}</span>
                  <code style={{ fontSize: 11, marginLeft: 10, color: 'var(--text-secondary)' }}>Code: {opt.code}</code>
                  <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--text-secondary)' }}>{opt.desc}</p>
                </div>
                <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 8px', background: 'rgba(16,185,129,0.1)', color: '#10B981', borderRadius: 6 }}>System Active</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── TAB 10: EMAIL TEMPLATES ────────────────────────────────────────── */}
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
            </div>

            <form onSubmit={handleSaveTemplate} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontWeight: 700 }}>Subject</label>
                <input type="text" className="form-input" value={templateSubject} onChange={e => setTemplateSubject(e.target.value)} required />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontWeight: 700 }}>Message Body</label>
                <textarea className="form-input" value={templateBody} onChange={e => setTemplateBody(e.target.value)} style={{ minHeight: 220, fontFamily: 'monospace', fontSize: 13, lineHeight: 1.5 }} required />
              </div>

              <div style={{ display: 'flex', gap: 12, marginTop: 4 }}>
                <button type="submit" disabled={savingTemplate} className="btn btn-primary" style={{ flex: 1, height: 42, justifyContent: 'center' }}>
                  <Save size={16} /> {savingTemplate ? 'Saving...' : 'Save Template'}
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
            </div>

            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: 4 }}>Subject Preview</div>
              <div style={{ padding: '10px 14px', background: 'var(--surface-alt)', border: '1px solid var(--border-color)', borderRadius: 10, fontSize: 13.5, fontWeight: 700, color: '#121118' }}>
                {interpolatedPreviewSubject}
              </div>
            </div>

            <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: 4 }}>Message Body Preview</div>
              <div style={{ flex: 1, padding: 16, background: '#F9FAFB', border: '1px solid var(--border-color)', borderRadius: 12, fontSize: 13, lineHeight: 1.6, whiteSpace: 'pre-wrap', color: '#374151' }}>
                {interpolatedPreviewBody}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ID CONFIG MODAL */}
      {editingEntity && (
        <CustomModal isOpen={!!editingEntity} onClose={() => setEditingEntity(null)} title={`Configure ${editingEntity.toUpperCase()} ID Rule`}>
          <form onSubmit={handleSaveIdConfig} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {errorMessage && <div style={{ background: '#FEF2F2', border: '1px solid #FCA5A5', color: '#991B1B', borderRadius: 8, padding: 10, fontSize: 12.5, fontWeight: 600 }}>{errorMessage}</div>}
            <div>
              <label className="form-label">ID Prefix</label>
              <input type="text" className="form-input" value={idPrefix} onChange={e => setIdPrefix(e.target.value)} placeholder="e.g. LVX" required />
            </div>
            <div>
              <label className="form-label">Next Counter Number</label>
              <input type="number" className="form-input" value={idNextNum} onChange={e => setIdNextNum(e.target.value)} placeholder="e.g. 70129" required />
            </div>
            <div>
              <label className="form-label">Number Padding (Digits)</label>
              <input type="number" className="form-input" value={idPadding} onChange={e => setIdPadding(e.target.value)} placeholder="e.g. 6" required />
            </div>
            <div>
              <label className="form-label">Separator</label>
              <input type="text" className="form-input" value={idSeparator} onChange={e => setIdSeparator(e.target.value)} placeholder="e.g. - or leave empty" />
            </div>
            <div style={{ padding: 12, background: 'var(--surface-alt)', borderRadius: 10, fontSize: 12.5, fontWeight: 700 }}>
              Live Example: {idPrefix || ''}{idSeparator || ''}{String(idNextNum || 1).padStart(Number(idPadding) || 4, '0')}
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 10 }}>
              <button type="button" className="btn btn-outline" onClick={() => setEditingEntity(null)}>Cancel</button>
              <button type="submit" disabled={savingIdConfig} className="btn btn-primary">{savingIdConfig ? 'Saving...' : 'Save Configuration'}</button>
            </div>
          </form>
        </CustomModal>
      )}

      {/* COURSE MODAL */}
      {showCourseModal && (
        <CustomModal isOpen={showCourseModal} onClose={() => setShowCourseModal(false)} title={editingCourse ? 'Edit Course' : 'Add New Course'}>
          <form onSubmit={handleSaveCourse} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {errorMessage && <div style={{ background: '#FEF2F2', border: '1px solid #FCA5A5', color: '#991B1B', borderRadius: 8, padding: 10, fontSize: 12.5, fontWeight: 600 }}>{errorMessage}</div>}
            <div>
              <label className="form-label">Course Title *</label>
              <input type="text" className="form-input" value={courseTitle} onChange={(e) => setCourseTitle(e.target.value)} placeholder="e.g. Fullstack Engineering" required />
            </div>
            <div>
              <label className="form-label">Course Code</label>
              <input type="text" className="form-input" value={courseCode} onChange={(e) => setCourseCode(e.target.value)} placeholder="e.g. CRS-0101" />
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

