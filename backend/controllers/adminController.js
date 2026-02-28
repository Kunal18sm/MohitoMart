import User from '../models/User.js';

// @desc    Get all users
// @route   GET /api/users
// @access  Private/Admin
export const getUsers = async (req, res, next) => {
    try {
        const users = await User.find({})
            .select('_id name email role location createdAt updatedAt')
            .lean();
        res.status(200).json(users);
    } catch (error) {
        next(error);
    }
};

// @desc    Get user by ID
// @route   GET /api/users/:id
// @access  Private/Admin
export const getUserById = async (req, res, next) => {
    try {
        const user = await User.findById(req.params.id).select('-password').lean();
        if (user) {
            res.status(200).json(user);
        } else {
            res.status(404);
            throw new Error('User not found');
        }
    } catch (error) {
        next(error);
    }
};

// @desc    Delete user
// @route   DELETE /api/users/:id
// @access  Private/Admin
export const deleteUser = async (req, res, next) => {
    try {
        const user = await User.findById(req.params.id);
        if (user) {
            if (user.role === 'admin') {
                res.status(400);
                throw new Error('Cannot delete admin user');
            }
            await User.deleteOne({ _id: user._id });
            res.status(200).json({ message: 'User removed successfully' });
        } else {
            res.status(404);
            throw new Error('User not found');
        }
    } catch (error) {
        next(error);
    }
};

// @desc    Update user
// @route   PUT /api/users/:id
// @access  Private/Admin
export const updateUser = async (req, res, next) => {
    try {
        const user = await User.findById(req.params.id);
        if (user) {
            user.name = req.body.name || user.name;
            user.email = req.body.email
                ? String(req.body.email).trim().toLowerCase()
                : user.email;
            user.username = user.email;
            user.role = req.body.role || user.role;

            const updatedUser = await user.save();
            res.status(200).json({
                _id: updatedUser._id,
                name: updatedUser.name,
                email: updatedUser.email,
                role: updatedUser.role,
            });
        } else {
            res.status(404);
            throw new Error('User not found');
        }
    } catch (error) {
        next(error);
    }
};
