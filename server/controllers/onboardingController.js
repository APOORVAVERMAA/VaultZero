const db = require("../config/db");
const bcrypt = require("bcrypt");
const logger = require("../utils/logger");

/*
  COMPLETE ONBOARDING:
  - Saves alternate email
  - Saves 3 security questions with hashed answers
  - Marks onboarding + terms accepted
*/

exports.completeOnboarding = async (req, res) => {
  let conn;
  let txStarted = false;
  try {
    const userId = req.user?.id;

    const { alternateEmail, questions } = req.body;

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    if (!alternateEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(alternateEmail)) {
      return res.status(400).json({ message: "Valid alternate email required" });
    }

    if (!Array.isArray(questions) || questions.length !== 3) {
      return res.status(400).json({ message: "Exactly 3 security questions required" });
    }

    for (const q of questions) {
      if (!q.question || !q.answer || q.answer.trim().length < 2) {
        return res.status(400).json({ message: "All questions must have answers (min 2 characters)" });
      }
    }

    const uniqueQuestions = new Set(questions.map((q) => q.question.trim().toLowerCase()));
    if (uniqueQuestions.size !== 3) {
      return res.status(400).json({ message: "Security questions must be unique" });
    }

    conn = await db.connect();
    await conn.query('BEGIN');
    txStarted = true;

    // Update user
    await conn.query(
      `UPDATE users 
       SET alternate_email = $1, 
           onboarding_completed = TRUE,
           terms_accepted = TRUE
       WHERE id = $2`,
      [alternateEmail, userId]
    );

    // Delete existing questions (safety)
    await conn.query(
      `DELETE FROM security_questions WHERE user_id = $1`,
      [userId]
    );

    // Store questions with hashed answers
    for (const q of questions) {
      const hashed = await bcrypt.hash(q.answer.trim(), 12);

      await conn.query(
        `INSERT INTO security_questions (user_id, question_text, answer_hash)
         VALUES ($1, $2, $3)`,
        [userId, q.question, hashed]
      );
    }

    await conn.query('COMMIT');

    res.json({ message: "Onboarding completed successfully" });

  } catch (error) {
    if (conn && txStarted) {
      try {
        await conn.query('ROLLBACK');
      } catch (rollbackError) {
        logger.error(rollbackError, 'ONBOARDING ROLLBACK ERROR');
      }
    }
    logger.error(error, "ONBOARDING ERROR");
    res.status(500).json({ message: "Onboarding failed" });
  } finally {
    if (conn) {
      conn.release();
    }
  }
};

// Accept privacy/security policy
exports.acceptPolicy = async (req, res) => {
  try {
    const userId = req.user.id;
    await db.query(
      "UPDATE users SET terms_accepted = TRUE WHERE id = $1",
      [userId]
    );
    res.json({ message: "Policy accepted" });
  } catch (error) {
    logger.error(error, "ACCEPT POLICY ERROR");
    res.status(500).json({ message: "Failed to accept policy" });
  }
};