const db = require("../config/db");
const crypto = require("crypto");
const bcrypt = require("bcrypt");
const logger = require("../utils/logger");
const { sendSecurityAlert } = require("../utils/securityAlerts");
const { getLocation } = require("../utils/geolocate");

/* ================= HMAC HELPERS ================= */

const generateHMAC = (blob, iv, salt) => {
  return crypto
    .createHmac("sha256", process.env.HMAC_SECRET)
    .update(blob + iv + salt)
    .digest("hex");
};

const verifyVaultIntegrity = (vault) => {
  const recalculated = generateHMAC(
    vault.encrypted_blob,
    vault.iv,
    vault.salt
  );
  return crypto.timingSafeEqual(
    Buffer.from(recalculated),
    Buffer.from(vault.hmac_signature)
  );
};

/* ================= CREATE VAULT ================= */

exports.createVault = async (req, res) => {
  try {
    const userId = req.user.id;

    const {
      encryptedBlob,
      iv,
      salt,
      vaultType,
      triggerDays,
      releaseEmail
    } = req.body;

    if (!encryptedBlob || !iv || !salt || !vaultType) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const hmacSignature = generateHMAC(encryptedBlob, iv, salt);

    const [insertResult] = await db.query(
      `INSERT INTO vaults 
       (user_id, vault_type, encrypted_blob, iv, salt, trigger_days, release_email, status, hmac_signature) 
       VALUES (?, ?, ?, ?, ?, ?, ?, 'active', ?)`,
      [
        userId,
        vaultType,
        encryptedBlob,
        iv,
        salt,
        triggerDays || null,
        releaseEmail || null,
        hmacSignature
      ]
    );

    // Send vault creation alert
    const [userRow] = await db.query('SELECT email FROM users WHERE id = ?', [userId]);
    if (userRow.length > 0) {
      getLocation(req.ip).then(location => {
        sendSecurityAlert(userRow[0].email, 'vault_created', insertResult.insertId, { ip: req.ip, location, time: new Date() });
      }).catch(() => {});
    }

    res.status(201).json({ message: "Vault created successfully" });

  } catch (error) {
    logger.error(error, "CREATE ERROR");
    res.status(500).json({ message: "Server error" });
  }
};

/* ================= GET USER VAULTS ================= */

exports.getMyVaults = async (req, res) => {
  try {
    const userId = req.user.id;

    const [vaults] = await db.query(
      `SELECT id, vault_type, status, trigger_days, created_at
       FROM vaults
       WHERE user_id = ?
       AND status != 'deleted'
       ORDER BY created_at DESC`,
      [userId]
    );

    res.json(vaults);

  } catch (error) {
    logger.error(error, 'GET VAULTS ERROR');
    res.status(500).json({ message: "Server error" });
  }
};

/* ================= OPEN VAULT ================= */

exports.openVault = async (req, res) => {
  try {
    const userId = req.user.id;
    const ip = req.ip;
    const vaultId = req.params.id;

    const [rows] = await db.query(
      "SELECT * FROM vaults WHERE id = ? AND user_id = ?",
      [vaultId, userId]
    );

    if (!rows.length) {
      return res.status(404).json({ message: "Vault not found" });
    }

    const vault = rows[0];

    if (!verifyVaultIntegrity(vault)) {
      await db.query(
        `INSERT INTO vault_events (vault_id, user_id, event_type, ip_address)
         VALUES (?, ?, 'tamper_detected', ?)`,
        [vaultId, userId, ip]
      );
      return res.status(403).json({ message: "Vault integrity compromised" });
    }

    if (vault.status === "destroyed") {
      return res.status(410).json({ message: "Vault permanently destroyed" });
    }

    if (vault.vault_type === "destroy" && vault.status === "active") {
      await db.query(
        "UPDATE vaults SET status = 'destroyed' WHERE id = ?",
        [vaultId]
      );
    }

    await db.query(
      `INSERT INTO vault_events (vault_id, user_id, event_type, ip_address)
       VALUES (?, ?, 'opened', ?)`,
      [vaultId, userId, ip]
    );

    // Send security alert for vault opened (fire-and-forget)
    const [ownerRows] = await db.query('SELECT email FROM users WHERE id = ?', [userId]);
    if (ownerRows.length) {
      getLocation(req.ip).then(location => {
        sendSecurityAlert(ownerRows[0].email, 'vault_opened', vaultId, { ip: req.ip, location, time: new Date() });
      }).catch(() => {});
    }

    res.json({
      id: vault.id,
      encrypted_blob: vault.encrypted_blob,
      iv: vault.iv,
      salt: vault.salt,
      vault_type: vault.vault_type,
      status: vault.status
    });

  } catch (error) {
    logger.error(error, 'OPEN VAULT ERROR');
    res.status(500).json({ message: "Server error" });
  }
};

/* ================= DELETE VAULT ================= */

exports.deleteVault = async (req, res) => {
  try {
    const userId = req.user.id;
    const ip = req.ip;
    const vaultId = req.params.id;

    const [result] = await db.query(
      `UPDATE vaults 
       SET status = 'deleted'
       WHERE id = ? AND user_id = ?`,
      [vaultId, userId]
    );

    if (!result.affectedRows) {
      return res.status(404).json({ message: "Vault not found" });
    }

    await db.query(
      `INSERT INTO vault_events (vault_id, user_id, event_type, ip_address)
       VALUES (?, ?, 'deleted', ?)`,
      [vaultId, userId, ip]
    );

    // Send security alert for vault deleted (fire-and-forget)
    const [delOwner] = await db.query('SELECT email FROM users WHERE id = ?', [userId]);
    if (delOwner.length) {
      getLocation(req.ip).then(location => {
        sendSecurityAlert(delOwner[0].email, 'vault_deleted', vaultId, { ip: req.ip, location, time: new Date() });
      }).catch(() => {});
    }

    res.json({ message: "Vault deleted successfully" });

  } catch (error) {
    logger.error(error, 'DELETE VAULT ERROR');
    res.status(500).json({ message: "Delete failed" });
  }
};

/* ================= SHA-256 HELPER ================= */

const sha256 = (data) => crypto.createHash("sha256").update(data).digest("hex");

/* ================= PUBLIC RELEASE ACCESS ================= */

exports.accessReleaseVault = async (req, res) => {
  try {
    const rawToken = req.params.token;

    if (!/^[a-f0-9]{64}$/.test(rawToken)) {
      return res.status(400).json({ message: "Invalid token format" });
    }

    const tokenHash = sha256(rawToken);

    const [rows] = await db.query(
      `SELECT rt.*, v.*
       FROM release_tokens rt
       JOIN vaults v ON rt.vault_id = v.id
       WHERE rt.token_hash = ?`,
      [tokenHash]
    );

    if (!rows.length) {
      return res.status(404).json({ message: "Invalid token" });
    }

    const data = rows[0];

    if (data.used) {
      return res.status(403).json({ message: "Token already used" });
    }

    if (new Date() > new Date(data.expires_at)) {
      return res.status(403).json({ message: "Token expired" });
    }

    if (data.failed_attempts >= 3) {
      return res.status(403).json({ message: "Token locked" });
    }

    if (!verifyVaultIntegrity(data)) {
      return res.status(403).json({ message: "Vault integrity compromised" });
    }

    if (!data.verification_passed) {

      // select ONE question and store it if not selected
      if (!data.question_id) {
        const [q] = await db.query(
          `SELECT id FROM security_questions 
           WHERE user_id = ?
           ORDER BY RAND()
           LIMIT 1`,
          [data.user_id]
        );

        await db.query(
          `UPDATE release_tokens SET question_id = ? WHERE token_hash = ?`,
          [q[0].id, tokenHash]
        );

        data.question_id = q[0].id;
      }

      const [question] = await db.query(
        `SELECT id, question_text FROM security_questions WHERE id = ?`,
        [data.question_id]
      );

      return res.json({
        verificationRequired: true,
        question: question[0]
      });
    }

    // Mark used AFTER delivering vault data
    await db.query(
      `UPDATE release_tokens SET used = TRUE WHERE token_hash = ?`,
      [tokenHash]
    );

    res.json({
      encrypted_blob: data.encrypted_blob,
      iv: data.iv,
      salt: data.salt
    });

  } catch (error) {
    logger.error(error, 'RELEASE ACCESS ERROR');
    res.status(500).json({ message: "Release access failed" });
  }
};

/* ================= VERIFY RELEASE ANSWER ================= */

exports.verifyReleaseAnswer = async (req, res) => {
  try {
    const { token } = req.params;
    const { answer } = req.body;

    const tokenHash = sha256(token);

    const [rows] = await db.query(
      `SELECT rt.*, v.*
       FROM release_tokens rt
       JOIN vaults v ON rt.vault_id = v.id
       WHERE rt.token_hash = ?`,
      [tokenHash]
    );

    if (!rows.length) {
      return res.status(404).json({ message: "Invalid token" });
    }

    const data = rows[0];

    if (data.failed_attempts >= 3) {
      return res.status(403).json({ message: "Token locked" });
    }

    const [question] = await db.query(
      `SELECT answer_hash FROM security_questions WHERE id = ?`,
      [data.question_id]
    );

    const match = await bcrypt.compare(answer, question[0].answer_hash);

    if (!match) {
      await db.query(
        `UPDATE release_tokens 
         SET failed_attempts = failed_attempts + 1 
         WHERE token_hash = ?`,
        [tokenHash]
      );

      // Alert owner on 3rd failed attempt
      if (data.failed_attempts + 1 >= 3) {
        const [alertOwner] = await db.query('SELECT email FROM users WHERE id = ?', [data.user_id]);
        if (alertOwner.length) {
          getLocation(req.ip).then(location => {
            sendSecurityAlert(alertOwner[0].email, 'suspicious_attempts', data.vault_id, { ip: req.ip, location, time: new Date() });
          }).catch(() => {});
        }
      }

      return res.status(401).json({ message: "Incorrect answer" });
    }

    if (!verifyVaultIntegrity(data)) {
      return res.status(403).json({ message: "Vault integrity compromised" });
    }

    // Only mark verification_passed here — used is set when data is delivered
    await db.query(
      `UPDATE release_tokens 
       SET verification_passed = TRUE
       WHERE token_hash = ?`,
      [tokenHash]
    );

    res.json({
      encrypted_blob: data.encrypted_blob,
      iv: data.iv,
      salt: data.salt
    });

  } catch (error) {
    logger.error(error, 'RELEASE VERIFY ERROR');
    res.status(500).json({ message: "Verification failed" });
  }
};