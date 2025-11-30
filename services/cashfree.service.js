// services/cashfree.service.js
import crypto from 'crypto';

/**
 * Generate Cashfree session token
 */
export const createCashfreeOrder = async (orderData) => {
  try {
    const apiUrl = process.env.CASHFREE_MODE === 'production' 
      ? 'https://api.cashfree.com/pg/orders'
      : 'https://sandbox.cashfree.com/pg/orders';

    // ⚠️ REMOVED CREDENTIAL LOGGING FOR SECURITY
    // DO NOT LOG CREDENTIALS IN PRODUCTION!
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-client-id': process.env.CASHFREE_APP_ID,
        'x-client-secret': process.env.CASHFREE_SECRET_KEY,
        'x-api-version': '2023-08-01'  // Changed from 2025-01-01 to 2023-08-01
      },
      body: JSON.stringify(orderData)
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('Cashfree API Error:', {
        status: response.status,
        error: error.message
      });
      throw new Error(error.message || 'Failed to create Cashfree order');
    }

    const result = await response.json();
    console.log('✅ Cashfree order created:', result.order_id);
    return result;
    
  } catch (error) {
    console.error('Cashfree order creation error:', error.message);
    throw error;
  }
};

/**
 * Verify Cashfree payment signature
 */
export const verifyCashfreeSignature = (orderId, orderAmount, signature) => {
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
    const apiUrl = process.env.CASHFREE_MODE === 'production'
      ? `https://api.cashfree.com/pg/orders/${orderId}`
      : `https://sandbox.cashfree.com/pg/orders/${orderId}`;

    const response = await fetch(apiUrl, {
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
    console.error('Cashfree order fetch error:', error.message);
    throw error;
  }
};

/**
 * Process refund via Cashfree
 */
export const createCashfreeRefund = async (orderId, refundData) => {
  try {
    const apiUrl = process.env.CASHFREE_MODE === 'production'
      ? `https://api.cashfree.com/pg/orders/${orderId}/refunds`
      : `https://sandbox.cashfree.com/pg/orders/${orderId}/refunds`;

    const response = await fetch(apiUrl, {
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
    console.error('Cashfree refund error:', error.message);
    throw error;
  }
};
