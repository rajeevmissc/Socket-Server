// // utils/smsUtils.js
// import twilio from 'twilio';

// // Twilio Configuration
// const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID || 'ACac7af367690b65c0';
// const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN || 'f4e2e997b6e88cee9121ecb7';
// const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER || '+14155238886'; // Your Twilio number
// const TWILIO_WHATSAPP_NUMBER = process.env.TWILIO_WHATSAPP_NUMBER || 'whatsapp:+14155238886';

// // Initialize Twilio client
// const twilioClient = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);

// /**
//  * Send SMS using Twilio
//  * @param {string} phoneNumber - Recipient phone number (with country code)
//  * @param {string} message - SMS message
//  * @returns {Promise<boolean>} Success status
//  */
// export const sendTwilioSMS = async (phoneNumber, message) => {
//   try {
//     console.log('📤 Sending SMS via Twilio...');
//     console.log(`   To: ${phoneNumber}`);
//     console.log(`   Message: ${message}`);

//     const response = await twilioClient.messages.create({
//       body: message,
//       from: TWILIO_PHONE_NUMBER,
//       to: phoneNumber
//     });

//     console.log('✅ Twilio SMS sent successfully!');
//     console.log(`   Message SID: ${response.sid}`);
//     console.log(`   Status: ${response.status}`);
    
//     return true;
//   } catch (error) {
//     console.error('❌ Twilio SMS Error:', error.message);
//     if (error.code) {
//       console.error(`   Error Code: ${error.code}`);
//     }
//     if (error.moreInfo) {
//       console.error(`   More Info: ${error.moreInfo}`);
//     }
//     return false;
//   }
// };

// /**
//  * Format WhatsApp OTP message with professional template
//  * @param {string} otpCode - OTP code
//  * @param {number} expiryMinutes - OTP expiry time in minutes
//  * @returns {string} Formatted WhatsApp message
//  */
// const formatWhatsAppOTPMessage = (otpCode, expiryMinutes = 10) => {
//   return `🔐 *ServiceConnect Verification*

// Hello! 👋

// Your verification code is:

// *${otpCode}*

// ⏰ Valid for *${expiryMinutes} minutes*
// 🔒 Keep this code confidential

// _If you didn't request this code, please ignore this message._

// ---
// ServiceConnect - Your Trusted Service Partner
// Need help? Contact support`;
// };

// /**
//  * Format SMS OTP message (shorter for SMS character limits)
//  * @param {string} otpCode - OTP code
//  * @param {number} expiryMinutes - OTP expiry time in minutes
//  * @returns {string} Formatted SMS message
//  */
// const formatSMSOTPMessage = (otpCode, expiryMinutes = 10) => {
//   return `ServiceConnect: Your verification code is ${otpCode}. Valid for ${expiryMinutes} minutes. Don't share this code.`;
// };

// /**
//  * Send WhatsApp message using Twilio with professional template
//  * @param {string} phoneNumber - Recipient phone number (with country code)
//  * @param {string} message - WhatsApp message
//  * @param {boolean} isOTP - Whether this is an OTP message (will format accordingly)
//  * @param {string} otpCode - OTP code (if isOTP is true)
//  * @returns {Promise<boolean>} Success status
//  */
// export const sendWhatsAppMessage = async (phoneNumber, message, isOTP = false, otpCode = null) => {
//   try {
//     // Format phone number for WhatsApp
//     const whatsappTo = phoneNumber.startsWith('whatsapp:') 
//       ? phoneNumber 
//       : `whatsapp:${phoneNumber}`;

//     // Use professional template for OTP messages
//     const finalMessage = (isOTP && otpCode) 
//       ? formatWhatsAppOTPMessage(otpCode) 
//       : message;

//     console.log('📱 Sending WhatsApp message via Twilio...');
//     console.log(`   To: ${whatsappTo}`);
//     console.log(`   Message Type: ${isOTP ? 'OTP' : 'General'}`);

//     const response = await twilioClient.messages.create({
//       body: finalMessage,
//       from: TWILIO_WHATSAPP_NUMBER,
//       to: whatsappTo
//     });

//     console.log('✅ Twilio WhatsApp message sent successfully!');
//     console.log(`   Message SID: ${response.sid}`);
//     console.log(`   Status: ${response.status}`);
    
//     return true;
//   } catch (error) {
//     console.error('❌ Twilio WhatsApp Error:', error.message);
//     if (error.code) {
//       console.error(`   Error Code: ${error.code}`);
//     }
//     if (error.moreInfo) {
//       console.error(`   More Info: ${error.moreInfo}`);
//     }
//     return false;
//   }
// };

// /**
//  * Send both SMS and WhatsApp message
//  * @param {string} phoneNumber - Recipient phone number
//  * @param {string} message - Message content
//  * @returns {Promise<Object>} Status of both sends
//  */
// export const sendBothSMSAndWhatsApp = async (phoneNumber, message) => {
//   console.log('\n🚀 Sending via both SMS and WhatsApp...');
  
//   const results = await Promise.allSettled([
//     sendTwilioSMS(phoneNumber, message),
//     sendWhatsAppMessage(phoneNumber, message)
//   ]);

//   return {
//     sms: results[0].status === 'fulfilled' ? results[0].value : false,
//     whatsapp: results[1].status === 'fulfilled' ? results[1].value : false
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
//   return true;
// };

// /**
//  * Main SMS sending function with retry logic
//  * @param {string} phoneNumber - Recipient phone number
//  * @param {string} message - Message content
//  * @param {Object} options - Additional options
//  * @param {boolean} options.sendWhatsApp - Also send via WhatsApp
//  * @param {boolean} options.preferWhatsApp - Prefer WhatsApp over SMS
//  * @param {number} retryCount - Current retry attempt
//  * @returns {Promise<boolean>} Success status
//  */
// export const sendSMS = async (phoneNumber, message, options = {}, retryCount = 0) => {
//   if (!phoneNumber || !message) {
//     console.error('❌ Phone number and message are required');
//     return false;
//   }

//   // Format phone number (ensure it starts with +)
//   const formattedPhoneNumber = phoneNumber.startsWith('+')
//     ? phoneNumber
//     : `+${phoneNumber}`;

//   console.log(`\n🚀 Attempting to send message to ${formattedPhoneNumber}`);
//   console.log(`   Message length: ${message.length} characters`);

//   try {
//     const { sendWhatsApp = false, preferWhatsApp = false } = options;

//     // Send via both channels
//     if (sendWhatsApp) {
//       const results = await sendBothSMSAndWhatsApp(formattedPhoneNumber, message);
//       return results.sms || results.whatsapp; // Success if either works
//     }

//     // Prefer WhatsApp
//     if (preferWhatsApp) {
//       const whatsappSuccess = await sendWhatsAppMessage(formattedPhoneNumber, message);
//       if (whatsappSuccess) return true;
      
//       console.log('⚠️  WhatsApp failed, trying SMS...');
//       return await sendTwilioSMS(formattedPhoneNumber, message);
//     }

//     // Default: SMS only
//     const smsSuccess = await sendTwilioSMS(formattedPhoneNumber, message);
//     if (smsSuccess) return true;

//     // Retry with WhatsApp if SMS fails
//     if (retryCount === 0) {
//       console.log('⚠️  SMS failed, trying WhatsApp...');
//       return await sendWhatsAppMessage(formattedPhoneNumber, message);
//     }

//     console.log('⚠️  All methods failed, falling back to mock...');
//     return await sendMockMessage(formattedPhoneNumber, message, 'SMS');
    
//   } catch (err) {
//     console.error('❌ Message sending failed:', err);
//     return await sendMockMessage(formattedPhoneNumber, message, 'SMS');
//   }
// };

// /**
//  * Send WhatsApp only (convenience function)
//  */
// export const sendWhatsApp = async (phoneNumber, message) => {
//   return sendSMS(phoneNumber, message, { preferWhatsApp: true });
// };













// utils/smsUtils.js
import twilio from 'twilio';

// Twilio Configuration
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID || 'ACac7af367690b65c0';
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN || 'f4e2e997b6e88cee9121ecb7';
const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER || '+14155238886'; // Your Twilio number
const TWILIO_WHATSAPP_NUMBER = process.env.TWILIO_WHATSAPP_NUMBER || 'whatsapp:+14155238886';

// Initialize Twilio client
const twilioClient = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);

/**
 * Format WhatsApp OTP message with professional template
 * @param {string} otpCode - OTP code
 * @param {number} expiryMinutes - OTP expiry time in minutes
 * @returns {string} Formatted WhatsApp message
 */
const formatWhatsAppOTPMessage = (otpCode, expiryMinutes = 10) => {
  return `🔐 *ServiceConnect Verification*

Hello! 👋

Your verification code is:

*${otpCode}*

⏰ Valid for *${expiryMinutes} minutes*
🔒 Keep this code confidential

_If you didn't request this code, please ignore this message._

---
ServiceConnect - Your Trusted Service Partner
Need help? Contact support`;
};

/**
 * Format SMS OTP message (shorter for SMS character limits)
 * @param {string} otpCode - OTP code
 * @param {number} expiryMinutes - OTP expiry time in minutes
 * @returns {string} Formatted SMS message
 */
const formatSMSOTPMessage = (otpCode, expiryMinutes = 10) => {
  return `ServiceConnect: Your verification code is ${otpCode}. Valid for ${expiryMinutes} minutes. Don't share this code.`;
};

/**
 * Send SMS using Twilio with professional template
 * @param {string} phoneNumber - Recipient phone number (with country code)
 * @param {string} message - SMS message
 * @param {boolean} isOTP - Whether this is an OTP message
 * @param {string} otpCode - OTP code (if isOTP is true)
 * @returns {Promise<boolean>} Success status
 */
export const sendTwilioSMS = async (phoneNumber, message, isOTP = false, otpCode = null) => {
  try {
    // Use formatted template for OTP messages
    const finalMessage = (isOTP && otpCode) 
      ? formatSMSOTPMessage(otpCode) 
      : message;

    console.log('📤 Sending SMS via Twilio...');
    console.log(`   To: ${phoneNumber}`);
    console.log(`   Message Type: ${isOTP ? 'OTP' : 'General'}`);

    const response = await twilioClient.messages.create({
      body: finalMessage,
      from: TWILIO_PHONE_NUMBER,
      to: phoneNumber
    });

    console.log('✅ Twilio SMS sent successfully!');
    console.log(`   Message SID: ${response.sid}`);
    console.log(`   Status: ${response.status}`);
    
    return true;
  } catch (error) {
    console.error('❌ Twilio SMS Error:', error.message);
    if (error.code) {
      console.error(`   Error Code: ${error.code}`);
    }
    if (error.moreInfo) {
      console.error(`   More Info: ${error.moreInfo}`);
    }
    return false;
  }
};

/**
 * Send WhatsApp message using Twilio with professional template
 * @param {string} phoneNumber - Recipient phone number (with country code)
 * @param {string} message - WhatsApp message
 * @param {boolean} isOTP - Whether this is an OTP message (will format accordingly)
 * @param {string} otpCode - OTP code (if isOTP is true)
 * @returns {Promise<boolean>} Success status
 */
export const sendWhatsAppMessage = async (phoneNumber, message, isOTP = false, otpCode = null) => {
  try {
    // Format phone number for WhatsApp
    const whatsappTo = phoneNumber.startsWith('whatsapp:') 
      ? phoneNumber 
      : `whatsapp:${phoneNumber}`;

    // Use professional template for OTP messages
    const finalMessage = (isOTP && otpCode) 
      ? formatWhatsAppOTPMessage(otpCode) 
      : message;

    console.log('📱 Sending WhatsApp message via Twilio...');
    console.log(`   To: ${whatsappTo}`);
    console.log(`   Message Type: ${isOTP ? 'OTP' : 'General'}`);

    const response = await twilioClient.messages.create({
      body: finalMessage,
      from: TWILIO_WHATSAPP_NUMBER,
      to: whatsappTo
    });

    console.log('✅ Twilio WhatsApp message sent successfully!');
    console.log(`   Message SID: ${response.sid}`);
    console.log(`   Status: ${response.status}`);
    
    return true;
  } catch (error) {
    console.error('❌ Twilio WhatsApp Error:', error.message);
    if (error.code) {
      console.error(`   Error Code: ${error.code}`);
    }
    if (error.moreInfo) {
      console.error(`   More Info: ${error.moreInfo}`);
    }
    return false;
  }
};

/**
 * Send both SMS and WhatsApp message with OTP
 * @param {string} phoneNumber - Recipient phone number
 * @param {string} message - Message content (or otpCode if using templates)
 * @param {boolean} isOTP - Whether this is an OTP message
 * @param {string} otpCode - OTP code for template formatting
 * @returns {Promise<Object>} Status of both sends
 */
export const sendBothSMSAndWhatsApp = async (phoneNumber, message, isOTP = false, otpCode = null) => {
  console.log('\n🚀 Sending via both SMS and WhatsApp...');
  
  const results = await Promise.allSettled([
    sendTwilioSMS(phoneNumber, message, isOTP, otpCode),
    sendWhatsAppMessage(phoneNumber, message, isOTP, otpCode)
  ]);

  return {
    sms: results[0].status === 'fulfilled' ? results[0].value : false,
    whatsapp: results[1].status === 'fulfilled' ? results[1].value : false
  };
};

/**
 * Mock SMS/WhatsApp service for development/testing
 */
const sendMockMessage = async (phoneNumber, message, type = 'SMS') => {
  console.log(`\n📱 MOCK ${type} SERVICE`);
  console.log(`To: ${phoneNumber}`);
  console.log(`Message: ${message}`);
  console.log(`✅ Delivered (Mock Mode)\n`);
  return true;
};

/**
 * Main SMS sending function with retry logic and OTP support
 * @param {string} phoneNumber - Recipient phone number
 * @param {string} message - Message content or OTP code
 * @param {Object} options - Additional options
 * @param {boolean} options.sendWhatsApp - Also send via WhatsApp
 * @param {boolean} options.preferWhatsApp - Prefer WhatsApp over SMS
 * @param {boolean} options.isOTP - Whether this is an OTP message (enables template)
 * @param {string} options.otpCode - OTP code for template formatting
 * @param {number} retryCount - Current retry attempt
 * @returns {Promise<boolean>} Success status
 */
export const sendSMS = async (phoneNumber, message, options = {}, retryCount = 0) => {
  if (!phoneNumber || !message) {
    console.error('❌ Phone number and message are required');
    return false;
  }

  // Format phone number (ensure it starts with +)
  const formattedPhoneNumber = phoneNumber.startsWith('+')
    ? phoneNumber
    : `+${phoneNumber}`;

  console.log(`\n🚀 Attempting to send message to ${formattedPhoneNumber}`);
  console.log(`   Message type: ${options.isOTP ? 'OTP' : 'Standard'}`);

  try {
    const { 
      sendWhatsApp = false, 
      preferWhatsApp = false,
      isOTP = false,
      otpCode = null 
    } = options;

    // Send via both channels
    if (sendWhatsApp) {
      const results = await sendBothSMSAndWhatsApp(
        formattedPhoneNumber, 
        message, 
        isOTP, 
        otpCode || message
      );
      return results.sms || results.whatsapp; // Success if either works
    }

    // Prefer WhatsApp
    if (preferWhatsApp) {
      const whatsappSuccess = await sendWhatsAppMessage(
        formattedPhoneNumber, 
        message, 
        isOTP, 
        otpCode || message
      );
      if (whatsappSuccess) return true;
      
      console.log('⚠️  WhatsApp failed, trying SMS...');
      return await sendTwilioSMS(
        formattedPhoneNumber, 
        message, 
        isOTP, 
        otpCode || message
      );
    }

    // Default: SMS only
    const smsSuccess = await sendTwilioSMS(
      formattedPhoneNumber, 
      message, 
      isOTP, 
      otpCode || message
    );
    if (smsSuccess) return true;

    // Retry with WhatsApp if SMS fails
    if (retryCount === 0) {
      console.log('⚠️  SMS failed, trying WhatsApp...');
      return await sendWhatsAppMessage(
        formattedPhoneNumber, 
        message, 
        isOTP, 
        otpCode || message
      );
    }

    console.log('⚠️  All methods failed, falling back to mock...');
    return await sendMockMessage(formattedPhoneNumber, message, 'SMS');
    
  } catch (err) {
    console.error('❌ Message sending failed:', err);
    return await sendMockMessage(formattedPhoneNumber, message, 'SMS');
  }
};

/**
 * Send WhatsApp only with OTP template (convenience function)
 */
export const sendWhatsApp = async (phoneNumber, message, isOTP = false, otpCode = null) => {
  return sendSMS(phoneNumber, message, { 
    preferWhatsApp: true, 
    isOTP, 
    otpCode: otpCode || message 
  });
};

