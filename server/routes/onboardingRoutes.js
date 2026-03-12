const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const onboardingController = require("../controllers/onboardingController");

router.post("/accept-policy", authMiddleware, onboardingController.acceptPolicy);
router.post("/complete", authMiddleware, onboardingController.completeOnboarding);

module.exports = router;