function adminOnly(req, res, next) {
  if (!req.user || !req.user.username) {
    return res.status(401).json({ success: false, message: 'Brak uprawnień.' });
  }
  if (req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Dostęp tylko dla admina.' });
  }

  next();
}

module.exports = adminOnly;
