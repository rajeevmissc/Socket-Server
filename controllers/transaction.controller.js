// controllers/transaction.controller.js
import { Transaction } from '../models/transaction.model.js';
import { parseReference } from '../utils/reference.util.js';

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
    
    // Build query
    const query = { userId: req.user._id };
    
    if (type) query.type = type;
    if (status) query.status = status;
    if (category) query.category = category;
    if (serviceType) query.serviceType = serviceType;
    
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }
    
    // Get transactions
    const transactions = await Transaction.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('providerId', 'firstName lastName email')
      .lean();
    
    // Get total count
    const total = await Transaction.countDocuments(query);
    
    // Format transactions with robust error handling
    const formattedTransactions = transactions.map((transaction, index) => {
      try {
        // Convert to plain object to avoid method call issues
        const t = transaction.toObject ? transaction.toObject() : transaction;
        
        return {
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
      } catch (formatError) {
        console.error(`Error formatting transaction at index ${index}:`, formatError);
        return {
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
          dateRange: startDate && endDate ? { startDate, endDate } : null
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

/**
 * Get transaction by reference ID
 */
export const getTransactionByReference = async (req, res) => {
  try {
    const { reference } = req.params;
    
    const transaction = await Transaction.findOne({ 
      reference: reference.toUpperCase(),
      userId: req.user._id 
    }).populate('providerId', 'firstName lastName email phone');
    
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
    
    res.json({
      success: true,
      data: {
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
      }
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
    
    // Get overall statistics
    const stats = await Transaction.getUserStats(req.user._id, startDate, new Date());
    
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
    
    const groupedStats = await Transaction.aggregate([
      {
        $match: {
          userId: req.user._id,
          createdAt: { $gte: startDate }
        }
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
        $match: {
          userId: req.user._id,
          createdAt: { $gte: startDate }
        }
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
          userId: req.user._id,
          type: 'debit',
          serviceType: { $exists: true, $ne: null },
          createdAt: { $gte: startDate }
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
    
    const query = { userId: req.user._id };
    
    if (type) query.type = type;
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }
    
    const transactions = await Transaction.find(query)
      .sort({ createdAt: -1 })
      .populate('providerId', 'firstName lastName')
      .lean();
    
    if (format === 'csv') {
      // Generate CSV content
      const csvHeader = 'Reference,Type,Amount,Description,Status,Category,Service Type,Provider,Payment Method,Balance Before,Balance After,Date,Processed Date\n';
      
      const csvContent = transactions.map(t => {
        const providerName = t.providerId ? `${t.providerId.firstName} ${t.providerId.lastName}` : '';
        return [
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
    
    const searchQuery = {
      userId: req.user._id,
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
    
    const transactions = await Transaction.find(searchQuery)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('providerId', 'firstName lastName')
      .lean();
    
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
  searchTransactions
};