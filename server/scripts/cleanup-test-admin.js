import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../src/models/User.js';

dotenv.config();

async function cleanupTestAdmin() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const email = "testadmin@gmail.com";
        await User.deleteOne({ email });
        console.log("Test admin removed.");
        process.exit(0);
    } catch (error) {
        console.error("Error:", error);
        process.exit(1);
    }
}

cleanupTestAdmin();
