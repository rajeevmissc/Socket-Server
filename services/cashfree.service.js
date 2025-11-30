// services/cashfree.service.js
import axios from "axios";
import crypto from "crypto";

const CF_APP_ID = process.env.CASHFREE_APP_ID;
const CF_SECRET = process.env.CASHFREE_SECRET_KEY;

const CF_BASE = "https://api.cashfree.com/pg/orders";

/**
 * Create Cashfree Checkout Session
 */
export const createCashfreeCheckout = async ({ amount, currency, user, metadata }) => {
  try {
    const orderId = `order_${Date.now()}`;

    const body = {
      order_id: orderId,
      order_amount: amount / 100,
      order_currency: currency.toUpperCase(),
      customer_details: {
        customer_id: user._id.toString(),
        customer_email: user.email,
        customer_phone: user.phone || "9999999999",
      },
      order_meta: {
        return_url: `${process.env.FRONTEND_URL}/wallet?order_id={order_id}`
      },
      metadata,
    };

    const response = await axios.post(CF_BASE, body, {
      headers: {
        "Content-Type": "application/json",
        "x-client-id": CF_APP_ID,
        "x-client-secret": CF_SECRET,
      },
    });

    return {
      success: true,
      data: {
        sessionId: response.data.payment_session_id,
        orderId,
        paymentLink: `https://payments.cashfree.com/pg/${response.data.payment_session_id}`
      },
    };
  } catch (err) {
    console.error("Cashfree Error:", err.response?.data || err.message);
    return { success: false, error: err.message };
  }
};


/**
 * Verify order
 */
export const verifyCashfreeOrder = async (orderId) => {
  try {
    const response = await axios.get(`${CF_BASE}/${orderId}`, {
      headers: {
        "x-client-id": CF_APP_ID,
        "x-client-secret": CF_SECRET,
      },
    });

    return {
      success: true,
      status: response.data.order_status,
      data: response.data,
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
};


/**
 * Refunds (wallet refund logic)
 */
export const cashfreeRefund = async (orderId, amount, reason) => {
  try {
    const body = {
      refund_amount: amount,
      refund_note: reason || "Refund",
      refund_id: `refund_${Date.now()}`,
    };

    const response = await axios.post(
      `${CF_BASE}/${orderId}/refunds`,
      body,
      {
        headers: {
          "x-client-id": CF_APP_ID,
          "x-client-secret": CF_SECRET,
        },
      }
    );

    return { success: true, data: response.data };
  } catch (err) {
    return { success: false, error: err.message };
  }
};


/**
 * Verify Cashfree Webhook Signature
 */
export const validateCashfreeWebhook = (rawBody, signature) => {
  const computed = crypto
    .createHmac("sha256", CF_SECRET)
    .update(rawBody)
    .digest("base64");

  return computed === signature;
};
