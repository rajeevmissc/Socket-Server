// backend/services/wallet.service.js
import { Wallet } from '../models/wallet.model.js';
import { Transaction } from '../models/transaction.model.js';
import { generateReference } from '../utils/reference.util.js';

export const walletService = {
  // Get user wallet balance
  async getBalance(userId) {
    const wallet = await Wallet.findOne({ userId });
    if (!wallet) throw new Error('Wallet not found');
    return wallet.balance;
  },

  // Deduct amount for booking and record transaction
  async deduct(userId, amount, description, bookingId, serviceType = 'other') {
    const wallet = await Wallet.findOne({ userId });
    if (!wallet) throw new Error('Wallet not found');
    console.log('🔄 walletService.deduct called:', { userId, amount, description, bookingId, serviceType });
    if (wallet.balance < amount) throw new Error('Insufficient balance');

    const balanceBefore = wallet.balance;
    const balanceAfter = balanceBefore - amount;

    const reference = generateReference('debit');
    const transactionData = new Transaction({
      userId,
      walletId: wallet._id,
      type: 'debit',
      amount,
      description,
      reference,
      bookingId,
      category: 'service_payment',
      balanceBefore,
      balanceAfter,
      status: 'completed'
    });

     if (serviceType) {
      transactionData.serviceType = serviceType;
    }
    const transaction = new Transaction(transactionData);
    wallet.balance = balanceAfter;
    wallet.updatedAt = new Date();

    await transaction.save();
    await wallet.save();
 console.log(`✅ Deduction successful: ${amount} from user ${userId}`);
    return { transactionId: transaction._id, balance: balanceAfter };
  },
};
