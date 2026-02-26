import mongoose from 'mongoose';

const connectDB = async () => {
    try {
        const mongoUri =
            process.env.MongoDB_URL ||
            process.env.MONGODB_URL ||
            process.env.MONGO_URI;

        if (!mongoUri) {
            throw new Error(
                'Missing MongoDB connection string. Set MongoDB_URL, MONGODB_URL, or MONGO_URI in .env'
            );
        }

        const conn = await mongoose.connect(mongoUri);
        console.log(`MongoDB Connected: ${conn.connection.host}`);
    } catch (error) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
    }
};

export default connectDB;
