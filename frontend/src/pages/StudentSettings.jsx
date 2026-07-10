import React, { useState, useEffect } from 'react';
import {
  User, Mail, Phone, Lock, Eye, EyeOff, Camera, CheckCircle,
  AlertCircle, Save, X, RefreshCw, Key, Shield, HelpCircle, ArrowRight
} from 'lucide-react';

const API_BASE = 'http://localhost:5000/api';

const StudentSettings = ({ token, user, showModal }) => {
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [savingAccount, setSavingAccount] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [toast, setToast] = useState('');

  // Account Fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [profilePic, setProfilePic] = useState('');

  // Password Fields
  const [currPassword, setCurrPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrPassword, setShowCurrPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Phone Update OTP State
  const [isUpdatingPhone, setIsUpdatingPhone] = useState(false);
  const [tempPhone, setTempPhone] = useState('');
  const [phoneOtp, setPhoneOtp] = useState('');
  const [phoneOtpSent, setPhoneOtpSent] = useState(false);
  const [phoneTimer, setPhoneTimer] = useState(0);
  const [verifyingPhone, setVerifyingPhone] = useState(false);

  // Forgot Password Stepper State
  const [showForgotFlow, setShowForgotFlow] = useState(false);
  const [forgotStep, setForgotStep] = useState(1); // 1: Enter Phone, 2: Enter OTP, 3: Set New Password
  const [forgotPhone, setForgotPhone] = useState('');
  const [forgotOtp, setForgotOtp] = useState('');
  const [forgotNewPassword, setForgotNewPassword] = useState('');
  const [forgotConfirmPassword, setForgotConfirmPassword] = useState('');
  const [forgotResetToken, setForgotResetToken] = useState('');
  const [forgotTimer, setForgotTimer] = useState(0);
  const [showForgotNewPassword, setShowForgotNewPassword] = useState(false);
  const [showForgotConfirmPassword, setShowForgotConfirmPassword] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, []);

  // Timer intervals
  useEffect(() => {
    let interval = null;
    if (phoneTimer > 0) {
      interval = setInterval(() => {
        setPhoneTimer(prev => prev - 1);
      }, 1000);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [phoneTimer]);

  useEffect(() => {
    let interval = null;
    if (forgotTimer > 0) {
      interval = setInterval(() => {
        setForgotTimer(prev => prev - 1);
      }, 1000);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [forgotTimer]);

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
          phone: phone, // phone only updated via OTP verification endpoints
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

  // Password Strength Evaluator
  const getPasswordStrength = (pwd) => {
    if (!pwd) return { label: '', color: 'transparent', score: 0 };
    let score = 0;
    if (pwd.length >= 8) score++;
    if (/[a-z]/.test(pwd) && /[A-Z]/.test(pwd)) score++;
    if (/[0-9]/.test(pwd)) score++;
    if (/[!@#$%^&*(),.?":{}|<>_+\-\[\]\\]/.test(pwd)) score++;

    if (pwd.length < 6) return { label: 'Weak (Too Short)', color: 'var(--danger-color)', score: 1 };
    if (score <= 1) return { label: 'Weak', color: 'var(--danger-color)', score: 1 };
    if (score === 2 || score === 3) return { label: 'Medium', color: 'var(--warning-color)', score: 2 };
    return { label: 'Strong', color: 'var(--success-color)', score: 3 };
  };

  // Standard Password Change Form
  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (!currPassword) {
      showModal('Validation Error', 'Please enter your current password.', 'warning');
      return;
    }
    if (newPassword.length < 8) {
      showModal('Validation Error', 'New password must be at least 8 characters long.', 'warning');
      return;
    }
    if (newPassword !== confirmPassword) {
      showModal('Validation Error', 'New passwords do not match.', 'warning');
      return;
    }

    setSavingPassword(true);
    try {
      const r = await fetch(`${API_BASE}/student/change-password`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          current_password: currPassword,
          new_password: newPassword
        })
      });
      const d = await r.json();
      if (r.ok) {
        showModal('Password Updated', 'Your password was changed successfully!', 'success');
        setCurrPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        showModal('Update Failed', d.message || 'Incorrect current password.', 'error');
      }
    } catch (e) {
      console.error(e);
      showModal('Error', 'An error occurred during password change.', 'error');
    } finally {
      setSavingPassword(false);
    }
  };

  // OTP Verification for Phone Number Change
  const requestPhoneOtp = async () => {
    if (!tempPhone || tempPhone.length !== 10 || !/^\d+$/.test(tempPhone)) {
      showModal('Validation Error', 'Please enter a valid 10-digit mobile number.', 'warning');
      return;
    }
    setVerifyingPhone(true);
    try {
      const r = await fetch(`${API_BASE}/student/update-phone/request`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ new_phone: tempPhone })
      });
      const d = await r.json();
      if (r.ok) {
        setPhoneOtpSent(true);
        setPhoneTimer(120); // 2 minutes countdown
        showToast('OTP sent successfully ✓ Check backend logs.');
      } else {
        showModal('Failed to send OTP', d.message || 'Mobile number already registered.', 'error');
      }
    } catch (e) {
      console.error(e);
      showModal('Error', 'An error occurred while requesting OTP.', 'error');
    } finally {
      setVerifyingPhone(false);
    }
  };

  const verifyPhoneOtp = async () => {
    if (!phoneOtp || phoneOtp.length !== 6) {
      showModal('Validation Error', 'Please enter a valid 6-digit OTP code.', 'warning');
      return;
    }
    setVerifyingPhone(true);
    try {
      const r = await fetch(`${API_BASE}/student/update-phone/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ new_phone: tempPhone, otp: phoneOtp })
      });
      const d = await r.json();
      if (r.ok) {
        showModal('Verification Successful', 'Mobile number updated successfully!', 'success');
        setPhone(tempPhone);
        setPhoneOtp('');
        setPhoneOtpSent(false);
        setIsUpdatingPhone(false);
        fetchProfile();
      } else {
        showModal('Verification Failed', d.message || 'Invalid or expired OTP code.', 'error');
      }
    } catch (e) {
      console.error(e);
      showModal('Error', 'An error occurred during verification.', 'error');
    } finally {
      setVerifyingPhone(false);
    }
  };

  // Forgot Password Stepper Flow
  const handleForgotRequestOtp = async () => {
    if (!forgotPhone || forgotPhone.length !== 10 || !/^\d+$/.test(forgotPhone)) {
      showModal('Validation Error', 'Please enter your registered 10-digit mobile number.', 'warning');
      return;
    }
    try {
      const r = await fetch(`${API_BASE}/auth/forgot-password/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: forgotPhone })
      });
      const d = await r.json();
      if (r.ok) {
        setForgotStep(2);
        setForgotTimer(120); // 2 minutes
        showToast('Forgot password OTP sent. Check backend logs.');
      } else {
        showModal('Error', d.message || 'Registered mobile number not found.', 'error');
      }
    } catch (e) {
      console.error(e);
      showModal('Error', 'Failed to request OTP for forgot password.', 'error');
    }
  };

  const handleForgotVerifyOtp = async () => {
    if (!forgotOtp || forgotOtp.length !== 6) {
      showModal('Validation Error', 'Please enter a valid 6-digit OTP code.', 'warning');
      return;
    }
    try {
      const r = await fetch(`${API_BASE}/auth/forgot-password/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: forgotPhone, otp: forgotOtp })
      });
      const d = await r.json();
      if (r.ok) {
        setForgotResetToken(d.reset_token);
        setForgotStep(3);
      } else {
        showModal('Verification Failed', d.message || 'Invalid or expired OTP.', 'error');
      }
    } catch (e) {
      console.error(e);
      showModal('Error', 'Failed to verify OTP.', 'error');
    }
  };

  const handleForgotResetPassword = async () => {
    if (forgotNewPassword.length < 8) {
      showModal('Validation Error', 'Password must meet safety rules (8+ chars, uppercase, lowercase, numbers, and symbols).', 'warning');
      return;
    }
    if (forgotNewPassword !== forgotConfirmPassword) {
      showModal('Validation Error', 'Passwords do not match.', 'warning');
      return;
    }
    try {
      const r = await fetch(`${API_BASE}/auth/forgot-password/reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reset_token: forgotResetToken, new_password: forgotNewPassword })
      });
      const d = await r.json();
      if (r.ok) {
        showModal('Success', 'Password updated successfully! You can now use your new password.', 'success');
        // Reset stepper
        setShowForgotFlow(false);
        setForgotStep(1);
        setForgotPhone('');
        setForgotOtp('');
        setForgotNewPassword('');
        setForgotConfirmPassword('');
        setForgotResetToken('');
      } else {
        showModal('Error', d.message || 'Could not reset password.', 'error');
      }
    } catch (e) {
      console.error(e);
      showModal('Error', 'Failed to reset password.', 'error');
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 350 }}>
        <p style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Loading settings...</p>
      </div>
    );
  }

  const pwdStrength = getPasswordStrength(newPassword);

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
          Manage your student account details and adjust security credentials.
        </p>
      </div>

      <div className="dashboard-main-grid" style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 24, alignItems: 'start' }}>
        
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

              {/* Mobile Number Block (Requires OTP) */}
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Mobile Number (Requires OTP verification to update)</label>
                
                {!isUpdatingPhone ? (
                  <div style={{ display: 'flex', gap: 10 }}>
                    <div style={{ position: 'relative', flex: 1 }}>
                      <input
                        type="text"
                        className="form-input"
                        value={phone}
                        readOnly
                        style={{ paddingLeft: 42, background: 'var(--surface-alt)', opacity: 0.95, cursor: 'default' }}
                      />
                      <Phone size={16} color="var(--text-secondary)" style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)' }} />
                    </div>
                    <button
                      type="button"
                      onClick={() => { setTempPhone(phone); setIsUpdatingPhone(true); }}
                      className="btn btn-secondary btn-sm"
                      style={{ height: '46px', alignSelf: 'flex-end' }}
                    >
                      Update Number
                    </button>
                  </div>
                ) : (
                  <div style={{ background: 'var(--surface-alt)', border: '1.5px solid var(--border-color)', borderRadius: 14, padding: 18, marginTop: 4 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                      <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--primary-color)' }}>UPDATE MOBILE NUMBER</span>
                      <button
                        type="button"
                        onClick={() => { setIsUpdatingPhone(false); setPhoneOtpSent(false); }}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}
                      >
                        <X size={16} />
                      </button>
                    </div>

                    {!phoneOtpSent ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        <div style={{ position: 'relative' }}>
                          <input
                            type="text"
                            className="form-input"
                            value={tempPhone}
                            onChange={e => setTempPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                            placeholder="Enter 10-digit new number"
                            style={{ paddingLeft: 42 }}
                            disabled={verifyingPhone}
                          />
                          <Phone size={16} color="var(--text-secondary)" style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)' }} />
                        </div>
                        <button
                          type="button"
                          onClick={requestPhoneOtp}
                          disabled={verifyingPhone || tempPhone.length !== 10}
                          className="btn btn-primary btn-block"
                          style={{ height: 40, fontSize: 13 }}
                        >
                          {verifyingPhone ? 'Requesting...' : 'Send Verification OTP'}
                        </button>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        <p style={{ margin: 0, fontSize: 12, color: 'var(--text-secondary)' }}>
                          An OTP code has been generated to verify <strong>+91 {tempPhone}</strong>.
                        </p>
                        <input
                          type="text"
                          className="form-input"
                          value={phoneOtp}
                          onChange={e => setPhoneOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                          placeholder="Enter 6-digit OTP"
                          style={{ letterSpacing: 3, textAlign: 'center', fontWeight: 'bold' }}
                          disabled={verifyingPhone}
                        />

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: 11.5, color: 'var(--text-secondary)' }}>
                            {phoneTimer > 0 ? (
                              <span>Expires in: <strong>{Math.floor(phoneTimer / 60)}:{String(phoneTimer % 60).padStart(2, '0')}</strong></span>
                            ) : (
                              <span style={{ color: 'var(--danger-color)', fontWeight: 600 }}>OTP Expired</span>
                            )}
                          </span>
                          
                          <button
                            type="button"
                            onClick={requestPhoneOtp}
                            disabled={phoneTimer > 0 || verifyingPhone}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: phoneTimer > 0 ? 'var(--text-muted)' : 'var(--primary-color)',
                              cursor: phoneTimer > 0 ? 'not-allowed' : 'pointer',
                              fontSize: 12,
                              fontWeight: 700,
                              display: 'flex',
                              alignItems: 'center',
                              gap: 4
                            }}
                          >
                            <RefreshCw size={11} /> Resend OTP
                          </button>
                        </div>

                        <button
                          type="button"
                          onClick={verifyPhoneOtp}
                          disabled={verifyingPhone || phoneOtp.length !== 6}
                          className="btn btn-primary btn-block"
                          style={{ height: 40, fontSize: 13 }}
                        >
                          {verifyingPhone ? 'Verifying...' : 'Verify & Change Number'}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

            </div>

            {/* Save Profile Button */}
            <button
              type="submit"
              disabled={savingAccount || isUpdatingPhone}
              className="btn btn-primary btn-block"
              style={{ height: 46 }}
            >
              <Save size={16} /> {savingAccount ? 'Saving Profile...' : 'Save Profile Changes'}
            </button>
          </form>
        </div>

        {/* CARD 2: PASSWORD & SECURITY MODULE */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          
          {/* STANDARD PASSWORD UPDATE CARD */}
          {!showForgotFlow ? (
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
                <Lock size={18} color="var(--primary-color)" /> Password & Security
              </h3>

              <form onSubmit={handleChangePassword}>
                {/* Current Password */}
                <div className="form-group">
                  <label className="form-label">Current Password</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showCurrPassword ? 'text' : 'password'}
                      className="form-input"
                      value={currPassword}
                      onChange={e => setCurrPassword(e.target.value)}
                      placeholder="••••••••"
                      style={{ paddingLeft: 42, paddingRight: 42 }}
                    />
                    <Lock size={16} color="var(--text-secondary)" style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)' }} />
                    <button
                      type="button"
                      onClick={() => setShowCurrPassword(!showCurrPassword)}
                      style={{ position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}
                    >
                      {showCurrPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                {/* New Password */}
                <div className="form-group" style={{ marginBottom: 12 }}>
                  <label className="form-label">New Password</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      className="form-input"
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      placeholder="Min. 8 characters"
                      style={{ paddingLeft: 42, paddingRight: 42 }}
                    />
                    <Lock size={16} color="var(--text-secondary)" style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)' }} />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      style={{ position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}
                    >
                      {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>

                  {/* Password Strength Indicator */}
                  {newPassword && (
                    <div style={{ marginTop: 8 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                        <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Password Strength:</span>
                        <span style={{ fontSize: 11, fontWeight: 800, color: pwdStrength.color }}>{pwdStrength.label}</span>
                      </div>
                      <div style={{ height: 4, background: 'var(--border-color)', borderRadius: 2, overflow: 'hidden' }}>
                        <div style={{
                          height: '100%',
                          width: `${(pwdStrength.score / 4) * 100}%`,
                          background: pwdStrength.color,
                          transition: 'width 0.3s ease'
                        }} />
                      </div>
                    </div>
                  )}
                </div>

                {/* Confirm Password */}
                <div className="form-group" style={{ marginBottom: 20 }}>
                  <label className="form-label">Confirm Password</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      className="form-input"
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      style={{ paddingLeft: 42, paddingRight: 42 }}
                    />
                    <Lock size={16} color="var(--text-secondary)" style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)' }} />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      style={{ position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}
                    >
                      {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {confirmPassword && newPassword !== confirmPassword && (
                    <p style={{ margin: '4px 0 0', fontSize: 11, color: 'var(--danger-color)', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <AlertCircle size={12} /> Passwords do not match.
                    </p>
                  )}
                </div>

                {/* Action Buttons */}
                <button
                  type="submit"
                  disabled={savingPassword || (newPassword && newPassword !== confirmPassword)}
                  className="btn btn-primary btn-block"
                  style={{ height: 44, marginBottom: 12 }}
                >
                  <Key size={15} /> {savingPassword ? 'Changing Password...' : 'Change Password'}
                </button>
              </form>

              {/* Toggle to Forgot Password Stepper */}
              <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: 16, textAlign: 'center' }}>
                <button
                  type="button"
                  onClick={() => { setShowForgotFlow(true); setForgotStep(1); }}
                  style={{ background: 'none', border: 'none', color: 'var(--primary-color)', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}
                >
                  Forgot Password? Reset via OTP
                </button>
              </div>
            </div>
          ) : (
            
            /* OTP FORGOT PASSWORD STEPPER WIZARD */
            <div className="clickable-card-hover" style={{
              background: '#FFF',
              border: '1.5px solid var(--border-color)',
              borderRadius: 20,
              padding: 28,
              boxShadow: 'var(--shadow-card)',
              display: 'flex',
              flexDirection: 'column',
              animation: 'scaleUp 0.3s ease'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <h3 style={{ fontSize: 16, fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: 8, color: '#121118' }}>
                  <Shield size={18} color="var(--primary-color)" /> Reset Password
                </h3>
                <button
                  type="button"
                  onClick={() => { setShowForgotFlow(false); setForgotStep(1); }}
                  style={{ background: 'var(--surface-alt)', border: '1px solid var(--border-color)', borderRadius: '50%', width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-secondary)' }}
                >
                  <X size={14} />
                </button>
              </div>

              {/* Progress Stepper Visual */}
              <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
                {[1, 2, 3].map((step) => (
                  <div
                    key={step}
                    style={{
                      height: 4,
                      flex: 1,
                      borderRadius: 2,
                      background: step <= forgotStep ? 'var(--primary-color)' : 'var(--border-color)',
                      transition: 'background 0.3s'
                    }}
                  />
                ))}
              </div>

              {/* STEP 1: Enter Mobile Number */}
              {forgotStep === 1 && (
                <div>
                  <p style={{ margin: '0 0 16px', fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                    Enter the registered mobile number associated with your Student account. We will mock send a 6-digit OTP code to verify your identity.
                  </p>
                  <div className="form-group">
                    <label className="form-label">Registered Mobile Number</label>
                    <div style={{ position: 'relative' }}>
                      <input
                        type="text"
                        className="form-input"
                        value={forgotPhone}
                        onChange={e => setForgotPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                        placeholder="e.g. 9876543210"
                        style={{ paddingLeft: 42 }}
                      />
                      <Phone size={16} color="var(--text-secondary)" style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)' }} />
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleForgotRequestOtp}
                    disabled={forgotPhone.length !== 10}
                    className="btn btn-primary btn-block"
                    style={{ height: 44 }}
                  >
                    Send OTP Code <ArrowRight size={14} />
                  </button>
                </div>
              )}

              {/* STEP 2: Enter OTP Code */}
              {forgotStep === 2 && (
                <div>
                  <p style={{ margin: '0 0 16px', fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                    Please enter the 6-digit OTP verification code printed in your server logs for phone number <strong>+91 {forgotPhone}</strong>.
                  </p>
                  <div className="form-group">
                    <label className="form-label">6-Digit OTP</label>
                    <input
                      type="text"
                      className="form-input"
                      value={forgotOtp}
                      onChange={e => setForgotOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="Enter OTP"
                      style={{ letterSpacing: 4, textAlign: 'center', fontWeight: 'bold', fontSize: 16 }}
                    />
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                    <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                      {forgotTimer > 0 ? (
                        <span>Expires in: <strong>{Math.floor(forgotTimer / 60)}:{String(forgotTimer % 60).padStart(2, '0')}</strong></span>
                      ) : (
                        <span style={{ color: 'var(--danger-color)', fontWeight: 600 }}>Expired</span>
                      )}
                    </span>
                    
                    <button
                      type="button"
                      onClick={handleForgotRequestOtp}
                      disabled={forgotTimer > 0}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: forgotTimer > 0 ? 'var(--text-muted)' : 'var(--primary-color)',
                        cursor: forgotTimer > 0 ? 'not-allowed' : 'pointer',
                        fontSize: 12,
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4
                      }}
                    >
                      <RefreshCw size={11} /> Resend OTP
                    </button>
                  </div>

                  <div style={{ display: 'flex', gap: 10 }}>
                    <button
                      type="button"
                      onClick={() => setForgotStep(1)}
                      className="btn btn-outline"
                      style={{ flex: 1, height: 42 }}
                    >
                      Back
                    </button>
                    <button
                      type="button"
                      onClick={handleForgotVerifyOtp}
                      disabled={forgotOtp.length !== 6}
                      className="btn btn-primary"
                      style={{ flex: 1.5, height: 42 }}
                    >
                      Verify Code
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 3: Enter New Password */}
              {forgotStep === 3 && (
                <div>
                  <p style={{ margin: '0 0 16px', fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                    Your mobile is verified! Create a secure new password for your Student account.
                  </p>
                  
                  {/* New Password */}
                  <div className="form-group">
                    <label className="form-label">New Password</label>
                    <div style={{ position: 'relative' }}>
                      <input
                        type={showForgotNewPassword ? 'text' : 'password'}
                        className="form-input"
                        value={forgotNewPassword}
                        onChange={e => setForgotNewPassword(e.target.value)}
                        placeholder="Min. 8 characters"
                        style={{ paddingLeft: 42, paddingRight: 42 }}
                      />
                      <Lock size={16} color="var(--text-secondary)" style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)' }} />
                      <button
                        type="button"
                        onClick={() => setShowForgotNewPassword(!showForgotNewPassword)}
                        style={{ position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}
                      >
                        {showForgotNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  {/* Confirm Password */}
                  <div className="form-group" style={{ marginBottom: 24 }}>
                    <label className="form-label">Confirm New Password</label>
                    <div style={{ position: 'relative' }}>
                      <input
                        type={showForgotConfirmPassword ? 'text' : 'password'}
                        className="form-input"
                        value={forgotConfirmPassword}
                        onChange={e => setForgotConfirmPassword(e.target.value)}
                        placeholder="••••••••"
                        style={{ paddingLeft: 42, paddingRight: 42 }}
                      />
                      <Lock size={16} color="var(--text-secondary)" style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)' }} />
                      <button
                        type="button"
                        onClick={() => setShowForgotConfirmPassword(!showForgotConfirmPassword)}
                        style={{ position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}
                      >
                        {showForgotConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                    {forgotConfirmPassword && forgotNewPassword !== forgotConfirmPassword && (
                      <p style={{ margin: '4px 0 0', fontSize: 11, color: 'var(--danger-color)', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <AlertCircle size={12} /> Passwords do not match.
                      </p>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={handleForgotResetPassword}
                    disabled={forgotNewPassword.length < 8 || forgotNewPassword !== forgotConfirmPassword}
                    className="btn btn-primary btn-block"
                    style={{ height: 44 }}
                  >
                    Update Password Successfully
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default StudentSettings;
