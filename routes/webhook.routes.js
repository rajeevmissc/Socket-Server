// routes/webhook.routes.js
import express from 'express';
import { Payment } from '../models/payment.model.js';
import { validateWebhookSignature } from '../utils/signature.util.js';

const router = express.Router();

// Raw body parser middleware for webhooks
const rawBodyParser = express.raw({ type: 'application/json' });

/**
 * Handle Razorpay webhooks
 */
router.post('/razorpay', rawBodyParser, async (req, res) => {
  try {
    const signature = req.headers['x-razorpay-signature'];
    const body = req.body.toString();
    
    // Verify webhook signature
    const isValidSignature = validateWebhookSignature(body, signature);
    
    if (!isValidSignature) {
      console.warn('Invalid webhook signature received');
      return res.status(400).json({ success: false, error: 'Invalid signature' });
    }
    
    const event = JSON.parse(body);    
    // Handle different webhook events
    switch (event.event) {
      case 'payment.captured':
        await handlePaymentCaptured(event.payload.payment.entity);
        break;
        
      case 'payment.failed':
        await handlePaymentFailed(event.payload.payment.entity);
        break;
        
      case 'refund.created':
        await handleRefundCreated(event.payload.refund.entity);
        break;
        
      case 'order.paid':
        await handleOrderPaid(event.payload.order.entity);
        break;
        
      default:
        console.log(`Unhandled webhook event: ${event.event}`);
    }
    
    res.json({ success: true });
    
  } catch (error) {
    console.error('Webhook processing error:', error);
    res.status(500).json({ success: false, error: 'Webhook processing failed' });
  }
});

/**
 * Handle payment captured webhook
 */
const handlePaymentCaptured = async (paymentData) => {
  try {
    const payment = await Payment.findOne({ paymentId: paymentData.order_id });
    
    if (payment && payment.status !== 'captured') {
      payment.status = 'captured';
      payment.gatewayResponse.razorpay_payment_id = paymentData.id;
      payment.capturedAt = new Date();
      await payment.save();
    }
  } catch (error) {
    console.error('Error handling payment captured:', error);
  }
};

/**
 * Handle payment failed webhook
 */
const handlePaymentFailed = async (paymentData) => {
  try {
    const payment = await Payment.findOne({ paymentId: paymentData.order_id });
    
    if (payment && payment.status !== 'failed') {
      payment.status = 'failed';
      payment.failureCode = paymentData.error_code;
      payment.failureReason = paymentData.error_description;
      payment.failedAt = new Date();
      await payment.save();
    }
  } catch (error) {
    console.error('Error handling payment failed:', error);
  }
};

/**
 * Handle refund created webhook
 */
const handleRefundCreated = async (refundData) => {
  try {
    const payment = await Payment.findOne({ 
      'gatewayResponse.razorpay_payment_id': refundData.payment_id 
    });
    
    if (payment) {
      await payment.addRefund({
        refundId: refundData.id,
        amount: refundData.amount / 100, // Convert from paise
        reason: refundData.notes?.reason || 'Refund processed',
        status: 'processed',
        processedAt: new Date()
      });
    }
  } catch (error) {
    console.error('Error handling refund created:', error);
  }
};

/**
 * Handle order paid webhook
 */
const handleOrderPaid = async (orderData) => {
  try {
    const payment = await Payment.findOne({ paymentId: orderData.id });
    
    if (payment && payment.status === 'created') {
      payment.status = 'authorized';
      payment.authorizedAt = new Date();
      await payment.save();
    }
  } catch (error) {
    console.error('Error handling order paid:', error);
  }
};

export default router;






