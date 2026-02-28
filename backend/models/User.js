import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
        },
        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
        },
        username: {
            type: String,
            unique: true,
            sparse: true,
            lowercase: true,
            trim: true,
        },
        password: {
            type: String,
            required: true,
        },
        role: {
            type: String,
            required: true,
            enum: ['user', 'shop_owner', 'admin'],
            default: 'user',
            lowercase: true,
            trim: true,
        },
        location: {
            city: {
                type: String,
                required: true,
                trim: true,
            },
            area: {
                type: String,
                required: true,
                trim: true,
            },
        },
        followedShops: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Shop',
            },
        ],
    },
    {
        timestamps: true,
    }
);

// Method to check if entered password matches the hashed password in DB
userSchema.methods.matchPassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

// Middleware to hash the password before saving
userSchema.pre('save', async function () {
    if (!this.isModified('password')) {
        return;
    }
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
});

userSchema.index({ followedShops: 1 });
userSchema.index({ role: 1, createdAt: -1 });

const User = mongoose.model('User', userSchema);
export default User;
