// // utils/smsUtils.js
// import twilio from 'twilio';

// // Twilio Configuration
// const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
// const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
// const TWILIO_PHONE_NUMBER = '+18773678609';
// const TWILIO_WHATSAPP_NUMBER = 'whatsapp:+14155238886';

// // Initialize Twilio client
// const twilioClient = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);

// // ==================== MESSAGE TEMPLATES ====================

// /**
//  * Format WhatsApp OTP message with professional template
//  */
// const formatWhatsAppOTPMessage = (otpCode, expiryMinutes = 10, serviceName = "ServiceConnect") => {
//   return `🔐 *${serviceName} Verification*

// Hello! 👋

// Your verification code is:

// *${otpCode}*

// ⏰ Valid for *${expiryMinutes} minutes*
// 🔒 Keep this code confidential

// _If you didn't request this code, please ignore this message._

// ---
// ${serviceName} - Your Trusted Service Partner
// Need help? Contact support`;
// };

// /**
//  * Format SMS OTP message with professional template (optimized for SMS)
//  */
// const formatSMSOTPMessage = (otpCode, expiryMinutes = 10, serviceName = "ServiceConnect") => {
//   return `🔐 ${serviceName} Verification\n\nYour OTP is: ${otpCode}\n\nValid for ${expiryMinutes} minutes. Do not share with anyone.\n\n- ${serviceName} Team`;
// };

// /**
//  * Format professional OTP message for general use
//  */
// const formatProfessionalOTPMessage = (otpCode, expiryMinutes = 10, serviceName = "ServiceConnect") => {
//   return `🔐 ${serviceName} Verification Code\n\n${otpCode}\n\nThis code will expire in ${expiryMinutes} minutes.\n\nFor your security, please do not share this code with anyone.\n\nThank you,\n${serviceName} Team`;
// };

// // ==================== CORE SMS FUNCTIONS ====================

// /**
//  * Send SMS using Twilio with OTP template support
//  */
// export const sendTwilioSMS = async (phoneNumber, message, isOTP = false, otpCode = null) => {
//   try {
//     console.log('📤 Sending SMS via Twilio...');
//     console.log(`   To: ${phoneNumber}`);
//     console.log(`   Type: ${isOTP ? 'OTP Template' : 'General Message'}`);

//     const finalMessage = (isOTP && otpCode) 
//       ? formatSMSOTPMessage(otpCode)
//       : message;

//     const response = await twilioClient.messages.create({
//       body: finalMessage,
//       from: TWILIO_PHONE_NUMBER,
//       to: phoneNumber
//     });

//     console.log('✅ Twilio SMS sent successfully!');
//     console.log(`   Message SID: ${response.sid}`);
//     console.log(`   Status: ${response.status}`);
    
//     return {
//       success: true,
//       messageSid: response.sid,
//       status: response.status
//     };
//   } catch (error) {
//     console.error('❌ Twilio SMS Error:', error.message);
//     if (error.code) {
//       console.error(`   Error Code: ${error.code}`);
//     }
//     if (error.moreInfo) {
//       console.error(`   More Info: ${error.moreInfo}`);
//     }
//     return {
//       success: false,
//       error: error.message
//     };
//   }
// };

// /**
//  * Send WhatsApp message using Twilio with professional template
//  */
// export const sendWhatsAppMessage = async (phoneNumber, message, isOTP = false, otpCode = null) => {
//   try {
//     const whatsappTo = phoneNumber.startsWith('whatsapp:') 
//       ? phoneNumber 
//       : `whatsapp:${phoneNumber}`;

//     const finalMessage = (isOTP && otpCode) 
//       ? formatWhatsAppOTPMessage(otpCode) 
//       : message;

//     console.log('📱 Sending WhatsApp message via Twilio...');
//     console.log(`   To: ${whatsappTo}`);
//     console.log(`   Type: ${isOTP ? 'OTP Template' : 'General Message'}`);

//     const response = await twilioClient.messages.create({
//       body: finalMessage,
//       from: TWILIO_WHATSAPP_NUMBER,
//       to: whatsappTo
//     });

//     console.log('✅ Twilio WhatsApp message sent successfully!');
//     console.log(`   Message SID: ${response.sid}`);
//     console.log(`   Status: ${response.status}`);
    
//     return {
//       success: true,
//       messageSid: response.sid,
//       status: response.status
//     };
//   } catch (error) {
//     console.error('❌ Twilio WhatsApp Error:', error.message);
//     if (error.code) {
//       console.error(`   Error Code: ${error.code}`);
//     }
//     if (error.moreInfo) {
//       console.error(`   More Info: ${error.moreInfo}`);
//     }
//     return {
//       success: false,
//       error: error.message
//     };
//   }
// };

// // ==================== ENHANCED OTP FUNCTIONS ====================

// /**
//  * Send OTP via SMS with professional template
//  */
// export const sendOTPViaSMS = async (phoneNumber, otpCode, expiryMinutes = 10) => {
//   console.log(`\n🔐 Sending OTP via SMS to ${phoneNumber}`);
//   console.log(`   OTP: ${otpCode}`);
//   console.log(`   Expiry: ${expiryMinutes} minutes`);
  
//   const formattedPhoneNumber = phoneNumber.startsWith('+')
//     ? phoneNumber
//     : `+${phoneNumber}`;

//   return await sendTwilioSMS(formattedPhoneNumber, null, true, otpCode);
// };

// /**
//  * Send OTP via WhatsApp with professional template
//  */
// export const sendOTPViaWhatsApp = async (phoneNumber, otpCode, expiryMinutes = 10) => {
//   console.log(`\n🔐 Sending OTP via WhatsApp to ${phoneNumber}`);
//   console.log(`   OTP: ${otpCode}`);
//   console.log(`   Expiry: ${expiryMinutes} minutes`);
  
//   const formattedPhoneNumber = phoneNumber.startsWith('+')
//     ? phoneNumber
//     : `+${phoneNumber}`;

//   return await sendWhatsAppMessage(formattedPhoneNumber, null, true, otpCode);
// };

// /**
//  * Send OTP via preferred channel (SMS first, then WhatsApp fallback)
//  */
// export const sendOTP = async (phoneNumber, otpCode, expiryMinutes = 10, options = {}) => {
//   const { preferWhatsApp = false, sendBoth = false } = options;
  
//   console.log(`\n🔐 Sending OTP to ${phoneNumber}`);
//   console.log(`   OTP: ${otpCode}`);
//   console.log(`   Expiry: ${expiryMinutes} minutes`);
//   console.log(`   Strategy: ${sendBoth ? 'Both channels' : preferWhatsApp ? 'WhatsApp preferred' : 'SMS preferred'}`);

//   const formattedPhoneNumber = phoneNumber.startsWith('+')
//     ? phoneNumber
//     : `+${phoneNumber}`;

//   try {
//     if (sendBoth) {
//       // Send via both channels
//       const results = await Promise.allSettled([
//         sendOTPViaSMS(formattedPhoneNumber, otpCode, expiryMinutes),
//         sendOTPViaWhatsApp(formattedPhoneNumber, otpCode, expiryMinutes)
//       ]);

//       return {
//         sms: results[0].status === 'fulfilled' ? results[0].value : { success: false, error: results[0].reason },
//         whatsapp: results[1].status === 'fulfilled' ? results[1].value : { success: false, error: results[1].reason },
//         success: (results[0].status === 'fulfilled' && results[0].value.success) || 
//                 (results[1].status === 'fulfilled' && results[1].value.success)
//       };
//     }

//     if (preferWhatsApp) {
//       // Try WhatsApp first, then SMS fallback
//       const whatsappResult = await sendOTPViaWhatsApp(formattedPhoneNumber, otpCode, expiryMinutes);
//       if (whatsappResult.success) {
//         return { success: true, channel: 'whatsapp', details: whatsappResult };
//       }
      
//       console.log('⚠️  WhatsApp OTP failed, trying SMS...');
//       const smsResult = await sendOTPViaSMS(formattedPhoneNumber, otpCode, expiryMinutes);
//       return { 
//         success: smsResult.success, 
//         channel: smsResult.success ? 'sms' : 'none',
//         details: smsResult 
//       };
//     }

//     // Try SMS first, then WhatsApp fallback (default)
//     const smsResult = await sendOTPViaSMS(formattedPhoneNumber, otpCode, expiryMinutes);
//     if (smsResult.success) {
//       return { success: true, channel: 'sms', details: smsResult };
//     }
    
//     console.log('⚠️  SMS OTP failed, trying WhatsApp...');
//     const whatsappResult = await sendOTPViaWhatsApp(formattedPhoneNumber, otpCode, expiryMinutes);
//     return { 
//       success: whatsappResult.success, 
//       channel: whatsappResult.success ? 'whatsapp' : 'none',
//       details: whatsappResult 
//     };

//   } catch (error) {
//     console.error('❌ OTP sending failed:', error);
//     return { success: false, channel: 'none', error: error.message };
//   }
// };

// // ==================== ENHANCED MAIN FUNCTIONS ====================

// /**
//  * Main SMS sending function with improved OTP support
//  */
// export const sendSMS = async (phoneNumber, message, options = {}) => {
//   if (!phoneNumber) {
//     console.error('❌ Phone number is required');
//     return { success: false, error: 'Phone number is required' };
//   }

//   const { isOTP = false, otpCode = null, sendWhatsApp = false, preferWhatsApp = false } = options;

//   // For OTP messages, message parameter is optional
//   if (!isOTP && !message) {
//     console.error('❌ Message is required for non-OTP messages');
//     return { success: false, error: 'Message is required for non-OTP messages' };
//   }

//   const formattedPhoneNumber = phoneNumber.startsWith('+')
//     ? phoneNumber
//     : `+${phoneNumber}`;

//   console.log(`\n🚀 Attempting to send ${isOTP ? 'OTP' : 'message'} to ${formattedPhoneNumber}`);
//   console.log(`   Channel: ${sendWhatsApp ? 'Both' : preferWhatsApp ? 'WhatsApp' : 'SMS'}`);

//   try {
//     if (isOTP && otpCode) {
//       // Use dedicated OTP function for OTP messages
//       return await sendOTP(formattedPhoneNumber, otpCode, 10, { preferWhatsApp, sendBoth: sendWhatsApp });
//     }

//     // Regular message flow
//     if (sendWhatsApp) {
//       const results = await Promise.allSettled([
//         sendTwilioSMS(formattedPhoneNumber, message),
//         sendWhatsAppMessage(formattedPhoneNumber, message)
//       ]);

//       return {
//         sms: results[0].status === 'fulfilled' ? results[0].value : { success: false, error: results[0].reason },
//         whatsapp: results[1].status === 'fulfilled' ? results[1].value : { success: false, error: results[1].reason },
//         success: (results[0].status === 'fulfilled' && results[0].value.success) || 
//                 (results[1].status === 'fulfilled' && results[1].value.success)
//       };
//     }

//     if (preferWhatsApp) {
//       const whatsappResult = await sendWhatsAppMessage(formattedPhoneNumber, message);
//       if (whatsappResult.success) return { success: true, channel: 'whatsapp', details: whatsappResult };
      
//       console.log('⚠️  WhatsApp failed, trying SMS...');
//       const smsResult = await sendTwilioSMS(formattedPhoneNumber, message);
//       return { 
//         success: smsResult.success, 
//         channel: smsResult.success ? 'sms' : 'none',
//         details: smsResult 
//       };
//     }

//     const smsResult = await sendTwilioSMS(formattedPhoneNumber, message);
//     return { 
//       success: smsResult.success, 
//       channel: smsResult.success ? 'sms' : 'none',
//       details: smsResult 
//     };

//   } catch (error) {
//     console.error('❌ Message sending failed:', error);
//     return { success: false, error: error.message };
//   }
// };

// /**
//  * Send both SMS and WhatsApp message
//  */
// export const sendBothSMSAndWhatsApp = async (phoneNumber, message) => {
//   console.log('\n🚀 Sending via both SMS and WhatsApp...');
  
//   const results = await Promise.allSettled([
//     sendTwilioSMS(phoneNumber, message),
//     sendWhatsAppMessage(phoneNumber, message)
//   ]);

//   return {
//     sms: results[0].status === 'fulfilled' ? results[0].value : { success: false, error: results[0].reason },
//     whatsapp: results[1].status === 'fulfilled' ? results[1].value : { success: false, error: results[1].reason },
//     success: (results[0].status === 'fulfilled' && results[0].value.success) || 
//             (results[1].status === 'fulfilled' && results[1].value.success)
//   };
// };

// /**
//  * Mock SMS/WhatsApp service for development/testing
//  */
// const sendMockMessage = async (phoneNumber, message, type = 'SMS') => {
//   console.log(`\n📱 MOCK ${type} SERVICE`);
//   console.log(`To: ${phoneNumber}`);
//   console.log(`Message: ${message}`);
//   console.log(`✅ Delivered (Mock Mode)\n`);
//   return {
//     success: true,
//     channel: 'mock',
//     status: 'delivered'
//   };
// };

// /**
//  * Send WhatsApp only (convenience function)
//  */
// export const sendWhatsApp = async (phoneNumber, message) => {
//   return sendSMS(phoneNumber, message, { preferWhatsApp: true });
// };

// // ==================== BOOKING NOTIFICATION FUNCTIONS ====================

// /**
//  * Format booking confirmation message for USER
//  */
// const formatUserBookingMessage = (bookingDetails) => {
//   const { providerName, date, timeSlot, mode, price, bookingId } = bookingDetails;
//   const formattedDate = new Date(date).toLocaleDateString('en-IN', {
//     weekday: 'long',
//     year: 'numeric',
//     month: 'long',
//     day: 'numeric'
//   });

//   return `✅ *Booking Confirmed - ServiceConnect*

// Hello! Your appointment has been booked successfully.

// 📋 *Booking Details:*
// ━━━━━━━━━━━━━━━━━━━━
// 👨‍⚕️ Provider: *${providerName}*
// 📅 Date: *${formattedDate}*
// 🕐 Time: *${timeSlot}*
// 📍 Mode: *${mode}*
// 💰 Amount: *₹${price}*
// 🔖 Booking ID: ${bookingId}

// ⏰ *Important:*
// • Provider arrive 10 minutes early
// • Show any relevant documents
// • Verification pending

// 📞 Need to reschedule? Contact us or cancel through the app.

// ---
// ServiceConnect - Your Trusted Service Partner
// Need help? Contact support`;
// };

// /**
//  * Format booking notification message for PROVIDER
//  */
// const formatProviderBookingMessage = (bookingDetails) => {
//   const { userName, userPhone, date, timeSlot, mode, price, bookingId } = bookingDetails;
//   const formattedDate = new Date(date).toLocaleDateString('en-IN', {
//     weekday: 'long',
//     year: 'numeric',
//     month: 'long',
//     day: 'numeric'
//   });

//   return `🔔 *New Booking Received - ServiceConnect*

// You have received a new appointment booking!

// 📋 *Booking Details:*
// ━━━━━━━━━━━━━━━━━━━━
// 👤 Patient: *${userName}*
// 📞 Contact: ${userPhone}
// 📅 Date: *${formattedDate}*
// 🕐 Time: *${timeSlot}*
// 📍 Mode: *${mode}*
// 💰 Amount: *₹${price}*
// 🔖 Booking ID: ${bookingId}

// ⚠️ *Action Required:*
// • Review patient details
// • Verify booking in dashboard
// • Prepare for appointment

// 📱 Login to your dashboard to manage this booking.

// ---
// ServiceConnect - Provider Portal
// Need assistance? Contact support`;
// };

// /**
//  * Send booking notifications to both user and provider
//  * @param {Object} bookingData - Booking information
//  * @param {string} bookingData.userPhone - User's phone number
//  * @param {string} bookingData.providerPhone - Provider's phone number
//  * @param {string} bookingData.userName - User's name
//  * @param {string} bookingData.providerName - Provider's name
//  * @param {string} bookingData.date - Booking date
//  * @param {string} bookingData.timeSlot - Booking time slot
//  * @param {string} bookingData.mode - Consultation mode
//  * @param {number} bookingData.price - Booking price
//  * @param {string} bookingData.bookingId - Booking ID
//  * @returns {Promise<Object>} Status of notifications sent
//  */
// export const sendBookingNotifications = async (bookingData) => {
//   try {
//     const {
//       userPhone,
//       providerPhone,
//       userName,
//       providerName,
//       date,
//       timeSlot,
//       mode,
//       price,
//       bookingId
//     } = bookingData;

//     console.log('\n📬 Sending Booking Notifications...');
//     console.log(`   User: ${userName} (${userPhone})`);
//     console.log(`   Provider: ${providerName} (${providerPhone})`);

//     // Format phone numbers
//     const formattedUserPhone = userPhone.startsWith('+') ? userPhone : `+${userPhone}`;
//     const formattedProviderPhone = providerPhone.startsWith('+') ? providerPhone : `+${providerPhone}`;

//     // Create messages
//     const userMessage = formatUserBookingMessage({
//       providerName,
//       date,
//       timeSlot,
//       mode,
//       price,
//       bookingId
//     });

//     const providerMessage = formatProviderBookingMessage({
//       userName,
//       userPhone: formattedUserPhone,
//       date,
//       timeSlot,
//       mode,
//       price,
//       bookingId
//     });

//     // Send both notifications in parallel
//     const [userResult, providerResult] = await Promise.allSettled([
//       sendWhatsAppMessage(formattedUserPhone, userMessage),
//       sendWhatsAppMessage(formattedProviderPhone, providerMessage)
//     ]);

//     const results = {
//       user: {
//         sent: userResult.status === 'fulfilled' && userResult.value.success,
//         phone: formattedUserPhone,
//         error: userResult.status === 'rejected' ? userResult.reason : (userResult.status === 'fulfilled' && !userResult.value.success ? userResult.value.error : null)
//       },
//       provider: {
//         sent: providerResult.status === 'fulfilled' && providerResult.value.success,
//         phone: formattedProviderPhone,
//         error: providerResult.status === 'rejected' ? providerResult.reason : (providerResult.status === 'fulfilled' && !providerResult.value.success ? providerResult.value.error : null)
//       }
//     };

//     console.log('\n✅ Booking Notifications Summary:');
//     console.log(`   User notification: ${results.user.sent ? '✓ Sent' : '✗ Failed'}`);
//     console.log(`   Provider notification: ${results.provider.sent ? '✓ Sent' : '✗ Failed'}`);

//     return results;

//   } catch (error) {
//     console.error('❌ Booking Notifications Error:', error);
//     return {
//       user: { sent: false, error: error.message },
//       provider: { sent: false, error: error.message }
//     };
//   }
// };

// /**
//  * Send booking cancellation notifications
//  */
// export const sendCancellationNotifications = async (bookingData) => {
//   try {
//     const {
//       userPhone,
//       providerPhone,
//       userName,
//       providerName,
//       date,
//       timeSlot,
//       bookingId,
//       cancelledBy // 'user' or 'provider'
//     } = bookingData;

//     const formattedDate = new Date(date).toLocaleDateString('en-IN', {
//       weekday: 'long',
//       year: 'numeric',
//       month: 'long',
//       day: 'numeric'
//     });

//     const userMessage = `❌ *Booking Cancelled - ServiceConnect*

// Your appointment has been cancelled.

// 📋 *Cancelled Booking:*
// ━━━━━━━━━━━━━━━━━━━━
// 👨‍⚕️ Provider: *${providerName}*
// 📅 Date: *${formattedDate}*
// 🕐 Time: *${timeSlot}*
// 🔖 Booking ID: ${bookingId}

// ${cancelledBy === 'user' ? '✓ You cancelled this booking' : '⚠️ Cancelled by provider'}

// 💰 Refund will be processed to your wallet within 24 hours.

// ---
// ServiceConnect - Your Trusted Service Partner`;

//     const providerMessage = `❌ *Booking Cancelled - ServiceConnect*

// An appointment has been cancelled.

// 📋 *Cancelled Booking:*
// ━━━━━━━━━━━━━━━━━━━━
// 👤 Patient: *${userName}*
// 📅 Date: *${formattedDate}*
// 🕐 Time: *${timeSlot}*
// 🔖 Booking ID: ${bookingId}

// ${cancelledBy === 'provider' ? '✓ You cancelled this booking' : '⚠️ Cancelled by patient'}

// ---
// ServiceConnect - Provider Portal`;

//     const formattedUserPhone = userPhone.startsWith('+') ? userPhone : `+${userPhone}`;
//     const formattedProviderPhone = providerPhone.startsWith('+') ? providerPhone : `+${providerPhone}`;

//     const [userResult, providerResult] = await Promise.allSettled([
//       sendWhatsAppMessage(formattedUserPhone, userMessage),
//       sendWhatsAppMessage(formattedProviderPhone, providerMessage)
//     ]);

//     return {
//       user: { 
//         sent: userResult.status === 'fulfilled' && userResult.value.success,
//         error: userResult.status === 'rejected' ? userResult.reason : null
//       },
//       provider: { 
//         sent: providerResult.status === 'fulfilled' && providerResult.value.success,
//         error: providerResult.status === 'rejected' ? providerResult.reason : null
//       }
//     };

//   } catch (error) {
//     console.error('❌ Cancellation Notifications Error:', error);
//     return {
//       user: { sent: false, error: error.message },
//       provider: { sent: false, error: error.message }
//     };
//   }
// };

// // ==================== EXPORTS ====================

// export default {
//   sendSMS,
//   sendWhatsApp,
//   sendOTP,
//   sendOTPViaSMS,
//   sendOTPViaWhatsApp,
//   sendBothSMSAndWhatsApp,
//   sendBookingNotifications,
//   sendCancellationNotifications,
//   sendTwilioSMS,
//   sendWhatsAppMessage
// };







// utils/smsUtils.js
import twilio from 'twilio';
import axios from "axios";

// ====================================================
//   TWILIO CONFIG (NOT USED ANYMORE – ONLY STRUCTURE KEPT)
// ====================================================
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_PHONE_NUMBER = '+18773678609';
const TWILIO_WHATSAPP_NUMBER = 'whatsapp:+14155238886';

const twilioClient = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);

// ====================================================
//   ULTRAMSG CONFIG (NEW SENDER)
// ====================================================
const ULTRAMSG_INSTANCE_ID = process.env.ULTRAMSG_INSTANCE_ID;
const ULTRAMSG_TOKEN = process.env.ULTRAMSG_TOKEN;

// ====================================================
//   ULTRAMSG SEND FUNCTION
// ====================================================
const sendUltraMsg = async (phoneNumber, message) => {
  try {
    const url = `https://api.ultramsg.com/${ULTRAMSG_INSTANCE_ID}/messages/chat`;

    const data = new URLSearchParams({
      token: ULTRAMSG_TOKEN,
      to: phoneNumber,
      body: message
    });

    const response = await axios.post(url, data, {
      headers: { "Content-Type": "application/x-www-form-urlencoded" }
    });

    console.log("📨 UltraMsg Sent:", response.data);

    return { success: true, response: response.data };
  } catch (err) {
    console.error("❌ UltraMsg Error:", err.response?.data || err.message);
    return { success: false, error: err.message };
  }
};


// ====================================================
//   MESSAGE TEMPLATES (NO CHANGES)
// ====================================================
const formatWhatsAppOTPMessage = (otpCode, expiryMinutes = 10, serviceName = "ServiceConnect") => {
  return `🔐 *${serviceName} Verification*

Hello! 👋

Your verification code is:

*${otpCode}*

⏰ Valid for *${expiryMinutes} minutes*
🔒 Keep this code confidential

_If you didn't request this code, please ignore this message._

---
${serviceName} - Your Trusted Service Partner
Need help? Contact support`;
};

const formatSMSOTPMessage = (otpCode, expiryMinutes = 10, serviceName = "ServiceConnect") => {
  return `🔐 ${serviceName} Verification

Your OTP is: ${otpCode}

Valid for ${expiryMinutes} minutes. Do not share with anyone.

- ${serviceName} Team`;
};

const formatProfessionalOTPMessage = (otpCode, expiryMinutes = 10, serviceName = "ServiceConnect") => {
  return `🔐 ${serviceName} Verification Code

${otpCode}

This code will expire in ${expiryMinutes} minutes.

For your security, please do not share this code with anyone.

Thank you,
${serviceName} Team`;
};


// ====================================================
//   REPLACED TWILIO SENDER → NOW ULTRAMSG
// ====================================================
export const sendTwilioSMS = async (phoneNumber, message, isOTP = false, otpCode = null) => {
  const finalMessage = (isOTP && otpCode)
    ? formatSMSOTPMessage(otpCode)
    : message;

  return await sendUltraMsg(phoneNumber, finalMessage);
};

export const sendWhatsAppMessage = async (phoneNumber, message, isOTP = false, otpCode = null) => {
  const finalMessage = (isOTP && otpCode)
    ? formatWhatsAppOTPMessage(otpCode)
    : message;

  return await sendUltraMsg(phoneNumber, finalMessage);
};


// ====================================================
//   OTP FUNCTIONS (NO CHANGE NEEDED)
// ====================================================
export const sendOTPViaSMS = async (phoneNumber, otpCode, expiryMinutes = 10) => {
  const formattedPhone = phoneNumber.startsWith('+') ? phoneNumber : `+${phoneNumber}`;
  return await sendTwilioSMS(formattedPhone, null, true, otpCode);
};

export const sendOTPViaWhatsApp = async (phoneNumber, otpCode, expiryMinutes = 10) => {
  const formattedPhone = phoneNumber.startsWith('+') ? phoneNumber : `+${phoneNumber}`;
  return await sendWhatsAppMessage(formattedPhone, null, true, otpCode);
};

export const sendOTP = async (phoneNumber, otpCode, expiryMinutes = 10, options = {}) => {
  const { preferWhatsApp = false, sendBoth = false } = options;

  const formattedPhone = phoneNumber.startsWith('+') ? phoneNumber : `+${phoneNumber}`;

  if (sendBoth) {
    const results = await Promise.allSettled([
      sendOTPViaSMS(formattedPhone, otpCode, expiryMinutes),
      sendOTPViaWhatsApp(formattedPhone, otpCode, expiryMinutes)
    ]);

    return {
      sms: results[0].value,
      whatsapp: results[1].value,
      success: results[0].value?.success || results[1].value?.success
    };
  }

  if (preferWhatsApp) {
    const wa = await sendOTPViaWhatsApp(formattedPhone, otpCode, expiryMinutes);
    if (wa.success) return { success: true, channel: "whatsapp" };
    return await sendOTPViaSMS(formattedPhone, otpCode, expiryMinutes);
  }

  const sms = await sendOTPViaSMS(formattedPhone, otpCode, expiryMinutes);
  if (sms.success) return { success: true, channel: "sms" };
  return await sendOTPViaWhatsApp(formattedPhone, otpCode, expiryMinutes);
};


// ====================================================
//   MAIN SEND FUNCTION (NO CHANGE NEEDED)
// ====================================================
export const sendSMS = async (phoneNumber, message, options = {}) => {
  const { isOTP = false, otpCode = null, sendWhatsApp = false, preferWhatsApp = false } = options;
  const formattedPhone = phoneNumber.startsWith('+') ? phoneNumber : `+${phoneNumber}`;

  if (isOTP) {
    return await sendOTP(formattedPhone, otpCode, 10, { preferWhatsApp, sendBoth: sendWhatsApp });
  }

  if (sendWhatsApp) {
    return await Promise.all([
      sendTwilioSMS(formattedPhone, message),
      sendWhatsAppMessage(formattedPhone, message)
    ]);
  }

  if (preferWhatsApp) {
    return await sendWhatsAppMessage(formattedPhone, message);
  }

  return await sendTwilioSMS(formattedPhone, message);
};


// ====================================================
//   BOOKING + CANCELLATION (NO CHANGE)
// ====================================================
const formatUserBookingMessage = (b) => {
  const formattedDate = new Date(b.date).toLocaleDateString("en-IN", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return `✅ *Booking Confirmed - ServiceConnect*

Hello! Your appointment has been booked successfully.

📋 *Booking Details:*
━━━━━━━━━━━━━━━━━━━━
👨‍⚕️ Provider: *${b.providerName}*
📅 Date: *${formattedDate}*
🕐 Time: *${b.timeSlot}*
📍 Mode: *${b.mode}*
💰 Amount: *₹${b.price}*
🔖 Booking ID: ${b.bookingId}

---
ServiceConnect`;
};

const formatProviderBookingMessage = (b) => {
  const formattedDate = new Date(b.date).toLocaleDateString("en-IN", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return `🔔 *New Booking Received - ServiceConnect*

📋 *Booking Details:*
━━━━━━━━━━━━━━━━━━━━
👤 Patient: *${b.userName}*
📞 Contact: ${b.userPhone}
📅 Date: *${formattedDate}*
🕐 Time: *${b.timeSlot}*
📍 Mode: *${b.mode}*
💰 Amount: *₹${b.price}*
🔖 Booking ID: ${b.bookingId}

---
ServiceConnect Provider Portal`;
};

export const sendBookingNotifications = async (data) => {
  const userMsg = formatUserBookingMessage(data);
  const providerMsg = formatProviderBookingMessage(data);

  const user = await sendWhatsAppMessage(data.userPhone, userMsg);
  const provider = await sendWhatsAppMessage(data.providerPhone, providerMsg);

  return { user, provider };
};

export const sendCancellationNotifications = async (data) => {
  const formattedDate = new Date(data.date).toLocaleDateString("en-IN", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const userMessage = `❌ *Booking Cancelled*
Provider: *${data.providerName}*
Date: *${formattedDate}*
Time: *${data.timeSlot}*`;

  const providerMessage = `❌ *Booking Cancelled*
Patient: *${data.userName}*
Date: *${formattedDate}*
Time: *${data.timeSlot}*`;

  const user = await sendWhatsAppMessage(data.userPhone, userMessage);
  const provider = await sendWhatsAppMessage(data.providerPhone, providerMessage);

  return { user, provider };
};


// ====================================================
//   EXPORTS
// ====================================================
export default {
  sendSMS,
  sendWhatsApp,
  sendOTP,
  sendOTPViaSMS,
  sendOTPViaWhatsApp,
  sendBothSMSAndWhatsApp: sendSMS,
  sendBookingNotifications,
  sendCancellationNotifications,
  sendTwilioSMS,
  sendWhatsAppMessage
};
