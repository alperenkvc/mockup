const User = require('../models/User');
const bcrypt = require('bcrypt');

/**
 * @desc    Register new user
 * @route   POST /api/users/register
 * @access  Private
 * @isTested true
 */
const registerUser = async (req, res) => {

    try{
        const { email, password, username, first_name, last_name} = req.body;

        if(!email || !password || !username){
            return  res.status(400).json({ message: 'Please provide all required fields' });
        }

        const userExists = await User.findByEmail(email);
        if (userExists) {
            return res.status(400).json({ message: 'User already exists' });
        }

        const salt = await bcrypt.genSalt(10);
        const password_hash = await bcrypt.hash(password, salt);

        const newUser = await User.create({ email, password_hash, username, first_name, last_name});

        const token = User.generateToken(newUser.id, newUser.role);

        res.status(201).json({
            message: 'User registered successfully',
            id: newUser.id,
            username: newUser.username,
            role: newUser.role,
            token
        });
    } catch (error) {
        console.error('Error registering user:', error);
        res.status(500).json({ message: 'Server error' });
    }
}

/**
 * @desc    Log in user
 * @route   POST /api/users/login
 * @access  Private
 * @isTested true
 */
const loginUser = async (req, res) => {

    try {
        const { email, password } = req.body;

        if(!email || !password){
            return res.status(400).json({ message: 'Please provide all required fields' });
        }
        
        //Check if email exists
        const user = await User.findByEmail(email);
        if (!user) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        //check if user is banned
        if(user.is_banned){
            return res.status(403).json({ message: 'User is banned' });
        }

        //Compare password
        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        //send token
        const token = User.generateToken(user.id, user.role);

        res.json({
            id: user.id,
            username: user.username,
            role: user.role,
            token
        })
    }catch (error) {
        console.error('Error logging in user:', error);
        res.status(500).json({ message: 'Server error' });
    }
}


/**
 * @desc    Update user profile (username, names)
 * @route   PUT /api/users/profile
 * @access  Private
 * @isTested true
 */
const updateUser = async (req, res) => {
    try {
        const userId = req.user.id;
        const { username, first_name, last_name } = req.body;
        
        if(username){
            const existingUser = await User.findByUsername(username);
            if(existingUser && existingUser.id !== userId){
                return res.status(400).json({ message: 'Username already taken' });
            }
        }

        const updatedUser = await User.update(userId, { username, first_name, last_name });
        delete updatedUser.password_hash; // Prevent password updates

        res.status(200).json({ message: 'User profile updated successfully', user: updatedUser });
    }catch (error){
        console.error('Error updating user profile:', error);
        res.status(500).json({ message: 'Server error' });
    }
}

/**
 * @desc    Delete user account (by user)
 * @route   DELETE /api/users/profile
 * @access  Private
 * @isTested true
 */
const deleteUser = async (req, res) => {
    try {
        const userId = req.user.id;

        await User.delete(userId);

        res.status(200).json({ message: 'User account deleted successfully' });
    } catch (error) {
        console.error('Error deleting user account:', error);
        res.status(500).json({ message: 'Server error' });
    }
}


module.exports = {
    registerUser,
    loginUser,
    updateUser,
    deleteUser
}