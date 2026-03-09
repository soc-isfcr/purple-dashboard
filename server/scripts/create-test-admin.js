import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../src/models/User.js';

dotenv.config();

async function createTestAdmin() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const email = "testadmin@gmail.com";
        const password = "password123";

        const existing = await User.findOne({ email });
        if (existing) {
            console.log("Test admin already exists.");
        } else {
            await User.create({
                name: "Test Admin",
                email: email,
                password: password,
                role: "admin"
            });
            console.log("Test admin created successfully.");
        }
        process.exit(0);
    } catch (error) {
        console.error("Error:", error);
        process.exit(1);
    }
}

createTestAdmin();
