const cron = require("node-cron");
const db = require("../config/db");
const crypto = require("crypto");
const { sendReleaseEmail } = require("./mailer");
const { sendSecurityAlert } = require("./securityAlerts");
const logger = require("./logger");

const sha256 = (data) => crypto.createHash("sha256").update(data).digest("hex");

const startTriggerEngine = () => {

  cron.schedule("*/5 * * * *", async () => {

    try {
      logger.info("Trigger Engine Running...");

      const [vaults] = await db.query(`
        SELECT v.*, u.email as owner_email, u.last_login
        FROM vaults v
        JOIN users u ON v.user_id = u.id
        WHERE v.vault_type = 'release'
        AND v.status = 'active'
      `);

      const now = new Date();

      for (let vault of vaults) {

        const lastLogin = new Date(vault.last_login);
        const daysInactive = Math.floor(
          (now - lastLogin) / (1000 * 60 * 60 * 24)
        );

        if (daysInactive >= vault.trigger_days) {

          const rawToken = crypto.randomBytes(32).toString("hex");
          const tokenHash = sha256(rawToken);

          const expiry = new Date();
          expiry.setHours(expiry.getHours() + 48);

          // Transaction: mark released + store hashed token atomically
          const conn = await db.getConnection();
          try {
            await conn.beginTransaction();

            await conn.query(
              `UPDATE vaults SET status = 'released' WHERE id = ? AND status = 'active'`,
              [vault.id]
            );

            await conn.query(
              `INSERT INTO release_tokens (vault_id, token_hash, expires_at)
               VALUES (?, ?, ?)`,
              [vault.id, tokenHash, expiry]
            );

            await conn.commit();
          } catch (txErr) {
            await conn.rollback();
            logger.error(txErr, `Transaction failed for vault ${vault.id}`);
            continue;
          } finally {
            conn.release();
          }

          const releaseLink = `${process.env.FRONTEND_URL}/release/${rawToken}`;

          await sendReleaseEmail(
            vault.release_email,
            vault,
            vault.owner_email,
            releaseLink
          );

          logger.info(`Vault ${vault.id} released and email sent.`);

          // Alert the vault owner about the release
          sendSecurityAlert(vault.owner_email, 'vault_released', vault.id).catch(() => {});
        }
      }

    } catch (error) {
      logger.error(error, "Trigger Engine Error");
    }

  });

};

module.exports = startTriggerEngine;