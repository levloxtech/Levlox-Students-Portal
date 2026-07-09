import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Eye, EyeOff, Lock, Phone, User, Check, X,
  ShieldCheck, KeyRound, ArrowLeft, AlertTriangle,
  Shield, Loader2, GraduationCap, Sparkles
} from 'lucide-react';
import CustomModal from '../components/Modal';

const COUNTRIES = [
  { name: 'India', code: 'IN', dial: '+91', flag: '🇮🇳', length: 10, pattern: /^[6789]\d{9}$/ },
  { name: 'Sri Lanka', code: 'LK', dial: '+94', flag: '🇱🇰', length: 9, pattern: /^7\d{8}$/ },
  { name: 'United States', code: 'US', dial: '+1', flag: '🇺🇸', length: 10, pattern: /^\d{10}$/ },
  { name: 'United Kingdom', code: 'GB', dial: '+44', flag: '🇬🇧', length: 10, pattern: /^7\d{9}$/ },
  { name: 'United Arab Emirates', code: 'AE', dial: '+971', flag: '🇦🇪', length: 9, pattern: /^5\d{8}$/ },
  { name: 'Canada', code: 'CA', dial: '+1', flag: '🇨🇦', length: 10, pattern: /^\d{10}$/ },
  { name: 'Australia', code: 'AU', dial: '+61', flag: '🇦🇺', length: 9, pattern: /^4\d{8}$/ },
];

const API_BASE = 'http://localhost:5000/api';

/* ─── Rate limiter config ───────────────────────────── */
const MAX_ATTEMPTS = 5;
const LOCKOUT_SECONDS = 30;

/* ─── Inactivity timeout (ms) ──────────────────────── */
const INACTIVITY_TIMEOUT = 15 * 60 * 1000; // 15 minutes

/* ══════════════════════════════════════════════════════
   LOGIN PAGE
══════════════════════════════════════════════════════ */
const Login = () => {
  /* ─── Form state ─── */
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  /* ─── Country selector state ─── */
  const [selectedCountry, setSelectedCountry] = useState(COUNTRIES[0]);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  /* ─── View State: 'login', 'forgot-step1', 'forgot-step2', 'forgot-step3' ─── */
  const [view, setView] = useState('login');

  /* ─── Loading & Modals ─── */
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [modalText, setModalText] = useState('');
  const [modalType, setModalType] = useState('info');

  /* ─── Rate limiting ─── */
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockoutEndTime, setLockoutEndTime] = useState(null);
  const [lockoutCountdown, setLockoutCountdown] = useState(0);
  const [isLocked, setIsLocked] = useState(false);

  /* ─── Forgot Password Flow ─── */
  const [forgotPhone, setForgotPhone] = useState('');
  const [otpFields, setOtpFields] = useState(['', '', '', '', '', '']);
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);

  /* ─── OTP timers ─── */
  const [otpExpiryTime, setOtpExpiryTime] = useState(300);
  const [resendCooldown, setResendCooldown] = useState(30);

  /* ─── Validation feedback ─── */
  const [phoneError, setPhoneError] = useState('');
  const [passError, setPassError] = useState('');
  const [forgotPhoneError, setForgotPhoneError] = useState('');
  const [newPasswordError, setNewPasswordError] = useState('');
  const [confirmPasswordError, setConfirmPasswordError] = useState('');

  const navigate = useNavigate();
  const inactivityTimer = useRef(null);

  /* ════ LOAD REMEMBERED PHONE ════ */
  useEffect(() => {
    const saved = localStorage.getItem('rememberedPhone');
    if (saved) { setPhone(saved); setRememberMe(true); }

    // Restore lockout state from sessionStorage
    const savedLockout = sessionStorage.getItem('loginLockoutEnd');
    if (savedLockout) {
      const endTime = parseInt(savedLockout, 10);
      if (Date.now() < endTime) {
        setLockoutEndTime(endTime);
        setIsLocked(true);
        const saved = sessionStorage.getItem('loginAttempts');
        if (saved) setFailedAttempts(parseInt(saved, 10));
      } else {
        sessionStorage.removeItem('loginLockoutEnd');
        sessionStorage.removeItem('loginAttempts');
      }
    }
  }, []);

  /* ════ LOCKOUT COUNTDOWN TIMER ════ */
  useEffect(() => {
    if (!isLocked || !lockoutEndTime) return;
    const tick = () => {
      const remaining = Math.ceil((lockoutEndTime - Date.now()) / 1000);
      if (remaining <= 0) {
        setIsLocked(false);
        setLockoutEndTime(null);
        setLockoutCountdown(0);
        setFailedAttempts(0);
        sessionStorage.removeItem('loginLockoutEnd');
        sessionStorage.removeItem('loginAttempts');
      } else {
        setLockoutCountdown(remaining);
      }
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [isLocked, lockoutEndTime]);

  /* ════ OTP EXPIRY TIMER ════ */
  useEffect(() => {
    let timer;
    if (view === 'forgot-step2') {
      timer = setInterval(() => {
        setOtpExpiryTime(p => (p > 0 ? p - 1 : 0));
        setResendCooldown(p => (p > 0 ? p - 1 : 0));
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [view]);

  /* ════ INACTIVITY AUTO-LOGOUT ════ */
  const resetInactivityTimer = useCallback(() => {
    if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
    inactivityTimer.current = setTimeout(() => {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    }, INACTIVITY_TIMEOUT);
  }, []);

  useEffect(() => {
    const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
    events.forEach(e => window.addEventListener(e, resetInactivityTimer));
    return () => {
      events.forEach(e => window.removeEventListener(e, resetInactivityTimer));
      if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
    };
  }, [resetInactivityTimer]);

  /* ════ HELPERS ════ */
  const showToast = (title, text, type = 'info') => {
    setModalTitle(title); setModalText(text); setModalType(type); setModalOpen(true);
  };

  const triggerLockout = () => {
    const end = Date.now() + LOCKOUT_SECONDS * 1000;
    setLockoutEndTime(end);
    setIsLocked(true);
    sessionStorage.setItem('loginLockoutEnd', end.toString());
    sessionStorage.setItem('loginAttempts', MAX_ATTEMPTS.toString());
  };

  const recordFailedAttempt = () => {
    const newCount = failedAttempts + 1;
    setFailedAttempts(newCount);
    if (newCount >= MAX_ATTEMPTS) {
      triggerLockout();
      return true; // locked
    }
    return false;
  };

  /* ════ LOGIN SUBMIT ════ */
  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setPhoneError(''); setPassError('');

    if (isLocked) return;

    // Validate
    let valid = true;
    const countryLength = selectedCountry.length;
    if (phone.length !== countryLength || isNaN(phone)) {
      setPhoneError(`Enter a valid ${countryLength}-digit mobile number`);
      valid = false;
    } else if (selectedCountry.pattern && !selectedCountry.pattern.test(phone)) {
      setPhoneError(`Invalid phone number format for ${selectedCountry.name}`);
      valid = false;
    }
    if (password.length < 8) {
      setPassError('Password must be at least 8 characters');
      valid = false;
    }
    if (!valid) return;

    setLoading(true);
    try {
      const url = `${API_BASE}/auth/login`;
      const payload = { phone, password };

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (!res.ok) {
        const locked = recordFailedAttempt();
        if (locked) {
          showToast(
            'Too Many Attempts',
            `Account temporarily locked for ${LOCKOUT_SECONDS} seconds due to multiple failed attempts. Please wait.`,
            'error'
          );
          setLoading(false);
          return;
        }
        const remaining = MAX_ATTEMPTS - (failedAttempts + 1);
        throw new Error(`${data.message || 'Invalid credentials'}${remaining > 0 ? ` (${remaining} attempt${remaining > 1 ? 's' : ''} remaining)` : ''}`);
      }

      // Successful login
      setFailedAttempts(0);
      sessionStorage.removeItem('loginAttempts');
      sessionStorage.removeItem('loginLockoutEnd');

      if (rememberMe) localStorage.setItem('rememberedPhone', phone);
      else localStorage.removeItem('rememberedPhone');

      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      resetInactivityTimer();

      navigate(data.user.role === 'admin' ? '/admin' : '/student');
    } catch (err) {
      showToast('Authentication Failed', err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  /* ════ FORGOT PASSWORD — STEP 1: REQUEST OTP ════ */
  const handleRequestOtp = async (e) => {
    e?.preventDefault();
    setForgotPhoneError('');
    const countryLength = selectedCountry.length;
    if (forgotPhone.length !== countryLength || isNaN(forgotPhone)) {
      setForgotPhoneError(`Please enter a valid ${countryLength}-digit mobile number.`);
      return;
    } else if (selectedCountry.pattern && !selectedCountry.pattern.test(forgotPhone)) {
      setForgotPhoneError(`Invalid phone number format for ${selectedCountry.name}`);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/forgot-password/request`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: forgotPhone })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'OTP request failed');
      setOtpExpiryTime(300); setResendCooldown(30);
      setOtpFields(['', '', '', '', '', '']);
      setView('forgot-step2');
      showToast('OTP Sent', 'A 6-digit verification code has been generated.', 'success');
    } catch (err) { showToast('Error', err.message, 'error'); }
    finally { setLoading(false); }
  };

  /* ════ FORGOT PASSWORD — STEP 2: VERIFY OTP ════ */
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    const otp = otpFields.join('');
    if (otp.length !== 6) { showToast('Incomplete OTP', 'Enter all 6 digits.', 'error'); return; }
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/forgot-password/verify`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: forgotPhone, otp })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Verification failed');
      setResetToken(data.reset_token);
      setView('forgot-step3');
    } catch (err) { showToast('Failed', err.message, 'error'); }
    finally { setLoading(false); }
  };

  /* ════ FORGOT PASSWORD — STEP 3: RESET ════ */
  const handleResetPassword = async (e) => {
    e.preventDefault();
    setNewPasswordError('');
    setConfirmPasswordError('');
    let valid = true;
    if (checkStrength(newPassword) < 5) {
      setNewPasswordError('Password does not meet all requirements.');
      valid = false;
    }
    if (newPassword !== confirmPassword) {
      setConfirmPasswordError('Passwords do not match.');
      valid = false;
    }
    if (!valid) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/forgot-password/reset`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reset_token: resetToken, new_password: newPassword })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Reset failed');
      setView('login');
      setNewPassword(''); setConfirmPassword('');
      showToast('Password Reset', 'Your password has been updated. Please sign in.', 'success');
    } catch (err) { showToast('Reset Failed', err.message, 'error'); }
    finally { setLoading(false); }
  };

  /* ─── OTP input handlers ─── */
  const handleOtpChange = (e, index) => {
    const val = e.target.value;
    if (val && isNaN(val)) return;
    const next = [...otpFields]; next[index] = val.slice(-1);
    setOtpFields(next);
    if (val && index < 5) document.getElementById(`otp-${index + 1}`)?.focus();
  };

  const handleOtpKeyDown = (e, index) => {
    if (e.key === 'Backspace' && !otpFields[index] && index > 0) {
      const prev = [...otpFields]; prev[index - 1] = '';
      setOtpFields(prev);
      document.getElementById(`otp-${index - 1}`)?.focus();
    }
  };

  const handleOtpPaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text');
    if (pasted.length === 6 && !isNaN(pasted)) {
      setOtpFields(pasted.split(''));
      document.getElementById('otp-5')?.focus();
    }
  };

  /* ─── Password strength ─── */
  const checkStrength = (p) => {
    let s = 0;
    if (p.length >= 8) s++;
    if (/[A-Z]/.test(p)) s++;
    if (/[a-z]/.test(p)) s++;
    if (/[0-9]/.test(p)) s++;
    if (/[^A-Za-z0-9]/.test(p)) s++;
    return s;
  };

  const formatTime = (s) =>
    `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  const strength = checkStrength(newPassword);
  const strengthColor = strength >= 5 ? '#10B981' : strength >= 3 ? '#F59E0B' : '#EF4444';
  const strengthLabel = strength >= 5 ? 'Very Strong' : strength >= 3 ? 'Medium' : 'Weak';

  /* ════════════════════════════════════════════════════
     RENDER
  ════════════════════════════════════════════════════ */
  return (
    <>
      {/* ── Full-page dark gradient background ── */}
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #050308 0%, #0D0A1A 30%, #110C24 55%, #0A0814 80%, #070510 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px 16px',
        position: 'relative',
        overflow: 'hidden',
        fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif",
      }}>

        {/* ── Decorative orbs ── */}
        <div style={{ position: 'absolute', top: '-15%', left: '-10%', width: 520, height: 520, borderRadius: '50%', background: 'radial-gradient(circle, rgba(108,60,240,0.14) 0%, transparent 65%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: '-20%', right: '-8%', width: 600, height: 600, borderRadius: '50%', background: 'radial-gradient(circle, rgba(76,34,188,0.10) 0%, transparent 65%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', top: '40%', right: '15%', width: 280, height: 280, borderRadius: '50%', background: 'radial-gradient(circle, rgba(167,139,250,0.06) 0%, transparent 70%)', pointerEvents: 'none' }} />

        {/* ── Subtle grid texture ── */}
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.018) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.018) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }} />

        {/* ══════════════════════════════════════
            GLASSMORPHISM CARD
        ══════════════════════════════════════ */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', maxWidth: 440, zIndex: 1 }}>
          <div style={{
            width: '100%',
            background: 'rgba(255, 255, 255, 0.04)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 24,
            padding: '44px 40px 40px',
            boxShadow: '0 32px 80px rgba(0,0,0,0.5), 0 0 0 1px rgba(108,60,240,0.08), inset 0 1px 0 rgba(255,255,255,0.06)',
            position: 'relative',
            animation: 'cardFadeIn 0.5s cubic-bezier(0.4,0,0.2,1)',
          }}>

          {/* ── Card top accent line ── */}
          <div style={{
            position: 'absolute', top: 0, left: '10%', right: '10%', height: 1,
            background: 'linear-gradient(90deg, transparent, rgba(108,60,240,0.6), rgba(167,139,250,0.4), transparent)',
            borderRadius: '0 0 4px 4px',
          }} />

          {/* ── LOGO ── */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 32 }}>
            <div style={{
              width: 60, height: 60, borderRadius: 16,
              background: 'linear-gradient(135deg, #6C3CF0 0%, #4c22bc 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 8px 24px rgba(108,60,240,0.4), 0 0 0 1px rgba(108,60,240,0.3)',
              marginBottom: 18,
            }}>
              <GraduationCap size={28} color="white" strokeWidth={1.75} />
            </div>

            <h1 style={{
              fontSize: 22, fontWeight: 800, color: '#FFFFFF',
              letterSpacing: -0.5, margin: '0 0 6px', textAlign: 'center',
            }}>
              {view === 'login' && <>Welcome Back to <span style={{ color: '#A78BFA' }}>Levlox</span></>}
              {view === 'forgot-step1' && <>Recover <span style={{ color: '#A78BFA' }}>Password</span></>}
              {view === 'forgot-step2' && <>Verify <span style={{ color: '#A78BFA' }}>OTP Code</span></>}
              {view === 'forgot-step3' && <>Create New <span style={{ color: '#A78BFA' }}>Password</span></>}
            </h1>
            <p style={{ fontSize: 13.5, color: 'rgba(255,255,255,0.38)', margin: 0, textAlign: 'center', fontWeight: 500 }}>
              {view === 'login' && 'Sign in to access your dashboard'}
              {view === 'forgot-step1' && "Enter your registered mobile number below"}
              {view === 'forgot-step2' && 'Enter the 6-digit code sent to your number'}
              {view === 'forgot-step3' && 'Set a strong password for your account'}
            </p>
          </div>

          {/* ── LOCKOUT BANNER ── */}
          {isLocked && (
            <div style={{
              background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)',
              borderRadius: 12, padding: '14px 16px', marginBottom: 20,
              display: 'flex', alignItems: 'center', gap: 12,
            }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(239,68,68,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Shield size={18} color="#F87171" strokeWidth={1.75} />
              </div>
              <div>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#FCA5A5' }}>Account Temporarily Locked</p>
                <p style={{ margin: '2px 0 0', fontSize: 12, color: 'rgba(252,165,165,0.7)' }}>
                  Too many failed attempts. Try again in <span style={{ fontWeight: 800, color: '#FCA5A5' }}>{lockoutCountdown}s</span>
                </p>
              </div>
            </div>
          )}

          {/* ── ATTEMPT WARNING (3–4 attempts) ── */}
          {!isLocked && failedAttempts >= 3 && failedAttempts < MAX_ATTEMPTS && (
            <div style={{
              background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)',
              borderRadius: 10, padding: '10px 14px', marginBottom: 16,
              display: 'flex', alignItems: 'center', gap: 10,
            }}>
              <AlertTriangle size={15} color="#FBBF24" strokeWidth={1.75} />
              <p style={{ margin: 0, fontSize: 12.5, color: '#FDE68A', fontWeight: 600 }}>
                {MAX_ATTEMPTS - failedAttempts} attempt{MAX_ATTEMPTS - failedAttempts > 1 ? 's' : ''} remaining before temporary lockout
              </p>
            </div>
          )}

          {/* ══════════ FORMS ══════════ */}
          {view === 'login' && (
            <form onSubmit={handleLoginSubmit} noValidate className="animated-form">
              {/* ─── Mobile Number ─── */}
              <div style={{ marginBottom: phoneError ? 10 : 20 }}>
                <label style={labelStyle} htmlFor="phone">Mobile Number</label>
                <div className={`input-group-relative ${phoneError ? 'error-border' : phone.length === selectedCountry.length ? 'success-border' : ''}`}>
                  <button
                    type="button"
                    onClick={() => setDropdownOpen(!dropdownOpen)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      background: 'transparent',
                      border: 'none',
                      color: 'rgba(255, 255, 255, 0.9)',
                      fontSize: '15px',
                      paddingLeft: 16,
                      paddingRight: 10,
                      height: '100%',
                      cursor: 'pointer',
                      outline: 'none',
                      flexShrink: 0,
                    }}
                  >
                    <span style={{
                      background: 'rgba(139, 92, 246, 0.15)',
                      border: '1px solid rgba(139, 92, 246, 0.3)',
                      padding: '3px 8px',
                      borderRadius: '6px',
                      fontSize: '11px',
                      fontWeight: '800',
                      color: '#C4B5FD',
                      letterSpacing: '0.5px',
                      textTransform: 'uppercase'
                    }}>
                      {selectedCountry.code}
                    </span>
                    <span style={{ fontSize: 9, opacity: 0.5 }}>▼</span>
                  </button>

                  <div style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.12)', flexShrink: 0 }} />

                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    paddingLeft: 12,
                    paddingRight: 12,
                    color: '#FFFFFF',
                    fontWeight: 600,
                    fontSize: '14.5px',
                    flexShrink: 0,
                    userSelect: 'none',
                  }}>
                    {selectedCountry.dial}
                  </div>

                  <div style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.12)', flexShrink: 0 }} />

                  <input
                    id="phone"
                    className="premium-input phone-input-field"
                    style={{ cursor: isLocked ? 'not-allowed' : 'text' }}
                    type="tel"
                    maxLength={selectedCountry.length}
                    placeholder="Enter your mobile number"
                    value={phone}
                    onChange={e => { setPhone(e.target.value.replace(/\D/g, '')); setPhoneError(''); }}
                    disabled={isLocked}
                    autoComplete="off"
                    required
                  />

                  {phone.length === selectedCountry.length && !phoneError && (
                    <div style={{ paddingRight: 18, display: 'flex', alignItems: 'center', color: '#10B981', flexShrink: 0 }}>
                      <Check size={15} />
                    </div>
                  )}

                  {dropdownOpen && (
                    <div style={{
                      position: 'absolute',
                      top: '62px',
                      left: 0,
                      width: '100%',
                      background: '#0d0a1b',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      borderRadius: '14px',
                      boxShadow: '0 12px 36px rgba(0, 0, 0, 0.6)',
                      zIndex: 100,
                      padding: '8px',
                      boxSizing: 'border-box',
                      animation: 'formFadeIn 0.2s ease',
                    }}>
                      <input
                        type="text"
                        placeholder="Search country..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        autoFocus
                        autoComplete="off"
                        style={{
                          width: '100%',
                          height: '38px',
                          background: 'rgba(255, 255, 255, 0.05)',
                          border: '1px solid rgba(255, 255, 255, 0.08)',
                          borderRadius: '8px',
                          padding: '0 12px',
                          color: '#FFFFFF',
                          fontSize: '13px',
                          outline: 'none',
                          boxSizing: 'border-box',
                          marginBottom: '8px',
                        }}
                      />
                      <div style={{ maxHeight: '210px', overflowY: 'auto' }}>
                        {COUNTRIES.filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()) || c.dial.includes(searchQuery))
                          .map(c => {
                            const isSelected = selectedCountry.code === c.code;
                            return (
                              <div
                                key={c.code}
                                onClick={() => {
                                  setSelectedCountry(c);
                                  setPhone('');
                                  setPhoneError('');
                                  setDropdownOpen(false);
                                  setSearchQuery('');
                                }}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  padding: '10px 12px',
                                  borderRadius: '10px',
                                  cursor: 'pointer',
                                  fontSize: '13.5px',
                                  color: isSelected ? '#FFFFFF' : 'rgba(255,255,255,0.7)',
                                  background: isSelected ? '#6C3CF0' : 'transparent',
                                  transition: 'all 0.15s',
                                  marginBottom: '2px',
                                }}
                                onMouseEnter={e => {
                                  if (!isSelected) e.currentTarget.style.background = 'rgba(108, 60, 240, 0.15)';
                                }}
                                onMouseLeave={e => {
                                  if (!isSelected) e.currentTarget.style.background = 'transparent';
                                }}
                              >
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                  <span style={{
                                    background: isSelected ? 'rgba(255, 255, 255, 0.2)' : 'rgba(255, 255, 255, 0.08)',
                                    padding: '2px 6px',
                                    borderRadius: '4px',
                                    fontSize: '10px',
                                    fontWeight: '800',
                                    color: isSelected ? '#FFFFFF' : '#C4B5FD',
                                  }}>
                                    {c.code}
                                  </span>
                                  <span style={{ fontWeight: isSelected ? '700' : '500' }}>{c.name}</span>
                                </div>
                                <span style={{ fontWeight: 600, opacity: isSelected ? 0.9 : 0.4 }}>{c.dial}</span>
                              </div>
                            );
                          })}
                      </div>
                    </div>
                  )}
                </div>
                {phoneError && <p style={errorStyle}>{phoneError}</p>}
              </div>

              {/* ─── Password ─── */}
              <div style={{ marginBottom: passError ? 10 : 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 7 }}>
                  <label style={{ ...labelStyle, marginBottom: 0 }} htmlFor="password">Password</label>
                  <button
                    type="button"
                    onClick={() => { setView('forgot-step1'); setForgotPhone(''); setForgotPhoneError(''); }}
                    style={{ background: 'none', border: 'none', color: '#A78BFA', fontSize: 12.5, fontWeight: 700, cursor: 'pointer', padding: 0, transition: 'color 0.15s' }}
                    onMouseEnter={e => e.currentTarget.style.color = '#C4B5FD'}
                    onMouseLeave={e => e.currentTarget.style.color = '#A78BFA'}
                  >
                    Forgot Password?
                  </button>
                </div>
                <div className={`input-group-relative ${passError ? 'error-border' : ''}`}>
                  <div className="input-icon-left">
                    <Lock size={16} />
                  </div>
                  <input
                    id="password"
                    className="premium-input"
                    style={{ cursor: isLocked ? 'not-allowed' : 'text' }}
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter your password"
                    value={password}
                    onChange={e => { setPassword(e.target.value); setPassError(''); }}
                    disabled={isLocked}
                    autoComplete="new-password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(p => !p)}
                    className="input-icon-right"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {passError && <p style={errorStyle}>{passError}</p>}
              </div>

              {/* ─── Remember Me ─── */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24, marginTop: 4 }}>
                <div
                  onClick={() => setRememberMe(p => !p)}
                  style={{
                    width: 18, height: 18, borderRadius: 5,
                    border: `1.5px solid ${rememberMe ? '#6C3CF0' : 'rgba(255,255,255,0.2)'}`,
                    background: rememberMe ? '#6C3CF0' : 'transparent',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', flexShrink: 0, transition: 'all 0.15s',
                  }}
                >
                  {rememberMe && <Check size={11} color="white" strokeWidth={2.5} />}
                </div>
                <label
                  onClick={() => setRememberMe(p => !p)}
                  style={{ fontSize: 13.5, color: 'rgba(255,255,255,0.5)', cursor: 'pointer', fontWeight: 500, userSelect: 'none' }}
                >
                  Remember me on this device
                </label>
              </div>

              {/* ─── SUBMIT BUTTON ─── */}
              <button
                type="submit"
                disabled={loading || isLocked}
                style={{
                  width: '100%', height: 52, borderRadius: 14, border: 'none',
                  background: isLocked
                    ? 'rgba(108,60,240,0.2)'
                    : 'linear-gradient(135deg, #6C3CF0 0%, #4c22bc 100%)',
                  color: isLocked ? 'rgba(255,255,255,0.3)' : 'white',
                  fontSize: 15, fontWeight: 800, cursor: isLocked ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                  fontFamily: 'inherit', letterSpacing: -0.2,
                  boxShadow: isLocked ? 'none' : '0 8px 24px rgba(108,60,240,0.35), inset 0 1px 0 rgba(255,255,255,0.12)',
                  transition: 'all 0.22s',
                  position: 'relative', overflow: 'hidden',
                }}
                onMouseEnter={e => { if (!isLocked && !loading) { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 14px 32px rgba(108,60,240,0.45), inset 0 1px 0 rgba(255,255,255,0.12)'; } }}
                onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = isLocked ? 'none' : '0 8px 24px rgba(108,60,240,0.35), inset 0 1px 0 rgba(255,255,255,0.12)'; }}
              >
                {loading ? (
                  <>
                    <span style={{ width: 18, height: 18, border: '2px solid rgba(255,255,255,0.25)', borderTopColor: 'white', borderRadius: '50%', display: 'inline-block', animation: 'loginSpin 0.75s linear infinite' }} />
                    Authenticating…
                  </>
                ) : isLocked ? (
                  <>
                    <Shield size={17} strokeWidth={1.75} /> Locked · {lockoutCountdown}s
                  </>
                ) : (
                  <>
                    <ShieldCheck size={17} strokeWidth={1.75} /> Secure Login
                  </>
                )}
              </button>
            </form>
          )}

          {/* FORGOT PASSWORD — STEP 1 */}
          {view === 'forgot-step1' && (
            <form onSubmit={handleRequestOtp} className="animated-form" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div>
                <label style={labelStyle} htmlFor="forgot-phone">Mobile Number</label>
                <div className={`input-group-relative ${forgotPhoneError ? 'error-border' : ''}`}>
                  <button
                    type="button"
                    onClick={() => setDropdownOpen(!dropdownOpen)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      background: 'transparent',
                      border: 'none',
                      color: 'rgba(255, 255, 255, 0.9)',
                      fontSize: '15px',
                      paddingLeft: 16,
                      paddingRight: 10,
                      height: '100%',
                      cursor: 'pointer',
                      outline: 'none',
                      flexShrink: 0,
                    }}
                  >
                    <span style={{
                      background: 'rgba(139, 92, 246, 0.15)',
                      border: '1px solid rgba(139, 92, 246, 0.3)',
                      padding: '3px 8px',
                      borderRadius: '6px',
                      fontSize: '11px',
                      fontWeight: '800',
                      color: '#C4B5FD',
                      letterSpacing: '0.5px',
                      textTransform: 'uppercase'
                    }}>
                      {selectedCountry.code}
                    </span>
                    <span style={{ fontSize: 9, opacity: 0.5 }}>▼</span>
                  </button>

                  <div style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.12)', flexShrink: 0 }} />

                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    paddingLeft: 12,
                    paddingRight: 12,
                    color: '#FFFFFF',
                    fontWeight: 600,
                    fontSize: '14.5px',
                    flexShrink: 0,
                    userSelect: 'none',
                  }}>
                    {selectedCountry.dial}
                  </div>

                  <div style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.12)', flexShrink: 0 }} />

                  <input
                    id="forgot-phone"
                    className="premium-input phone-input-field"
                    type="tel"
                    maxLength={selectedCountry.length}
                    placeholder="Enter your mobile number"
                    value={forgotPhone}
                    onChange={e => { setForgotPhone(e.target.value.replace(/\D/g, '')); setForgotPhoneError(''); }}
                    autoComplete="off"
                    required
                  />

                  {dropdownOpen && (
                    <div style={{
                      position: 'absolute',
                      top: '62px',
                      left: 0,
                      width: '100%',
                      background: '#0d0a1b',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      borderRadius: '14px',
                      boxShadow: '0 12px 36px rgba(0, 0, 0, 0.6)',
                      zIndex: 100,
                      padding: '8px',
                      boxSizing: 'border-box',
                      animation: 'formFadeIn 0.2s ease',
                    }}>
                      <input
                        type="text"
                        placeholder="Search country..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        autoFocus
                        autoComplete="off"
                        style={{
                          width: '100%',
                          height: '38px',
                          background: 'rgba(255, 255, 255, 0.05)',
                          border: '1px solid rgba(255, 255, 255, 0.08)',
                          borderRadius: '8px',
                          padding: '0 12px',
                          color: '#FFFFFF',
                          fontSize: '13px',
                          outline: 'none',
                          boxSizing: 'border-box',
                          marginBottom: '8px',
                        }}
                      />
                      <div style={{ maxHeight: '210px', overflowY: 'auto' }}>
                        {COUNTRIES.filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()) || c.dial.includes(searchQuery))
                          .map(c => {
                            const isSelected = selectedCountry.code === c.code;
                            return (
                              <div
                                key={c.code}
                                onClick={() => {
                                  setSelectedCountry(c);
                                  setForgotPhone('');
                                  setForgotPhoneError('');
                                  setDropdownOpen(false);
                                  setSearchQuery('');
                                }}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  padding: '10px 12px',
                                  borderRadius: '10px',
                                  cursor: 'pointer',
                                  fontSize: '13.5px',
                                  color: isSelected ? '#FFFFFF' : 'rgba(255,255,255,0.7)',
                                  background: isSelected ? '#6C3CF0' : 'transparent',
                                  transition: 'all 0.15s',
                                  marginBottom: '2px',
                                }}
                                onMouseEnter={e => {
                                  if (!isSelected) e.currentTarget.style.background = 'rgba(108, 60, 240, 0.15)';
                                }}
                                onMouseLeave={e => {
                                  if (!isSelected) e.currentTarget.style.background = 'transparent';
                                }}
                              >
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                  <span style={{
                                    background: isSelected ? 'rgba(255, 255, 255, 0.2)' : 'rgba(255, 255, 255, 0.08)',
                                    padding: '2px 6px',
                                    borderRadius: '4px',
                                    fontSize: '10px',
                                    fontWeight: '800',
                                    color: isSelected ? '#FFFFFF' : '#C4B5FD',
                                  }}>
                                    {c.code}
                                  </span>
                                  <span style={{ fontWeight: isSelected ? '700' : '500' }}>{c.name}</span>
                                </div>
                                <span style={{ fontWeight: 600, opacity: isSelected ? 0.9 : 0.4 }}>{c.dial}</span>
                              </div>
                            );
                          })}
                      </div>
                    </div>
                  )}
                </div>
                {forgotPhoneError && <p style={errorStyle}>{forgotPhoneError}</p>}
              </div>

              <div style={{ display: 'flex', gap: 12 }}>
                <button
                  type="button"
                  onClick={() => setView('login')}
                  style={{
                    height: 52, width: 56, borderRadius: 14, border: '1px solid rgba(255,255,255,0.1)',
                    background: 'rgba(255,255,255,0.03)', color: 'rgba(255,255,255,0.7)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = '#FFFFFF'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; e.currentTarget.style.color = 'rgba(255,255,255,0.7)'; }}
                >
                  <ArrowLeft size={18} />
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    flex: 1, height: 52, borderRadius: 14, border: 'none',
                    background: 'linear-gradient(135deg, #6C3CF0 0%, #4c22bc 100%)',
                    color: 'white', fontSize: 15, fontWeight: 800, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: '0 8px 24px rgba(108,60,240,0.35), inset 0 1px 0 rgba(255,255,255,0.12)',
                    transition: 'all 0.22s'
                  }}
                  onMouseEnter={e => { if (!loading) { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 14px 32px rgba(108,60,240,0.45), inset 0 1px 0 rgba(255,255,255,0.12)'; } }}
                  onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '0 8px 24px rgba(108,60,240,0.35), inset 0 1px 0 rgba(255,255,255,0.12)'; }}
                >
                  {loading ? 'Sending Code…' : 'Send OTP'}
                </button>
              </div>
            </form>
          )}

          {/* FORGOT PASSWORD — STEP 2 */}
          {view === 'forgot-step2' && (
            <form onSubmit={handleVerifyOtp} className="animated-form" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'center', gap: 8 }} onPaste={handleOtpPaste}>
                {otpFields.map((val, i) => (
                  <input
                    key={i}
                    id={`otp-${i}`}
                    type="text"
                    maxLength={1}
                    value={val}
                    onChange={e => handleOtpChange(e, i)}
                    onKeyDown={e => handleOtpKeyDown(e, i)}
                    autoFocus={i === 0}
                    style={{
                      width: 44, height: 52, textAlign: 'center', fontSize: 20, fontWeight: 800,
                      border: `1.5px solid ${val ? '#8B5CF6' : 'rgba(255,255,255,0.1)'}`,
                      borderRadius: 10, background: val ? 'rgba(108,60,240,0.08)' : 'rgba(255,255,255,0.03)',
                      outline: 'none', fontFamily: 'inherit', color: 'white',
                      transition: 'all 0.15s',
                    }}
                  />
                ))}
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '0 4px' }}>
                <span style={{ color: otpExpiryTime > 0 ? 'rgba(255,255,255,0.5)' : '#F87171', fontWeight: 600 }}>
                  Expires in: {formatTime(otpExpiryTime)}
                </span>
                {resendCooldown > 0
                  ? <span style={{ color: 'rgba(255,255,255,0.3)', fontWeight: 600 }}>Resend in {resendCooldown}s</span>
                  : <button type="button" onClick={handleRequestOtp} style={{ background: 'none', border: 'none', color: '#A78BFA', fontWeight: 700, cursor: 'pointer', fontSize: 'inherit', padding: 0 }}>Resend OTP</button>
                }
              </div>

              <div style={{ display: 'flex', gap: 12 }}>
                <button
                  type="button"
                  onClick={() => setView('forgot-step1')}
                  style={{
                    height: 52, width: 56, borderRadius: 14, border: '1px solid rgba(255,255,255,0.1)',
                    background: 'rgba(255,255,255,0.03)', color: 'rgba(255,255,255,0.7)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = '#FFFFFF'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; e.currentTarget.style.color = 'rgba(255,255,255,0.7)'; }}
                >
                  <ArrowLeft size={18} />
                </button>
                <button
                  type="submit"
                  disabled={loading || otpExpiryTime === 0}
                  style={{
                    flex: 1, height: 52, borderRadius: 14, border: 'none',
                    background: 'linear-gradient(135deg, #6C3CF0 0%, #4c22bc 100%)',
                    color: 'white', fontSize: 15, fontWeight: 800, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: '0 8px 24px rgba(108,60,240,0.35), inset 0 1px 0 rgba(255,255,255,0.12)',
                    transition: 'all 0.22s'
                  }}
                  onMouseEnter={e => { if (!loading && otpExpiryTime > 0) { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 14px 32px rgba(108,60,240,0.45), inset 0 1px 0 rgba(255,255,255,0.12)'; } }}
                  onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '0 8px 24px rgba(108,60,240,0.35), inset 0 1px 0 rgba(255,255,255,0.12)'; }}
                >
                  {loading ? 'Verifying OTP…' : 'Verify Code'}
                </button>
              </div>
            </form>
          )}

          {/* FORGOT PASSWORD — STEP 3 */}
          {view === 'forgot-step3' && (
            <form onSubmit={handleResetPassword} className="animated-form" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* New Password */}
              <div>
                <label style={labelStyle} htmlFor="new-password">New Password</label>
                <div className={`input-group-relative ${newPasswordError ? 'error-border' : ''}`}>
                  <div className="input-icon-left">
                    <Lock size={16} />
                  </div>
                  <input
                    id="new-password"
                    className="premium-input"
                    type={showNewPassword ? 'text' : 'password'}
                    placeholder="Enter your password"
                    value={newPassword}
                    onChange={e => { setNewPassword(e.target.value); setNewPasswordError(''); }}
                    required
                  />
                  <button type="button" onClick={() => setShowNewPassword(p => !p)} className="input-icon-right">
                    {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {newPasswordError && <p style={errorStyle}>{newPasswordError}</p>}
              </div>

              {/* Strength indicator */}
              {newPassword && (
                <div style={{ marginTop: 2 }}>
                  <div style={{ display: 'flex', gap: 4, marginBottom: 5 }}>
                    {[1, 2, 3, 4, 5].map(i => (
                      <div key={i} style={{ flex: 1, height: 4, borderRadius: 2, background: i <= strength ? strengthColor : 'rgba(255,255,255,0.1)', transition: 'background 0.2s' }} />
                    ))}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5 }}>
                    <span style={{ color: 'rgba(255,255,255,0.45)' }}>Password strength</span>
                    <span style={{ fontWeight: 700, color: strengthColor }}>{strengthLabel}</span>
                  </div>
                </div>
              )}

              {/* Confirm Password */}
              <div>
                <label style={labelStyle} htmlFor="confirm-password">Confirm Password</label>
                <div className={`input-group-relative ${confirmPasswordError ? 'error-border' : ''}`}>
                  <div className="input-icon-left">
                    <Lock size={16} />
                  </div>
                  <input
                    id="confirm-password"
                    className="premium-input"
                    type={showNewPassword ? 'text' : 'password'}
                    placeholder="Enter your password"
                    value={confirmPassword}
                    onChange={e => { setConfirmPassword(e.target.value); setConfirmPasswordError(''); }}
                    required
                  />
                </div>
                {confirmPasswordError && <p style={errorStyle}>{confirmPasswordError}</p>}
              </div>

              {/* Password strength checklist / rules */}
              <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 12, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                {[
                  { ok: newPassword.length >= 8, label: 'Minimum 8 characters' },
                  { ok: /[A-Z]/.test(newPassword), label: 'One uppercase letter' },
                  { ok: /[a-z]/.test(newPassword), label: 'One lowercase letter' },
                  { ok: /[0-9]/.test(newPassword), label: 'One number' },
                  { ok: /[^A-Za-z0-9]/.test(newPassword), label: 'One special character' },
                ].map((r, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12, color: r.ok ? '#10B981' : 'rgba(255,255,255,0.3)' }}>
                    {r.ok ? <Check size={12} /> : <X size={12} />} {r.label}
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', gap: 12, marginTop: 4 }}>
                <button
                  type="button"
                  onClick={() => setView('forgot-step2')}
                  style={{
                    height: 52, width: 56, borderRadius: 14, border: '1px solid rgba(255,255,255,0.1)',
                    background: 'rgba(255,255,255,0.03)', color: 'rgba(255,255,255,0.7)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = '#FFFFFF'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; e.currentTarget.style.color = 'rgba(255,255,255,0.7)'; }}
                >
                  <ArrowLeft size={18} />
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    flex: 1, height: 52, borderRadius: 14, border: 'none',
                    background: 'linear-gradient(135deg, #6C3CF0 0%, #4c22bc 100%)',
                    color: 'white', fontSize: 15, fontWeight: 800, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: '0 8px 24px rgba(108,60,240,0.35), inset 0 1px 0 rgba(255,255,255,0.12)',
                    transition: 'all 0.22s'
                  }}
                  onMouseEnter={e => { if (!loading) { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 14px 32px rgba(108,60,240,0.45), inset 0 1px 0 rgba(255,255,255,0.12)'; } }}
                  onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '0 8px 24px rgba(108,60,240,0.35), inset 0 1px 0 rgba(255,255,255,0.12)'; }}
                >
                  {loading ? 'Saving…' : 'Save Password'}
                </button>
              </div>
            </form>
          )}

          {/* ─── Attempt dots indicator ─── */}
          {view === 'login' && !isLocked && failedAttempts > 0 && failedAttempts < MAX_ATTEMPTS && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginTop: 18 }}>
              {Array.from({ length: MAX_ATTEMPTS }).map((_, i) => (
                <div
                  key={i}
                  style={{
                    width: 7, height: 7, borderRadius: '50%',
                    background: i < failedAttempts ? '#EF4444' : 'rgba(255,255,255,0.12)',
                    transition: 'background 0.2s',
                  }}
                />
              ))}
            </div>
          )}
          </div>

          {/* ─── Security Footer ─── */}
          <div style={{ marginTop: 24, textAlign: 'center', position: 'relative' }}>
            <span style={{ fontSize: 11.5, color: 'rgba(255, 255, 255, 0.25)', fontWeight: 500, letterSpacing: '0.4px', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              🔒 Secure Authentication
            </span>
          </div>
        </div>
      </div>

      {/* ─── Toast Modal ─── */}
      <CustomModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={modalTitle}
        type={modalType}
        confirmText="Dismiss"
        onConfirm={() => setModalOpen(false)}
      >
        <p style={{ fontSize: 14, color: 'var(--text-secondary)', margin: 0, lineHeight: 1.65 }}>{modalText}</p>
      </CustomModal>

      {/* ─── Styles ─── */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Inter:wght@400;500;600;700&display=swap');
        
        @keyframes cardFadeIn {
          from { opacity: 0; transform: translateY(20px) scale(0.98); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes formFadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes loginSpin {
          to { transform: rotate(360deg); }
        }
        
        .animated-form {
          animation: formFadeIn 0.35s cubic-bezier(0.4, 0, 0.2, 1) forwards;
        }

        .input-group-relative {
          position: relative;
          width: 100%;
          display: flex;
          align-items: center;
          height: 56px;
          background: rgba(255, 255, 255, 0.03) !important;
          border: 1px solid rgba(255, 255, 255, 0.08) !important;
          border-radius: 14px !important;
          box-sizing: border-box;
          transition: all 0.2s ease;
        }
        .input-group-relative:focus-within {
          border-color: #8B5CF6 !important;
          box-shadow: 0 0 8px rgba(139, 92, 246, 0.3) !important;
          background: rgba(255, 255, 255, 0.05) !important;
        }
        .input-group-relative.error-border {
          border-color: #EF4444 !important;
          box-shadow: 0 0 8px rgba(239, 68, 68, 0.2) !important;
        }
        .input-group-relative.success-border {
          border-color: #10B981 !important;
          box-shadow: 0 0 8px rgba(16, 185, 129, 0.2) !important;
        }

        .premium-input {
          width: 100%;
          height: 100%;
          background: transparent !important;
          border: none !important;
          outline: none !important;
          font-size: 14.5px;
          font-family: inherit;
          color: #FFFFFF !important;
          box-sizing: border-box;
          padding: 0 48px !important;
          transition: all 0.2s ease;
        }
        .premium-input.phone-input-field {
          padding-left: 14px !important;
          padding-right: 18px !important;
        }
        .premium-input::placeholder {
          color: rgba(156, 163, 175, 0.55);
        }

        /* Hide Microsoft Edge native password reveal eye icon */
        input::-ms-reveal,
        input::-ms-clear {
          display: none !important;
          width: 0;
          height: 0;
        }

        .input-icon-left {
          position: absolute;
          left: 18px;
          top: 50%;
          transform: translateY(-50%);
          color: rgba(255, 255, 255, 0.35);
          pointer-events: none;
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 2;
        }

        .input-icon-right {
          position: absolute;
          right: 18px;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          color: rgba(255, 255, 255, 0.3);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 4px;
          z-index: 2;
          transition: color 0.15s;
        }
        .input-icon-right:hover {
          color: rgba(255, 255, 255, 0.7);
        }

        .input-success-icon {
          position: absolute;
          right: 18px;
          top: 50%;
          transform: translateY(-50%);
          color: #10B981;
          display: flex;
          align-items: center;
          z-index: 2;
        }

        input.premium-input:-webkit-autofill {
          -webkit-box-shadow: 0 0 0 100px #0e0a1f inset !important;
          -webkit-text-fill-color: #ffffff !important;
          caret-color: white;
        }
      `}</style>
    </>
  );
};

/* ─── Shared input styles ─────────────────────────── */
const labelStyle = {
  display: 'block',
  fontSize: '11px',
  fontWeight: 700,
  color: 'rgba(255,255,255,0.45)',
  textTransform: 'uppercase',
  letterSpacing: '0.6px',
  marginBottom: '7px',
};

const errorStyle = {
  margin: '6px 0 0',
  fontSize: '12px',
  color: '#F87171',
  fontWeight: 600,
  display: 'flex',
  alignItems: 'center',
  gap: 4,
};

export default Login;
