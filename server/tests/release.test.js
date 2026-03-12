const crypto = require("crypto");
const bcrypt = require("bcrypt");

jest.mock("../config/db", () => ({
  query: jest.fn()
}));

jest.mock("../utils/logger", () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn()
}));

const db = require("../config/db");
const vaultController = require("../controllers/vaultController");

const sha256 = (data) => crypto.createHash("sha256").update(data).digest("hex");

const mockReq = (overrides = {}) => ({
  user: { id: 1 },
  ip: "127.0.0.1",
  body: {},
  params: {},
  ...overrides
});
const mockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

beforeEach(() => {
  jest.clearAllMocks();
  process.env.HMAC_SECRET = "test-hmac-secret";
});

describe("Release Controller", () => {

  describe("GET /release/:token", () => {
    it("returns verification required for un-verified token", async () => {
      const rawToken = crypto.randomBytes(32).toString("hex");
      const tokenHash = sha256(rawToken);
      const blob = "dGVzdA==";
      const iv = "aXY=";
      const salt = "c2FsdA==";
      const hmac = crypto.createHmac("sha256", process.env.HMAC_SECRET)
        .update(blob + iv + salt).digest("hex");

      db.query
        .mockResolvedValueOnce([[{
          token_hash: tokenHash, vault_id: 1, used: false,
          expires_at: new Date(Date.now() + 86400000),
          failed_attempts: 0, verification_passed: false, question_id: null,
          user_id: 5, id: 1, encrypted_blob: blob, iv, salt,
          hmac_signature: hmac, vault_type: "release", status: "released"
        }]])
        .mockResolvedValueOnce([[{ id: 42 }]])  // random question
        .mockResolvedValueOnce([{}])             // update question_id
        .mockResolvedValueOnce([[{ id: 42, question_text: "Your pet?" }]]); // question text

      const req = mockReq({ params: { token: rawToken } });
      const res = mockRes();
      await vaultController.accessReleaseVault(req, res);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        verificationRequired: true,
        question: expect.objectContaining({ question_text: "Your pet?" })
      }));
    });

    it("rejects invalid token format", async () => {
      const req = mockReq({ params: { token: "bad-token" } });
      const res = mockRes();
      await vaultController.accessReleaseVault(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe("POST /release/verify/:token", () => {
    it("returns vault data on correct answer", async () => {
      const rawToken = crypto.randomBytes(32).toString("hex");
      const tokenHash = sha256(rawToken);
      const blob = "dGVzdA==";
      const iv = "aXY=";
      const salt = "c2FsdA==";
      const hmac = crypto.createHmac("sha256", process.env.HMAC_SECRET)
        .update(blob + iv + salt).digest("hex");
      const answerHash = await bcrypt.hash("fluffy", 12);

      db.query
        .mockResolvedValueOnce([[{
          token_hash: tokenHash, vault_id: 1, used: false,
          expires_at: new Date(Date.now() + 86400000),
          failed_attempts: 0, verification_passed: false, question_id: 42,
          user_id: 5, id: 1, encrypted_blob: blob, iv, salt,
          hmac_signature: hmac, vault_type: "release", status: "released"
        }]])
        .mockResolvedValueOnce([[{ answer_hash: answerHash }]])  // question answer
        .mockResolvedValueOnce([{}]); // update verification_passed

      const req = mockReq({ params: { token: rawToken }, body: { answer: "fluffy" } });
      const res = mockRes();
      await vaultController.verifyReleaseAnswer(req, res);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        encrypted_blob: blob,
        iv,
        salt
      }));
    });

    it("rejects wrong answer and increments failed attempts", async () => {
      const rawToken = crypto.randomBytes(32).toString("hex");
      const tokenHash = sha256(rawToken);
      const blob = "dGVzdA==";
      const iv = "aXY=";
      const salt = "c2FsdA==";
      const hmac = crypto.createHmac("sha256", process.env.HMAC_SECRET)
        .update(blob + iv + salt).digest("hex");
      const answerHash = await bcrypt.hash("fluffy", 12);

      db.query
        .mockResolvedValueOnce([[{
          token_hash: tokenHash, vault_id: 1, used: false,
          expires_at: new Date(Date.now() + 86400000),
          failed_attempts: 0, verification_passed: false, question_id: 42,
          user_id: 5, id: 1, encrypted_blob: blob, iv, salt,
          hmac_signature: hmac, vault_type: "release", status: "released"
        }]])
        .mockResolvedValueOnce([[{ answer_hash: answerHash }]])
        .mockResolvedValueOnce([{}]); // increment failed_attempts

      const req = mockReq({ params: { token: rawToken }, body: { answer: "wrong" } });
      const res = mockRes();
      await vaultController.verifyReleaseAnswer(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: "Incorrect answer" });
    });
  });
});
