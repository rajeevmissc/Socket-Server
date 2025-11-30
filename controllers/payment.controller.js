// // controllers/payment.controller.js
// import { Payment } from '../models/payment.model.js';
// import { generateOrderId, generateReceiptId } from '../utils/reference.util.js';
// import { stripe } from '../services/stripe.service.js';

// /**
//  * Create Stripe Checkout Session
//  */
// export const createCheckoutSession = async (req, res) => {
//   try {
//     const { 
//       amount, 
//       currency = 'inr',
//       payment_method_types = ['card'],
//       success_url,
//       cancel_url,
//       metadata = {}
//     } = req.body;
    
//     // Generate order and receipt IDs
//     const orderId = generateOrderId(req.user._id);
//     const receipt = generateReceiptId('wallet');
    
//     // Use production URLs or fallback
//     const baseUrl = 'https://www.getcompanion.in/wallet';
    
//     // Create Stripe checkout session
//     const session = await stripe.checkout.sessions.create({
//       payment_method_types,
//       line_items: [{
//         price_data: {
//           currency,
//           product_data: {
//             name: 'Healthcare Wallet Recharge',
//             description: `Add ₹${amount / 100} to your wallet`,
//           },
//           unit_amount: amount,
//         },
//         quantity: 1,
//       }],
//       mode: 'payment',
//       success_url: success_url || `${baseUrl}/?session_id={CHECKOUT_SESSION_ID}`,
//       cancel_url: cancel_url || `${baseUrl}/?cancelled=true`,
//       customer_email: req.user.email,
//       metadata: {
//         userId: req.user._id.toString(),
//         orderId,
//         type: 'wallet_recharge',
//         userEmail: req.user.email,
//         userName: `${req.user.firstName} ${req.user.lastName}`,
//         ...metadata
//       }
//     });
    
//     // Save payment record
//     const payment = new Payment({
//       userId: req.user._id,
//       paymentId: session.id,
//       orderId: session.id,
//       amount: amount,
//       currency: currency.toUpperCase(),
//       paymentMethod: 'Stripe Checkout',
//       paymentGateway: 'Stripe',
//       description: `Wallet Recharge - ₹${amount}`,
//       receipt,
//       customerInfo: {
//         name: `${req.user.firstName} ${req.user.lastName}`,
//         email: req.user.email,
//         phone: req.user.phone
//       },
//       gatewayResponse: {
//         sessionId: session.id,
//         url: session.url,
//         payment_status: session.payment_status
//       },
//       ipAddress: req.ip,
//       userAgent: req.get('User-Agent'),
//       notes: {
//         userId: req.user._id.toString(),
//         type: 'wallet_recharge',
//         userEmail: req.user.email,
//         userName: `${req.user.firstName} ${req.user.lastName}`
//       }
//     });
    
//     await payment.save();
     
//     res.json({
//       success: true,
//       data: {
//         sessionId: session.id,
//         url: session.url,
//         paymentId: session.id,
//         orderId: session.id,
//         amount: amount / 100,
//         currency: currency.toUpperCase()
//       }
//     });
    
//   } catch (error) {
//     console.error('Error creating Stripe checkout session:', error);
//     res.status(500).json({
//       success: false,
//       error: 'Failed to create checkout session',
//       details: process.env.NODE_ENV === 'development' ? error.message : undefined
//     });
//   }
// };

// /**
//  * Verify Stripe payment session
//  */
// export const verifyPaymentSession = async (req, res) => {
//   try {
//     const { sessionId } = req.params;
    
//     const session = await stripe.checkout.sessions.retrieve(sessionId);
    
//     const payment = await Payment.findOne({ paymentId: sessionId });
//     if (!payment) {
//       return res.status(404).json({
//         success: false,
//         error: 'Payment record not found',
//         code: 'PAYMENT_NOT_FOUND'
//       });
//     }
    
//     if (session.payment_status === 'paid') {
//       payment.status = 'captured';
//       payment.capturedAt = new Date();
//       payment.gatewayResponse = {
//         ...payment.gatewayResponse,
//         payment_intent: session.payment_intent,
//         payment_status: session.payment_status,
//         customer: session.customer
//       };
      
//       await payment.save();
      
      
//       res.json({
//         success: true,
//         data: {
//           sessionId,
//           paymentIntentId: session.payment_intent,
//           status: 'verified',
//           amount: payment.amount,
//           currency: payment.currency,
//           capturedAt: payment.capturedAt,
//           message: 'Payment verified successfully'
//         }
//       });
//     } else {
//       payment.status = 'failed';
//       payment.failureReason = `Payment status: ${session.payment_status}`;
//       await payment.save();
      
//       res.status(400).json({
//         success: false,
//         error: 'Payment not completed',
//         code: 'PAYMENT_INCOMPLETE',
//         status: session.payment_status
//       });
//     }
    
//   } catch (error) {
//     console.error('Error verifying Stripe payment:', error);
//     res.status(500).json({
//       success: false,
//       error: 'Failed to verify payment'
//     });
//   }
// };

// /**
//  * Initiate payment (backward compatibility)
//  */
// export const initiatePayment = async (req, res) => {
//   try {
//     const { amount, paymentMethod, type = 'wallet_recharge' } = req.body;
    
//     const payment_method_types = ['card'];
    
//     req.body = {
//       amount: amount * 100,
//       currency: 'inr',
//       payment_method_types,
//       metadata: { type, originalPaymentMethod: paymentMethod }
//     };
    
//     return await createCheckoutSession(req, res);
    
//   } catch (error) {
//     console.error('Error initiating payment:', error);
//     res.status(500).json({
//       success: false,
//       error: 'Failed to initiate payment',
//       details: process.env.NODE_ENV === 'development' ? error.message : undefined
//     });
//   }
// };

// /**
//  * Verify payment (backward compatibility)
//  */
// export const verifyPayment = async (req, res) => {
//   try {
//     const { payment_intent_id, session_id } = req.body;
    
//     if (session_id) {
//       req.params.sessionId = session_id;
//       return await verifyPaymentSession(req, res);
//     }
    
//     if (payment_intent_id) {
//       const paymentIntent = await stripe.paymentIntents.retrieve(payment_intent_id);
      
//       const payment = await Payment.findOne({ 
//         'gatewayResponse.payment_intent': payment_intent_id 
//       });
      
//       if (!payment) {
//         return res.status(404).json({
//           success: false,
//           error: 'Payment record not found',
//           code: 'PAYMENT_NOT_FOUND'
//         });
//       }
      
//       if (paymentIntent.status === 'succeeded') {
//         payment.status = 'captured';
//         payment.capturedAt = new Date();
//         await payment.save();
        
//         res.json({
//           success: true,
//           data: {
//             paymentIntentId: payment_intent_id,
//             status: 'verified',
//             amount: payment.amount,
//             currency: payment.currency,
//             capturedAt: payment.capturedAt,
//             message: 'Payment verified successfully'
//           }
//         });
//       } else {
//         res.status(400).json({
//           success: false,
//           error: 'Payment not succeeded',
//           code: 'PAYMENT_INCOMPLETE',
//           status: paymentIntent.status
//         });
//       }
//     } else {
//       res.status(400).json({
//         success: false,
//         error: 'Missing payment verification data',
//         code: 'INVALID_REQUEST'
//       });
//     }
    
//   } catch (error) {
//     console.error('Error verifying payment:', error);
//     res.status(500).json({
//       success: false,
//       error: 'Failed to verify payment'
//     });
//   }
// };

// /**
//  * Get payment details by payment ID
//  */
// export const getPaymentDetails = async (req, res) => {
//   try {
//     const { paymentId } = req.params;
    
//     const payment = await Payment.findOne({ 
//       paymentId,
//       userId: req.user._id 
//     });
    
//     if (!payment) {
//       return res.status(404).json({
//         success: false,
//         error: 'Payment not found',
//         code: 'PAYMENT_NOT_FOUND'
//       });
//     }
    
//     res.json({
//       success: true,
//       data: payment.getSummary()
//     });
    
//   } catch (error) {
//     console.error('Error fetching payment details:', error);
//     res.status(500).json({
//       success: false,
//       error: 'Failed to fetch payment details'
//     });
//   }
// };

// /**
//  * Get all payments for user with pagination
//  */
// export const getUserPayments = async (req, res) => {
//   try {
//     const page = parseInt(req.query.page) || 1;
//     const limit = parseInt(req.query.limit) || 10;
//     const status = req.query.status;
//     const paymentMethod = req.query.paymentMethod;
//     const skip = (page - 1) * limit;
    
//     const query = { userId: req.user._id };
//     if (status) query.status = status;
//     if (paymentMethod) query.paymentMethod = paymentMethod;
    
//     const payments = await Payment.find(query)
//       .sort({ createdAt: -1 })
//       .skip(skip)
//       .limit(limit)
//       .lean();
    
//     const total = await Payment.countDocuments(query);
    
//     res.json({
//       success: true,
//       data: {
//         payments: payments.map(payment => ({
//           paymentId: payment.paymentId,
//           orderId: payment.orderId,
//           amount: payment.amount,
//           currency: payment.currency,
//           status: payment.status,
//           paymentMethod: payment.paymentMethod,
//           description: payment.description,
//           createdAt: payment.createdAt,
//           capturedAt: payment.capturedAt,
//           isSuccessful: ['authorized', 'captured'].includes(payment.status)
//         })),
//         pagination: {
//           page,
//           limit,
//           total,
//           totalPages: Math.ceil(total / limit),
//           hasNext: page < Math.ceil(total / limit),
//           hasPrev: page > 1
//         }
//       }
//     });
    
//   } catch (error) {
//     console.error('Error fetching user payments:', error);
//     res.status(500).json({
//       success: false,
//       error: 'Failed to fetch payments'
//     });
//   }
// };

// /**
//  * Retry failed payment
//  */
// export const retryPayment = async (req, res) => {
//   try {
//     const { paymentId } = req.params;
    
//     const payment = await Payment.findOne({ 
//       paymentId,
//       userId: req.user._id,
//       status: 'failed'
//     });
    
//     if (!payment) {
//       return res.status(404).json({
//         success: false,
//         error: 'Failed payment not found',
//         code: 'PAYMENT_NOT_FOUND'
//       });
//     }
    
//     const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    
//     const session = await stripe.checkout.sessions.create({
//       payment_method_types: ['card'],
//       line_items: [{
//         price_data: {
//           currency: payment.currency.toLowerCase(),
//           product_data: {
//             name: 'Healthcare Wallet Recharge (Retry)',
//             description: `Retry: Add ₹${payment.amount} to your wallet`,
//           },
//           unit_amount: payment.amount * 100,
//         },
//         quantity: 1,
//       }],
//       mode: 'payment',
//       success_url: `${baseUrl}/?session_id={CHECKOUT_SESSION_ID}`,
//       cancel_url: `${baseUrl}/?cancelled=true`,
//       customer_email: req.user.email,
//       metadata: {
//         userId: req.user._id.toString(),
//         type: 'wallet_recharge',
//         retryOf: payment.paymentId,
//         attempt: payment.attempts + 1
//       }
//     });
    
//     const newOrderId = generateOrderId(req.user._id);
//     const receipt = generateReceiptId('retry');
    
//     const retryPayment = new Payment({
//       userId: req.user._id,
//       paymentId: session.id,
//       orderId: session.id,
//       amount: payment.amount,
//       currency: payment.currency,
//       paymentMethod: payment.paymentMethod,
//       paymentGateway: 'Stripe',
//       description: `Retry: ${payment.description}`,
//       receipt,
//       customerInfo: payment.customerInfo,
//       gatewayResponse: {
//         sessionId: session.id,
//         url: session.url
//       },
//       attempts: payment.attempts + 1,
//       ipAddress: req.ip,
//       userAgent: req.get('User-Agent'),
//       notes: {
//         ...payment.notes,
//         retryOf: payment.paymentId,
//         attempt: payment.attempts + 1
//       }
//     });
    
//     await retryPayment.save();
    
//     res.json({
//       success: true,
//       data: {
//         sessionId: session.id,
//         url: session.url,
//         paymentId: session.id,
//         orderId: session.id,
//         amount: payment.amount,
//         currency: payment.currency
//       }
//     });
    
//   } catch (error) {
//     console.error('Error retrying payment:', error);
//     res.status(500).json({
//       success: false,
//       error: 'Failed to retry payment'
//     });
//   }
// };

// /**
//  * Cancel pending payment
//  */
// export const cancelPayment = async (req, res) => {
//   try {
//     const { paymentId } = req.params;
    
//     const payment = await Payment.findOne({ 
//       paymentId,
//       userId: req.user._id,
//       status: 'created'
//     });
    
//     if (!payment) {
//       return res.status(404).json({
//         success: false,
//         error: 'Pending payment not found',
//         code: 'PAYMENT_NOT_FOUND'
//       });
//     }
    
//     try {
//       await stripe.checkout.sessions.expire(paymentId);
//     } catch (stripeError) {
//       console.log('Could not expire Stripe session:', stripeError.message);
//     }
    
//     payment.status = 'cancelled';
//     payment.cancelledAt = new Date();
//     await payment.save();
       
//     res.json({
//       success: true,
//       data: {
//         paymentId,
//         status: 'cancelled',
//         cancelledAt: payment.cancelledAt,
//         message: 'Payment cancelled successfully'
//       }
//     });
    
//   } catch (error) {
//     console.error('Error cancelling payment:', error);
//     res.status(500).json({
//       success: false,
//       error: 'Failed to cancel payment'
//     });
//   }
// };

// /**
//  * Initiate refund for captured payment
//  */
// export const initiateRefund = async (req, res) => {
//   try {
//     const { paymentId } = req.params;
//     const { amount, reason } = req.body;
    
//     const payment = await Payment.findOne({ 
//       paymentId,
//       userId: req.user._id,
//       status: 'captured'
//     });
    
//     if (!payment) {
//       return res.status(404).json({
//         success: false,
//         error: 'Captured payment not found',
//         code: 'PAYMENT_NOT_FOUND'
//       });
//     }
    
//     if (!payment.canRefund()) {
//       return res.status(400).json({
//         success: false,
//         error: 'Payment cannot be refunded',
//         code: 'REFUND_NOT_ALLOWED'
//       });
//     }
    
//     const refundAmount = amount || payment.refundableAmount;
    
//     if (refundAmount > payment.refundableAmount) {
//       return res.status(400).json({
//         success: false,
//         error: 'Refund amount exceeds refundable amount',
//         code: 'INVALID_REFUND_AMOUNT',
//         maxRefundable: payment.refundableAmount
//       });
//     }
    
//     let paymentIntentId = payment.gatewayResponse.payment_intent;
    
//     if (!paymentIntentId) {
//       const session = await stripe.checkout.sessions.retrieve(paymentId);
//       paymentIntentId = session.payment_intent;
//     }
    
//     const refund = await stripe.refunds.create({
//       payment_intent: paymentIntentId,
//       amount: refundAmount * 100,
//       metadata: {
//         reason: reason || 'Customer request',
//         userId: req.user._id.toString()
//       }
//     });
    
//     await payment.addRefund({
//       refundId: refund.id,
//       amount: refundAmount,
//       reason: reason || 'Customer request',
//       status: 'processed',
//       processedAt: new Date()
//     });

    
//     res.json({
//       success: true,
//       data: {
//         refundId: refund.id,
//         paymentId,
//         refundAmount,
//         status: 'processed',
//         message: 'Refund processed successfully'
//       }
//     });
    
//   } catch (error) {
//     console.error('Error initiating refund:', error);
//     res.status(500).json({
//       success: false,
//       error: 'Failed to process refund'
//     });
//   }
// };

// /**
//  * Get payment statistics
//  */
// export const getPaymentStats = async (req, res) => {
//   try {
//     const { period = '30' } = req.query;
//     const daysBack = parseInt(period);
    
//     const startDate = new Date();
//     startDate.setDate(startDate.getDate() - daysBack);
    
//     const stats = await Payment.getStats({
//       userId: req.user._id,
//       startDate,
//       endDate: new Date()
//     });
    
//     res.json({
//       success: true,
//       data: {
//         period: `${daysBack} days`,
//         statistics: stats
//       }
//     });
    
//   } catch (error) {
//     console.error('Error fetching payment stats:', error);
//     res.status(500).json({
//       success: false,
//       error: 'Failed to fetch payment statistics'
//     });
//   }
// };

// export default {
//   createCheckoutSession,
//   verifyPaymentSession,
//   initiatePayment,
//   verifyPayment,
//   getPaymentDetails,
//   getUserPayments,
//   retryPayment,
//   cancelPayment,
//   initiateRefund,
//   getPaymentStats

// };







// controllers/payment.controller.js
import { Payment } from '../models/payment.model.js';
import { generateOrderId, generateReceiptId } from '../utils/reference.util.js';
import {
  createCashfreeOrder,
  getCashfreeOrder,
  createCashfreeRefund,
} from '../services/cashfree.service.js';

/**
 * Create Cashfree Checkout Session
 * Frontend sends: amount in paise (amount * 100)
 * Cashfree needs: order_amount in rupees
 * DB stores: amount in rupees
 */
export const createCheckoutSession = async (req, res) => {
  try {
    const {
      amount, // paise from frontend
      currency = 'INR',
      success_url,
      cancel_url, // not used directly by Cashfree, we use return_url
      metadata = {},
    } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid amount',
      });
    }

    const baseUrl = 'https://www.getcompanion.in/wallet';

    // rupees
    const amountInRupees = amount / 100;

    // Generate IDs
    const orderId = generateOrderId(req.user._id);
    const receipt = generateReceiptId('wallet');

    const orderData = {
      order_id: orderId,
      order_amount: amountInRupees,
      order_currency: currency.toUpperCase(),
      customer_details: {
        customer_id: req.user._id.toString(),
        customer_name: `${req.user.firstName} ${req.user.lastName}`,
        customer_email: req.user.email,
        customer_phone: req.user.phone || '9999999999',
      },
      order_meta: {
        // User is redirected back here after payment
        return_url: success_url || `${baseUrl}/?order_id={order_id}`,
        // Cashfree will call this for webhook
        notify_url: `${
          process.env.BACKEND_URL || 'http://localhost:5002'
        }/api/webhooks/cashfree`,
        payment_methods: 'cc,dc,upi,nb,wallet',
      },
      order_note: `Wallet Recharge - ₹${amountInRupees}`,
      order_tags: {
        userId: req.user._id.toString(),
        type: 'wallet_recharge',
        userEmail: req.user.email,
        userName: `${req.user.firstName} ${req.user.lastName}`,
        ...metadata,
      },
    };

    const cashfreeOrder = await createCashfreeOrder(orderData);

    // Save payment (amount in rupees)
    const payment = new Payment({
      userId: req.user._id,
      paymentId: cashfreeOrder.order_id,
      orderId: cashfreeOrder.order_id,
      amount: amountInRupees,
      currency: currency.toUpperCase(),
      paymentMethod: 'Cashfree Checkout',
      paymentGateway: 'Cashfree',
      description: `Wallet Recharge - ₹${amountInRupees}`,
      receipt,
      customerInfo: {
        name: `${req.user.firstName} ${req.user.lastName}`,
        email: req.user.email,
        phone: req.user.phone,
      },
      gatewayResponse: {
        orderId: cashfreeOrder.order_id,
        sessionId: cashfreeOrder.payment_session_id,
        url: cashfreeOrder.payment_link,
        order_status: cashfreeOrder.order_status,
      },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      notes: {
        userId: req.user._id.toString(),
        type: 'wallet_recharge',
        userEmail: req.user.email,
        userName: `${req.user.firstName} ${req.user.lastName}`,
      },
    });

    await payment.save();

    return res.json({
      success: true,
      data: {
        sessionId: cashfreeOrder.payment_session_id,
        url: cashfreeOrder.payment_link,
        paymentId: cashfreeOrder.order_id,
        orderId: cashfreeOrder.order_id,
        amount: amountInRupees,
        currency: currency.toUpperCase(),
      },
    });
  } catch (error) {
    console.error('Error creating Cashfree checkout session:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to create checkout session',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * Verify Cashfree payment (used by /verify-session/:sessionId)
 * sessionId can be order_id or payment_session_id – we resolve via DB.
 */
export const verifyPaymentSession = async (req, res) => {
  try {
    const { sessionId } = req.params;

    const payment = await Payment.findOne({
      $or: [
        { paymentId: sessionId },
        { orderId: sessionId },
        { 'gatewayResponse.sessionId': sessionId },
      ],
    });

    if (!payment) {
      return res.status(404).json({
        success: false,
        error: 'Payment record not found',
        code: 'PAYMENT_NOT_FOUND',
      });
    }

    const cashfreeOrder = await getCashfreeOrder(payment.orderId);

    if (cashfreeOrder.order_status === 'PAID') {
      payment.status = 'captured';
      payment.capturedAt = new Date();
      payment.gatewayResponse = {
        ...(payment.gatewayResponse || {}),
        cf_order_id: cashfreeOrder.cf_order_id,
        order_status: cashfreeOrder.order_status,
        payment_method: cashfreeOrder.payment_method,
        payment_time: cashfreeOrder.payment_time,
      };
      await payment.save();

      return res.json({
        success: true,
        data: {
          sessionId,
          orderId: cashfreeOrder.order_id,
          status: 'verified',
          amount: payment.amount,
          currency: payment.currency,
          capturedAt: payment.capturedAt,
          message: 'Payment verified successfully',
        },
      });
    }

    if (cashfreeOrder.order_status === 'ACTIVE') {
      return res.status(400).json({
        success: false,
        error: 'Payment pending',
        code: 'PAYMENT_PENDING',
        status: cashfreeOrder.order_status,
      });
    }

    // Any other status -> failed
    payment.status = 'failed';
    payment.failureReason = `Payment status: ${cashfreeOrder.order_status}`;
    await payment.save();

    return res.status(400).json({
      success: false,
      error: 'Payment not completed',
      code: 'PAYMENT_INCOMPLETE',
      status: cashfreeOrder.order_status,
    });
  } catch (error) {
    console.error('Error verifying Cashfree payment:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to verify payment',
    });
  }
};

/**
 * Backward-compatible initiatePayment
 * (same route, now internally calls Cashfree createCheckoutSession)
 */
export const initiatePayment = async (req, res) => {
  try {
    const { amount, paymentMethod, type = 'wallet_recharge' } = req.body;

    req.body = {
      amount: amount * 100,
      currency: 'INR',
      metadata: { type, originalPaymentMethod: paymentMethod },
    };

    return await createCheckoutSession(req, res);
  } catch (error) {
    console.error('Error initiating payment:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to initiate payment',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * Backward-compatible verifyPayment
 */
export const verifyPayment = async (req, res) => {
  try {
    const { order_id, session_id } = req.body;
    const sessionIdToUse = session_id || order_id;

    if (!sessionIdToUse) {
      return res.status(400).json({
        success: false,
        error: 'Missing payment verification data',
        code: 'INVALID_REQUEST',
      });
    }

    req.params.sessionId = sessionIdToUse;
    return await verifyPaymentSession(req, res);
  } catch (error) {
    console.error('Error verifying payment:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to verify payment',
    });
  }
};

// 🔽 The rest of your functions are unchanged logic-wise,
// just re-used with Cashfree payments stored in the same Payment model.

/**
 * Get payment details by payment ID
 */
export const getPaymentDetails = async (req, res) => {
  try {
    const { paymentId } = req.params;

    const payment = await Payment.findOne({
      paymentId,
      userId: req.user._id,
    });

    if (!payment) {
      return res.status(404).json({
        success: false,
        error: 'Payment not found',
        code: 'PAYMENT_NOT_FOUND',
      });
    }

    return res.json({
      success: true,
      data: payment.getSummary(),
    });
  } catch (error) {
    console.error('Error fetching payment details:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch payment details',
    });
  }
};

/**
 * Get all payments for user with pagination
 */
export const getUserPayments = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const status = req.query.status;
    const paymentMethod = req.query.paymentMethod;
    const skip = (page - 1) * limit;

    const query = { userId: req.user._id };
    if (status) query.status = status;
    if (paymentMethod) query.paymentMethod = paymentMethod;

    const payments = await Payment.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await Payment.countDocuments(query);
    const totalPages = Math.ceil(total / limit);

    return res.json({
      success: true,
      data: {
        payments: payments.map((payment) => ({
          paymentId: payment.paymentId,
          orderId: payment.orderId,
          amount: payment.amount,
          currency: payment.currency,
          status: payment.status,
          paymentMethod: payment.paymentMethod,
          description: payment.description,
          createdAt: payment.createdAt,
          capturedAt: payment.capturedAt,
          isSuccessful: ['authorized', 'captured'].includes(payment.status),
        })),
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1,
        },
      },
    });
  } catch (error) {
    console.error('Error fetching user payments:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch payments',
    });
  }
};

/**
 * Retry failed payment
 */
export const retryPayment = async (req, res) => {
  try {
    const { paymentId } = req.params;

    const payment = await Payment.findOne({
      paymentId,
      userId: req.user._id,
      status: 'failed',
    });

    if (!payment) {
      return res.status(404).json({
        success: false,
        error: 'Failed payment not found',
        code: 'PAYMENT_NOT_FOUND',
      });
    }

    const newOrderId = generateOrderId(req.user._id);
    const receipt = generateReceiptId('retry');
    const baseUrl = 'https://www.getcompanion.in/wallet';

    const orderData = {
      order_id: newOrderId,
      order_amount: payment.amount, // already rupees
      order_currency: payment.currency,
      customer_details: {
        customer_id: req.user._id.toString(),
        customer_name: payment.customerInfo.name,
        customer_email: payment.customerInfo.email,
        customer_phone: payment.customerInfo.phone || '9999999999',
      },
      order_meta: {
        return_url: `${baseUrl}/?order_id={order_id}`,
        notify_url: `${
          process.env.BACKEND_URL || 'http://localhost:5002'
        }/api/webhooks/cashfree`,
        payment_methods: 'cc,dc,upi,nb,wallet',
      },
      order_note: `Retry: ${payment.description}`,
      order_tags: {
        userId: req.user._id.toString(),
        type: 'wallet_recharge',
        retryOf: payment.paymentId,
        attempt: payment.attempts + 1,
      },
    };

    const cashfreeOrder = await createCashfreeOrder(orderData);

    const retryPaymentDoc = new Payment({
      userId: req.user._id,
      paymentId: cashfreeOrder.order_id,
      orderId: cashfreeOrder.order_id,
      amount: payment.amount,
      currency: payment.currency,
      paymentMethod: payment.paymentMethod,
      paymentGateway: 'Cashfree',
      description: `Retry: ${payment.description}`,
      receipt,
      customerInfo: payment.customerInfo,
      gatewayResponse: {
        orderId: cashfreeOrder.order_id,
        sessionId: cashfreeOrder.payment_session_id,
        url: cashfreeOrder.payment_link,
      },
      attempts: payment.attempts + 1,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      notes: {
        ...payment.notes,
        retryOf: payment.paymentId,
        attempt: payment.attempts + 1,
      },
    });

    await retryPaymentDoc.save();

    return res.json({
      success: true,
      data: {
        sessionId: cashfreeOrder.payment_session_id,
        url: cashfreeOrder.payment_link,
        paymentId: cashfreeOrder.order_id,
        orderId: cashfreeOrder.order_id,
        amount: payment.amount,
        currency: payment.currency,
      },
    });
  } catch (error) {
    console.error('Error retrying payment:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to retry payment',
    });
  }
};

/**
 * Cancel pending payment
 */
export const cancelPayment = async (req, res) => {
  try {
    const { paymentId } = req.params;

    const payment = await Payment.findOne({
      paymentId,
      userId: req.user._id,
      status: 'created',
    });

    if (!payment) {
      return res.status(404).json({
        success: false,
        error: 'Pending payment not found',
        code: 'PAYMENT_NOT_FOUND',
      });
    }

    // Cashfree usually does not require explicit cancel; we just mark ours
    payment.status = 'cancelled';
    payment.cancelledAt = new Date();
    await payment.save();

    return res.json({
      success: true,
      data: {
        paymentId,
        status: 'cancelled',
        cancelledAt: payment.cancelledAt,
        message: 'Payment cancelled successfully',
      },
    });
  } catch (error) {
    console.error('Error cancelling payment:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to cancel payment',
    });
  }
};

/**
 * Get payment statistics
 */
export const getPaymentStats = async (req, res) => {
  try {
    const { period = '30' } = req.query;
    const daysBack = parseInt(period);

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysBack);

    const stats = await Payment.getStats({
      userId: req.user._id,
      startDate,
      endDate: new Date(),
    });

    return res.json({
      success: true,
      data: {
        period: `${daysBack} days`,
        statistics: stats,
      },
    });
  } catch (error) {
    console.error('Error fetching payment stats:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch payment statistics',
    });
  }
};

export default {
  createCheckoutSession,
  verifyPaymentSession,
  initiatePayment,
  verifyPayment,
  getPaymentDetails,
  getUserPayments,
  retryPayment,
  cancelPayment,
  initiateRefund,
  getPaymentStats,
};


