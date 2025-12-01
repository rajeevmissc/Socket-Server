// controllers/transaction.controller.js
import { Transaction } from '../models/transaction.model.js';
import { parseReference } from '../utils/reference.util.js';

/**
 * Check if user has admin role
 */
const isAdmin = (user) => {
  return user && user.role === 'admin';
};

/**
 * Get transactions with pagination and filtering
 */
export const getTransactions = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const type = req.query.type; // 'credit' or 'debit'
    const status = req.query.status;
    const category = req.query.category;
    const serviceType = req.query.serviceType;
    const startDate = req.query.startDate;
    const endDate = req.query.endDate;
    const skip = (page - 1) * limit;
    
    // Build query - ADMIN can see all transactions, regular users only their own
    const query = {};
    
    // If user is not admin, restrict to their own transactions
    if (!isAdmin(req.user)) {
      query.userId = req.user._id;
    }
    // If admin and specific userId is provided in query, use it
    else if (isAdmin(req.user) && req.query.userId) {
      query.userId = req.query.userId;
    }
    // If admin and no userId provided, they can see all transactions (no userId filter)
    
    if (type) query.type = type;
    if (status) query.status = status;
    if (category) query.category = category;
    if (serviceType) query.serviceType = serviceType;
    
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }
    
    // Get transactions with conditional population for admin
    const transactionsQuery = Transaction.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('providerId', 'firstName lastName email');
    
    // Add user population for admin to see who owns the transaction
    if (isAdmin(req.user)) {
      transactionsQuery.populate('userId', 'firstName lastName email');
    }
    
    const transactions = await transactionsQuery.lean();
    
    // Get total count
    const total = await Transaction.countDocuments(query);
    
    // Format transactions with robust error handling
    const formattedTransactions = transactions.map((transaction, index) => {
      try {
        // Convert to plain object to avoid method call issues
        const t = transaction.toObject ? transaction.toObject() : transaction;
        
        const baseTransaction = {
          id: t._id || transaction._id,
          reference: t.reference || transaction.reference || '',
          type: t.type || transaction.type || 'unknown',
          amount: t.amount || transaction.amount || 0,
          formattedAmount: `₹${(t.amount || transaction.amount || 0).toLocaleString('en-IN')}`,
          description: t.description || transaction.description || 'No description',
          status: t.status || transaction.status || 'pending',
          category: t.category || transaction.category || null,
          serviceId: t.serviceId || transaction.serviceId || null,
          serviceType: t.serviceType || transaction.serviceType || null,
          provider: (t.providerId || transaction.providerId) ? {
            id: (t.providerId._id || transaction.providerId._id),
            name: `${(t.providerId.firstName || transaction.providerId.firstName || '')} ${(t.providerId.lastName || transaction.providerId.lastName || '')}`.trim(),
            email: (t.providerId.email || transaction.providerId.email || '')
          } : null,
          balanceBefore: t.balanceBefore || transaction.balanceBefore || 0,
          balanceAfter: t.balanceAfter || transaction.balanceAfter || 0,
          paymentMethod: t.paymentMethod || transaction.paymentMethod || null,
          createdAt: t.createdAt || transaction.createdAt,
          processedAt: t.processedAt || transaction.processedAt || null,
          // Use inline boolean logic for canRefund
          canRefund: (t.type || transaction.type) === 'debit' && (t.status || transaction.status) === 'completed' && (t.amount || transaction.amount) > 0,
          refundableAmount: (t.type || transaction.type) === 'debit' && (t.status || transaction.status) === 'completed' ? (t.amount || transaction.amount) : 0
        };

        // Add user information for admin
        if (isAdmin(req.user) && (t.userId || transaction.userId)) {
          baseTransaction.user = {
            id: (t.userId?._id || transaction.userId?._id),
            name: `${(t.userId?.firstName || transaction.userId?.firstName || '')} ${(t.userId?.lastName || transaction.userId?.lastName || '')}`.trim(),
            email: (t.userId?.email || transaction.userId?.email || '')
          };
        }

        return baseTransaction;
      } catch (formatError) {
        console.error(`Error formatting transaction at index ${index}:`, formatError);
        const fallbackTransaction = {
          id: transaction._id,
          reference: transaction.reference,
          type: transaction.type,
          amount: transaction.amount,
          formattedAmount: `₹${transaction.amount.toLocaleString('en-IN')}`,
          description: transaction.description,
          status: transaction.status,
          category: transaction.category,
          serviceId: transaction.serviceId,
          serviceType: transaction.serviceType,
          provider: transaction.providerId ? {
            id: transaction.providerId._id,
            name: `${transaction.providerId.firstName} ${transaction.providerId.lastName}`,
            email: transaction.providerId.email
          } : null,
          balanceBefore: transaction.balanceBefore,
          balanceAfter: transaction.balanceAfter,
          paymentMethod: transaction.paymentMethod,
          createdAt: transaction.createdAt,
          processedAt: transaction.processedAt,
          canRefund: (transaction.type === 'debit' && transaction.status === 'completed' && transaction.amount > 0),
          refundableAmount: (transaction.type === 'debit' && transaction.status === 'completed') ? transaction.amount : 0
        };

        // Add user information for admin in fallback
        if (isAdmin(req.user) && transaction.userId) {
          fallbackTransaction.user = {
            id: transaction.userId._id,
            name: `${transaction.userId.firstName} ${transaction.userId.lastName}`,
            email: transaction.userId.email
          };
        }

        return fallbackTransaction;
      }
    });
    
    res.json({
      success: true,
      data: {
        transactions: formattedTransactions,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasNext: page < Math.ceil(total / limit),
          hasPrev: page > 1
        },
        filters: {
          type,
          status,
          category,
          serviceType,
          dateRange: startDate && endDate ? { startDate, endDate } : null,
          // Include userId filter in response only for admin when used
          ...(isAdmin(req.user) && req.query.userId && { userId: req.query.userId })
        }
      }
    });
    
  } catch (error) {
    console.error('Error fetching transactions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch transactions'
    });
  }
};




// ⛔ Provider cannot change type or providerId through query parameters.
// ✔ Provider only sees income (credit) related to their ID.

router.get("/provider/transactions/:providerId", async (req, res) => {
  try {
    const { providerId } = req.params;

    // Fetch all transactions credited to the provider
    const transactions = await Transaction.find({ providerId }).sort({ createdAt: -1 });

    // Stats
    const totalEarnings = transactions
      .filter(t => t.type === "debit")        // user paid → provider credited
      .reduce((sum, t) => sum + t.amount, 0);

    const completed = transactions.filter(t => t.status === "completed").length;
    const pending = transactions.filter(t => t.status === "pending").length;

    res.json({
      success: true,
      providerId,
      stats: {
        totalEarnings,
        totalTransactions: transactions.length,
        completedTransactions: completed,
        pendingTransactions: pending
      },
      transactions
    });

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * Get transaction by reference ID
 */
export const getTransactionByReference = async (req, res) => {
  try {
    const { reference } = req.params;
    
    // Build query - ADMIN can see any transaction, regular users only their own
    const query = { 
      reference: reference.toUpperCase()
    };
    
    if (!isAdmin(req.user)) {
      query.userId = req.user._id;
    }
    // Admin can see any transaction without userId filter
    
    const transaction = await Transaction.findOne(query)
      .populate('providerId', 'firstName lastName email phone');
    
    // Add user population for admin
    if (isAdmin(req.user)) {
      transaction.populate('userId', 'firstName lastName email');
    }
    
    if (!transaction) {
      return res.status(404).json({
        success: false,
        error: 'Transaction not found',
        code: 'TRANSACTION_NOT_FOUND'
      });
    }
    
    // Parse reference for additional info
    let referenceInfo = null;
    try {
      referenceInfo = parseReference(reference);
    } catch (error) {
      console.warn('Could not parse reference:', reference);
    }
    
    const responseData = {
      id: transaction._id,
      reference: transaction.reference,
      referenceInfo,
      type: transaction.type,
      amount: transaction.amount,
      formattedAmount: transaction.formattedAmount,
      description: transaction.description,
      status: transaction.status,
      category: transaction.category,
      serviceId: transaction.serviceId,
      serviceType: transaction.serviceType,
      provider: transaction.providerId ? {
        id: transaction.providerId._id,
        name: `${transaction.providerId.firstName} ${transaction.providerId.lastName}`,
        email: transaction.providerId.email,
        phone: transaction.providerId.phone
      } : null,
      balanceBefore: transaction.balanceBefore,
      balanceAfter: transaction.balanceAfter,
      paymentMethod: transaction.paymentMethod,
      paymentGateway: transaction.paymentGateway,
      paymentId: transaction.paymentId,
      metadata: transaction.metadata,
      location: transaction.location,
      ipAddress: transaction.ipAddress,
      createdAt: transaction.createdAt,
      processedAt: transaction.processedAt,
      canRefund: transaction.canRefund(),
      refundableAmount: transaction.getRefundableAmount(),
      age: transaction.age
    };

    // Add user information for admin
    if (isAdmin(req.user) && transaction.userId) {
      responseData.user = {
        id: transaction.userId._id,
        name: `${transaction.userId.firstName} ${transaction.userId.lastName}`,
        email: transaction.userId.email
      };
    }
    
    res.json({
      success: true,
      data: responseData
    });
    
  } catch (error) {
    console.error('Error fetching transaction:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch transaction'
    });
  }
};

/**
 * Get transaction statistics
 */
export const getTransactionStats = async (req, res) => {
  try {
    const { period = '30', groupBy = 'day' } = req.query;
    const daysBack = parseInt(period);
    
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysBack);
    
    // Build user filter - ADMIN can see all stats, regular users only their own
    let userFilter = {};
    if (!isAdmin(req.user)) {
      userFilter.userId = req.user._id;
    }
    // If admin and specific userId is provided, use it
    else if (isAdmin(req.user) && req.query.userId) {
      userFilter.userId = req.query.userId;
    }
    // Admin without userId sees all data (no filter)
    
    // Get overall statistics
    let stats;
    if (isAdmin(req.user) && !req.query.userId) {
      // Admin viewing all users - get global stats
      stats = await Transaction.aggregate([
        {
          $match: {
            createdAt: { $gte: startDate }
          }
        },
        {
          $group: {
            _id: null,
            totalTransactions: { $sum: 1 },
            totalAmount: { $sum: "$amount" },
            totalCredits: {
              $sum: { $cond: [{ $eq: ["$type", "credit"] }, 1, 0] }
            },
            totalDebits: {
              $sum: { $cond: [{ $eq: ["$type", "debit"] }, 1, 0] }
            },
            creditAmount: {
              $sum: { $cond: [{ $eq: ["$type", "credit"] }, "$amount", 0] }
            },
            debitAmount: {
              $sum: { $cond: [{ $eq: ["$type", "debit"] }, "$amount", 0] }
            },
            completedTransactions: {
              $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] }
            },
            failedTransactions: {
              $sum: { $cond: [{ $eq: ["$status", "failed"] }, 1, 0] }
            }
          }
        }
      ]);
      
      stats = stats[0] || {
        totalTransactions: 0,
        totalAmount: 0,
        totalCredits: 0,
        totalDebits: 0,
        creditAmount: 0,
        debitAmount: 0,
        completedTransactions: 0,
        failedTransactions: 0
      };
    } else {
      // Regular user or admin with specific userId
      const userId = isAdmin(req.user) && req.query.userId ? req.query.userId : req.user._id;
      stats = await Transaction.getUserStats(userId, startDate, new Date());
    }
    
    // Get grouped statistics
    let groupByFormat;
    switch (groupBy) {
      case 'hour':
        groupByFormat = "%Y-%m-%d %H:00";
        break;
      case 'day':
        groupByFormat = "%Y-%m-%d";
        break;
      case 'week':
        groupByFormat = "%Y-W%U";
        break;
      case 'month':
        groupByFormat = "%Y-%m";
        break;
      default:
        groupByFormat = "%Y-%m-%d";
    }
    
    const matchStage = {
      createdAt: { $gte: startDate },
      ...userFilter
    };
    
    const groupedStats = await Transaction.aggregate([
      {
        $match: matchStage
      },
      {
        $group: {
          _id: {
            period: { $dateToString: { format: groupByFormat, date: "$createdAt" } },
            type: "$type",
            status: "$status"
          },
          count: { $sum: 1 },
          totalAmount: { $sum: "$amount" }
        }
      },
      { $sort: { "_id.period": 1 } }
    ]);
    
    // Get category-wise breakdown
    const categoryStats = await Transaction.aggregate([
      {
        $match: matchStage
      },
      {
        $group: {
          _id: {
            category: "$category",
            type: "$type"
          },
          count: { $sum: 1 },
          totalAmount: { $sum: "$amount" },
          avgAmount: { $avg: "$amount" }
        }
      }
    ]);
    
    // Get service type breakdown for debits
    const serviceTypeStats = await Transaction.aggregate([
      {
        $match: {
          ...matchStage,
          type: 'debit',
          serviceType: { $exists: true, $ne: null }
        }
      },
      {
        $group: {
          _id: "$serviceType",
          count: { $sum: 1 },
          totalAmount: { $sum: "$amount" },
          avgAmount: { $avg: "$amount" }
        }
      }
    ]);
    
    res.json({
      success: true,
      data: {
        period: `${daysBack} days`,
        groupBy,
        summary: stats,
        trends: groupedStats.map(item => ({
          period: item._id.period,
          type: item._id.type,
          status: item._id.status,
          count: item.count,
          totalAmount: Math.round(item.totalAmount * 100) / 100
        })),
        categoryBreakdown: categoryStats.map(item => ({
          category: item._id.category,
          type: item._id.type,
          count: item.count,
          totalAmount: Math.round(item.totalAmount * 100) / 100,
          avgAmount: Math.round(item.avgAmount * 100) / 100
        })),
        serviceTypeBreakdown: serviceTypeStats.map(item => ({
          serviceType: item._id,
          count: item.count,
          totalAmount: Math.round(item.totalAmount * 100) / 100,
          avgAmount: Math.round(item.avgAmount * 100) / 100
        }))
      }
    });
    
  } catch (error) {
    console.error('Error fetching transaction stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch transaction statistics'
    });
  }
};

/**
 * Export transactions to CSV
 */
export const exportTransactions = async (req, res) => {
  try {
    const { startDate, endDate, type, format = 'csv' } = req.query;
    
    // Build query - ADMIN can see all transactions, regular users only their own
    const query = {};
    
    if (!isAdmin(req.user)) {
      query.userId = req.user._id;
    }
    // If admin and specific userId is provided, use it
    else if (isAdmin(req.user) && req.query.userId) {
      query.userId = req.query.userId;
    }
    // Admin without userId sees all data (no filter)
    
    if (type) query.type = type;
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }
    
    const transactionsQuery = Transaction.find(query)
      .sort({ createdAt: -1 })
      .populate('providerId', 'firstName lastName');
    
    // Add user population for admin
    if (isAdmin(req.user)) {
      transactionsQuery.populate('userId', 'firstName lastName email');
    }
    
    const transactions = await transactionsQuery.lean();
    
    if (format === 'csv') {
      // Generate CSV content with conditional columns for admin
      const adminColumns = isAdmin(req.user) ? 'User,User Email,' : '';
      const csvHeader = `${adminColumns}Reference,Type,Amount,Description,Status,Category,Service Type,Provider,Payment Method,Balance Before,Balance After,Date,Processed Date\n`;
      
      const csvContent = transactions.map(t => {
        const providerName = t.providerId ? `${t.providerId.firstName} ${t.providerId.lastName}` : '';
        const userInfo = isAdmin(req.user) ? [
          t.userId ? `${t.userId.firstName} ${t.userId.lastName}` : '',
          t.userId ? t.userId.email : ''
        ] : [];
        
        return [
          ...userInfo,
          t.reference,
          t.type,
          t.amount,
          `"${t.description.replace(/"/g, '""')}"`, // Escape quotes
          t.status,
          t.category || '',
          t.serviceType || '',
          `"${providerName}"`,
          t.paymentMethod || '',
          t.balanceBefore,
          t.balanceAfter,
          t.createdAt.toISOString(),
          t.processedAt ? t.processedAt.toISOString() : ''
        ].join(',');
      }).join('\n');
      
      const csv = csvHeader + csvContent;
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="transactions_${Date.now()}.csv"`);
      res.send(csv);
      
    } else {
      // Return JSON format
      res.json({
        success: true,
        data: {
          transactions: transactions.map(t => ({
            // Add user info for admin
            ...(isAdmin(req.user) && {
              user: t.userId ? {
                id: t.userId._id,
                name: `${t.userId.firstName} ${t.userId.lastName}`,
                email: t.userId.email
              } : null
            }),
            reference: t.reference,
            type: t.type,
            amount: t.amount,
            description: t.description,
            status: t.status,
            category: t.category,
            serviceType: t.serviceType,
            provider: t.providerId ? `${t.providerId.firstName} ${t.providerId.lastName}` : null,
            paymentMethod: t.paymentMethod,
            balanceBefore: t.balanceBefore,
            balanceAfter: t.balanceAfter,
            createdAt: t.createdAt,
            processedAt: t.processedAt
          })),
          exportedAt: new Date(),
          totalRecords: transactions.length
        }
      });
    }
    
  } catch (error) {
    console.error('Error exporting transactions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to export transactions'
    });
  }
};

/**
 * Search transactions
 */
export const searchTransactions = async (req, res) => {
  try {
    const { q, page = 1, limit = 10 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    if (!q || q.trim().length < 2) {
      return res.status(400).json({
        success: false,
        error: 'Search query must be at least 2 characters long'
      });
    }
    
    // Build base query - ADMIN can search all transactions, regular users only their own
    const baseQuery = {};
    
    if (!isAdmin(req.user)) {
      baseQuery.userId = req.user._id;
    }
    // If admin and specific userId is provided, use it
    else if (isAdmin(req.user) && req.query.userId) {
      baseQuery.userId = req.query.userId;
    }
    // Admin without userId searches all data (no filter)
    
    const searchQuery = {
      ...baseQuery,
      $or: [
        { reference: { $regex: q, $options: 'i' } },
        { description: { $regex: q, $options: 'i' } },
        { serviceId: { $regex: q, $options: 'i' } },
        { paymentId: { $regex: q, $options: 'i' } }
      ]
    };
    
    // Try to parse as amount
    const numericQuery = parseFloat(q);
    if (!isNaN(numericQuery)) {
      searchQuery.$or.push({ amount: numericQuery });
    }
    
    const transactionsQuery = Transaction.find(searchQuery)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('providerId', 'firstName lastName');
    
    // Add user population for admin
    if (isAdmin(req.user)) {
      transactionsQuery.populate('userId', 'firstName lastName email');
    }
    
    const transactions = await transactionsQuery.lean();
    
    const total = await Transaction.countDocuments(searchQuery);
    
    res.json({
      success: true,
      data: {
        query: q,
        transactions: transactions.map(t => ({
          id: t._id,
          reference: t.reference,
          type: t.type,
          amount: t.amount,
          formattedAmount: `₹${t.amount.toLocaleString('en-IN')}`,
          description: t.description,
          status: t.status,
          serviceId: t.serviceId,
          serviceType: t.serviceType,
          provider: t.providerId ? `${t.providerId.firstName} ${t.providerId.lastName}` : null,
          // Add user info for admin
          ...(isAdmin(req.user) && {
            user: t.userId ? {
              id: t.userId._id,
              name: `${t.userId.firstName} ${t.userId.lastName}`,
              email: t.userId.email
            } : null
          }),
          createdAt: t.createdAt
        })),
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: Math.ceil(total / parseInt(limit))
        }
      }
    });
    
  } catch (error) {
    console.error('Error searching transactions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to search transactions'
    });
  }
};

export default {
  getTransactions,
  getTransactionByReference,
  getTransactionStats,
  exportTransactions,
  searchTransactions,
  getAllTransactionsForProvider
};






