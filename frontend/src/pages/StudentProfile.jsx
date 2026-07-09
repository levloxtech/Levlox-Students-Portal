import React, { useState, useEffect } from 'react';
import {
  User, Mail, Phone, Lock, Edit3, Camera, Save, X,
  GraduationCap, MapPin, Building2, Briefcase, CheckCircle,
  FileText, Calendar, Award, BookOpen, Percent, Users, UserCheck
} from 'lucide-react';

const API_BASE = 'http://localhost:5000/api';

const StudentProfile = ({ dashboardData, enrolledCourses = [], token }) => {
  const [profileData, setProfileData] = useState(null);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');

  // Editable fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [currentLocation, setCurrentLocation] = useState('');
  const [permanentAddress, setPermanentAddress] = useState('');
  const [profilePic, setProfilePic] = useState('');

  useEffect(() => {
    fetchProfile();
  }, []);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const r = await fetch(`${API_BASE}/student/profile`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (r.ok) {
        const d = await r.json();
        setProfileData(d);
        setName(d.name || '');
        setEmail(d.email || '');
        setPhone(d.phone || '');
        setCurrentLocation(d.current_location || '');
        setPermanentAddress(d.permanent_address || '');
        setProfilePic(d.profile_pic || '');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const r = await fetch(`${API_BASE}/student/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          name,
          email,
          phone,
          profile_pic: profilePic,
          current_location: currentLocation,
          permanent_address: permanentAddress
        })
      });
      if (r.ok) {
        showToast('Profile updated successfully ✓');
        fetchProfile();
        setEditing(false);
      } else {
        const err = await r.json();
        showToast(err.message || 'Failed to save');
      }
    } catch (e) {
      console.error(e);
      showToast('Error updating profile');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (profileData) {
      setName(profileData.name || '');
      setEmail(profileData.email || '');
      setPhone(profileData.phone || '');
      setCurrentLocation(profileData.current_location || '');
      setPermanentAddress(profileData.permanent_address || '');
      setProfilePic(profileData.profile_pic || '');
    }
    setEditing(false);
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => setProfilePic(reader.result);
    reader.readAsDataURL(file);
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300 }}>
        <p style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Loading profile...</p>
      </div>
    );
  }

  const attendancePct = profileData?.attendance || dashboardData?.student?.attendance?.percentage || 92;
  const isPaid = profileData?.feesStatus === 'Paid' || dashboardData?.student?.feesStatus === 'Paid';
  const studentId = profileData?.rollNumber || dashboardData?.student?.rollNumber || 'LSP-2026-9999';
  const course = profileData?.course || dashboardData?.student?.course || 'Fullstack Engineering';
  const batchName = profileData?.batch_name || 'Not Assigned';
  const trainer = profileData?.trainer || 'Levlox Trainer';
  const college = profileData?.college || 'Levlox Technical Institute';
  const company = profileData?.company || '';
  const admissionDate = profileData?.join_date || dashboardData?.student?.enrollmentDate || 'July 08, 2026';
  
  // Calculate completion % from enrolledCourses or fallback
  const courseCompletionPct = enrolledCourses.length > 0
    ? Math.round(enrolledCourses.reduce((acc, c) => acc + (c.progress || 0), 0) / enrolledCourses.length)
    : dashboardData?.recordedClasses && dashboardData.recordedClasses.length > 0
      ? Math.round(dashboardData.recordedClasses.reduce((acc, c) => acc + (c.progress || 0), 0) / dashboardData.recordedClasses.length)
      : 78;

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
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 24, fontWeight: 800, margin: 0 }}>LMS Student Profile</h2>
        <p style={{ margin: '4px 0 0', fontSize: 13.5, color: 'var(--text-secondary)' }}>
          Manage your personal details and view your locked academic profile.
        </p>
      </div>

      {/* Clean Two Column Layout */}
      <div className="dashboard-main-grid" style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 24 }}>
        
        {/* LEFT CARD - PERSONAL INFORMATION */}
        <div style={{
          background: '#FFF',
          border: '1.5px solid var(--border-color)',
          borderRadius: 20,
          padding: 28,
          boxShadow: 'var(--shadow-card)',
          display: 'flex',
          flexDirection: 'column',
          height: 'fit-content'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
            <h3 style={{ fontSize: 16, fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: 8, color: '#121118' }}>
              <User size={18} color="var(--primary-color)" /> Personal Information
            </h3>
            {!editing ? (
              <button
                onClick={() => setEditing(true)}
                style={{
                  background: 'var(--primary-light)',
                  border: '1px solid var(--primary-border)',
                  borderRadius: 8,
                  padding: '7px 14px',
                  fontSize: 12,
                  fontWeight: 700,
                  color: 'var(--primary-color)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                  fontFamily: 'inherit',
                  transition: 'all 0.15s'
                }}
              >
                <Edit3 size={12} /> Edit Profile
              </button>
            ) : (
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  style={{
                    background: 'var(--primary-color)',
                    border: 'none',
                    borderRadius: 8,
                    padding: '7px 14px',
                    fontSize: 12,
                    fontWeight: 700,
                    color: '#FFF',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 5,
                    fontFamily: 'inherit',
                    boxShadow: '0 4px 10px rgba(108,60,240,0.2)',
                    transition: 'all 0.15s'
                  }}
                >
                  <Save size={12} /> {saving ? 'Saving...' : 'Save'}
                </button>
                <button
                  onClick={handleCancel}
                  style={{
                    background: 'var(--surface-alt)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 8,
                    padding: '7px 14px',
                    fontSize: 12,
                    fontWeight: 700,
                    color: 'var(--text-secondary)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 5,
                    fontFamily: 'inherit',
                    transition: 'all 0.15s'
                  }}
                >
                  <X size={12} /> Cancel
                </button>
              </div>
            )}
          </div>

          {/* Profile Photo Upload */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 28, paddingBottom: 20, borderBottom: '1px solid var(--border-color)' }}>
            <div style={{ position: 'relative', width: 90, height: 90 }}>
              <div style={{
                width: 90,
                height: 90,
                borderRadius: '50%',
                overflow: 'hidden',
                background: 'var(--primary-light)',
                border: '3.5px solid white',
                boxShadow: 'var(--shadow-card)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                {profilePic ? (
                  <img src={profilePic} alt="profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg, var(--primary-color) 0%, #4c22bc 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, fontWeight: 800, color: '#fff' }}>
                    {(name || 'S')[0].toUpperCase()}
                  </div>
                )}
              </div>
              {editing && (
                <label style={{
                  position: 'absolute',
                  bottom: 0,
                  right: 0,
                  width: 28,
                  height: 28,
                  background: 'var(--primary-color)',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                  cursor: 'pointer',
                  border: '2px solid #fff',
                  boxShadow: '0 4px 10px rgba(0,0,0,0.15)'
                }}>
                  <Camera size={12} />
                  <input type="file" accept="image/*" onChange={handleImageUpload} style={{ display: 'none' }} />
                </label>
              )}
            </div>
            <div>
              <h4 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: 'var(--text-primary)' }}>Profile Photo</h4>
              <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--text-secondary)' }}>
                {editing ? 'Accepts JPG, PNG formats.' : 'Only student can upload a profile picture.'}
              </p>
            </div>
          </div>

          {/* Form Fields Grid */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            
            {/* Full Name */}
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>Full Name</label>
              {editing ? (
                <input type="text" className="form-input" style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1.5px solid var(--border-color)', fontSize: 13.5, fontWeight: 600, outline: 'none' }} value={name} onChange={e => setName(e.target.value)} />
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: 'var(--surface-alt)', borderRadius: 10, border: '1.5px solid transparent' }}>
                  <User size={15} color="var(--primary-color)" />
                  <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>{name || '—'}</span>
                </div>
              )}
            </div>

            {/* Email Address */}
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>Email Address</label>
              {editing ? (
                <input type="email" className="form-input" style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1.5px solid var(--border-color)', fontSize: 13.5, fontWeight: 600, outline: 'none' }} value={email} onChange={e => setEmail(e.target.value)} />
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: 'var(--surface-alt)', borderRadius: 10, border: '1.5px solid transparent' }}>
                  <Mail size={15} color="var(--primary-color)" />
                  <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>{email || '—'}</span>
                </div>
              )}
            </div>

            {/* Phone Number */}
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>Phone Number</label>
              {editing ? (
                <input type="text" className="form-input" style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1.5px solid var(--border-color)', fontSize: 13.5, fontWeight: 600, outline: 'none' }} value={phone} onChange={e => setPhone(e.target.value)} />
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: 'var(--surface-alt)', borderRadius: 10, border: '1.5px solid transparent' }}>
                  <Phone size={15} color="var(--primary-color)" />
                  <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>{phone || 'Not added'}</span>
                </div>
              )}
            </div>

            {/* Current Location */}
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>Current Location</label>
              {editing ? (
                <input type="text" className="form-input" style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1.5px solid var(--border-color)', fontSize: 13.5, fontWeight: 600, outline: 'none' }} value={currentLocation} onChange={e => setCurrentLocation(e.target.value)} placeholder="e.g. Bangalore, India" />
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: 'var(--surface-alt)', borderRadius: 10, border: '1.5px solid transparent' }}>
                  <MapPin size={15} color="var(--primary-color)" />
                  <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>{currentLocation || 'Not added'}</span>
                </div>
              )}
            </div>

            {/* Permanent Address */}
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>Permanent Address</label>
              {editing ? (
                <textarea className="form-input" style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1.5px solid var(--border-color)', fontSize: 13.5, fontWeight: 600, outline: 'none', minHeight: 60, resize: 'vertical' }} value={permanentAddress} onChange={e => setPermanentAddress(e.target.value)} placeholder="e.g. 123 Main St, New Delhi, India" />
              ) : (
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '10px 14px', background: 'var(--surface-alt)', borderRadius: 10, border: '1.5px solid transparent' }}>
                  <MapPin size={15} color="var(--primary-color)" style={{ marginTop: 2 }} />
                  <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.4 }}>{permanentAddress || 'Not added'}</span>
                </div>
              )}
            </div>

            {/* College / Institution (READ ONLY - LOCK ICON) */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 6 }}>
                <label style={{ fontSize: 12, fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 0.5, margin: 0 }}>College / Institution</label>
                <Lock size={12} color="#EF4444" />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: '#F3F4F6', borderRadius: 10, border: '1.5px solid var(--border-color)', opacity: 0.8, cursor: 'not-allowed' }}>
                <Building2 size={15} color="#9CA3AF" />
                <span style={{ fontSize: 14, fontWeight: 700, color: '#6B7280' }}>{college}</span>
              </div>
            </div>

            {/* Company Name (READ ONLY - LOCK ICON) */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 6 }}>
                <label style={{ fontSize: 12, fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 0.5, margin: 0 }}>Company Name</label>
                <Lock size={12} color="#EF4444" />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: '#F3F4F6', borderRadius: 10, border: '1.5px solid var(--border-color)', opacity: 0.8, cursor: 'not-allowed' }}>
                <Briefcase size={15} color="#9CA3AF" />
                <span style={{ fontSize: 14, fontWeight: 700, color: '#6B7280' }}>{company || 'No Company Assigned'}</span>
              </div>
            </div>

          </div>
        </div>

        {/* RIGHT CARD - ACADEMIC INFORMATION */}
        <div style={{
          background: '#FFF',
          border: '1.5px solid var(--border-color)',
          borderRadius: 20,
          padding: 28,
          boxShadow: 'var(--shadow-card)',
          display: 'flex',
          flexDirection: 'column',
          height: 'fit-content'
        }}>
          <h3 style={{ fontSize: 16, fontWeight: 800, marginBottom: 24, display: 'flex', alignItems: 'center', gap: 8, color: '#121118' }}>
            <GraduationCap size={18} color="var(--primary-color)" /> Academic Information
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {[
              { label: 'Student ID', val: studentId, icon: <FileText size={15} color="var(--primary-color)" /> },
              { label: 'Course', val: course, icon: <BookOpen size={15} color="var(--primary-color)" /> },
              { label: 'Batch', val: batchName, icon: <Users size={15} color="var(--primary-color)" /> },
              { label: 'Admission Date', val: admissionDate, icon: <Calendar size={15} color="var(--primary-color)" /> },
              { label: 'Academic Year', val: batchName || '2024–25', icon: <Calendar size={15} color="var(--primary-color)" /> },
              { label: 'Trainer', val: trainer, icon: <UserCheck size={15} color="var(--primary-color)" /> },
              { label: 'Fee Status', val: isPaid ? 'Paid' : 'Pending', valColor: isPaid ? '#10B981' : '#EF4444', icon: <Award size={15} color="var(--primary-color)" /> },
              { label: 'Attendance %', val: `${attendancePct}%`, icon: <Percent size={15} color="var(--primary-color)" /> },
              { label: 'Course Completion %', val: `${courseCompletionPct}%`, icon: <Percent size={15} color="var(--primary-color)" /> }
            ].map((f, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '12px 14px',
                  background: 'var(--surface-alt)',
                  borderRadius: 12,
                  border: '1px solid var(--border-color)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {f.icon}
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)' }}>{f.label}</span>
                </div>
                <span style={{ fontSize: 13.5, fontWeight: 800, color: f.valColor || 'var(--text-primary)' }}>{f.val}</span>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
};

export default StudentProfile;
