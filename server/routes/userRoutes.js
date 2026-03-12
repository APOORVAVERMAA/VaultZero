const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const authMiddleware = require('../middleware/authMiddleware');

router.get('/profile', authMiddleware, userController.getProfile);
router.get('/activity', authMiddleware, userController.getActivity);
router.post('/change-password', authMiddleware, userController.changePassword);
router.delete('/account', authMiddleware, userController.deleteAccount);

module.exports = router;