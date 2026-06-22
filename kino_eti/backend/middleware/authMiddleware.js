const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET;
const getConnection = require('../db');

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.status(401).json({ success: false, message: 'Brak tokenu.' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ success: false, message: 'Nieprawidłowy token.' });
    }
    
    req.user = user;
    next();
  });
}

module.exports = authenticateToken;
