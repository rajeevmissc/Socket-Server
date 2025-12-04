// services/cashfree.service.js
import crypto from 'crypto';

const getBaseUrl = () =>
  process.env.CASHFREE_MODE === 'production'
    ? 'https://api.cashfree.com/pg'
    : 'https://sandbox.cashfree.com/pg';

const commonHeaders = () => ({
  'Content-Type': 'application/json',
  'x-client-id': process.env.CASHFREE_APP_ID,
  'x-client-secret': process.env.CASHFREE_SECRET_KEY,
  'x-api-version': '2023-08-01',
});

/**
 * Helper to handle Cashfree HTTP response
 */
const handleCashfreeResponse = async (response, context) => {
  let body;
  try {
    body = await response.json();
  } catch {
    body = null;
  }

  if (!response.ok) {
    console.error('Cashfree API Error:', {
      context,
      status: response.status,
      body,
    });
    throw new Error(
      body?.message ||
        body?.error ||
        `Cashfree API error (${context}) with status ${response.status}`
    );
  }

  return body;
};

/**
 * Create Cashfree order
 */
export const createCashfreeOrder = async (orderData) => {
  try {
    const apiUrl = `${getBaseUrl()}/orders`;

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: commonHeaders(),
      body: JSON.stringify(orderData),
    });

    return await handleCashfreeResponse(response, 'createCashfreeOrder');
  } catch (error) {
    console.error('Cashfree order creation error:', error);
    throw error;
  }
};

/**
 * Get order details from Cashfree
 */
export const getCashfreeOrder = async (orderId) => {
  try {
    const apiUrl = `${getBaseUrl()}/orders/${orderId}`;

    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: commonHeaders(),
    });

    return await handleCashfreeResponse(response, 'getCashfreeOrder');
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
    const apiUrl = `${getBaseUrl()}/orders/${orderId}/refunds`;

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: commonHeaders(),
      body: JSON.stringify(refundData),
    });

    return await handleCashfreeResponse(response, 'createCashfreeRefund');
  } catch (error) {
    console.error('Cashfree refund error:', error);
    throw error;
  }
};

/**
 * Verify Cashfree return/signature (if you use it anywhere)
 * This is NOT the webhook signature – this is for client returns.
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







// // services/cashfree.service.js
// import crypto from 'crypto';

// const getBaseUrl = () =>
//   process.env.CASHFREE_MODE_TEST === 'production'
//     ? 'https://api.cashfree.com/pg'
//     : 'https://sandbox.cashfree.com/pg';

// const commonHeaders = () => ({
//   'Content-Type': 'application/json',
//   'x-client-id': process.env.CASHFREE_APP_ID_TEST,
//   'x-client-secret': process.env.CASHFREE_SECRET_KEY_TEST,
//   'x-api-version': '2023-08-01',
// });

// /**
//  * Helper to handle Cashfree HTTP response
//  */
// const handleCashfreeResponse = async (response, context) => {
//   let body;
//   try {
//     body = await response.json();
//   } catch {
//     body = null;
//   }

//   if (!response.ok) {
//     console.error('Cashfree API Error:', {
//       context,
//       status: response.status,
//       body,
//     });
//     throw new Error(
//       body?.message ||
//         body?.error ||
//         `Cashfree API error (${context}) with status ${response.status}`
//     );
//   }

//   return body;
// };

// /**
//  * Create Cashfree order
//  */
// export const createCashfreeOrder = async (orderData) => {
//   try {
//     const apiUrl = `${getBaseUrl()}/orders`;

//     const response = await fetch(apiUrl, {
//       method: 'POST',
//       headers: commonHeaders(),
//       body: JSON.stringify(orderData),
//     });

//     return await handleCashfreeResponse(response, 'createCashfreeOrder');
//   } catch (error) {
//     console.error('Cashfree order creation error:', error);
//     throw error;
//   }
// };

// /**
//  * Get order details from Cashfree
//  */
// export const getCashfreeOrder = async (orderId) => {
//   try {
//     const apiUrl = `${getBaseUrl()}/orders/${orderId}`;

//     const response = await fetch(apiUrl, {
//       method: 'GET',
//       headers: commonHeaders(),
//     });

//     return await handleCashfreeResponse(response, 'getCashfreeOrder');
//   } catch (error) {
//     console.error('Cashfree order fetch error:', error);
//     throw error;
//   }
// };

// /**
//  * Process refund via Cashfree
//  */
// export const createCashfreeRefund = async (orderId, refundData) => {
//   try {
//     const apiUrl = `${getBaseUrl()}/orders/${orderId}/refunds`;

//     const response = await fetch(apiUrl, {
//       method: 'POST',
//       headers: commonHeaders(),
//       body: JSON.stringify(refundData),
//     });

//     return await handleCashfreeResponse(response, 'createCashfreeRefund');
//   } catch (error) {
//     console.error('Cashfree refund error:', error);
//     throw error;
//   }
// };

// /**
//  * Verify Cashfree return/signature (if you use it anywhere)
//  * This is NOT the webhook signature – this is for client returns.
//  */
// export const verifyCashfreeSignature = (orderId, orderAmount, signature) => {
//   const body = orderId + orderAmount;
//   const secretKey = process.env.CASHFREE_SECRET_KEY_TEST;

//   const expectedSignature = crypto
//     .createHmac('sha256', secretKey)
//     .update(body)
//     .digest('base64');

//   return signature === expectedSignature;
// };

