// // routes/webhook.routes.js
// import express from 'express';
// import { Payment } from '../models/payment.model.js';
// import { validateWebhookSignature } from '../utils/signature.util.js';

// const router = express.Router();

// // Raw body parser middleware for webhooks
// const rawBodyParser = express.raw({ type: 'application/json' });

// /**
//  * Handle Razorpay webhooks
//  */
// router.post('/razorpay', rawBodyParser, async (req, res) => {
//   try {
//     const signature = req.headers['x-razorpay-signature'];
//     const body = req.body.toString();
    
//     // Verify webhook signature
//     const isValidSignature = validateWebhookSignature(body, signature);
    
//     if (!isValidSignature) {
//       console.warn('Invalid webhook signature received');
//       return res.status(400).json({ success: false, error: 'Invalid signature' });
//     }
    
//     const event = JSON.parse(body);    
//     // Handle different webhook events
//     switch (event.event) {
//       case 'payment.captured':
//         await handlePaymentCaptured(event.payload.payment.entity);
//         break;
        
//       case 'payment.failed':
//         await handlePaymentFailed(event.payload.payment.entity);
//         break;
        
//       case 'refund.created':
//         await handleRefundCreated(event.payload.refund.entity);
//         break;
        
//       case 'order.paid':
//         await handleOrderPaid(event.payload.order.entity);
//         break;
        
//       default:
//         console.log(`Unhandled webhook event: ${event.event}`);
//     }
    
//     res.json({ success: true });
    
//   } catch (error) {
//     console.error('Webhook processing error:', error);
//     res.status(500).json({ success: false, error: 'Webhook processing failed' });
//   }
// });

// /**
//  * Handle payment captured webhook
//  */
// const handlePaymentCaptured = async (paymentData) => {
//   try {
//     const payment = await Payment.findOne({ paymentId: paymentData.order_id });
    
//     if (payment && payment.status !== 'captured') {
//       payment.status = 'captured';
//       payment.gatewayResponse.razorpay_payment_id = paymentData.id;
//       payment.capturedAt = new Date();
//       await payment.save();
//     }
//   } catch (error) {
//     console.error('Error handling payment captured:', error);
//   }
// };

// /**
//  * Handle payment failed webhook
//  */
// const handlePaymentFailed = async (paymentData) => {
//   try {
//     const payment = await Payment.findOne({ paymentId: paymentData.order_id });
    
//     if (payment && payment.status !== 'failed') {
//       payment.status = 'failed';
//       payment.failureCode = paymentData.error_code;
//       payment.failureReason = paymentData.error_description;
//       payment.failedAt = new Date();
//       await payment.save();
//     }
//   } catch (error) {
//     console.error('Error handling payment failed:', error);
//   }
// };

// /**
//  * Handle refund created webhook
//  */
// const handleRefundCreated = async (refundData) => {
//   try {
//     const payment = await Payment.findOne({ 
//       'gatewayResponse.razorpay_payment_id': refundData.payment_id 
//     });
    
//     if (payment) {
//       await payment.addRefund({
//         refundId: refundData.id,
//         amount: refundData.amount / 100, // Convert from paise
//         reason: refundData.notes?.reason || 'Refund processed',
//         status: 'processed',
//         processedAt: new Date()
//       });
//     }
//   } catch (error) {
//     console.error('Error handling refund created:', error);
//   }
// };

// /**
//  * Handle order paid webhook
//  */
// const handleOrderPaid = async (orderData) => {
//   try {
//     const payment = await Payment.findOne({ paymentId: orderData.id });
    
//     if (payment && payment.status === 'created') {
//       payment.status = 'authorized';
//       payment.authorizedAt = new Date();
//       await payment.save();
//     }
//   } catch (error) {
//     console.error('Error handling order paid:', error);
//   }
// };

// export default router;






// routes/webhook.routes.js
import express from 'express';
import crypto from 'crypto';
import { Payment } from '../models/payment.model.js';

const router = express.Router();

// Raw body parser middleware for webhooks
const rawBodyParser = express.raw({ type: 'application/json' });

/**
 * Validate Cashfree Webhook Signature
 * Signature = base64( HMAC_SHA256( rawBody, CASHFREE_WEBHOOK_SECRET ) )
 */
const validateCashfreeWebhookSignature = (rawBody, signature) => {
  try {
    const secret = process.env.CASHFREE_WEBHOOK_SECRET;
    if (!secret) {
      console.error('CASHFREE_WEBHOOK_SECRET is not set');
      return false;
    }

    const computed = crypto
      .createHmac('sha256', secret)
      .update(rawBody)
      .digest('base64');

    return computed === signature;
  } catch (err) {
    console.error('Error validating Cashfree webhook signature:', err);
    return false;
  }
};

/**
 * MAIN CASHFREE WEBHOOK ENDPOINT
 * Full URL (prod): https://socket-server-d9ts.onrender.com/api/webhooks/cashfree
 */
router.post('/cashfree', rawBodyParser, async (req, res) => {
  try {
    const signature = req.headers['x-webhook-signature'];
    const rawBody = req.body.toString();

    if (!validateCashfreeWebhookSignature(rawBody, signature)) {
      console.warn('❌ Invalid Cashfree webhook signature');
      return res.status(400).json({ success: false, error: 'Invalid signature' });
    }

    const event = JSON.parse(rawBody);
    const type = event?.type || event?.event;

    console.log('📩 Cashfree Webhook Received:', type);

    switch (type) {
      case 'PAYMENT_SUCCESS_WEBHOOK':
        await handlePaymentSuccess(event.data);
        break;

      case 'PAYMENT_FAILED_WEBHOOK':
        await handlePaymentFailed(event.data);
        break;

      case 'REFUND_STATUS_WEBHOOK':
        await handleRefund(event.data);
        break;

      default:
        console.log('ℹ Unhandled Cashfree Webhook:', type);
    }

    return res.json({ success: true });
  } catch (err) {
    console.error('❌ Cashfree Webhook Error:', err);
    return res.status(500).json({ success: false, error: 'Webhook error' });
  }
});

// ==================================================
// HANDLERS
// ==================================================

/**
 * Payment Successful → mark captured
 */
const handlePaymentSuccess = async (paymentData) => {
  try {
    const orderId = paymentData.order.order_id;
    const cfPaymentId = paymentData.payment.payment_id;

    const payment = await Payment.findOne({ orderId });

    if (!payment) {
      console.log('⚠ Payment not found for orderId:', orderId);
      return;
    }

    if (payment.status !== 'captured') {
      payment.status = 'captured';
      payment.capturedAt = new Date();
      payment.gatewayResponse = {
        ...(payment.gatewayResponse || {}),
        cfWebhookData: paymentData,
        cf_payment_id: cfPaymentId,
        cf_order_status: paymentData.payment.payment_status,
      };
      await payment.save();

      console.log('✅ Payment Captured via webhook:', orderId);
    }
  } catch (err) {
    console.error('❌ handlePaymentSuccess error:', err);
  }
};

/**
 * Payment Failed → mark failed
 */
const handlePaymentFailed = async (paymentData) => {
  try {
    const orderId = paymentData.order.order_id;

    const payment = await Payment.findOne({ orderId });
    if (!payment) {
      console.log('⚠ Payment not found for failed orderId:', orderId);
      return;
    }

    payment.status = 'failed';
    payment.failureReason =
      paymentData.payment.error_message || 'Payment failed via webhook';
    payment.failedAt = new Date();
    payment.gatewayResponse = {
      ...(payment.gatewayResponse || {}),
      cfWebhookData: paymentData,
    };

    await payment.save();

    console.log('❌ Payment Failed via webhook:', orderId);
  } catch (err) {
    console.error('❌ handlePaymentFailed error:', err);
  }
};

/**
 * Refund Updated → add refund to DB
 */
const handleRefund = async (refundData) => {
  try {
    const orderId = refundData.order_id;

    const payment = await Payment.findOne({ orderId });
    if (!payment) {
      console.log('⚠ Payment not found for refund orderId:', orderId);
      return;
    }

    const refundAmount = Number(refundData.refund_amount);

    await payment.addRefund({
      refundId: refundData.refund_id,
      amount: refundAmount,
      reason: refundData.refund_note || 'Refund processed',
      status: refundData.refund_status?.toLowerCase() || 'processed',
      processedAt: new Date(),
    });

    console.log('♻ Refund Recorded via webhook:', refundData.refund_id);
  } catch (err) {
    console.error('❌ handleRefund error:', err);
  }
};

export default router;
