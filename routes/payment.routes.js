// routes/payment.routes.js
import express from 'express';
import paymentController from '../controllers/payment.controller.js';
import walletMiddleware from '../middleware/wallet.middleware.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(authenticateToken);
router.use(walletMiddleware.trackWalletRequest);

router.post('/create-checkout-session',
  walletMiddleware.validateWalletRequest(['amount']),
  walletMiddleware.validateTransactionLimits({ min: 1, max: 50000 }),
  walletMiddleware.walletRateLimit({ max: 10, operation: 'create_checkout' }),
  walletMiddleware.logWalletOperation('create_checkout_session'),
  paymentController.createCheckoutSession
);

router.get('/verify-session/:sessionId',
  walletMiddleware.walletRateLimit({ max: 20, operation: 'verify_session' }),
  walletMiddleware.logWalletOperation('verify_payment_session'),
  paymentController.verifyPaymentSession
);

router.post('/initiate',
  walletMiddleware.validateWalletRequest(['amount', 'paymentMethod']),
  walletMiddleware.validateTransactionLimits({ min: 1, max: 50000 }),
  walletMiddleware.walletRateLimit({ max: 10, operation: 'initiate_payment' }),
  walletMiddleware.logWalletOperation('initiate_payment'),
  paymentController.initiatePayment
);

router.post('/verify',
  walletMiddleware.validateWalletRequest([], { allowEmpty: true }),
  walletMiddleware.walletRateLimit({ max: 20, operation: 'verify_payment' }),
  walletMiddleware.logWalletOperation('verify_payment'),
  paymentController.verifyPayment
);

router.get('/',
  paymentController.getUserPayments
);

router.get('/stats/summary',
  paymentController.getPaymentStats
);

router.get('/:paymentId',
  paymentController.getPaymentDetails
);

router.post('/:paymentId/retry',
  walletMiddleware.walletRateLimit({ max: 3, operation: 'retry_payment' }),
  walletMiddleware.logWalletOperation('retry_payment'),
  paymentController.retryPayment
);

router.post('/:paymentId/cancel',
  walletMiddleware.walletRateLimit({ max: 5, operation: 'cancel_payment' }),
  walletMiddleware.logWalletOperation('cancel_payment'),
  paymentController.cancelPayment
);

router.post('/:paymentId/refund',
  walletMiddleware.walletRateLimit({ max: 3, operation: 'initiate_refund' }),
  walletMiddleware.logWalletOperation('initiate_refund'),
  paymentController.initiateRefund
);

router.use(walletMiddleware.walletErrorHandler);

export default router;