const jwt = require('jsonwebtoken');
const db = require('../db');

function getJwtSecret() {
  return process.env.JWT_SECRET;
}

function sendAuthConfigError(res) {
  return res.status(500).json({ message: 'Authentication is not configured' });
}

async function requireAuth(req, res, next) {
  const secret = getJwtSecret();
  if (!secret) return sendAuthConfigError(res);

  const authHeader = req.headers.authorization || '';
  const [scheme, token] = authHeader.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ message: 'Authorization token required' });
  }

  try {
    const payload = jwt.verify(token, secret);
    const userId = payload.userId || payload.id || payload.sub;

    if (!userId) {
      return res.status(403).json({ message: 'Invalid token' });
    }

    const [rows] = await db.execute(
      'SELECT id, full_name, national_id, email, role, is_confirmed FROM users WHERE id = ? LIMIT 1',
      [userId]
    );

    if (rows.length === 0) {
      return res.status(403).json({ message: 'User no longer exists' });
    }

    req.user = rows[0];
    req.userId = rows[0].id;
    next();
  } catch (err) {
    return res.status(403).json({ message: 'Invalid token' });
  }
}

function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(500).json({ message: 'Authentication middleware missing' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }

    next();
  };
}

const requireCitizen = [requireAuth, requireRole('citizen')];
const requireStaff = [requireAuth, requireRole('staff', 'admin')];
const requireAdmin = [requireAuth, requireRole('admin')];

module.exports = {
  requireAuth,
  requireRole,
  requireCitizen,
  requireStaff,
  requireAdmin
};
