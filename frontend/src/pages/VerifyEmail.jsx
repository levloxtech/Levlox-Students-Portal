import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { getDocument, updateStudent } from "../services/firebaseService";
import { validatePasswordStrength } from "../services/authService";
import { resendVerificationEmail } from "../services/emailService";
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Lock,
  Eye,
  EyeOff,
  GraduationCap,
  Loader2,
  Mail,
  ShieldCheck,
  ArrowRight,
} from "lucide-react";
import CustomModal from "../components/Modal";
import leveloxLogo from "../assets/levelox-icon-transparent.png";

const VerifyEmail = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const uid = searchParams.get("uid");
  const token = searchParams.get("token");

  const [verifying, setVerifying] = useState(true);
  const [student, setStudent] = useState(null);
  const [statusState, setStatusState] = useState("loading"); // 'loading', 'valid', 'already_verified', 'invalid', 'success'
  const [errorMessage, setErrorMessage] = useState("");

  // Password setup state
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [passError, setPassError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Resend state
  const [resending, setResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);

  useEffect(() => {
    const verifyToken = async () => {
      if (!uid || !token) {
        setStatusState("invalid");
        setErrorMessage("Invalid or missing verification parameters.");
        setVerifying(false);
        return;
      }

      try {
        const studentDoc = await getDocument("students", uid);
        if (!studentDoc) {
          setStatusState("invalid");
          setErrorMessage("No training account found for this verification link.");
          setVerifying(false);
          return;
        }

        setStudent(studentDoc);

        // Check if already active & verified
        if (studentDoc.emailVerified && (studentDoc.status === "active" || studentDoc.status === "Active")) {
          setStatusState("already_verified");
          setVerifying(false);
          return;
        }

        // Validate token
        if (studentDoc.verificationToken !== token) {
          setStatusState("invalid");
          setErrorMessage("This verification token is invalid or has already been used.");
          setVerifying(false);
          return;
        }

        // Check token expiry
        if (studentDoc.verificationTokenExpiresAt) {
          const expiryDate = new Date(studentDoc.verificationTokenExpiresAt);
          if (new Date() > expiryDate) {
            setStatusState("invalid");
            setErrorMessage("This activation link has expired (links are valid for 48 hours). Please request a new verification email.");
            setVerifying(false);
            return;
          }
        }

        setStatusState("valid");
      } catch (err) {
        console.error("[VerifyEmail] Verification error:", err);
        setStatusState("invalid");
        setErrorMessage("Database error while checking activation details. Please try again.");
      } finally {
        setVerifying(false);
      }
    };

    verifyToken();
  }, [uid, token]);

  const handleActivateAccount = async (e) => {
    e.preventDefault();
    setPassError("");

    if (newPassword) {
      const err = validatePasswordStrength(newPassword);
      if (err) {
        setPassError(err);
        return;
      }
      if (newPassword !== confirmPassword) {
        setPassError("Passwords do not match.");
        return;
      }
    }

    setSubmitting(true);
    try {
      // Activate account in Firestore
      await updateStudent(uid, {
        status: "active",
        emailVerified: true,
        verificationStatus: "Verified",
        verifiedAt: new Date().toISOString(),
        mustChangePassword: false,
      });

      setStatusState("success");
    } catch (err) {
      console.error("[VerifyEmail] Activation failed:", err);
      setPassError(err.message || "Failed to activate account. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleResendLink = async () => {
    if (!student && !uid) return;
    setResending(true);
    try {
      await resendVerificationEmail(student || uid);
      setResendSuccess(true);
    } catch (err) {
      console.error("[VerifyEmail] Resend failed:", err);
      alert("Failed to resend verification email: " + (err.message || "Unknown error"));
    } finally {
      setResending(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #050308 0%, #0D0A1A 30%, #110C24 55%, #0A0814 80%, #070510 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px 16px",
        position: "relative",
        overflow: "hidden",
        fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif",
      }}
    >
      {/* Background ambient orbs */}
      <div style={{ position: "absolute", top: "-15%", left: "-10%", width: 520, height: 520, borderRadius: "50%", background: "radial-gradient(circle, rgba(108,60,240,0.14) 0%, transparent 65%)", pointerEvents: "none" }} />
      <div style={{ position: "absolute", bottom: "-20%", right: "-8%", width: 600, height: 600, borderRadius: "50%", background: "radial-gradient(circle, rgba(76,34,188,0.10) 0%, transparent 65%)", pointerEvents: "none" }} />

      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "100%", maxWidth: 460, zIndex: 1 }}>
        <div
          style={{
            width: "100%",
            background: "rgba(255, 255, 255, 0.04)",
            backdropFilter: "blur(24px)",
            WebkitBackdropFilter: "blur(24px)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 24,
            padding: "40px 36px",
            boxShadow: "0 32px 80px rgba(0,0,0,0.5), 0 0 0 1px rgba(108,60,240,0.08)",
            position: "relative",
            animation: "cardFadeIn 0.5s cubic-bezier(0.4,0,0.2,1)",
          }}
        >
          {/* Header Logo */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 28 }}>
            <img
              src={leveloxLogo}
              alt="Levlox Logo"
              style={{
                width: 76,
                height: 76,
                objectFit: "contain",
                marginBottom: 16,
                filter: "drop-shadow(0 0 20px rgba(139, 92, 246, 0.6))",
              }}
            />
            <h1 style={{ fontSize: 22, fontWeight: 800, color: "#FFFFFF", letterSpacing: -0.5, margin: "0 0 6px", textAlign: "center" }}>
              Training Account <span style={{ color: "#A78BFA" }}>Verification</span>
            </h1>
            <p style={{ fontSize: 13.5, color: "rgba(255,255,255,0.45)", margin: 0, textAlign: "center", fontWeight: 500 }}>
              Levlox Student Portal
            </p>
          </div>

          {/* STATE: LOADING */}
          {statusState === "loading" && (
            <div style={{ textAlign: "center", padding: "30px 0" }}>
              <Loader2 size={36} color="#A78BFA" style={{ animation: "spin 1s linear infinite", marginBottom: 16 }} />
              <p style={{ color: "rgba(255,255,255,0.7)", fontSize: 14, fontWeight: 600 }}>
                Verifying your email activation token…
              </p>
            </div>
          )}

          {/* STATE: ALREADY VERIFIED */}
          {statusState === "already_verified" && (
            <div style={{ textAlign: "center" }}>
              <div style={{ width: 56, height: 56, borderRadius: "50%", background: "rgba(16,185,129,0.15)", border: "1px solid rgba(16,185,129,0.3)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 18px" }}>
                <CheckCircle2 size={28} color="#10B981" />
              </div>
              <h3 style={{ fontSize: 18, fontWeight: 800, color: "#FFFFFF", margin: "0 0 8px" }}>
                Already Verified & Active
              </h3>
              <p style={{ fontSize: 13.5, color: "rgba(255,255,255,0.6)", lineHeight: 1.6, margin: "0 0 24px" }}>
                Your email address <strong style={{ color: "#A78BFA" }}>{student?.email}</strong> is already verified and your account is fully active.
              </p>
              <button
                type="button"
                onClick={() => navigate("/login")}
                style={{
                  width: "100%",
                  height: 48,
                  borderRadius: 14,
                  border: "none",
                  background: "linear-gradient(135deg, #6C3CF0 0%, #4c22bc 100%)",
                  color: "white",
                  fontSize: 14,
                  fontWeight: 800,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                }}
              >
                Proceed to Login <ArrowRight size={16} />
              </button>
            </div>
          )}

          {/* STATE: INVALID OR EXPIRED TOKEN */}
          {statusState === "invalid" && (
            <div style={{ textAlign: "center" }}>
              <div style={{ width: 56, height: 56, borderRadius: "50%", background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.3)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 18px" }}>
                <XCircle size={28} color="#EF4444" />
              </div>
              <h3 style={{ fontSize: 18, fontWeight: 800, color: "#FCA5A5", margin: "0 0 8px" }}>
                Verification Link Invalid or Expired
              </h3>
              <p style={{ fontSize: 13.5, color: "rgba(255,255,255,0.6)", lineHeight: 1.6, margin: "0 0 24px" }}>
                {errorMessage}
              </p>

              {resendSuccess ? (
                <div style={{ background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.25)", color: "#34D399", padding: "12px 16px", borderRadius: 12, fontSize: 13, fontWeight: 600, marginBottom: 20 }}>
                  A new activation email has been sent! Please check your inbox and spam folder.
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleResendLink}
                  disabled={resending}
                  style={{
                    width: "100%",
                    height: 48,
                    borderRadius: 14,
                    border: "1px solid rgba(167,139,250,0.3)",
                    background: "rgba(108,60,240,0.15)",
                    color: "#A78BFA",
                    fontSize: 14,
                    fontWeight: 700,
                    cursor: resending ? "not-allowed" : "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                    marginBottom: 12,
                  }}
                >
                  {resending ? <Loader2 size={16} className="spin" /> : <Mail size={16} />}
                  Resend Verification Email
                </button>
              )}

              <button
                type="button"
                onClick={() => navigate("/login")}
                style={{
                  background: "none",
                  border: "none",
                  color: "rgba(255,255,255,0.45)",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Back to Sign In
              </button>
            </div>
          )}

          {/* STATE: VALID TOKEN — ACTIVATION FORM */}
          {statusState === "valid" && (
            <form onSubmit={handleActivateAccount}>
              <div style={{ background: "rgba(108,60,240,0.08)", border: "1px solid rgba(108,60,240,0.2)", borderRadius: 14, padding: "16px", marginBottom: 24 }}>
                <p style={{ margin: "0 0 4px", fontSize: 12, textTransform: "uppercase", letterSpacing: 0.8, fontWeight: 700, color: "#A78BFA" }}>
                  Trainee Account Details
                </p>
                <h4 style={{ margin: "0 0 4px", fontSize: 15, fontWeight: 800, color: "#FFFFFF" }}>
                  {student?.name}
                </h4>
                <p style={{ margin: "0 0 2px", fontSize: 13, color: "rgba(255,255,255,0.7)" }}>
                  ID: <span style={{ fontWeight: 700, color: "#A78BFA" }}>{student?.rollNumber || student?.id}</span>
                </p>
                <p style={{ margin: 0, fontSize: 12.5, color: "rgba(255,255,255,0.5)" }}>
                  Email: {student?.email}
                </p>
              </div>

              {passError && (
                <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", color: "#FCA5A5", padding: "10px 14px", borderRadius: 10, fontSize: 12.5, fontWeight: 600, marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
                  <AlertTriangle size={15} color="#EF4444" /> {passError}
                </div>
              )}

              <div style={{ marginBottom: 16 }}>
                <label style={{ display: "block", fontSize: 12.5, fontWeight: 600, color: "rgba(255,255,255,0.7)", marginBottom: 6 }}>
                  Set New Password (Optional)
                </label>
                <div style={{ position: "relative" }}>
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter new password (optional)"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    style={{
                      width: "100%",
                      height: 48,
                      padding: "0 40px 0 16px",
                      borderRadius: 12,
                      border: "1px solid rgba(255,255,255,0.12)",
                      background: "rgba(255,255,255,0.03)",
                      color: "white",
                      fontSize: 14,
                      outline: "none",
                      boxSizing: "border-box",
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "rgba(255,255,255,0.4)", cursor: "pointer" }}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {newPassword && (
                <div style={{ marginBottom: 24 }}>
                  <label style={{ display: "block", fontSize: 12.5, fontWeight: 600, color: "rgba(255,255,255,0.7)", marginBottom: 6 }}>
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    placeholder="Confirm new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    style={{
                      width: "100%",
                      height: 48,
                      padding: "0 16px",
                      borderRadius: 12,
                      border: "1px solid rgba(255,255,255,0.12)",
                      background: "rgba(255,255,255,0.03)",
                      color: "white",
                      fontSize: 14,
                      outline: "none",
                      boxSizing: "border-box",
                    }}
                  />
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                style={{
                  width: "100%",
                  height: 52,
                  borderRadius: 14,
                  border: "none",
                  background: "linear-gradient(135deg, #6C3CF0 0%, #4c22bc 100%)",
                  color: "white",
                  fontSize: 15,
                  fontWeight: 800,
                  cursor: submitting ? "not-allowed" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 10,
                  boxShadow: "0 8px 24px rgba(108,60,240,0.35)",
                }}
              >
                {submitting ? (
                  <>
                    <Loader2 size={18} className="spin" /> Activating Account…
                  </>
                ) : (
                  <>
                    <ShieldCheck size={18} /> Verify Email & Activate Account
                  </>
                )}
              </button>
            </form>
          )}

          {/* STATE: ACTIVATION SUCCESS */}
          {statusState === "success" && (
            <div style={{ textAlign: "center", animation: "cardFadeIn 0.3s ease" }}>
              <div style={{ width: 64, height: 64, borderRadius: "50%", background: "rgba(16,185,129,0.15)", border: "1px solid rgba(16,185,129,0.3)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
                <CheckCircle2 size={36} color="#10B981" />
              </div>
              <h3 style={{ fontSize: 20, fontWeight: 800, color: "#FFFFFF", margin: "0 0 10px" }}>
                Email Verified & Account Active!
              </h3>
              <p style={{ fontSize: 14, color: "rgba(255,255,255,0.65)", lineHeight: 1.6, margin: "0 0 28px" }}>
                Congratulations <strong style={{ color: "#A78BFA" }}>{student?.name}</strong>! Your email address has been verified successfully. You can now log in to access your training dashboard and assigned courses.
              </p>

              <button
                type="button"
                onClick={() => navigate("/login")}
                style={{
                  width: "100%",
                  height: 52,
                  borderRadius: 14,
                  border: "none",
                  background: "linear-gradient(135deg, #10B981 0%, #059669 100%)",
                  color: "white",
                  fontSize: 15,
                  fontWeight: 800,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 10,
                  boxShadow: "0 8px 24px rgba(16,185,129,0.35)",
                }}
              >
                Go to Training Portal Login <ArrowRight size={18} />
              </button>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        .spin {
          animation: spin 0.8s linear infinite;
        }
        @keyframes cardFadeIn {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default VerifyEmail;
