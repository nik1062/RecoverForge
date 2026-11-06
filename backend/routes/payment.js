const express = require('express');
const router = express.Router();
const { createOrder, verifyPayment, getTransactions } = require('../controllers/paymentController');
const { protect } = require('../middleware/auth');

router.use(protect);
router.post('/create-order', createOrder);
router.post('/verify', verifyPayment);
router.get('/transactions', getTransactions);

module.exports = router;
