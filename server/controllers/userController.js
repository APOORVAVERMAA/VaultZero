const db = require('../config/db');
const bcrypt = require('bcrypt');
const logger = require('../utils/logger');

exports.getProfile = async (req, res) => {
  try {
    const userId = req.user.id;

    const [users] = await db.query(
      'SELECT id, email, last_login, created_at FROM users WHERE id = ?',
      [userId]
    );

    if (users.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(users[0]);

  } catch (error) {
    logger.error(error, "Profile error");
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getActivity = async (req, res) => {
  try {
    const userId = req.user.id;
    const [events] = await db.query(
      'SELECT id, vault_id, event_type, ip_address, created_at FROM vault_events WHERE user_id = ? ORDER BY created_at DESC LIMIT 50',
      [userId]
    );
    res.json(events);
  } catch (error) {
    logger.error(error, "Activity fetch error");
    res.status(500).json({ message: 'Server error' });
  }
};

exports.changePassword = async (req, res) => {
  try {
    const userId = req.user.id;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Current and new password are required.' });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ message: 'New password must be at least 8 characters.' });
    }

    const [users] = await db.query('SELECT password_hash FROM users WHERE id = ?', [userId]);
    if (users.length === 0) {
      return res.status(404).json({ message: 'User not found.' });
    }

    const valid = await bcrypt.compare(currentPassword, users[0].password_hash);
    if (!valid) {
      return res.status(401).json({ message: 'Current password is incorrect.' });
    }

    const hash = await bcrypt.hash(newPassword, 12);
    await db.query('UPDATE users SET password_hash = ? WHERE id = ?', [hash, userId]);

    res.json({ message: 'Password changed successfully.' });
  } catch (error) {
    logger.error(error, "Change password error");
    res.status(500).json({ message: 'Server error' });
  }
};

exports.deleteAccount = async (req, res) => {
  let conn;
  let transactionStarted = false;
  try {
    const userId = req.user.id;
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({ message: 'Password required.' });
    }

    // Verify user exists and password is correct before acquiring connection
    const [users] = await db.query('SELECT password_hash FROM users WHERE id = ?', [userId]);
    if (users.length === 0) {
      return res.status(404).json({ message: 'User not found.' });
    }

    const valid = await bcrypt.compare(password, users[0].password_hash);
    if (!valid) {
      return res.status(401).json({ message: 'Incorrect password.' });
    }

    // Acquire connection only when we're ready to delete
    conn = await db.getConnection();
    await conn.beginTransaction();
    transactionStarted = true;

    // 1. Delete security questions
    await conn.query('DELETE FROM security_questions WHERE user_id = ?', [userId]);
    // 2. Delete release tokens (linked via vault_id)
    await conn.query('DELETE FROM release_tokens WHERE vault_id IN (SELECT id FROM vaults WHERE user_id = ?)', [userId]);
    // 3. Delete vault events
    await conn.query('DELETE FROM vault_events WHERE user_id = ?', [userId]);
    // 4. Delete vaults
    await conn.query('DELETE FROM vaults WHERE user_id = ?', [userId]);
    // 5. Delete user account
    await conn.query('DELETE FROM users WHERE id = ?', [userId]);

    await conn.commit();
    res.json({ message: 'Account deleted successfully.' });
  } catch (error) {
    if (conn && transactionStarted) {
      try { await conn.rollback(); } catch (rbErr) {
        logger.error(rbErr, "Rollback failed during account deletion");
      }
    }
    logger.error(error, "Delete account error");
    res.status(500).json({ message: 'Server error' });
  } finally {
    if (conn) conn.release();
  }
};