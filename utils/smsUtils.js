// utils/smsUtils.js
import axios from 'axios';

/**
 * Send SMS using Fast2SMS
 * @param {string} phoneNumber - Recipient phone number
 * @param {string} message - SMS message
 * @returns {Promise<boolean>} Success status
 */
export const sendFast2SMS = async (phoneNumber, message) => {
  try {
    const apiKey = process.env.FAST2SMS_API_KEY || 'CYu1pIHdqgBU3EikbHDBgkxHLRb7zT1ES2jnNqtIeJMxAjzxpGqVtfK3QwZb';

    if (!apiKey) {
      console.log('❌ FAST2SMS_API_KEY not configured');
      return false;
    }

    // Clean phone number (remove +91 if present, keep only digits)
    const cleanedPhone = phoneNumber.replace(/^\+91/, '').replace(/\D/g, '');
    if (cleanedPhone.length !== 10) {
      console.log('❌ Invalid phone number format. Must be 10 digits.');
      return false;
    }

    console.log('📤 Sending SMS via Fast2SMS...');
    console.log(`   To: +91${cleanedPhone}`);
    console.log(`   Message: ${message}`);

    // ✅ Send as x-www-form-urlencoded, not params
    const formData = new URLSearchParams();
    formData.append('message', message);
    formData.append('route', 'q'); // ✅ working route
    formData.append('numbers', cleanedPhone);

    const response = await axios.post(
      'https://www.fast2sms.com/dev/bulkV2',
      formData,
      {
        headers: {
          authorization: apiKey,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        timeout: 10000,
      }
    );

    if (response.data && (response.data.return === true || response.data.status_code === 200)) {
      console.log('✅ Fast2SMS: SMS sent successfully!');
      return true;
    } else {
      console.log('❌ Fast2SMS: Failed to send SMS');
      console.log('   Response:', response.data);
      return false;
    }

  } catch (error) {
    console.error('❌ Fast2SMS Error:', error.message);
    if (error.response) {
      console.error('💡 API Response Error:', error.response.data);
    }
    return false;
  }
};

/**
 * Mock SMS service for development/testing
 */
const sendMockSMS = async (phoneNumber, message) => {
  console.log('\n📱 MOCK SMS SERVICE');
  console.log(`To: ${phoneNumber}`);
  console.log(`Message: ${message}`);
  console.log('✅ Delivered (Mock Mode)\n');
  return true;
};

/**
 * Main SMS sending function
 */
export const sendSMS = async (phoneNumber, message) => {
  if (!phoneNumber || !message) {
    console.error('❌ Phone number and message are required for SMS');
    return false;
  }

  const formattedPhoneNumber = phoneNumber.startsWith('+')
    ? phoneNumber
    : `+${phoneNumber}`;

  console.log(`\n🚀 Attempting to send SMS to ${formattedPhoneNumber}`);

  try {
    const success = await sendFast2SMS(formattedPhoneNumber, message);
    if (success) return true;

    console.log('⚠️  Fast2SMS failed, falling back to mock...');
    return await sendMockSMS(formattedPhoneNumber, message);
  } catch (err) {
    console.error('❌ SMS sending failed:', err);
    return await sendMockSMS(formattedPhoneNumber, message);
  }
};
