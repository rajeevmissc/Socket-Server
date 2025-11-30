// services/cashfree.service.js
import { Cashfree } from 'cashfree-pg-sdk-javascript';

// Initialize Cashfree with your credentials
const cashfree = new Cashfree({
  mode: process.env.CASHFREE_MODE || 'sandbox', // 'sandbox' or 'production'
});

/**
 * Generate Cashfree session token
 */
export const createCashfreeOrder = async (orderData) => {
  try {
    const response = await fetch('https://sandbox.cashfree.com/pg/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-client-id': process.env.CASHFREE_APP_ID,
        'x-client-secret': process.env.CASHFREE_SECRET_KEY,
        'x-api-version': '2023-08-01'
      },
      body: JSON.stringify(orderData)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to create Cashfree order');
    }

    return await response.json();
  } catch (error) {
    console.error('Cashfree order creation error:', error);
    throw error;
  }
};

/**
 * Verify Cashfree payment signature
 */
export const verifyCashfreeSignature = (orderId, orderAmount, signature) => {
  const crypto = require('crypto');
  const body = orderId + orderAmount;
  const secretKey = process.env.CASHFREE_SECRET_KEY;
  
  const expectedSignature = crypto
    .createHmac('sha256', secretKey)
    .update(body)
    .digest('base64');
  
  return signature === expectedSignature;
};

/**
 * Get order details from Cashfree
 */
export const getCashfreeOrder = async (orderId) => {
  try {
    const response = await fetch(`https://sandbox.cashfree.com/pg/orders/${orderId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'x-client-id': process.env.CASHFREE_APP_ID,
        'x-client-secret': process.env.CASHFREE_SECRET_KEY,
        'x-api-version': '2023-08-01'
      }
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to fetch order');
    }

    return await response.json();
  } catch (error) {
    console.error('Cashfree order fetch error:', error);
    throw error;
  }
};

/**
 * Process refund via Cashfree
 */
export const createCashfreeRefund = async (orderId, refundData) => {
  try {
    const response = await fetch('https://sandbox.cashfree.com/pg/orders/${orderId}/refunds', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-client-id': process.env.CASHFREE_APP_ID,
        'x-client-secret': process.env.CASHFREE_SECRET_KEY,
        'x-api-version': '2023-08-01'
      },
      body: JSON.stringify(refundData)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to create refund');
    }

    return await response.json();
  } catch (error) {
    console.error('Cashfree refund error:', error);
    throw error;
  }
};

export { cashfree };
