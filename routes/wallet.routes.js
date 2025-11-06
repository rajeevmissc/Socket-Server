// routes/wallet.routes.js
import express from 'express';
import walletController from '../controllers/wallet.controller.js';
import walletMiddleware from '../middleware/wallet.middleware.js';

const router = express.Router();

router.use(walletMiddleware.ensureWallet);
router.use(walletMiddleware.trackWalletRequest);

router.get('/balance', 
  walletMiddleware.checkWalletStatus,
  walletController.getWalletBalance
);

router.post('/recharge',
  walletMiddleware.validateWalletRequest(['amount', 'paymentMethod']),
  walletMiddleware.validateTransactionLimits({ min: 1, max: 50000 }),
  walletMiddleware.walletRateLimit({ max: 5, operation: 'recharge' }),
  walletMiddleware.logWalletOperation('recharge'),
  walletController.addMoneyToWallet
);

router.post('/deduct',
  walletMiddleware.checkWalletStatus,
  walletMiddleware.validateWalletRequest(['amount', 'description']),
  walletMiddleware.validateSpending,
  walletMiddleware.walletRateLimit({ max: 10, operation: 'deduct' }),
  walletMiddleware.logWalletOperation('deduct'),
  walletController.deductMoneyFromWallet
);

router.get('/limits',
  walletController.getSpendingLimitsInfo
);

router.put('/limits',
  walletMiddleware.validateWalletRequest([]),
  walletMiddleware.walletRateLimit({ max: 3, operation: 'update_limits' }),
  walletController.updateWalletLimits
);

router.get('/stats',
  walletController.getWalletStats
);

router.post('/transfer',
  walletMiddleware.checkWalletStatus,
  walletMiddleware.validateWalletRequest(['recipientId', 'amount', 'description']),
  walletMiddleware.validateSpending,
  walletMiddleware.checkMinimumBalance(100),
  walletMiddleware.walletRateLimit({ max: 5, operation: 'transfer' }),
  walletMiddleware.logWalletOperation('transfer'),
  walletController.transferMoney
);

router.put('/:walletId/status',
  walletMiddleware.checkWalletOwnership,
  walletController.toggleWalletStatus
);

router.use(walletMiddleware.walletErrorHandler);

export default router;