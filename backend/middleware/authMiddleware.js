const jwt = require('jsonwebtoken');

/**
 * @desc    Middleware to protect routes and optionally set user info
 * @route   middleware
 * @access  Private/Public
 */
const protect = (req, res, next) => {
    let token;
    
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try{
            token = req.headers.authorization.split(' ')[1];
            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            req.user = {id: decoded.id, role: decoded.role};
            return next();
        }catch (error){
            console.error('Error verifying token:', error);
            return res.status(401).json({error: 'Not authorized, token failed'});
        }
    }
    if (!token) {
        return res.status(401).json({error: 'Not authorized, no token'});
    }
}

/**
 * @desc    Middleware to optionally set user info if token is provided
 * @route   middleware
 * @access  Public
 */
const optionalProtect = (req, res, next) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try{
            token = req.headers.authorization.split(' ')[1];
            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            req.user = {id: decoded.id, role: decoded.role};
        }catch (error){
            console.error('Error verifying token:', error);
        }
    }
    next();
}

/**
 * @desc    Middleware to check if user is the admin
 * @route   middleware
 * @access  Private
 */
const isAdmin = (req, res, next) => {
    if(req.user && req.user.global_role === 'admin'){
        return next();
    }
    return res.status(403).json({error: 'Not authorized, admin required'});
}

module.exports = { protect, optionalProtect, isAdmin };