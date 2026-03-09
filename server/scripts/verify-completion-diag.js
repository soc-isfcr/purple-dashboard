import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

// Mock minimal models
const enrollmentSchema = new mongoose.Schema({}, { strict: false });
const certificateSchema = new mongoose.Schema({}, { strict: false });
const courseSchema = new mongoose.Schema({}, { strict: false });

const Enrollment = mongoose.model("Enrollment", enrollmentSchema);
const Certificate = mongoose.model("Certificate", certificateSchema);
const Course = mongoose.model("Course", courseSchema);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, "../.env") });

async function verify() {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to DB");

    const userId = "69a91f0f5f77d239a6bd5ad5";
    console.log(`Checking user: ${userId}`);

    const userEnrollments = await Enrollment.find({
        $or: [{ userId }, { user: userId }]
    }).populate("courseId");

    console.log(`\n--- Enrollments (${userEnrollments.length}) ---`);
    for (const e of userEnrollments) {
        const cid = e.courseId?._id || e.courseId;
        console.log(`Course: ${e.courseId?.title || cid}, Status: ${e.status}, Progress: ${e.progress}%`);
    }

    const userCerts = await Certificate.find({
        $or: [{ userId }, { user: userId }]
    });

    console.log(`\n--- Certificates (${userCerts.length}) ---`);
    for (const c of userCerts) {
        const cid = c.courseId || c.course;
        console.log(`CertID: ${c._id}, CourseID: ${cid}, Issued: ${c.issuedDate || c.issuedAt}`);
    }

    process.exit(0);
}

verify().catch(err => {
    console.error(err);
    process.exit(1);
});
