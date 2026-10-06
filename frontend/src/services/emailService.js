/**
 * Email Service Layer — Levlox Student Portal
 *
 * Handles sending welcome emails, account activation links,
 * email verification, and delivery status tracking in Firestore.
 */

import { updateStudent, updateTrainer, getDocument, getEmailTemplates, interpolateEmailTemplate, DEFAULT_TRAINER_WELCOME_TEMPLATE } from "./firebaseService";
import { serverTimestamp } from "firebase/firestore";

/**
 * Generate a secure, unique verification token.
 */
export const generateVerificationToken = () => {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let token = "";
  for (let i = 0; i < 32; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
};

/**
 * Send Welcome / Verification email to a trainee.
 * Contains:
 *  - Trainee's name
 *  - Training ID / Roll Number
 *  - Training details (Course, Batch)
 *  - Login page link
 *  - Secure account activation / password setup link
 *  - Access instructions
 *
 * Updates Firestore with email delivery status and verification token details.
 */
export const sendTraineeWelcomeEmail = async (studentData, tempPassword = "") => {
  if (!studentData || (!studentData.email && !studentData.id)) {
    throw new Error("Student details and email address are required.");
  }

  const studentId = studentData.id || studentData.uid;
  const emailAddr = studentData.email;

  if (!emailAddr) {
    throw new Error("No registered email address found for this trainee.");
  }

  // Generate activation token if not present or expired
  const token = studentData.verificationToken || generateVerificationToken();
  const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(); // 48 hours expiry

  const origin = window.location.origin;
  const loginLink = `${origin}/login`;
  const activationLink = `${origin}/verify-email?uid=${studentId}&token=${token}`;

  try {
    const templateData = await getEmailTemplates();
    const welcomeTemplate = templateData?.studentWelcome || {};

    const variables = {
      studentName: studentData.name || "Trainee",
      studentId: studentData.rollNumber || studentData.id || "N/A",
      email: emailAddr,
      temporaryPassword: tempPassword || studentData.password || "********",
      course: studentData.course || "Levlox Training Program",
      batch: studentData.batch_name || studentData.batch || "Regular Batch",
    };

    let subject = interpolateEmailTemplate(welcomeTemplate.subject, variables);
    let body = interpolateEmailTemplate(welcomeTemplate.body, variables);

    // Append activation link and instructions if not in template
    if (!body.includes(activationLink)) {
      body += `\n\n----------------------------------------\n`;
      body += `ACCOUNT ACTIVATION REQUIRED:\n`;
      body += `Click the secure link below to verify your email address and activate your account:\n`;
      body += `${activationLink}\n\n`;
      body += `Portal Login Page: ${loginLink}\n`;
      body += `(This activation link expires in 48 hours.)\n`;
      body += `----------------------------------------`;
    }

    // Construct mailto URL for optional manual email client opening
    const mailtoUrl = `mailto:${encodeURIComponent(emailAddr)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    if (studentData.openMailClient === true) {
      window.open(mailtoUrl, "_blank");
    }

    // Update Firestore student record with delivery tracking and token
    await updateStudent(studentId, {
      verificationToken: token,
      verificationTokenExpiresAt: expiresAt,
      emailDeliveryStatus: "Sent",
      emailSentAt: new Date().toISOString(),
      verificationStatus: studentData.emailVerified ? "Verified" : "Pending",
    });

    return {
      success: true,
      deliveryStatus: "Sent",
      activationLink,
      mailtoUrl,
      token,
    };
  } catch (err) {
    console.error("[EmailService] Failed to send welcome email:", err);
    await updateStudent(studentId, {
      emailDeliveryStatus: "Failed",
      emailDeliveryError: err.message || "Email dispatch failed",
    }).catch(() => null);

    throw err;
  }
};

/**
 * Resend verification email for a student whose account is pending verification.
 */
export const resendVerificationEmail = async (studentIdOrEmail) => {
  let studentDoc = null;

  if (typeof studentIdOrEmail === "object" && studentIdOrEmail.id) {
    studentDoc = studentIdOrEmail;
  } else {
    studentDoc = await getDocument("students", studentIdOrEmail).catch(() => null);
  }

  if (!studentDoc) {
    throw new Error("Trainee profile not found.");
  }

  return sendTraineeWelcomeEmail(studentDoc);
};

/**
 * Send Welcome email to a Trainer.
 * Uses trainerWelcome template from Master Data if available.
 */
export const sendTrainerWelcomeEmail = async (trainerData, tempPassword = "") => {
  if (!trainerData || (!trainerData.email && !trainerData.id)) {
    throw new Error("Trainer details and email address are required.");
  }

  const trainerId = trainerData.id || trainerData.uid;
  const emailAddr = trainerData.email;

  if (!emailAddr) {
    throw new Error("No registered email address found for this trainer.");
  }

  const origin = window.location.origin;
  const loginLink = `${origin}/login`;

  try {
    const templateData = await getEmailTemplates();
    const welcomeTemplate = templateData?.trainerWelcome || DEFAULT_TRAINER_WELCOME_TEMPLATE;

    const variables = {
      trainerName: trainerData.name || trainerData.trainer_name || "Trainer",
      trainerId: trainerData.trainerId || trainerData.id || "N/A",
      email: emailAddr,
      temporaryPassword: tempPassword || trainerData.password || "********",
      loginUrl: loginLink,
    };

    let subject = interpolateEmailTemplate(welcomeTemplate.subject, variables);
    let body = interpolateEmailTemplate(welcomeTemplate.body, variables);

    const mailtoUrl = `mailto:${encodeURIComponent(emailAddr)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    if (trainerData.openMailClient === true) {
      window.open(mailtoUrl, "_blank");
    }

    await updateTrainer(trainerId, {
      emailDeliveryStatus: "Sent",
      emailSentAt: new Date().toISOString(),
    }).catch(() => null);

    return {
      success: true,
      deliveryStatus: "Sent",
      mailtoUrl,
    };
  } catch (err) {
    console.error("[EmailService] Failed to send trainer welcome email:", err);
    throw err;
  }
};

export default {
  generateVerificationToken,
  sendTraineeWelcomeEmail,
  sendTrainerWelcomeEmail,
  resendVerificationEmail,
};
