import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  verifyPasswordResetCode,
  confirmPasswordReset,
} from 'firebase/auth';
import { auth } from '../firebase';
import {
  Eye, EyeOff, Lock, CheckCircle, ShieldCheck, AlertCircle,
  ArrowLeft, Key, Loader2
} from 'lucide-react';
import leveloxLogo from '../assets/levelox-icon-transparent.png';

const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // Action code from URL parameter (e.g. ?oobCode=... or ?code=...)
  const oobCode = searchParams.get('oobCode') || searchParams.get('code');

  // Verification state
  const [verifying, setVerifying] = useState(true);
  const [email, setEmail] = useState('');
  const [invalidCode, setInvalidCode] = useState(false);
  const [verificationError, setVerificationError] = useState('');

  // Form state
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Status & error
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!oobCode) {
      setVerifying(false);
      setInvalidCode(true);
      setVerificationError('No password reset code provided in the URL. Please request a new link.');
      return;
    }

    // Verify reset code with Firebase Auth
    verifyPasswordResetCode(auth, oobCode)
      .then((userEmail) => {
        setEmail(userEmail || '');
        setVerifying(false);
      })
      .catch((err) => {
        console.error('[ResetPassword] Code verification failed:', err);
        setVerifying(false);
        setInvalidCode(true);
        if (err.code === 'auth/invalid-action-code') {
          setVerificationError('The password reset link is invalid or has already been used.');
        } else if (err.code === 'auth/expired-action-code') {
          setVerificationError('The password reset link has expired. Please request a new password reset.');
        } else {
          setVerificationError('Unable to verify the password reset link. Please request a new link.');
        }
      });
  }, [oobCode]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!newPassword) {
      setError('Please enter your new password.');
      return;
    }

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match. Please check and try again.');
      return;
    }

    setLoading(true);
    try {
      await confirmPasswordReset(auth, oobCode, newPassword);
      setSuccess(true);
    } catch (err) {
      console.error('[ResetPassword] Reset failed:', err);
      if (err.code === 'auth/expired-action-code') {
        setError('The password reset link has expired. Please request a new link.');
      } else if (err.code === 'auth/invalid-action-code') {
        setError('The password reset link is invalid or has already been used.');
      } else if (err.code === 'auth/weak-password') {
        setError('Password is too weak. Please choose a stronger password.');
      } else {
        setError('Failed to reset password. Please try again or request a new link.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
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

      {/* Decorative Orbs */}
      <div style={{ position: 'absolute', top: '-15%', left: '-10%', width: 520, height: 520, borderRadius: '50%', background: 'radial-gradient(circle, rgba(108,60,240,0.14) 0%, transparent 65%)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: '-20%', right: '-8%', width: 600, height: 600, borderRadius: '50%', background: 'radial-gradient(circle, rgba(76,34,188,0.10) 0%, transparent 65%)', pointerEvents: 'none' }} />

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
        }}>

          {/* Top Line Gradient */}
          <div style={{
            position: 'absolute', top: 0, left: '10%', right: '10%', height: 1,
            background: 'linear-gradient(90deg, transparent, rgba(108,60,240,0.6), rgba(167,139,250,0.4), transparent)',
            borderRadius: '0 0 4px 4px',
          }} />

          {/* LOGO */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 28 }}>
            <img
              src={leveloxLogo}
              alt="Levlox Logo"
              style={{
                width: 72,
                height: 72,
                objectFit: 'contain',
                marginBottom: 16,
                filter: 'drop-shadow(0 0 20px rgba(139, 92, 246, 0.6))',
              }}
            />
            <h1 style={{
              fontSize: 22, fontWeight: 800, color: '#FFFFFF',
              letterSpacing: -0.5, margin: '0 0 6px', textAlign: 'center',
            }}>
              Set New Password
            </h1>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', margin: 0, textAlign: 'center', fontWeight: 500 }}>
              Levlox Student Portal Account Security
            </p>
          </div>

          {/* LOADING STATE */}
          {verifying && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '30px 0' }}>
              <div style={{ width: 28, height: 28, border: '3px solid rgba(167,139,250,0.2)', borderTopColor: '#A78BFA', borderRadius: '50%', animation: 'spin 0.8s linear infinite', marginBottom: 14 }} />
              <p style={{ fontSize: 13.5, color: 'rgba(255,255,255,0.6)', margin: 0 }}>Verifying password reset link...</p>
            </div>
          )}

          {/* INVALID CODE STATE */}
          {!verifying && invalidCode && (
            <div style={{ textAlign: 'center', padding: '10px 0' }}>
              <div style={{ width: 54, height: 54, borderRadius: '50%', background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <AlertCircle size={26} color="#F87171" />
              </div>
              <h3 style={{ fontSize: 17, fontWeight: 800, color: '#FFF', margin: '0 0 8px' }}>Invalid or Expired Link</h3>
              <p style={{ fontSize: 13.5, color: 'rgba(255,255,255,0.5)', margin: '0 0 24px', lineHeight: 1.5 }}>
                {verificationError}
              </p>
              <button
                type="button"
                onClick={() => navigate('/login')}
                style={{
                  width: '100%', height: 48, borderRadius: 12, border: 'none',
                  background: 'linear-gradient(135deg, #6C3CF0 0%, #4c22bc 100%)',
                  color: 'white', fontSize: 14, fontWeight: 700, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                }}
              >
                <ArrowLeft size={16} /> Return to Login
              </button>
            </div>
          )}

          {/* SUCCESS STATE */}
          {!verifying && !invalidCode && success && (
            <div style={{ textAlign: 'center', padding: '10px 0' }}>
              <div style={{ width: 54, height: 54, borderRadius: '50%', background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <CheckCircle size={26} color="#10B981" />
              </div>
              <h3 style={{ fontSize: 17, fontWeight: 800, color: '#FFF', margin: '0 0 8px' }}>Password Reset Successfully</h3>
              <p style={{ fontSize: 13.5, color: 'rgba(255,255,255,0.6)', margin: '0 0 24px', lineHeight: 1.5 }}>
                Your password has been reset successfully. You can now sign in to your dashboard with your new password.
              </p>
              <button
                type="button"
                onClick={() => navigate('/login')}
                style={{
                  width: '100%', height: 48, borderRadius: 12, border: 'none',
                  background: 'linear-gradient(135deg, #6C3CF0 0%, #4c22bc 100%)',
                  color: 'white', fontSize: 14, fontWeight: 700, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                }}
              >
                <ShieldCheck size={16} /> Back to Login
              </button>
            </div>
          )}

          {/* RESET FORM STATE */}
          {!verifying && !invalidCode && !success && (
            <form onSubmit={handleSubmit}>
              {email && (
                <div style={{
                  background: 'rgba(108,60,240,0.1)', border: '1px solid rgba(108,60,240,0.2)',
                  borderRadius: 12, padding: '10px 14px', marginBottom: 20,
                  fontSize: 12.5, color: '#A78BFA', fontWeight: 600, textAlign: 'center'
                }}>
                  Resetting password for: <strong style={{ color: '#FFF' }}>{email}</strong>
                </div>
              )}

              {error && (
                <div style={{
                  background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)',
                  borderRadius: 10, padding: '10px 14px', marginBottom: 18,
                  fontSize: 12.5, color: '#FCA5A5', fontWeight: 600,
                  display: 'flex', alignItems: 'center', gap: 8
                }}>
                  <AlertCircle size={15} color="#F87171" style={{ flexShrink: 0 }} />
                  <span>{error}</span>
                </div>
              )}

              {/* New Password */}
              <div style={{ marginBottom: 18 }}>
                <label style={labelStyle} htmlFor="new-password">New Password</label>
                <div className="input-group-relative">
                  <div className="input-icon-left">
                    <Lock size={16} />
                  </div>
                  <input
                    id="new-password"
                    type={showNewPassword ? 'text' : 'password'}
                    className="premium-input"
                    placeholder="At least 6 characters"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    style={{ paddingLeft: '48px', paddingRight: '44px' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="input-icon-right"
                    tabIndex={-1}
                  >
                    {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div style={{ marginBottom: 24 }}>
                <label style={labelStyle} htmlFor="confirm-password">Confirm New Password</label>
                <div className="input-group-relative">
                  <div className="input-icon-left">
                    <Key size={16} />
                  </div>
                  <input
                    id="confirm-password"
                    type={showConfirmPassword ? 'text' : 'password'}
                    className="premium-input"
                    placeholder="Re-enter your password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    style={{ paddingLeft: '48px', paddingRight: '44px' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="input-icon-right"
                    tabIndex={-1}
                  >
                    {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                style={{
                  width: '100%', height: 50, borderRadius: 14, border: 'none',
                  background: 'linear-gradient(135deg, #6C3CF0 0%, #4c22bc 100%)',
                  color: 'white', fontSize: 14.5, fontWeight: 800, cursor: loading ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                  boxShadow: '0 8px 24px rgba(108,60,240,0.35)',
                }}
              >
                {loading ? 'Resetting Password...' : 'Reset Password'}
              </button>

              <div style={{ marginTop: 20, textAlign: 'center' }}>
                <button
                  type="button"
                  onClick={() => navigate('/login')}
                  style={{
                    background: 'none', border: 'none', color: 'rgba(255,255,255,0.45)',
                    fontSize: 13, fontWeight: 600, cursor: 'pointer'
                  }}
                >
                  ← Back to Login
                </button>
              </div>
            </form>
          )}

        </div>
      </div>

      <style>{`
        .input-group-relative {
          position: relative; width: 100%; display: flex; align-items: center;
          height: 52px; background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 12px;
          overflow: hidden;
        }
        .input-group-relative:focus-within {
          border-color: #8B5CF6; box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.25);
        }
        .premium-input {
          width: 100%; height: 100%; background: transparent; border: none;
          outline: none; font-size: 14px; color: #FFFFFF;
        }
        .input-icon-left {
          position: absolute; left: 16px; color: rgba(255, 255, 255, 0.35);
          display: flex; align-items: center; pointer-events: none;
        }
        .input-icon-right {
          position: absolute; right: 16px; background: none; border: none;
          color: rgba(255, 255, 255, 0.35); cursor: pointer; display: flex; alignItems: center;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};

const labelStyle = {
  display: 'block',
  fontSize: '11px',
  fontWeight: 700,
  color: 'rgba(255,255,255,0.45)',
  textTransform: 'uppercase',
  letterSpacing: '0.6px',
  marginBottom: '6px',
};

export default ResetPassword;
