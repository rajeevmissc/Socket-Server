// services/stripe.service.js
import Stripe from 'stripe';

// Validate that Stripe key exists
if (!process.env.STRIPE_SECRET_KEY) {
  console.error('WARNING: STRIPE_SECRET_KEY is not set in environment variables');
  console.error('Using hardcoded key for development - DO NOT use in production!');
}

// Initialize Stripe instance
export const stripe = new Stripe(
  process.env.STRIPE_SECRET_KEY || 'sk_test_51RsdcGFSWm4fDY7yVDMU08ALsl8Cz6TyrUMTnJl5CEHqWtdMVNIFNAHbmJ9ODj5E3WfF4pIq0CxPLqKhPudXDfWj00xBE4b4KJ',
  {
    apiVersion: '2023-10-16',
    timeout: 30000,
    maxNetworkRetries: 3
  }
);

/**
 * Create Stripe Payment Intent (equivalent to Razorpay order)
 */
export const createOrder = async (options) => {
  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: options.amount,
      currency: options.currency.toLowerCase(),
      metadata: {
        receipt: options.receipt,
        ...options.notes
      },
      automatic_payment_methods: {
        enabled: true,
      }
    });
    
    return {
      success: true,
      data: {
        id: paymentIntent.id,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency.toUpperCase(),
        status: 'created',
        receipt: options.receipt,
        notes: options.notes,
        created_at: Math.floor(paymentIntent.created)
      }
    };
  } catch (error) {
    console.error('Stripe payment intent creation failed:', error);
    return {
      success: false,
      error: error.message || 'Failed to create order'
    };
  }
};

/**
 * Fetch payment intent details
 */
export const fetchOrder = async (paymentIntentId) => {
  try {
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    return {
      success: true,
      data: {
        id: paymentIntent.id,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency.toUpperCase(),
        status: paymentIntent.status === 'succeeded' ? 'paid' : paymentIntent.status,
        created_at: paymentIntent.created
      }
    };
  } catch (error) {
    console.error('Failed to fetch payment intent:', error);
    return {
      success: false,
      error: error.message || 'Failed to fetch order'
    };
  }
};

/**
 * Fetch payment details
 */
export const fetchPayment = async (paymentId) => {
  try {
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentId);
    return {
      success: true,
      data: {
        id: paymentIntent.id,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency.toUpperCase(),
        status: paymentIntent.status,
        created: paymentIntent.created
      }
    };
  } catch (error) {
    console.error('Failed to fetch payment:', error);
    return {
      success: false,
      error: error.message || 'Failed to fetch payment'
    };
  }
};

/**
 * Create refund
 */
export const createRefund = async (paymentIntentId, options) => {
  try {
    const refund = await stripe.refunds.create({
      payment_intent: paymentIntentId,
      amount: options.amount,
      metadata: options.notes || {}
    });
    
    return {
      success: true,
      data: {
        id: refund.id,
        amount: refund.amount,
        currency: refund.currency.toUpperCase(),
        status: refund.status,
        payment_id: paymentIntentId
      }
    };
  } catch (error) {
    console.error('Stripe refund failed:', error);
    return {
      success: false,
      error: error.message || 'Failed to create refund'
    };
  }
};

/**
 * Fetch all refunds for a payment
 */
export const fetchRefunds = async (paymentIntentId) => {
  try {
    const refunds = await stripe.refunds.list({
      payment_intent: paymentIntentId
    });
    
    return {
      success: true,
      data: {
        items: refunds.data.map(refund => ({
          id: refund.id,
          amount: refund.amount,
          currency: refund.currency.toUpperCase(),
          status: refund.status,
          created: refund.created
        }))
      }
    };
  } catch (error) {
    console.error('Failed to fetch refunds:', error);
    return {
      success: false,
      error: error.message || 'Failed to fetch refunds'
    };
  }
};

/**
 * Capture payment
 */
export const capturePayment = async (paymentIntentId, amount) => {
  try {
    const paymentIntent = await stripe.paymentIntents.capture(paymentIntentId, {
      amount_to_capture: amount
    });
    
    return {
      success: true,
      data: {
        id: paymentIntent.id,
        amount: paymentIntent.amount,
        status: paymentIntent.status
      }
    };
  } catch (error) {
    console.error('Payment capture failed:', error);
    return {
      success: false,
      error: error.message || 'Failed to capture payment'
    };
  }
};

/**
 * Get payment methods available
 */
export const getPaymentMethods = () => {
  return {
    success: true,
    data: {
      methods: [
        {
          type: 'UPI',
          name: 'UPI (PhonePe, GPay, Paytm)',
          icon: '📱',
          recommended: true,
          processingTime: 'Instant',
          fees: 'Free'
        },
        {
          type: 'Credit Card',
          name: 'Credit Card',
          icon: '💳',
          recommended: false,
          processingTime: 'Instant',
          fees: '2.9% + ₹3'
        },
        {
          type: 'Debit Card',
          name: 'Debit Card',
          icon: '💳',
          recommended: false,
          processingTime: 'Instant',
          fees: '1.9% + ₹3'
        },
        {
          type: 'Net Banking',
          name: 'Net Banking',
          icon: '🏦',
          recommended: false,
          processingTime: '2-5 minutes',
          fees: '₹15 + GST'
        },
        {
          type: 'Wallet',
          name: 'Mobile Wallets',
          icon: '👛',
          recommended: false,
          processingTime: 'Instant',
          fees: 'Free'
        }
      ]
    }
  };
};

/**
 * Validate webhook signature
 */
export const validateWebhookSignature = (body, signature, secret = null) => {
  try {
    const webhookSecret = secret || process.env.STRIPE_WEBHOOK_SECRET;
    
    if (!webhookSecret) {
      throw new Error('Webhook secret not configured');
    }
    
    const event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    return !!event;
  } catch (error) {
    console.error('Webhook signature validation failed:', error);
    return false;
  }
};

/**
 * Get order status
 */
export const getOrderStatus = async (paymentIntentId) => {
  try {
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    const status = paymentIntent.status === 'succeeded' ? 'paid' : paymentIntent.status;
    
    return {
      success: true,
      status,
      data: paymentIntent
    };
  } catch (error) {
    return {
      success: false,
      status: 'unknown',
      error: error.message
    };
  }
};

/**
 * Get payment status
 */
export const getPaymentStatus = async (paymentIntentId) => {
  try {
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    
    return {
      success: true,
      status: paymentIntent.status,
      data: paymentIntent
    };
  } catch (error) {
    return {
      success: false,
      status: 'unknown',
      error: error.message
    };
  }
};

/**
 * Create QR code for payments (using payment links)
 */
export const createQRCode = async (options) => {
  try {
    const paymentLink = await stripe.paymentLinks.create({
      line_items: [{
        price_data: {
          currency: options.currency || 'inr',
          product_data: {
            name: options.description || 'Payment'
          },
          unit_amount: options.amount
        },
        quantity: 1
      }],
      metadata: options.notes || {}
    });
    
    return {
      success: true,
      data: {
        id: paymentLink.id,
        url: paymentLink.url,
        qr_code: paymentLink.url
      }
    };
  } catch (error) {
    console.error('Payment link creation failed:', error);
    return {
      success: false,
      error: error.message || 'Failed to create payment link'
    };
  }
};

// Create a wrapper object that matches the Razorpay interface
export const razorpay = {
  orders: {
    create: async (options) => {
      const result = await createOrder(options);
      if (result.success) {
        return result.data;
      }
      throw new Error(result.error);
    },
    fetch: async (id) => {
      const result = await fetchOrder(id);
      if (result.success) {
        return result.data;
      }
      throw new Error(result.error);
    }
  },
  payments: {
    fetch: async (id) => {
      const result = await fetchPayment(id);
      if (result.success) {
        return result.data;
      }
      throw new Error(result.error);
    },
    refund: async (paymentId, options) => {
      const result = await createRefund(paymentId, options);
      if (result.success) {
        return result.data;
      }
      throw new Error(result.error);
    },
    fetchMultipleRefund: async (paymentId) => {
      const result = await fetchRefunds(paymentId);
      if (result.success) {
        return result.data;
      }
      throw new Error(result.error);
    },
    capture: async (paymentId, amount) => {
      const result = await capturePayment(paymentId, amount);
      if (result.success) {
        return result.data;
      }
      throw new Error(result.error);
    }
  },
  qrCode: {
    create: async (options) => {
      const result = await createQRCode(options);
      if (result.success) {
        return result.data;
      }
      throw new Error(result.error);
    }
  },
  validateWebhookSignature
};

export default {
  stripe,
  razorpay,
  createOrder,
  fetchOrder,
  fetchPayment,
  createRefund,
  fetchRefunds,
  capturePayment,
  getPaymentMethods,
  validateWebhookSignature,
  getOrderStatus,
  getPaymentStatus,
  createQRCode
};