// utils/smsUtils.js - SMS service with Fast2SMS and Mock mode
import axios from 'axios';

/**
 * Send SMS using Fast2SMS
 * @param {string} phoneNumber - Recipient phone number
 * @param {string} message - SMS message
 * @returns {Promise<boolean>} Success status
 */
export const sendFast2SMS = async (phoneNumber, message) => {
    try {
        if (!process.env.FAST2SMS_API_KEY) {
            console.log('❌ FAST2SMS_API_KEY not configured');
            return false;
        }

        // Clean phone number (remove +91 if present, keep only 10 digits)
        const cleanedPhone = phoneNumber.replace(/^\+91/, '').replace(/\D/g, '');
        
        if (cleanedPhone.length !== 10) {
            console.log('❌ Invalid phone number format. Must be 10 digits.');
            return false;
        }

        console.log('📤 Sending SMS via Fast2SMS...');
        console.log(`   To: +91${cleanedPhone}`);
        console.log(`   Message: ${message.substring(0, 50)}${message.length > 50 ? '...' : ''}`);

        // Fast2SMS API call
        const response = await axios.post(
            'https://www.fast2sms.com/dev/bulkV2',
            null,
            {
                params: {
                    authorization: 'bwhuRi1LpgBMpcdxkCXXmLYANI32LYSwwK5O9HyEYxKtbbn4JbnSl86NU7wZ',
                    message: message,
                    route: process.env.FAST2SMS_ROUTE || 'v3',
                    numbers: cleanedPhone,
                    flash: 0
                },
                timeout: 10000
            }
        );

        if (response.data && response.data.return === true) {
            console.log(`✅ Fast2SMS: SMS sent successfully!`);
            console.log(`   Request ID: ${response.data.request_id || 'N/A'}`);
            console.log(`   Message: ${response.data.message || 'Success'}`);
            return true;
        } else {
            console.log(`❌ Fast2SMS: Failed to send SMS`);
            console.log(`   Message: ${response.data?.message || 'Unknown error'}`);
            return false;
        }

    } catch (error) {
        console.error('❌ Fast2SMS Error:', error.message);
        
        if (error.response) {
            console.error('💡 API Response Error:');
            console.error(`   Status: ${error.response.status}`);
            
            if (error.response.status === 401) {
                console.error('💡 Authentication failed - Check your FAST2SMS_API_KEY');
            } else if (error.response.status === 400) {
                console.error('💡 Bad request - Check phone number format and message content');
            } else if (error.response.data?.message) {
                console.error(`💡 ${error.response.data.message}`);
            }
        } else if (error.request) {
            console.error('💡 No response received from Fast2SMS. Check your internet connection.');
        }
        
        return false;
    }
};

/**
 * Mock SMS service for development/testing
 * @param {string} phoneNumber - Recipient phone number
 * @param {string} message - SMS message
 * @returns {Promise<boolean>} Success status
 */
const sendMockSMS = async (phoneNumber, message) => {
    console.log('\n╔════════════════════════════════════════╗');
    console.log('║      📱 MOCK SMS SERVICE               ║');
    console.log('╠════════════════════════════════════════╣');
    console.log(`║ To: ${phoneNumber.padEnd(31)} ║`);
    console.log(`║ Message: ${message.substring(0, 28).padEnd(28)} ║`);
    if (message.length > 28) {
        console.log(`║          ${message.substring(28, 56).padEnd(28)} ║`);
    }
    console.log('╠════════════════════════════════════════╣');
    console.log('║ Status: ✅ Delivered (Mock Mode)      ║');
    console.log('╚════════════════════════════════════════╝\n');
    
    // In development, always return true to allow testing
    return true;
};

/**
 * Main SMS sending function with Fast2SMS or Mock fallback
 * @param {string} phoneNumber - Recipient phone number
 * @param {string} message - SMS message
 * @returns {Promise<boolean>} Success status
 */
export const sendSMS = async (phoneNumber, message) => {
    // Validate inputs
    if (!phoneNumber || !message) {
        console.error('❌ Phone number and message are required for SMS');
        return false;
    }

    // Format phone number (ensure it starts with +)
    const formattedPhoneNumber = phoneNumber.startsWith('+')
        ? phoneNumber
        : `+${phoneNumber}`;

    console.log(`\n🚀 Attempting to send SMS to ${formattedPhoneNumber}`);
    
    // Debug: Log environment variable status
    console.log('🔍 Environment Check:');
    console.log('   FAST2SMS_API_KEY:', process.env.FAST2SMS_API_KEY ? `✅ (${process.env.FAST2SMS_API_KEY.substring(0, 10)}...)` : '❌ Not set');
    console.log('   FAST2SMS_ROUTE:', process.env.FAST2SMS_ROUTE || 'v3 (default)');
    console.log('   NODE_ENV:', process.env.NODE_ENV || 'not set');

    try {
        // Try Fast2SMS first (if configured)
        if (process.env.FAST2SMS_API_KEY) {
            console.log('📍 Trying Fast2SMS...');
            const success = await sendFast2SMS(formattedPhoneNumber, message);
            if (success) return true;
            console.log('⚠️  Fast2SMS failed, falling back to mock...');
        } else {
            console.log('⚠️  Fast2SMS not configured, skipping to mock...');
        }

        // Fallback to mock service in development or when Fast2SMS fails
        if (process.env.NODE_ENV === 'development' || process.env.ENABLE_MOCK_SMS === 'true') {
            console.log('📍 Using mock SMS service...');
            return await sendMockSMS(formattedPhoneNumber, message);
        }

        console.error('❌ Fast2SMS failed and mock SMS is not enabled');
        return false;
    } catch (error) {
        console.error('❌ SMS sending failed with error:', error);
        
        // Last resort: use mock in development
        if (process.env.NODE_ENV === 'development') {
            console.log('⚠️  Error occurred, falling back to mock SMS...');
            return await sendMockSMS(formattedPhoneNumber, message);
        }
        
        return false;
    }
};

/**
 * Format phone number for display
 * @param {string} phoneNumber - Phone number to format
 * @returns {string} Formatted phone number
 */
export const formatPhoneNumber = (phoneNumber) => {
    if (!phoneNumber) return '';

    // Remove all non-digit characters except +
    const cleaned = phoneNumber.replace(/[^\d+]/g, '');

    // Basic formatting for common patterns
    if (cleaned.startsWith('+1')) {
        // US/Canada format: +1 (555) 123-4567
        const number = cleaned.substring(2);
        if (number.length === 10) {
            return `+1 (${number.substring(0, 3)}) ${number.substring(3, 6)}-${number.substring(6)}`;
        }
    } else if (cleaned.startsWith('+91')) {
        // India format: +91 63065 39815
        const number = cleaned.substring(3);
        if (number.length === 10) {
            return `+91 ${number.substring(0, 5)} ${number.substring(5)}`;
        }
    }

    return cleaned;
};

/**
 * Verify SMS configuration on startup
 * Call this function when your app starts to check SMS setup
 */
export const verifySMSConfiguration = () => {
    console.log('\n╔════════════════════════════════════════╗');
    console.log('║     📱 SMS Configuration Check         ║');
    console.log('╠════════════════════════════════════════╣');
    
    // Check Fast2SMS
    if (process.env.FAST2SMS_API_KEY) {
        console.log('║ ✅ Fast2SMS: Configured                ║');
        console.log(`║    API Key: ${process.env.FAST2SMS_API_KEY.substring(0, 10).padEnd(24)}║`);
        console.log(`║    Route: ${(process.env.FAST2SMS_ROUTE || 'v3').padEnd(28)}║`);
    } else {
        console.log('║ ⚪ Fast2SMS: Not configured            ║');
        console.log('║    Missing: FAST2SMS_API_KEY           ║');
    }
    
    // Check Mock mode
    if (process.env.NODE_ENV === 'development' || process.env.ENABLE_MOCK_SMS === 'true') {
        console.log('║ 🧪 Mock SMS: Enabled (Fallback)        ║');
    }
    
    console.log('╠════════════════════════════════════════╣');
    
    if (process.env.FAST2SMS_API_KEY) {
        console.log('║ ✅ Ready to send SMS via Fast2SMS      ║');
    } else if (process.env.NODE_ENV === 'development' || process.env.ENABLE_MOCK_SMS === 'true') {
        console.log('║ 🧪 Mock mode active - No real SMS     ║');
    } else {
        console.log('║ ⚠️  WARNING: No SMS provider configured║');
        console.log('║    SMS sending will fail!              ║');
    }
    
    console.log('╚════════════════════════════════════════╝\n');
};