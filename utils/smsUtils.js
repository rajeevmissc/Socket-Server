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
    const apiKey ='CYu1pIHdqgBU3EikbHDBgkxHLRb7zT1ES2jnNqtIeJMxAjzxpGqVtfK3QwZb';

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
    console.log(`   API Key: ${apiKey.substring(0, 10)}...`);

    // Use URLSearchParams for form data
    const formData = new URLSearchParams();
    formData.append('sender_id', 'TXTIND'); // Add sender ID
    formData.append('message', message);
    formData.append('route', 'v3'); // Try v3 route instead of q
    formData.append('numbers', cleanedPhone);
    formData.append('language', 'english'); // Add language parameter

    const response = await axios.post(
      'https://www.fast2sms.com/dev/bulkV2',
      formData,
      {
        headers: {
          'Authorization': apiKey,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        timeout: 15000,
      }
    );

    console.log('📨 Fast2SMS Response:', JSON.stringify(response.data, null, 2));

    // Check response based on Fast2SMS documentation
    if (response.data && response.data.return === true) {
      console.log('✅ Fast2SMS: SMS sent successfully!');
      console.log(`   Request ID: ${response.data.request_id}`);
      return true;
    } else {
      console.log('❌ Fast2SMS: Failed to send SMS');
      console.log('   Error:', response.data.message || 'Unknown error');
      return false;
    }

  } catch (error) {
    console.error('❌ Fast2SMS Error:', error.message);
    if (error.response) {
      console.error('💡 API Response Error:', JSON.stringify(error.response.data, null, 2));
      console.error('💡 Status Code:', error.response.status);
    } else if (error.request) {
      console.error('💡 No response received:', error.request);
    }
    return false;
  }
};

/**
 * Alternative Fast2SMS implementation matching your curl command exactly
 */
export const sendFast2SMSAlternative = async (phoneNumber, message) => {
  try {
    const apiKey = process.env.FAST2SMS_API_KEY || 'CYu1pIHdqgBU3EikbHDBgkxHLRb7zT1ES2jnNqtIeJMxAjzxpGqVtfK3QwZb';

    // Clean phone number
    const cleanedPhone = phoneNumber.replace(/^\+91/, '').replace(/\D/g, '');
    if (cleanedPhone.length !== 10) {
      console.log('❌ Invalid phone number format. Must be 10 digits.');
      return false;
    }

    console.log('📤 Sending SMS via Fast2SMS (Alternative)...');
    console.log(`   To: +91${cleanedPhone}`);
    console.log(`   Message: ${message}`);

    // Use exact parameters from your working curl command
    const formData = new URLSearchParams();
    formData.append('message', message);
    formData.append('route', 'q'); // Use 'q' route as in your curl
    formData.append('numbers', cleanedPhone);

    const response = await axios.post(
      'https://www.fast2sms.com/dev/bulkV2',
      formData,
      {
        headers: {
          'authorization': apiKey, // lowercase as in curl
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        timeout: 15000,
      }
    );

    console.log('📨 Fast2SMS Alternative Response:', JSON.stringify(response.data, null, 2));

    if (response.data && response.data.return === true) {
      console.log('✅ Fast2SMS: SMS sent successfully!');
      return true;
    } else {
      console.log('❌ Fast2SMS: Failed to send SMS');
      return false;
    }

  } catch (error) {
    console.error('❌ Fast2SMS Alternative Error:', error.message);
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
 * Main SMS sending function with retry logic
 */
export const sendSMS = async (phoneNumber, message, retryCount = 0) => {
  if (!phoneNumber || !message) {
    console.error('❌ Phone number and message are required for SMS');
    return false;
  }

  const formattedPhoneNumber = phoneNumber.startsWith('+')
    ? phoneNumber
    : `+${phoneNumber}`;

  console.log(`\n🚀 Attempting to send SMS to ${formattedPhoneNumber}`);
  console.log(`   Message length: ${message.length} characters`);

  try {
    // Try alternative method first (matches your curl command)
    let success = await sendFast2SMSAlternative(formattedPhoneNumber, message);
    
    // If alternative fails, try main method
    if (!success && retryCount === 0) {
      console.log('⚠️  Alternative method failed, trying main method...');
      success = await sendFast2SMS(formattedPhoneNumber, message);
    }

    if (success) {
      return true;
    }

    console.log('⚠️  Both Fast2SMS methods failed, falling back to mock...');
    return await sendMockSMS(formattedPhoneNumber, message);
    
  } catch (err) {
    console.error('❌ SMS sending failed:', err);
    return await sendMockSMS(formattedPhoneNumber, message);
  }
};

