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
  try {
    const userId = req.user.id;

    const { alternateEmail, questions } = req.body;

    if (!alternateEmail) {
      return res.status(400).json({ message: "Alternate email required" });
    }

    if (!questions || questions.length !== 3) {
      return res.status(400).json({ message: "Exactly 3 security questions required" });
    }

    for (const q of questions) {
      if (!q.question || !q.answer || q.answer.trim().length < 2) {
        return res.status(400).json({ message: "All questions must have answers (min 2 characters)" });
      }
    }

    // Update user
    await db.query(
      `UPDATE users 
       SET alternate_email = $1, 
           onboarding_completed = TRUE,
           terms_accepted = TRUE
       WHERE id = $2`,
      [alternateEmail, userId]
    );

    // Delete existing questions (safety)
    await db.query(
      `DELETE FROM security_questions WHERE user_id = $1`,
      [userId]
    );

    // Store questions with hashed answers
    for (const q of questions) {
      const hashed = await bcrypt.hash(q.answer.trim(), 12);

      await db.query(
        `INSERT INTO security_questions (user_id, question_text, answer_hash)
         VALUES ($1, $2, $3)`,
        [userId, q.question, hashed]
      );
    }

    res.json({ message: "Onboarding completed successfully" });

  } catch (error) {
    logger.error(error, "ONBOARDING ERROR");
    res.status(500).json({ message: "Onboarding failed" });
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