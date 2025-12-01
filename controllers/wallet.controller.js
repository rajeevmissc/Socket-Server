// controllers/wallet.controller.js
import mongoose from 'mongoose';
import { Wallet } from '../models/wallet.model.js';
import { Transaction } from '../models/transaction.model.js';
import { generateReference } from '../utils/reference.util.js';
import { getSpendingLimits, updateSpendingLimits } from '../utils/limits.util.js';

/**
 * Get wallet balance and details
 */
export const getWalletBalance = async (req, res) => {
  try {
    const spendingLimits = getSpendingLimits(req.wallet);
    
    res.json({
      success: true,
      data: {
        walletId: req.wallet._id,
        balance: req.wallet.balance,
        currency: req.wallet.currency,
        isActive: req.wallet.isActive,
        isBlocked: req.wallet.isBlocked,
        ...spendingLimits,
        lastUpdated: req.wallet.updatedAt
      }
    });
  } catch (error) {
    console.error('Error fetching wallet balance:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch wallet balance'
    });
  }
};

/**
 * Add money to wallet after successful payment
 */
export const addMoneyToWallet = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    const { amount, paymentMethod, transactionId, description } = req.body;
    
    // Validate payment method matches enum
    const validPaymentMethods = ['UPI', 'Credit Card', 'Debit Card', 'Net Banking', 'Wallet', 'Cash', 'Stripe', 'Stripe Checkout', 'Cashfree Checkout', 'Cashfree'];
    if (!validPaymentMethods.includes(paymentMethod)) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        success: false,
        error: 'Invalid payment method',
        validMethods: validPaymentMethods
      });
    }
    
    const reference = generateReference('credit');
    const balanceBefore = req.wallet.balance;
    const balanceAfter = balanceBefore + amount;
    
    const transaction = new Transaction({
      userId: req.user._id,
      walletId: req.wallet._id,
      type: 'credit',
      amount,
      description: description || `Wallet Recharge via ${paymentMethod}`,
      reference,
      paymentMethod,
      paymentId: transactionId,
      category: 'recharge',
      balanceBefore,
      balanceAfter,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      metadata: { transactionId },
      status: 'completed'
    });
    
    req.wallet.balance = balanceAfter;
    req.wallet.updatedAt = new Date();
    
    await transaction.save({ session });
    await req.wallet.save({ session });
    
    await session.commitTransaction();
    session.endSession();
        
    res.json({
      success: true,
      data: {
        transactionId: transaction._id,
        reference: transaction.reference,
        amount: transaction.amount,
        newBalance: balanceAfter,
        transaction: {
          id: transaction._id,
          type: transaction.type,
          amount: transaction.amount,
          description: transaction.description,
          status: transaction.status,
          createdAt: transaction.createdAt
        }
      }
    });
    
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error('Error adding money to wallet:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to add money to wallet',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Deduct money from wallet for service bookings
 */
// controllers/wallet.controller.js
/**
 * Deduct money from wallet for service bookings - FIXED
 */
export const deductMoneyFromWallet = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    const { amount, description, serviceId, serviceType, providerId, metadata } = req.body;
    
    console.log('🔍 Deduct request received:', {
      userId: req.user._id,
      amount,
      description,
      serviceId,
      serviceType,
      providerId
    });

    // Validate required fields
    if (!amount || !description) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        success: false,
        error: 'Amount and description are required'
      });
    }
    
    // Validate service type if provided
    const validServiceTypes = ['call', 'video', 'visit', 'chat', 'subscription', 'other'];
    if (serviceType && !validServiceTypes.includes(serviceType)) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details: [`Service type must be one of: ${validServiceTypes.join(', ')}`]
      });
    }
    
    // Check if wallet has sufficient balance
    if (req.wallet.balance < amount) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        success: false,
        error: 'Insufficient balance',
        code: 'INSUFFICIENT_BALANCE',
        currentBalance: req.wallet.balance,
        requiredAmount: amount
      });
    }
    
    // Check if wallet is active and not blocked
    if (!req.wallet.isActive || req.wallet.isBlocked) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        success: false,
        error: 'Wallet is not active or blocked',
        code: 'WALLET_INACTIVE'
      });
    }
    
    const reference = generateReference('debit');
    const balanceBefore = req.wallet.balance;
    const balanceAfter = balanceBefore - amount;
    
    // Create transaction data - FIX: Handle empty providerId
  const transactionData = {
  userId: req.user._id,
  walletId: req.wallet._id,
  type: 'debit',
  amount,
  description,
  reference,
  serviceId: serviceId || `call_${Date.now()}`,
  category: 'service_payment',
  balanceBefore,
  balanceAfter,
  paymentMethod: "Wallet",  // 🔥 FIXED REQUIRED FIELD
  ipAddress: req.ip,
  userAgent: req.get('User-Agent'),
  metadata: metadata || {},
  status: 'completed'
}; 
    // Add serviceType only if provided
    if (serviceType) {
      transactionData.serviceType = serviceType;
    }
    
    // Add providerId only if it's a valid ObjectId (not empty string)
    if (providerId && providerId.trim() !== '' && mongoose.Types.ObjectId.isValid(providerId)) {
      transactionData.providerId = providerId;
    }
    // If providerId is empty string or invalid, don't include it
    
    const transaction = new Transaction(transactionData);
    
    req.wallet.balance = balanceAfter;
    req.wallet.dailySpent += amount;
    req.wallet.monthlySpent += amount;
    req.wallet.updatedAt = new Date();
    
    await transaction.save({ session });
    await req.wallet.save({ session });
    
    await session.commitTransaction();
    session.endSession();    
    
    console.log(`✅ Successfully deducted ${amount} from wallet ${req.wallet._id}. New balance: ${balanceAfter}`);
    
    res.json({
      success: true,
      data: {
        transactionId: transaction._id,
        reference: transaction.reference,
        amount: transaction.amount,
        newBalance: balanceAfter,
        transaction: {
          id: transaction._id,
          type: transaction.type,
          amount: transaction.amount,
          description: transaction.description,
          status: transaction.status,
          serviceId: transaction.serviceId,
          serviceType: transaction.serviceType,
          createdAt: transaction.createdAt
        }
      }
    });
    
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error('❌ Error deducting money from wallet:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to deduct money from wallet',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get spending limits information
 */
export const getSpendingLimitsInfo = async (req, res) => {
  try {
    const spendingLimits = getSpendingLimits(req.wallet);
    
    res.json({
      success: true,
      data: spendingLimits
    });
  } catch (error) {
    console.error('Error fetching spending limits:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch spending limits'
    });
  }
};

/**
 * Update spending limits
 */
export const updateWalletLimits = async (req, res) => {
  try {
    const { dailyLimit, monthlyLimit } = req.body;
    
    const updatedWallet = await updateSpendingLimits(req.wallet, {
      dailyLimit,
      monthlyLimit
    });
    
    res.json({
      success: true,
      data: {
        dailyLimit: updatedWallet.dailyLimit,
        monthlyLimit: updatedWallet.monthlyLimit,
        message: 'Spending limits updated successfully'
      }
    });
  } catch (error) {
    console.error('Error updating spending limits:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to update spending limits'
    });
  }
};

/**
 * Block/Unblock wallet (Admin only)
 */
export const toggleWalletStatus = async (req, res) => {
  try {
    const { walletId } = req.params;
    const { isBlocked, reason } = req.body;
    
    const wallet = await Wallet.findById(walletId);
    if (!wallet) {
      return res.status(404).json({
        success: false,
        error: 'Wallet not found'
      });
    }
    
    wallet.isBlocked = isBlocked;
    if (isBlocked) {
      wallet.blockedReason = reason || 'Administrative action';
      wallet.blockedAt = new Date();
    } else {
      wallet.blockedReason = undefined;
      wallet.blockedAt = undefined;
    }
    
    await wallet.save();
        
    res.json({
      success: true,
      data: {
        walletId: wallet._id,
        isBlocked: wallet.isBlocked,
        blockedReason: wallet.blockedReason,
        message: `Wallet ${isBlocked ? 'blocked' : 'unblocked'} successfully`
      }
    });
  } catch (error) {
    console.error('Error toggling wallet status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update wallet status'
    });
  }
};

/**
 * Get wallet statistics
 */
export const getWalletStats = async (req, res) => {
  try {
    const { period = '30' } = req.query;
    const daysBack = parseInt(period);
    
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysBack);
    
    const stats = await Transaction.getUserStats(req.user._id, startDate, new Date());
    
    const dailyStats = await Transaction.aggregate([
      {
        $match: {
          userId: req.user._id,
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
            type: "$type"
          },
          count: { $sum: 1 },
          amount: { $sum: "$amount" }
        }
      },
      { $sort: { "_id.date": 1 } }
    ]);
    
    res.json({
      success: true,
      data: {
        period: `${daysBack} days`,
        summary: stats,
        dailyBreakdown: dailyStats,
        currentBalance: req.wallet.balance,
        spendingLimits: getSpendingLimits(req.wallet)
      }
    });
  } catch (error) {
    console.error('Error fetching wallet stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch wallet statistics'
    });
  }
};

/**
 * Transfer money between wallets
 */
export const transferMoney = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    const { recipientId, amount, description } = req.body;
    
    const recipientWallet = await Wallet.findOne({ userId: recipientId });
    if (!recipientWallet) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({
        success: false,
        error: 'Recipient wallet not found'
      });
    }
    
    if (!recipientWallet.isActive || recipientWallet.isBlocked) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        success: false,
        error: 'Recipient wallet is not active'
      });
    }
    
    const debitRef = generateReference('debit');
    const creditRef = generateReference('credit');
    
    const senderTransaction = new Transaction({
      userId: req.user._id,
      walletId: req.wallet._id,
      type: 'debit',
      amount,
      description: `Transfer to ${recipientId}: ${description}`,
      reference: debitRef,
      category: 'transfer',
      balanceBefore: req.wallet.balance,
      balanceAfter: req.wallet.balance - amount,
      metadata: { transferTo: recipientId, recipientTransaction: creditRef },
      status: 'completed'
    });
    
    const recipientTransaction = new Transaction({
      userId: recipientId,
      walletId: recipientWallet._id,
      type: 'credit',
      amount,
      description: `Transfer from ${req.user._id}: ${description}`,
      reference: creditRef,
      category: 'transfer',
      balanceBefore: recipientWallet.balance,
      balanceAfter: recipientWallet.balance + amount,
      metadata: { transferFrom: req.user._id, senderTransaction: debitRef },
      status: 'completed'
    });
    
    req.wallet.balance -= amount;
    req.wallet.dailySpent += amount;
    req.wallet.monthlySpent += amount;
    
    recipientWallet.balance += amount;
    
    await senderTransaction.save({ session });
    await recipientTransaction.save({ session });
    await req.wallet.save({ session });
    await recipientWallet.save({ session });
    
    await session.commitTransaction();
    session.endSession();
        
    res.json({
      success: true,
      data: {
        transferId: senderTransaction._id,
        amount,
        recipient: recipientId,
        senderBalance: req.wallet.balance,
        reference: debitRef,
        message: 'Transfer completed successfully'
      }
    });
    
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error('Error transferring money:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to transfer money'
    });
  }
};

// Export all functions as default
export default {
  getWalletBalance,
  addMoneyToWallet,
  deductMoneyFromWallet,
  getSpendingLimitsInfo,
  updateWalletLimits,
  toggleWalletStatus,
  getWalletStats,
  transferMoney

};



