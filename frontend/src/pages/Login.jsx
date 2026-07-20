import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import leveloxLogo from '../assets/levelox-icon-transparent.png';
import {
  Eye, EyeOff, Lock, Phone, User, Check, X,
  ShieldCheck, KeyRound, ArrowLeft, AlertTriangle,
  Shield, Loader2, GraduationCap, Sparkles
} from 'lucide-react';
import { RecaptchaVerifier, signInWithPhoneNumber } from "firebase/auth";
import { auth } from "../firebase";
import CustomModal from '../components/Modal';
import { getDeviceId, getDeviceType, getDeviceLabel } from "../utils/deviceId";

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
const MAX_ATTEMPTS = 5;
const LOCKOUT_SECONDS = 30;
const INACTIVITY_TIMEOUT = 15 * 60 * 1000;

const Login = () => {
  /* ─── Form states ─── */
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  /* ─── Student Registration states ─── */
  const [regName, setRegName] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);

  /* ─── Country selector state ─── */
  const [selectedCountry, setSelectedCountry] = useState(COUNTRIES[0]);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  /* ─── View State: 'login', 'register', 'forgot-step1', 'forgot-step2', 'forgot-step3' ─── */
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
  const [confirmResult, setConfirmResult] = useState(null);
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

    const params = new URLSearchParams(window.location.search);
    const reason = params.get('reason');
    if (reason === 'session_revoked') {
      setModalTitle('Session Revoked');
      setModalText('You have been logged out because this session was revoked or you logged in from another device.');
      setModalType('warning');
      setModalOpen(true);
    } else if (reason === 'session_expired') {
      setModalTitle('Session Expired');
      setModalText('Your session has expired. Please sign in again.');
      setModalType('info');
      setModalOpen(true);
    } else if (reason === 'inactivity') {
      setModalTitle('Session Inactivity');
      setModalText('You have been logged out due to 30 minutes of inactivity.');
      setModalType('info');
      setModalOpen(true);
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
      return true;
    }
    return false;
  };

  const isMockFirebase = !import.meta.env.VITE_FIREBASE_API_KEY || import.meta.env.VITE_FIREBASE_API_KEY === "PLACEHOLDER_API_KEY";

  const setupRecaptcha = () => {
    if (!window.recaptchaVerifier) {
      window.recaptchaVerifier = new RecaptchaVerifier(auth, "recaptcha-container", {
        size: "invisible",
        callback: () => { }
      });
    }
  };

  /* ════ LOGIN SUBMIT ════ */
  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setPhoneError(''); setPassError('');

    if (isLocked) return;

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
      const formattedPhone = `${selectedCountry.dial}${phone}`;
      const payload = {
        phone: formattedPhone,
        password,
        device_id: getDeviceId(),
        device_type: getDeviceType(),
        device_label: getDeviceLabel()
      };

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

  /* ════ STUDENT SELF-REGISTRATION ════ */
  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    let valid = true;
    if (!regName.trim()) {
      showToast('Validation Error', 'Name is required', 'error');
      valid = false;
    }
    const countryLength = selectedCountry.length;
    if (regPhone.length !== countryLength || isNaN(regPhone)) {
      showToast('Validation Error', `Enter a valid ${countryLength}-digit mobile number`, 'error');
      valid = false;
    }
    if (regPassword.length < 8) {
      showToast('Validation Error', 'Password must be at least 8 characters', 'error');
      valid = false;
    }
    if (regPassword !== regConfirmPassword) {
      showToast('Validation Error', 'Passwords do not match', 'error');
      valid = false;
    }
    if (!valid) return;

    setLoading(true);
    try {
      const formattedPhone = `${selectedCountry.dial}${regPhone}`;
      const res = await fetch(`${API_BASE}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: regName,
          phone: formattedPhone,
          email: regEmail,
          password: regPassword
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Registration failed');
      showToast('Success', 'Registration successful! Please login with your password.', 'success');
      setView('login');
      setPhone(regPhone);
      setRegName(''); setRegPhone(''); setRegEmail(''); setRegPassword(''); setRegConfirmPassword('');
    } catch (err) {
      showToast('Registration Failed', err.message, 'error');
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
      const formattedPhone = `${selectedCountry.dial}${forgotPhone}`;

      const res = await fetch(`${API_BASE}/auth/forgot-password/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: formattedPhone })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Phone check failed');

      if (isMockFirebase) {
        setOtpStep => { };
        setOtpFields(['', '', '', '', '', '']);
        setOtpExpiryTime(300);
        setResendCooldown(30);
        setView('forgot-step2');
        showToast('SMS Mock Mode', 'Development mode. OTP code is 123456.', 'success');
        console.log(`[FIREBASE MOCK] OTP for ${formattedPhone} is 123456`);
      } else {
        setupRecaptcha();
        const result = await signInWithPhoneNumber(auth, formattedPhone, window.recaptchaVerifier);
        setConfirmResult(result);
        setOtpFields(['', '', '', '', '', '']);
        setOtpExpiryTime(300);
        setResendCooldown(30);
        setView('forgot-step2');
        showToast('OTP Sent', `Verification code sent to ${formattedPhone}.`, 'success');
      }
    } catch (err) {
      showToast('Error', err.message || 'Could not request OTP.', 'error');
    } finally {
      setLoading(false);
    }
  };

  /* ════ FORGOT PASSWORD — STEP 2: VERIFY OTP ════ */
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    const otp = otpFields.join('');
    if (otp.length !== 6) { showToast('Incomplete OTP', 'Enter all 6 digits.', 'error'); return; }
    setLoading(true);
    try {
      let idToken = '';
      if (isMockFirebase) {
        if (otp !== '123456') {
          throw new Error('Invalid verification code. Try 123456');
        }
        idToken = `mock-token-${selectedCountry.dial}${forgotPhone}`;
      } else {
        const result = await confirmResult.confirm(otp);
        idToken = await result.user.getIdToken();
      }
      setResetToken(idToken);
      setView('forgot-step3');
    } catch (err) {
      showToast('Failed', err.message || 'Verification failed.', 'error');
    } finally {
      setLoading(false);
    }
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
      const res = await fetch(`${API_BASE}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken: resetToken, newPassword: newPassword })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.error || 'Reset failed');
      setView('login');
      setNewPassword(''); setConfirmPassword('');
      showToast('Password Reset', 'Your password has been updated. Please sign in.', 'success');
    } catch (err) {
      showToast('Reset Failed', err.message || 'Could not reset password.', 'error');
    } finally {
      setLoading(false);
    }
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

  return (
    <>
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

        {/* Decorative orbs */}
        <div style={{ position: 'absolute', top: '-15%', left: '-10%', width: 520, height: 520, borderRadius: '50%', background: 'radial-gradient(circle, rgba(108,60,240,0.14) 0%, transparent 65%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: '-20%', right: '-8%', width: 600, height: 600, borderRadius: '50%', background: 'radial-gradient(circle, rgba(76,34,188,0.10) 0%, transparent 65%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', top: '40%', right: '15%', width: 280, height: 280, borderRadius: '50%', background: 'radial-gradient(circle, rgba(167,139,250,0.06) 0%, transparent 70%)', pointerEvents: 'none' }} />

        {/* Subtle grid texture */}
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.018) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.018) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }} />

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

            <div style={{
              position: 'absolute', top: 0, left: '10%', right: '10%', height: 1,
              background: 'linear-gradient(90deg, transparent, rgba(108,60,240,0.6), rgba(167,139,250,0.4), transparent)',
              borderRadius: '0 0 4px 4px',
            }} />

            {/* LOGO */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 32 }}>
              <img 
                src={leveloxLogo} 
                alt="Levlox Logo" 
                style={{
                  width: 84,
                  height: 84,
                  objectFit: 'contain',
                  marginBottom: 18,
                  filter: 'drop-shadow(0 0 20px rgba(139, 92, 246, 0.6))',
                }}
              />

              <h1 style={{
                fontSize: 22, fontWeight: 800, color: '#FFFFFF',
                letterSpacing: -0.5, margin: '0 0 6px', textAlign: 'center',
              }}>
                {view === 'login' && <>Welcome Back to <span style={{ color: '#A78BFA' }}>Levlox</span></>}
                {view === 'register' && <>Student <span style={{ color: '#A78BFA' }}>Registration</span></>}
                {view === 'forgot-step1' && <>Recover <span style={{ color: '#A78BFA' }}>Password</span></>}
                {view === 'forgot-step2' && <>Verify <span style={{ color: '#A78BFA' }}>OTP Code</span></>}
                {view === 'forgot-step3' && <>Create New <span style={{ color: '#A78BFA' }}>Password</span></>}
              </h1>
              <p style={{ fontSize: 13.5, color: 'rgba(255,255,255,0.38)', margin: 0, textAlign: 'center', fontWeight: 500 }}>
                {view === 'login' && 'Sign in to access your dashboard'}
                {view === 'register' && 'Register your details to create an account'}
                {view === 'forgot-step1' && "Enter your registered mobile number below"}
                {view === 'forgot-step2' && 'Enter the 6-digit code sent to your number'}
                {view === 'forgot-step3' && 'Set a strong password for your account'}
              </p>
            </div>

            {/* LOCKOUT BANNER */}
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

            {/* ATTEMPT WARNING */}
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

            {/* Unified Login Form */}
            {view === 'login' && (
              <form onSubmit={handleLoginSubmit} noValidate className="animated-form">
                {/* Phone Number */}
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
                      type="text"
                      placeholder="Enter mobile number"
                      value={phone}
                      maxLength={selectedCountry.length}
                      onChange={e => { setPhone(e.target.value.replace(/\D/g, '')); setPhoneError(''); }}
                      disabled={isLocked}
                      autoComplete="new-password"
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

                {/* Password */}
                <div style={{ marginBottom: passError ? 10 : 24 }}>
                  <label style={labelStyle} htmlFor="password">Password</label>
                  <div className={`input-group-relative ${passError ? 'error-border' : ''}`}>
                    <div className="input-icon-left">
                      <Lock size={16} />
                    </div>
                    <input
                      id="password"
                      className="premium-input"
                      style={{ cursor: isLocked ? 'not-allowed' : 'text' }}
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Enter password"
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

                {/* Submit Button */}
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
                    marginBottom: 16,
                  }}
                  onMouseEnter={e => { if (!isLocked && !loading) { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 14px 32px rgba(108,60,240,0.45), inset 0 1px 0 rgba(255,255,255,0.12)'; } }}
                  onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = isLocked ? 'none' : '0 8px 24px rgba(108,60,240,0.35), inset 0 1px 0 rgba(255,255,255,0.12)'; }}
                >
                  {loading ? (
                    <>
                      <span style={{ width: 18, height: 18, border: '2px solid rgba(255,255,255,0.25)', borderTopColor: 'white', borderRadius: '50%', display: 'inline-block', animation: 'loginSpin 0.75s linear infinite' }} />
                      Authenticating…
                    </>
                  ) : (
                    <>
                      <ShieldCheck size={17} strokeWidth={1.75} /> Secure Login
                    </>
                  )}
                </button>

                {/* Sub-form Navigation links */}
                <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', fontSize: 13, marginTop: 12 }}>
                  <a
                    href="#forgot"
                    onClick={(e) => { e.preventDefault(); setForgotPhone(phone); setView('forgot-step1'); }}
                    style={{ color: '#A78BFA', fontWeight: 600, textDecoration: 'none' }}
                  >
                    Forgot password?
                  </a>
                  <a
                    href="#register"
                    onClick={(e) => { e.preventDefault(); setView('register'); }}
                    style={{ color: '#A78BFA', fontWeight: 600, textDecoration: 'none' }}
                  >
                    Register as Student
                  </a>
                </div>
              </form>
            )}

            {/* Student Registration Form */}
            {view === 'register' && (
              <form onSubmit={handleRegisterSubmit} noValidate className="animated-form" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {/* Full Name */}
                <div>
                  <label style={labelStyle} htmlFor="reg-name">Full Name</label>
                  <div className="input-group-relative">
                    <div className="input-icon-left">
                      <User size={16} />
                    </div>
                    <input
                      id="reg-name"
                      className="premium-input"
                      style={{ paddingLeft: 42 }}
                      type="text"
                      placeholder="Enter full name"
                      value={regName}
                      onChange={e => setRegName(e.target.value)}
                      required
                    />
                  </div>
                </div>

                {/* Mobile Number */}
                <div>
                  <label style={labelStyle} htmlFor="reg-phone">Mobile Number</label>
                  <div className="input-group-relative">
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      paddingLeft: 16,
                      paddingRight: 12,
                      color: '#C4B5FD',
                      fontWeight: 800,
                      fontSize: '13px',
                      flexShrink: 0,
                      userSelect: 'none',
                    }}>
                      {selectedCountry.dial}
                    </div>
                    <div style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.12)', flexShrink: 0 }} />
                    <input
                      id="reg-phone"
                      className="premium-input phone-input-field"
                      type="text"
                      placeholder="Enter mobile number"
                      value={regPhone}
                      maxLength={selectedCountry.length}
                      onChange={e => setRegPhone(e.target.value.replace(/\D/g, ''))}
                      required
                    />
                  </div>
                </div>

                {/* Email (Optional) */}
                <div>
                  <label style={labelStyle} htmlFor="reg-email">Email Address (Optional)</label>
                  <div className="input-group-relative">
                    <input
                      id="reg-email"
                      className="premium-input"
                      style={{ paddingLeft: 18 }}
                      type="email"
                      placeholder="Enter email address"
                      value={regEmail}
                      onChange={e => setRegEmail(e.target.value)}
                    />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <label style={labelStyle} htmlFor="reg-password">Password</label>
                  <div className="input-group-relative">
                    <div className="input-icon-left">
                      <Lock size={16} />
                    </div>
                    <input
                      id="reg-password"
                      className="premium-input"
                      type={showRegPassword ? 'text' : 'password'}
                      placeholder="Set password"
                      value={regPassword}
                      onChange={e => setRegPassword(e.target.value)}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowRegPassword(p => !p)}
                      className="input-icon-right"
                      tabIndex={-1}
                    >
                      {showRegPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                {/* Confirm Password */}
                <div>
                  <label style={labelStyle} htmlFor="reg-confirm">Confirm Password</label>
                  <div className="input-group-relative">
                    <div className="input-icon-left">
                      <Lock size={16} />
                    </div>
                    <input
                      id="reg-confirm"
                      className="premium-input"
                      type={showRegPassword ? 'text' : 'password'}
                      placeholder="Confirm password"
                      value={regConfirmPassword}
                      onChange={e => setRegConfirmPassword(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
                  <button
                    type="button"
                    onClick={() => setView('login')}
                    style={{
                      height: 52, width: 56, borderRadius: 14, border: '1px solid rgba(255,255,255,0.1)',
                      background: 'rgba(255,255,255,0.03)', color: 'rgba(255,255,255,0.7)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
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
                  >
                    {loading ? 'Creating Account…' : 'Register Now'}
                  </button>
                </div>
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

                {/* Password Rules */}
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
                  >
                    {loading ? 'Saving…' : 'Save Password'}
                  </button>
                </div>
              </form>
            )}

            {/* Attempt dots indicator */}
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

        </div>
      </div>

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

      <div id="recaptcha-container"></div>

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
          overflow: hidden !important;
        }
        .input-group-relative:focus-within {
          border-color: #8B5CF6 !important;
          box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.25) !important;
          background: rgba(255, 255, 255, 0.05) !important;
        }
        .input-group-relative.error-border {
          border-color: #EF4444 !important;
          box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.2) !important;
        }
        .input-group-relative.success-border {
          border-color: #10B981 !important;
          box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.2) !important;
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
        .premium-input:focus {
          outline: none !important;
          box-shadow: none !important;
        }
        .premium-input.phone-input-field {
          padding-left: 14px !important;
          padding-right: 18px !important;
        }
        .premium-input::placeholder {
          color: rgba(156, 163, 175, 0.55);
        }

        /* password field — kill native browser credential/autofill icons and overlays */
        input[type="password"] {
          -webkit-text-security: disc;
        }
        input[type="password"]::-webkit-credentials-auto-fill-button,
        input[type="password"]::-webkit-strong-password-auto-fill-button,
        input[type="password"]::-webkit-contacts-auto-fill-button {
          visibility: hidden !important;
          display: none !important;
          pointer-events: none !important;
          position: absolute !important;
          right: 0 !important;
          width: 0 !important;
          height: 0 !important;
          opacity: 0 !important;
        }

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

        input.premium-input:-webkit-autofill,
        input.premium-input:-webkit-autofill:hover,
        input.premium-input:-webkit-autofill:focus,
        input.premium-input:-webkit-autofill:active {
          -webkit-box-shadow: 0 0 0 1000px transparent inset !important;
          -webkit-text-fill-color: #ffffff !important;
          transition: background-color 999999s ease-in-out 0s;
          caret-color: white !important;
        }
      `}</style>
    </>
  );
};

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
