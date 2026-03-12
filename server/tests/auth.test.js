const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

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
const authController = require("../controllers/authController");

// Helpers
const mockReq = (body = {}) => ({ body });
const mockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

beforeEach(() => jest.clearAllMocks());

describe("Auth Controller", () => {

  describe("POST /register - password policy", () => {
    it("rejects passwords shorter than 8 characters", async () => {
      const req = mockReq({ email: "a@b.com", password: "Short1" });
      const res = mockRes();
      await authController.register(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: expect.stringContaining("8 characters") })
      );
    });

    it("rejects passwords without uppercase", async () => {
      const req = mockReq({ email: "a@b.com", password: "lowercase1" });
      const res = mockRes();
      await authController.register(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("rejects passwords without a number", async () => {
      const req = mockReq({ email: "a@b.com", password: "NoNumberHere" });
      const res = mockRes();
      await authController.register(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe("POST /login", () => {
    it("returns a token on valid credentials", async () => {
      process.env.JWT_SECRET = "testsecret";
      const hashed = await bcrypt.hash("Valid1pass", 12);
      db.query
        .mockResolvedValueOnce([[{ id: 1, email: "a@b.com", password_hash: hashed, terms_accepted: 1, onboarding_completed: 1 }]])
        .mockResolvedValueOnce([{}]); // last_login update

      const req = mockReq({ email: "a@b.com", password: "Valid1pass" });
      const res = mockRes();
      await authController.login(req, res);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ token: expect.any(String) }));
    });

    it("rejects invalid password", async () => {
      const hashed = await bcrypt.hash("CorrectPass1", 12);
      db.query.mockResolvedValueOnce([[{ id: 1, email: "a@b.com", password_hash: hashed }]]);

      const req = mockReq({ email: "a@b.com", password: "WrongPass1" });
      const res = mockRes();
      await authController.login(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: "Invalid credentials" });
    });
  });
});
