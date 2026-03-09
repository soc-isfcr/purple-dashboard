import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, "../.env") });

async function listUsers() {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to DB");

    const User = mongoose.model("User", new mongoose.Schema({}));
    const users = await User.find().lean();

    console.log(`\n--- Users (${users.length}) ---`);
    for (const u of users) {
        console.log(`ID: ${u._id}, Email: ${u.email}, Role: ${u.role}`);
    }

    const Enrollment = mongoose.model("Enrollment", new mongoose.Schema({}));
    const enrollments = await Enrollment.find().lean();
    console.log(`\n--- Enrollments Total: ${enrollments.length} ---`);
    for (const e of enrollments) {
        console.log(`EID: ${e._id}, User: ${e.userId || e.user}, Course: ${e.courseId || e.course}, Status: ${e.status}`);
    }

    process.exit(0);
}

listUsers().catch(err => {
    console.error(err);
    process.exit(1);
});
