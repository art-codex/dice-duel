const userModel = require('../models/user.model');

module.exports = async function adminMiddleware(req, res, next) {
  try {
    const user = userModel.findUserById(req.userId);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Admin only.' });
    }
    next();
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};