// utils/limits.util.js

/**
 * Check if limits need to be reset based on last reset date
 * @param {Date} lastResetDate - Last reset date from wallet
 * @returns {object} Reset flags and new reset date
 */
export const checkLimitsReset = (lastResetDate) => {
  const now = new Date();
  const lastReset = new Date(lastResetDate);
  
  const shouldResetDaily = (
    now.getDate() !== lastReset.getDate() ||
    now.getMonth() !== lastReset.getMonth() ||
    now.getFullYear() !== lastReset.getFullYear()
  );
  
  const shouldResetMonthly = (
    now.getMonth() !== lastReset.getMonth() ||
    now.getFullYear() !== lastReset.getFullYear()
  );
  
  return {
    shouldResetDaily,
    shouldResetMonthly,
    newResetDate: now
  };
};

/**
 * Reset wallet spending limits if needed
 * @param {object} wallet - Wallet document
 * @returns {Promise<object>} Updated wallet with reset limits
 */
export const resetLimitsIfNeeded = async (wallet) => {
  const resetInfo = checkLimitsReset(wallet.lastResetDate);
  
  let hasChanges = false;
  
  if (resetInfo.shouldResetDaily) {
    wallet.dailySpent = 0;
    hasChanges = true;
  }
  
  if (resetInfo.shouldResetMonthly) {
    wallet.monthlySpent = 0;
    hasChanges = true;
  }
  
  if (hasChanges) {
    wallet.lastResetDate = resetInfo.newResetDate;
    await wallet.save();
  }
  
  return wallet;
};

/**
 * Check if user can spend specific amount
 * @param {object} wallet - Wallet document
 * @param {number} amount - Amount to spend
 * @returns {object} Validation result
 */
export const validateSpendingLimits = (wallet, amount) => {
  const errors = [];
  
  // Check if wallet is active
  if (!wallet.isActive) {
    errors.push({
      code: 'WALLET_INACTIVE',
      message: 'Wallet is currently inactive'
    });
  }
  
  // Check if wallet is blocked
  if (wallet.isBlocked) {
    errors.push({
      code: 'WALLET_BLOCKED',
      message: wallet.blockedReason || 'Wallet is currently blocked'
    });
  }
  
  // Check sufficient balance
  if (wallet.balance < amount) {
    errors.push({
      code: 'INSUFFICIENT_BALANCE',
      message: 'Insufficient wallet balance',
      required: amount,
      available: wallet.balance,
      shortfall: amount - wallet.balance
    });
  }
  
  // Check daily limit
  if (wallet.dailySpent + amount > wallet.dailyLimit) {
    errors.push({
      code: 'DAILY_LIMIT_EXCEEDED',
      message: 'Daily spending limit would be exceeded',
      dailyLimit: wallet.dailyLimit,
      dailySpent: wallet.dailySpent,
      requestedAmount: amount,
      availableToday: Math.max(0, wallet.dailyLimit - wallet.dailySpent)
    });
  }
  
  // Check monthly limit
  if (wallet.monthlySpent + amount > wallet.monthlyLimit) {
    errors.push({
      code: 'MONTHLY_LIMIT_EXCEEDED',
      message: 'Monthly spending limit would be exceeded',
      monthlyLimit: wallet.monthlyLimit,
      monthlySpent: wallet.monthlySpent,
      requestedAmount: amount,
      availableThisMonth: Math.max(0, wallet.monthlyLimit - wallet.monthlySpent)
    });
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    maxSpendableAmount: Math.min(
      wallet.balance,
      wallet.dailyLimit - wallet.dailySpent,
      wallet.monthlyLimit - wallet.monthlySpent
    )
  };
};

/**
 * Get spending limit details for user
 * @param {object} wallet - Wallet document
 * @returns {object} Spending limits information
 */
export const getSpendingLimits = (wallet) => {
  return {
    balance: wallet.balance,
    dailyLimit: wallet.dailyLimit,
    monthlyLimit: wallet.monthlyLimit,
    dailySpent: wallet.dailySpent,
    monthlySpent: wallet.monthlySpent,
    dailyRemaining: Math.max(0, wallet.dailyLimit - wallet.dailySpent),
    monthlyRemaining: Math.max(0, wallet.monthlyLimit - wallet.monthlySpent),
    maxSpendable: Math.min(
      wallet.balance,
      wallet.dailyLimit - wallet.dailySpent,
      wallet.monthlyLimit - wallet.monthlySpent
    ),
    percentages: {
      dailyUsed: wallet.dailyLimit > 0 ? (wallet.dailySpent / wallet.dailyLimit) * 100 : 0,
      monthlyUsed: wallet.monthlyLimit > 0 ? (wallet.monthlySpent / wallet.monthlyLimit) * 100 : 0
    },
    warnings: generateLimitWarnings(wallet)
  };
};

/**
 * Generate warnings based on spending patterns
 * @param {object} wallet - Wallet document
 * @returns {array} Array of warning messages
 */
const generateLimitWarnings = (wallet) => {
  const warnings = [];
  
  const dailyUsagePercent = wallet.dailyLimit > 0 ? (wallet.dailySpent / wallet.dailyLimit) * 100 : 0;
  const monthlyUsagePercent = wallet.monthlyLimit > 0 ? (wallet.monthlySpent / wallet.monthlyLimit) * 100 : 0;
  
  if (dailyUsagePercent >= 90) {
    warnings.push({
      type: 'DAILY_LIMIT_WARNING',
      message: 'You have used 90% or more of your daily spending limit',
      severity: 'high'
    });
  } else if (dailyUsagePercent >= 75) {
    warnings.push({
      type: 'DAILY_LIMIT_WARNING',
      message: 'You have used 75% of your daily spending limit',
      severity: 'medium'
    });
  }
  
  if (monthlyUsagePercent >= 90) {
    warnings.push({
      type: 'MONTHLY_LIMIT_WARNING',
      message: 'You have used 90% or more of your monthly spending limit',
      severity: 'high'
    });
  } else if (monthlyUsagePercent >= 75) {
    warnings.push({
      type: 'MONTHLY_LIMIT_WARNING',
      message: 'You have used 75% of your monthly spending limit',
      severity: 'medium'
    });
  }
  
  if (wallet.balance < 500) {
    warnings.push({
      type: 'LOW_BALANCE_WARNING',
      message: 'Your wallet balance is running low',
      severity: 'medium'
    });
  }
  
  return warnings;
};

/**
 * Update spending limits for wallet
 * @param {object} wallet - Wallet document
 * @param {object} newLimits - New limits to set
 * @returns {Promise<object>} Updated wallet
 */
export const updateSpendingLimits = async (wallet, newLimits) => {
  const { dailyLimit, monthlyLimit } = newLimits;
  
  // Validate new limits
  if (dailyLimit !== undefined) {
    if (typeof dailyLimit !== 'number' || dailyLimit < 0) {
      throw new Error('Daily limit must be a non-negative number');
    }
    if (dailyLimit > 100000) {
      throw new Error('Daily limit cannot exceed ₹1,00,000');
    }
    wallet.dailyLimit = dailyLimit;
  }
  
  if (monthlyLimit !== undefined) {
    if (typeof monthlyLimit !== 'number' || monthlyLimit < 0) {
      throw new Error('Monthly limit must be a non-negative number');
    }
    if (monthlyLimit > 500000) {
      throw new Error('Monthly limit cannot exceed ₹5,00,000');
    }
    wallet.monthlyLimit = monthlyLimit;
  }
  
  // Ensure monthly limit is not less than daily limit
  if (wallet.monthlyLimit < wallet.dailyLimit) {
    throw new Error('Monthly limit cannot be less than daily limit');
  }
  
  await wallet.save();
  return wallet;
};

/**
 * Calculate optimal spending limits based on user's transaction history
 * @param {string} userId - User ID
 * @param {object} Transaction - Transaction model
 * @returns {Promise<object>} Suggested limits
 */
export const suggestOptimalLimits = async (userId, Transaction) => {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  const recentTransactions = await Transaction.find({
    userId,
    type: 'debit',
    status: 'completed',
    createdAt: { $gte: thirtyDaysAgo }
  });
  
  if (recentTransactions.length === 0) {
    return {
      suggestedDailyLimit: 5000,
      suggestedMonthlyLimit: 50000,
      reason: 'Default limits for new users'
    };
  }
  
  // Calculate daily spending patterns
  const dailySpending = {};
  recentTransactions.forEach(transaction => {
    const date = transaction.createdAt.toDateString();
    dailySpending[date] = (dailySpending[date] || 0) + transaction.amount;
  });
  
  const dailyAmounts = Object.values(dailySpending);
  const avgDailySpending = dailyAmounts.reduce((sum, amount) => sum + amount, 0) / Math.max(dailyAmounts.length, 1);
  const maxDailySpending = Math.max(...dailyAmounts, 0);
  
  // Calculate monthly spending
  const totalMonthlySpending = recentTransactions.reduce((sum, transaction) => sum + transaction.amount, 0);
  
  // Suggest limits with 20% buffer above maximum observed spending
  const suggestedDailyLimit = Math.min(Math.ceil(maxDailySpending * 1.2), 50000);
  const suggestedMonthlyLimit = Math.min(Math.ceil(totalMonthlySpending * 1.2), 200000);
  
  return {
    suggestedDailyLimit,
    suggestedMonthlyLimit,
    currentStats: {
      avgDailySpending: Math.round(avgDailySpending),
      maxDailySpending: Math.round(maxDailySpending),
      totalMonthlySpending: Math.round(totalMonthlySpending),
      transactionCount: recentTransactions.length
    },
    reason: 'Based on your spending patterns over the last 30 days'
  };
};

export default {
  checkLimitsReset,
  resetLimitsIfNeeded,
  validateSpendingLimits,
  getSpendingLimits,
  updateSpendingLimits,
  suggestOptimalLimits
};