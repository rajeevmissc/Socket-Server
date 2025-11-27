// routes/transaction.routes.js
import express from 'express';
import transactionController from '../controllers/transaction.controller.js';
import walletMiddleware from '../middleware/wallet.middleware.js';

const router = express.Router();

// Apply common middleware
router.use(walletMiddleware.trackWalletRequest);

// Get all transactions with pagination and filtering
router.get('/',
  transactionController.getTransactions
);

router.get( '/get-provider-transactions',
  transactionController.getAllTransactionsForProvider
  );

// Get transaction by reference ID
router.get('/reference/:reference',
  transactionController.getTransactionByReference
);

// Get transaction statistics
router.get('/stats',
  transactionController.getTransactionStats
);

// Search transactions
router.get('/search',
  walletMiddleware.walletRateLimit({ max: 20, operation: 'search_transactions' }),
  transactionController.searchTransactions
);

// Export transactions (CSV/JSON)
router.get('/export',
  walletMiddleware.walletRateLimit({ max: 5, operation: 'export_transactions' }),
  walletMiddleware.logWalletOperation('export_transactions'),
  transactionController.exportTransactions
);

// Apply error handler
router.use(walletMiddleware.walletErrorHandler);


export default router;

