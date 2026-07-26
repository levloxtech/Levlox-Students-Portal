import React, { useState, useEffect } from 'react';
import {
  User, Mail, Phone, Camera, CheckCircle, Save, Smartphone
} from 'lucide-react';
import { API_BASE } from '../utils/api';

const StudentSettings = ({ token, user, showModal }) => {
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [savingAccount, setSavingAccount] = useState(false);
  const [toast, setToast] = useState('');

  // Account Fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [profilePic, setProfilePic] = useState('');
  const [mySessions, setMySessions] = useState([]);

  useEffect(() => {
    fetchProfile();
    fetchMySessions();
  }, []);

  const fetchMySessions = async () => {
    try {
      const r = await fetch(`${API_BASE}/auth/my-sessions`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (r.ok) {
        const d = await r.json();
        setMySessions(d || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleRemoveMySession = async (sessionId) => {
    if (!window.confirm("Are you sure you want to log out from this device?")) return;
    try {
      const r = await fetch(`${API_BASE}/auth/my-sessions/${sessionId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (r.ok) {
        showToast('Logged out from device ✓');
        fetchMySessions();
      } else {
        showModal('Error', 'Failed to log out device', 'error');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 4000);
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
        setProfilePic(d.profile_pic || '');
      }
    } catch (e) {
      console.error(e);
      showToast('Error loading settings data.');
    } finally {
      setLoading(false);
    }
  };

  // Profile save helper
  const handleSaveAccount = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      showModal('Validation Error', 'Full Name is required.', 'warning');
      return;
    }
    if (!email.trim() || !/\S+@\S+\.\S+/.test(email)) {
      showModal('Validation Error', 'Please enter a valid email address.', 'warning');
      return;
    }

    setSavingAccount(true);
    try {
      const r = await fetch(`${API_BASE}/student/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          profile_pic: profilePic,
          current_location: profileData?.current_location || '',
          permanent_address: profileData?.permanent_address || '',
          college: profileData?.college || '',
          company: profileData?.company || ''
        })
      });
      if (r.ok) {
        showToast('Account details updated successfully ✓');
        fetchProfile();
        // Update LocalStorage user name
        const lu = JSON.parse(localStorage.getItem('user') || '{}');
        lu.name = name.trim();
        lu.email = email.trim();
        localStorage.setItem('user', JSON.stringify(lu));
      } else {
        const err = await r.json();
        showModal('Update Failed', err.message || 'Could not update profile details.', 'error');
      }
    } catch (e) {
      console.error(e);
      showModal('Error', 'An error occurred while saving account changes.', 'error');
    } finally {
      setSavingAccount(false);
    }
  };

  // Image upload handler
  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => setProfilePic(reader.result);
    reader.readAsDataURL(file);
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 350 }}>
        <p style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Loading settings...</p>
      </div>
    );
  }

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
        <h2 style={{ fontSize: 24, fontWeight: 800, margin: 0 }}>Student Settings</h2>
        <p style={{ margin: '4px 0 0', fontSize: 13.5, color: 'var(--text-secondary)' }}>
          Manage your account profile details.
        </p>
      </div>

      <div className="dashboard-main-grid" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        
        {/* CARD 1: ACCOUNT MODULE */}
        <div className="clickable-card-hover" style={{
          background: '#FFF',
          border: '1.5px solid var(--border-color)',
          borderRadius: 20,
          padding: 28,
          boxShadow: 'var(--shadow-card)',
          display: 'flex',
          flexDirection: 'column'
        }}>
          <h3 style={{ fontSize: 16, fontWeight: 800, margin: '0 0 20px', display: 'flex', alignItems: 'center', gap: 8, color: '#121118' }}>
            <User size={18} color="var(--primary-color)" /> Account Details
          </h3>

          <form onSubmit={handleSaveAccount}>
            {/* Profile Photo */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 28, paddingBottom: 20, borderBottom: '1px solid var(--border-color)' }}>
              <div style={{ position: 'relative', width: 90, height: 90 }}>
                <div style={{
                  width: 90,
                  height: 90,
                  borderRadius: '50%',
                  overflow: 'hidden',
                  background: 'var(--primary-light)',
                  border: '3.5px solid white',
                  boxShadow: '0 4px 14px rgba(0,0,0,0.06)',
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
                  boxShadow: '0 4px 10px rgba(0,0,0,0.15)',
                  transition: 'background 0.2s'
                }}
                className="photo-upload-badge"
                >
                  <Camera size={12} />
                  <input type="file" accept="image/*" onChange={handleImageUpload} style={{ display: 'none' }} />
                </label>
              </div>
              <div>
                <h4 style={{ margin: 0, fontSize: 14.5, fontWeight: 800, color: 'var(--text-primary)' }}>Profile Photo</h4>
                <p style={{ margin: '4px 0 0', fontSize: 11.5, color: 'var(--text-secondary)' }}>
                  Upload a square picture. Click the camera icon.
                </p>
              </div>
            </div>

            {/* Editable Fields */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18, marginBottom: 24 }}>
              
              {/* Full Name */}
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Full Name</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    className="form-input"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="Enter your full name"
                    style={{ paddingLeft: 42 }}
                  />
                  <User size={16} color="var(--text-secondary)" style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)' }} />
                </div>
              </div>

              {/* Email Address */}
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Email Address</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="email"
                    className="form-input"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="student@example.com"
                    style={{ paddingLeft: 42 }}
                  />
                  <Mail size={16} color="var(--text-secondary)" style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)' }} />
                </div>
              </div>

              {/* Mobile Number Read Only */}
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Mobile Number (Managed by Admin)</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    className="form-input"
                    value={phone}
                    readOnly
                    disabled
                    style={{ paddingLeft: 42, background: 'var(--surface-alt)', opacity: 0.85, cursor: 'not-allowed' }}
                  />
                  <Phone size={16} color="var(--text-secondary)" style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)' }} />
                </div>
              </div>

            </div>

            {/* Save Profile Button */}
            <button
              type="submit"
              disabled={savingAccount}
              className="btn btn-primary btn-block"
              style={{ height: 46 }}
            >
              <Save size={16} /> {savingAccount ? 'Saving Profile...' : 'Save Profile Changes'}
            </button>
          </form>
        </div>

        {/* MY DEVICES CARD */}
        <div className="clickable-card-hover" style={{
          background: '#FFF',
          border: '1.5px solid var(--border-color)',
          borderRadius: 20,
          padding: 28,
          boxShadow: 'var(--shadow-card)',
          display: 'flex',
          flexDirection: 'column'
        }}>
          <h3 style={{ fontSize: 16, fontWeight: 800, margin: '0 0 20px', display: 'flex', alignItems: 'center', gap: 8, color: '#121118' }}>
            📱 My Active Devices
          </h3>
          <p style={{ margin: '0 0 16px', fontSize: 12.5, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            You can be logged in on maximum 2 devices (1 mobile + 1 desktop). Manage your active sessions below:
          </p>
          
          {mySessions.length === 0 ? (
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>No active devices found.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {mySessions.map(session => (
                <div key={session._id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', background: 'var(--surface-alt)', border: '1px solid var(--border-color)', borderRadius: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ fontSize: 20 }}>{session.device_type === 'mobile' ? '📱' : '💻'}</span>
                    <div>
                      <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', display: 'block' }}>
                        {session.device_label || 'Unknown Device'}
                      </span>
                      <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                        Last active: {new Date(session.last_active).toLocaleString()}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveMySession(session._id)}
                    className="btn btn-secondary btn-sm"
                    style={{ padding: '6px 12px', height: 'auto', fontSize: 12 }}
                  >
                    Log Out
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default StudentSettings;

