import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  sendPasswordResetEmail,
  signOut,
} from 'firebase/auth';
import { auth } from '../firebase';
import { getStudent, getAdmin } from '../services/firebaseService';
import {
  Eye, EyeOff, Lock, Smartphone, Check, X, Mail, User,
  ShieldCheck, AlertTriangle, Shield, Loader2,
  GraduationCap, Sparkles
} from 'lucide-react';
import CustomModal from '../components/Modal';
import leveloxLogo from '../assets/levelox-icon-transparent.png';
import { normalizeMobile, mobileToAuthId, isValidMobile } from '../services/phoneIdentity';

const MAX_ATTEMPTS = 5;
const LOCKOUT_SECONDS = 30;

const Login = () => {
  /* ─── Form state ─── */
  const [identifier, setIdentifier] = useState(''); // Email or Mobile
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  /* ─── Reset Password Modal State ─── */
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);

  /* ─── Loading & modals ─── */
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [modalText, setModalText] = useState('');
  const [modalType, setModalType] = useState('info');

  /* ─── Validation feedback ─── */
  const [identifierError, setIdentifierError] = useState('');
  const [passError, setPassError] = useState('');

  /* ─── Rate limiting ─── */
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockoutEndTime, setLockoutEndTime] = useState(null);
  const [lockoutCountdown, setLockoutCountdown] = useState(0);
  const [isLocked, setIsLocked] = useState(false);

  const navigate = useNavigate();

  /* ════ LOAD REMEMBERED IDENTIFIER ════ */
  useEffect(() => {
    const saved = localStorage.getItem('rememberedMobile') || localStorage.getItem('rememberedIdentifier');
    if (saved) { setIdentifier(saved); setRememberMe(true); }

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
    const reasonMessages = {
      session_revoked: ['Session Revoked', 'You have been logged out because this session was revoked.', 'warning'],
      session_expired: ['Session Expired', 'Your session has expired. Please sign in again.', 'info'],
      inactivity: ['Session Timeout', 'You were logged out due to 30 minutes of inactivity.', 'info'],
      no_profile: ['Profile Not Found', 'Your sign-in succeeded but no portal profile is linked to this account. Please contact your Levlox administrator.', 'warning'],
    };
    if (reason && reasonMessages[reason]) {
      const [title, text, type] = reasonMessages[reason];
      setModalTitle(title); setModalText(text); setModalType(type); setModalOpen(true);
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

  const getFirebaseAuthError = (code) => {
    const map = {
      'auth/user-not-found': 'No account found with this email or mobile number.',
      'auth/wrong-password': 'Incorrect password. Please try again.',
      'auth/invalid-credential': 'Incorrect email/mobile number or password. Please try again.',
      'auth/invalid-login-credentials': 'Incorrect email/mobile number or password. Please try again.',
      'auth/missing-password': 'Please enter your password.',
      'auth/invalid-email': 'Please enter a valid email address or 10-digit mobile number.',
      'auth/user-disabled': 'This account has been disabled. Contact your administrator.',
      'auth/too-many-requests': 'Too many failed attempts. Please try again later.',
      'auth/network-request-failed': 'Network error. Please check your connection.',
      'auth/internal-error': 'An internal error occurred. Please try again.',
      'auth/configuration-not-found':
        'Sign-in is not enabled for this portal yet. Please contact your administrator.',
      'auth/operation-not-allowed':
        'Sign-in is not enabled for this portal yet. Please contact your administrator.',
      'auth/popup-closed-by-user': 'Google sign-in popup was closed before completing.',
    };
    return map[code] || 'Authentication failed. Please try again.';
  };

  const isConfigError = (code) =>
    code === 'auth/configuration-not-found' || code === 'auth/operation-not-allowed';

  /* ════ GOOGLE OAUTH SIGN IN ════ */
  const handleGoogleSignIn = async () => {
    if (isLocked) return;
    setGoogleLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      const credential = await signInWithPopup(auth, provider);
      const firebaseUser = credential.user;

      const [adminDoc, studentDoc] = await Promise.all([
        getAdmin(firebaseUser.uid).catch(() => null),
        getStudent(firebaseUser.uid).catch(() => null),
      ]);

      let role = null;
      if (adminDoc) {
        role = 'admin';
      } else if (studentDoc) {
        if (studentDoc.status === 'disabled' || studentDoc.status === 'inactive') {
          await signOut(auth);
          throw new Error('Your account has been disabled. Please contact your administrator.');
        }
        role = 'student';
      } else {
        await signOut(auth);
        throw new Error(
          `No portal profile is linked to ${firebaseUser.email}. Please contact your Levlox administrator.`
        );
      }

      navigate(role === 'admin' ? '/admin' : '/student', { replace: true });
    } catch (err) {
      console.warn('[Login] Google sign-in failed:', err?.code || err?.message);
      if (err.code !== 'auth/popup-closed-by-user') {
        showToast('Google Sign-In Failed', getFirebaseAuthError(err.code || err.message), 'error');
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  /* ════ PASSWORD RESET VIA EMAIL ════ */
  const handleSendPasswordReset = async (e) => {
    e.preventDefault();
    if (!resetEmail || !resetEmail.includes('@')) {
      showToast('Invalid Email', 'Please enter a valid email address to receive the password reset link.', 'warning');
      return;
    }
    setResetLoading(true);
    try {
      await sendPasswordResetEmail(auth, resetEmail.trim());
      setResetModalOpen(false);
      showToast('Email Sent', `A password reset link has been sent to ${resetEmail}. Check your inbox!`, 'success');
      setResetEmail('');
    } catch (err) {
      console.error('[Login] Password reset failed:', err);
      showToast('Reset Failed', getFirebaseAuthError(err.code || err.message), 'error');
    } finally {
      setResetLoading(false);
    }
  };

  /* ════ LOGIN SUBMIT ════ */
  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setIdentifierError(''); setPassError('');

    if (isLocked) return;

    let valid = true;
    const rawInput = identifier.trim();

    if (!rawInput) {
      setIdentifierError('Please enter your mobile number or email address.');
      valid = false;
    }

    if (!password) {
      setPassError('Please enter your password.');
      valid = false;
    }
    if (!valid) return;

    let authEmail = rawInput;
    if (isValidMobile(rawInput)) {
      authEmail = mobileToAuthId(rawInput);
    } else if (!rawInput.includes('@')) {
      setIdentifierError('Please enter a valid 10-digit mobile number or email address.');
      return;
    }

    setLoading(true);
    try {
      let credential;
      try {
        credential = await signInWithEmailAndPassword(
          auth,
          authEmail,
          password
        );
      } catch (firstErr) {
        // If mobile attempt failed and identifier wasn't formatted with @, also check if they signed up with plain identifier
        if (isValidMobile(rawInput) && (firstErr?.code === 'auth/user-not-found' || firstErr?.code === 'auth/invalid-credential')) {
          credential = await signInWithEmailAndPassword(
            auth,
            rawInput,
            password
          );
        } else {
          throw firstErr;
        }
      }
      const firebaseUser = credential.user;

      // Resolve the account's role from Firestore. Admin records take priority.
      const [adminDoc, studentDoc] = await Promise.all([
        getAdmin(firebaseUser.uid).catch(() => null),
        getStudent(firebaseUser.uid).catch(() => null),
      ]);

      let role = null;
      if (adminDoc) {
        role = 'admin';
      } else if (studentDoc) {
        if (studentDoc.status === 'disabled' || studentDoc.status === 'inactive') {
          await signOut(auth);
          throw new Error('Your account has been disabled. Please contact your administrator.');
        }
        role = 'student';
      } else {
        await signOut(auth);
        throw new Error(
          'No portal profile is linked to this account. Please contact your Levlox administrator.'
        );
      }

      // Clear failed attempts on success
      setFailedAttempts(0);
      sessionStorage.removeItem('loginAttempts');
      sessionStorage.removeItem('loginLockoutEnd');

      // Remember the email if requested
      if (rememberMe) localStorage.setItem('rememberedIdentifier', rawInput);
      else localStorage.removeItem('rememberedIdentifier');

      // AuthContext's onAuthStateChanged listener loads the profile from here.
      navigate(role === 'admin' ? '/admin' : '/student', { replace: true });

    } catch (err) {
      console.warn('[Login] sign-in failed:', err?.code || err?.message);

      if (isConfigError(err?.code)) {
        showToast('Sign-In Unavailable', getFirebaseAuthError(err.code), 'error');
        setLoading(false);
        return;
      }

      const locked = recordFailedAttempt();
      if (locked) {
        showToast(
          'Too Many Attempts',
          `Account temporarily locked for ${LOCKOUT_SECONDS} seconds. Please wait.`,
          'error'
        );
        setLoading(false);
        return;
      }

      const isOwnError = !err.code;
      const remaining = MAX_ATTEMPTS - (failedAttempts + 1);
      const errorMsg = isOwnError
        ? err.message
        : getFirebaseAuthError(err.code) +
          (remaining > 0 ? ` (${remaining} attempt${remaining > 1 ? 's' : ''} remaining)` : '');

      showToast('Sign-In Failed', errorMsg, 'error');
    } finally {
      setLoading(false);
    }
  };

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

        {/* Grid texture */}
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

            {/* Top gradient line */}
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
                Welcome Back to <span style={{ color: '#A78BFA' }}>Levlox</span>
              </h1>
              <p style={{ fontSize: 13.5, color: 'rgba(255,255,255,0.38)', margin: 0, textAlign: 'center', fontWeight: 500 }}>
                Sign in to access your dashboard
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

            {/* LOGIN FORM */}
            <form onSubmit={handleLoginSubmit} noValidate className="animated-form">
              {/* Email Address or Mobile Number */}
              <div style={{ marginBottom: identifierError ? 10 : 20 }}>
                <label style={labelStyle} htmlFor="identifier">Email Address / Mobile Number</label>
                <div className={`input-group-relative ${identifierError ? 'error-border' : ''}`}>
                  <div className="input-icon-left">
                    <Mail size={16} />
                  </div>
                  <input
                    id="identifier"
                    className="premium-input"
                    type="text"
                    placeholder="Enter email address or 10-digit mobile number"
                    value={identifier}
                    onChange={e => { setIdentifier(e.target.value); setIdentifierError(''); }}
                    disabled={isLocked}
                    autoComplete="username"
                    required
                    style={{ cursor: isLocked ? 'not-allowed' : 'text', paddingLeft: '48px', paddingRight: '18px' }}
                  />

                </div>
                {identifierError && <p style={errorStyle}>{identifierError}</p>}
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
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter your password"
                    value={password}
                    onChange={e => { setPassword(e.target.value); setPassError(''); }}
                    disabled={isLocked}
                    autoComplete="current-password"
                    required
                    style={{ cursor: isLocked ? 'not-allowed' : 'text' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(p => !p)}
                    className="input-icon-right"
                    tabIndex={-1}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {passError && <p style={errorStyle}>{passError}</p>}
              </div>

              {/* Remember Me & Forgot Password */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', userSelect: 'none' }}>
                  <div
                    onClick={() => setRememberMe(r => !r)}
                    style={{
                      width: 18, height: 18, borderRadius: 5, border: rememberMe ? 'none' : '1.5px solid rgba(255,255,255,0.2)',
                      background: rememberMe ? '#6C3CF0' : 'transparent',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                      cursor: 'pointer', transition: 'all 0.15s',
                    }}
                  >
                    {rememberMe && <Check size={11} color="white" strokeWidth={3} />}
                  </div>
                  <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', fontWeight: 500 }}>Remember me</span>
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setResetEmail(identifier.includes('@') ? identifier : '');
                    setResetModalOpen(true);
                  }}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                    fontSize: 13, color: '#A78BFA', fontWeight: 600, fontFamily: 'inherit',
                    transition: 'color 0.15s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.color = '#C4B5FD'}
                  onMouseLeave={e => e.currentTarget.style.color = '#A78BFA'}
                >
                  Forgot password?
                </button>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                id="login-btn"
                disabled={loading || isLocked}
                style={{
                  width: '100%', height: 52, borderRadius: 14, border: 'none',
                  background: isLocked
                    ? 'rgba(108,60,240,0.2)'
                    : 'linear-gradient(135deg, #6C3CF0 0%, #4c22bc 100%)',
                  color: isLocked ? 'rgba(255,255,255,0.3)' : 'white',
                  fontSize: 15, fontWeight: 800, cursor: isLocked || loading ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                  fontFamily: 'inherit', letterSpacing: -0.2,
                  boxShadow: isLocked ? 'none' : '0 8px 24px rgba(108,60,240,0.35), inset 0 1px 0 rgba(255,255,255,0.12)',
                  transition: 'all 0.22s',
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
                    <ShieldCheck size={17} strokeWidth={1.75} /> Sign In
                  </>
                )}
              </button>

              {/* Attempt dots indicator */}
              {!isLocked && failedAttempts > 0 && failedAttempts < MAX_ATTEMPTS && (
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
            </form>

            {/* Info note */}
            <div style={{
              marginTop: 24, padding: '12px 16px',
              background: 'rgba(108,60,240,0.08)', border: '1px solid rgba(108,60,240,0.15)',
              borderRadius: 12, display: 'flex', alignItems: 'flex-start', gap: 10,
            }}>
              <GraduationCap size={16} color="#A78BFA" style={{ flexShrink: 0, marginTop: 1 }} />
              <p style={{ margin: 0, fontSize: 12.5, color: 'rgba(255,255,255,0.45)', lineHeight: 1.6 }}>
                Your login credentials are provided by your administrator. If you need access, please contact <span style={{ color: '#A78BFA', fontWeight: 600 }}>Levlox support</span>.
              </p>
            </div>

          </div>
        </div>
      </div>

      {/* Reset Password Modal */}
      <CustomModal
        isOpen={resetModalOpen}
        onClose={() => setResetModalOpen(false)}
        title="Reset Password"
        type="info"
        confirmText={resetLoading ? "Sending Link..." : "Send Reset Link"}
        onConfirm={handleSendPasswordReset}
      >
        <p style={{ fontSize: 14, color: 'var(--text-secondary)', margin: '0 0 16px', lineHeight: 1.5 }}>
          Enter your registered email address below. We will send you an email with instructions to reset your password.
        </p>
        <div className="input-group-relative">
          <div className="input-icon-left">
            <Mail size={16} />
          </div>
          <input
            className="premium-input"
            type="email"
            placeholder="Enter your email address"
            value={resetEmail}
            onChange={e => setResetEmail(e.target.value)}
            style={{ paddingLeft: '48px' }}
          />
        </div>
      </CustomModal>

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

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Inter:wght@400;500;600;700&display=swap');

        @keyframes cardFadeIn {
          from { opacity: 0; transform: translateY(20px) scale(0.98); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes loginSpin {
          to { transform: rotate(360deg); }
        }

        .animated-form {
          animation: formFadeIn 0.35s cubic-bezier(0.4, 0, 0.2, 1) forwards;
        }
        @keyframes formFadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
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
        .premium-input:focus { outline: none !important; box-shadow: none !important; }
        .premium-input::placeholder { color: rgba(156, 163, 175, 0.55); }

        input[type="password"]::-webkit-credentials-auto-fill-button,
        input[type="password"]::-webkit-strong-password-auto-fill-button {
          visibility: hidden !important; display: none !important;
        }
        input::-ms-reveal, input::-ms-clear { display: none !important; }

        .input-icon-left {
          position: absolute; left: 18px; top: 50%;
          transform: translateY(-50%);
          color: rgba(255, 255, 255, 0.35);
          pointer-events: none;
          display: flex; align-items: center; justify-content: center; z-index: 2;
        }
        .input-icon-right {
          position: absolute; right: 18px; top: 50%;
          transform: translateY(-50%);
          background: none; border: none;
          color: rgba(255, 255, 255, 0.3);
          cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          padding: 4px; z-index: 2; transition: color 0.15s;
        }
        .input-icon-right:hover { color: rgba(255, 255, 255, 0.7); }

        input.premium-input:-webkit-autofill,
        input.premium-input:-webkit-autofill:hover,
        input.premium-input:-webkit-autofill:focus {
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
