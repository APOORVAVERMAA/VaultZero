const crypto = require("crypto");

// Mock db
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

// Helpers
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

describe("Vault Controller", () => {

  describe("POST /create", () => {
    it("creates a vault successfully", async () => {
      db.query.mockResolvedValueOnce([{ insertId: 1 }]);

      const req = mockReq({
        body: {
          encryptedBlob: "dGVzdA==",
          iv: "aXY=",
          salt: "c2FsdA==",
          vaultType: "eternal"
        }
      });
      const res = mockRes();
      await vaultController.createVault(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({ message: "Vault created successfully" });
    });

    it("rejects missing fields", async () => {
      const req = mockReq({ body: { encryptedBlob: "dGVzdA==" } });
      const res = mockRes();
      await vaultController.createVault(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe("POST /open/:id", () => {
    it("returns encrypted vault data on valid open", async () => {
      const blob = "dGVzdA==";
      const iv = "aXY=";
      const salt = "c2FsdA==";
      const hmac = crypto.createHmac("sha256", process.env.HMAC_SECRET)
        .update(blob + iv + salt).digest("hex");

      db.query
        .mockResolvedValueOnce([[{
          id: 10, user_id: 1, encrypted_blob: blob, iv, salt,
          hmac_signature: hmac, vault_type: "eternal", status: "active"
        }]])
        .mockResolvedValueOnce([{}]); // event insert

      const req = mockReq({ params: { id: "10" } });
      const res = mockRes();
      await vaultController.openVault(req, res);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        encrypted_blob: blob,
        iv,
        salt
      }));
    });

    it("detects HMAC tamper", async () => {
      // Generate a valid-length but incorrect HMAC (64 hex chars = 32 bytes, same as SHA-256)
      const wrongHmac = crypto.createHmac("sha256", "wrong-key")
        .update("tampered").digest("hex");

      db.query
        .mockResolvedValueOnce([[{
          id: 10, user_id: 1,
          encrypted_blob: "dGVzdA==", iv: "aXY=", salt: "c2FsdA==",
          hmac_signature: wrongHmac,
          vault_type: "eternal", status: "active"
        }]])
        .mockResolvedValueOnce([{}]); // tamper event

      const req = mockReq({ params: { id: "10" } });
      const res = mockRes();
      await vaultController.openVault(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ message: "Vault integrity compromised" });
    });
  });
});
