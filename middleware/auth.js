const jwt = require('jsonwebtoken');
const Teacher = require('../models/Teacher');

const authMiddleware = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ message: 'No token provided, authorization denied' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const teacher = await Teacher.findById(decoded.id).select('-password');
    
    if (!teacher || !teacher.isActive) {
      return res.status(401).json({ message: 'Token is not valid or user is inactive' });
    }

    req.teacher = teacher;
    req.user = teacher; // For compatibility with profile routes
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Invalid token' });
    } else if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token expired' });
    }
    
    console.error('Auth middleware error:', error);
    res.status(500).json({ message: 'Server error during authentication' });
  }
};

module.exports = authMiddleware;
