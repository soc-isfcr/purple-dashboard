import path from "path";
import fs from "fs";
import Certificate from "../models/Certificate.js";
import Course from "../models/Course.js";
import User from "../models/User.js";
import QuizSubmission from "../models/QuizSubmission.js";
import { createHttpError } from "../utils/errors.js";
import { sendResponse } from "../utils/response.js";
import crypto from "crypto";
import PDFDocument from "pdfkit";

const generateCertificateId = () => {
  return `CERT-${Date.now()}-${crypto
    .randomBytes(4)
    .toString("hex")
    .toUpperCase()}`;
};

// Calculate grade from quiz submissions
const calculateGrade = async (userId, courseId) => {
  try {
    const quizSubmissions = await QuizSubmission.find({
      userId,
      courseId,
      submitted: true,
    });
    if (quizSubmissions.length === 0) {
      return "NA";
    }
    let totalPercentage = 0;
    let validSubmissions = 0;
    for (const submission of quizSubmissions) {
      if (submission.totalPoints && submission.totalPoints > 0) {
        const percentage = (submission.score / submission.totalPoints) * 100;
        totalPercentage += percentage;
        validSubmissions++;
      }
    }
    if (validSubmissions === 0) {
      return "NA";
    }
    const averagePercentage = totalPercentage / validSubmissions;
    if (averagePercentage >= 90) return "S";
    if (averagePercentage >= 80) return "A";
    if (averagePercentage >= 70) return "B";
    if (averagePercentage >= 60) return "C";
    if (averagePercentage >= 50) return "D";
    if (averagePercentage >= 40) return "E";
    return "F";
  } catch (error) {
    console.error("Error calculating grade:", error);
    return "NA";
  }
};

// Generate certificate
export const generateCertificate = async (userId, courseId) => {
  try {
    const existingCert = await Certificate.findOne({ userId, courseId });
    if (existingCert) return existingCert;

    const [user, course, grade] = await Promise.all([
      User.findById(userId),
      Course.findById(courseId),
      calculateGrade(userId, courseId),
    ]);

    if (!user || !course) {
      console.error("User or course not found for certificate generation");
      return null;
    }

    const certificateId = generateCertificateId();
    const validUntil = new Date();
    validUntil.setFullYear(validUntil.getFullYear() + 2);

    const certificate = new Certificate({
      userId,
      courseId,
      certificateId,
      issuedDate: new Date(),
      validUntil,
      grade,
      score: 100,
      isVerified: true,
      shareToken: crypto.randomBytes(32).toString("hex"),
    });

    await certificate.save();
    console.log(`[Certificate] Generated ${certificateId} for User: ${userId}, Course: ${courseId}`);
    return certificate;
  } catch (error) {
    console.error("Error generating certificate:", error);
    throw error;
  }
};

// GET /api/certificates/user
export const getUserCertificates = async (req, res, next) => {
  try {
    const userId = req.user?._id || req.user?.id;
    const certs = await Certificate.find({ userId }).populate("courseId");
    const formattedCerts = certs.map((c) => ({
      ...c.toObject(),
      course: c.courseId,
    }));
    sendResponse(res, 200, "Certificates fetched", formattedCerts);
  } catch (err) {
    next(err);
  }
};

// GET /api/certificates/:id/download
export const downloadCertificate = async (req, res, next) => {
  try {
    const { id } = req.params;
    const cert = await Certificate.findById(id)
      .populate("courseId")
      .populate("userId");

    if (!cert) return next(createHttpError(404, "Certificate not found"));

    const doc = new PDFDocument({
      layout: "landscape",
      size: "A4",
      margins: { top: 40, bottom: 40, left: 60, right: 60 },
    });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="certificate-${cert.certificateId}.pdf"`
    );
    doc.pipe(res);

    const pageWidth = doc.page.width;
    const pageHeight = doc.page.height;

    // Logos paths
    const publicPath = path.resolve(process.cwd(), "..", "client_fixed", "public");
    const socLogoPath = path.join(publicPath, "soc_logo.png"); // Top middle
    const isfcrLogoPath = path.join(publicPath, "c_isfcr_logo.jpeg"); // Top left
    const mainLogoPath = path.join(publicPath, "logo.png"); // Top right

    // ================= LOGOS AT TOP =================
    try {
      // Top Left: c_isfcr_logo.jpeg
      if (fs.existsSync(isfcrLogoPath)) {
        doc.image(isfcrLogoPath, 60, 40, { width: 80 });
      }

      // Top Middle: soc_logo.png
      if (fs.existsSync(socLogoPath)) {
        doc.image(socLogoPath, (pageWidth / 2) - 40, 40, { width: 80 });
      }

      // Top Right: logo.png
      if (fs.existsSync(mainLogoPath)) {
        doc.image(mainLogoPath, pageWidth - 140, 40, { width: 80 });
      }
    } catch (error) {
      console.error("Error loading logos:", error);
    }

    // ================= BORDER =================
    doc.rect(20, 20, pageWidth - 40, pageHeight - 40).lineWidth(3).stroke("#4A148C");
    doc.rect(30, 30, pageWidth - 60, pageHeight - 60).lineWidth(1).stroke("#7B1FA2");

    // ================= CERTIFICATE CONTENT =================
    doc
      .fontSize(42)
      .font("Helvetica-Bold")
      .fillColor("#4A148C")
      .text("CERTIFICATE", 0, 160, {
        align: "center",
        width: pageWidth,
      });

    doc
      .fontSize(20)
      .font("Helvetica")
      .fillColor("#333")
      .text("OF COMPLETION", 0, 210, {
        align: "center",
        width: pageWidth,
      });

    doc.moveDown(1.5);

    doc
      .fontSize(18)
      .font("Helvetica")
      .text("This is to certify that", 0, 280, { align: "center", width: pageWidth });

    doc.moveDown(0.5);

    doc
      .fontSize(32)
      .font("Helvetica-Bold")
      .fillColor("#1A237E")
      .text(cert.userId?.name || "Student Name", 0, 320, {
        align: "center",
        width: pageWidth,
      });

    doc.moveDown(0.5);

    doc
      .fontSize(16)
      .font("Helvetica")
      .fillColor("#333")
      .text("has successfully completed the course", 0, 380, { align: "center", width: pageWidth });

    doc
      .fontSize(22)
      .font("Helvetica-Bold")
      .fillColor("#4A148C")
      .text(cert.courseId?.title || "Course Title", 0, 410, {
        align: "center",
        width: pageWidth,
      });

    doc.moveDown(0.5);

    const gradeText = cert.grade && cert.grade !== "NA" ? `with Grade ${cert.grade}` : "with distinction";
    doc
      .fontSize(16)
      .font("Helvetica-Oblique")
      .fillColor("#333")
      .text(gradeText, 0, 450, {
        align: "center",
        width: pageWidth,
      });

    // ================= SIGNATURES =================
    const sigY = pageHeight - 120;

    // Bottom Left Sign
    doc.moveTo(100, sigY).lineTo(250, sigY).lineWidth(1).stroke("#333");
    doc.fontSize(12).font("Helvetica-Bold").text("Authorized Signatory", 100, sigY + 10, { width: 150, align: "center" });

    // Bottom Right Sign
    doc.moveTo(pageWidth - 250, sigY).lineTo(pageWidth - 100, sigY).lineWidth(1).stroke("#333");
    doc.fontSize(12).font("Helvetica-Bold").text("Course Coordinator", pageWidth - 250, sigY + 10, { width: 150, align: "center" });

    // ================= FOOTER DETAILS =================
    // Certificate ID & Date - Moved slightly up to prevent spillover to page 2 (absolute Y: pageHeight - 70)
    doc
      .fontSize(10)
      .font("Helvetica")
      .fillColor("#666")
      .text(`Certificate ID: ${cert.certificateId}`, 60, pageHeight - 70);

    const issuedDate = new Date(cert.issuedDate).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    doc.text(`Date of Issue: ${issuedDate}`, pageWidth - 220, pageHeight - 70, { width: 160, align: "right" });

    doc.end();
  } catch (err) {
    console.error("PDF Generation Error:", err);
    next(err);
  }
};

// GET /api/certificates/count
export const getCertificateCount = async (req, res, next) => {
  try {
    const userId = req.user?._id || req.user?.id;
    const count = await Certificate.countDocuments({ userId });
    sendResponse(res, 200, "Certificate count fetched", { count });
  } catch (err) {
    next(err);
  }
};
