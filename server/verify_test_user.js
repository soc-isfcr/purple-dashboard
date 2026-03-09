
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env
dotenv.config({ path: path.join(__dirname, '../server/.env') });

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/purple_lms';

async function verify() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('Connected to MongoDB');

        // Register models by importing them
        await import('../server/src/models/User.js');
        await import('../server/src/models/Course.js');
        await import('../server/src/models/Enrollment.js');
        await import('../server/src/models/Certificate.js');

        const User = mongoose.model('User');
        const Enrollment = mongoose.model('Enrollment');
        const Certificate = mongoose.model('Certificate');

        const testEmail = 'Test123@gmail.com';
        const user = await User.findOne({ email: testEmail });

        if (!user) {
            console.log(`User with email ${testEmail} not found`);
            process.exit(0);
        }

        const userId = user._id;
        console.log('Found User ID:', userId, 'Role:', user.role);

        const [enrollments, certs] = await Promise.all([
            Enrollment.find({
                $or: [{ userId }, { user: userId }],
                status: { $in: ["active", "ongoing", "completed"] }
            }).populate("courseId").lean(),
            Certificate.find({
                $or: [{ userId }, { user: userId }]
            }).lean()
        ]);

        console.log(`Enrollments count: ${enrollments.length}`);
        enrollments.forEach(e => {
            console.log(`- Course: ${e.courseId?.title || 'Unknown'}, Status: ${e.status}, Progress: ${e.progress}%`);
        });

        console.log(`Certificates count: ${certs.length}`);

        process.exit(0);
    } catch (err) {
        console.error('Verification failed:', err);
        process.exit(1);
    }
}

verify();
