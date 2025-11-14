import express from 'express';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { createRequire } from 'module';
import User from '../models/Users.js';

const require = createRequire(import.meta.url);
const { RtcTokenBuilder, RtmTokenBuilder, RtcRole, RtmRole } = require('agora-access-token');

const router = express.Router();

// Generate both RTC and RTM tokens in one call
const generateCallTokens = async (req, res, next) => {
  try {
    const { channel } = req.query;
    
    if (!channel) {
      return res.status(400).json({ 
        error: 'Channel name is required', 
        status: 'error' 
      });
    }

    // Validate channel name format
    if (!/^[a-zA-Z0-9_-]+$/.test(channel)) {
      return res.status(400).json({ 
        error: 'Invalid channel name format. Use only alphanumeric characters, hyphens, and underscores.', 
        status: 'error' 
      });
    }

    const appID = process.env.AGORA_APP_ID;
    const appCertificate = process.env.AGORA_APP_CERT;
    
    if (!appID || !appCertificate) {
      console.error('Agora configuration missing:', { 
        hasAppID: !!appID, 
        hasCert: !!appCertificate 
      });
      return res.status(500).json({ 
        error: 'Server configuration error. Please contact support.', 
        status: 'error' 
      });
    }

    // Token validity: 24 hours
    const expirationTimeInSeconds = 3600 * 24;
    const currentTimestamp = Math.floor(Date.now() / 1000);
    const privilegeExpiredTs = currentTimestamp + expirationTimeInSeconds;

    // Use MongoDB _id as string for UID
    const uid = req.user._id.toString();

    try {
      // Generate RTC Token (for voice/video)
      const rtcToken = RtcTokenBuilder.buildTokenWithUid(
        appID, 
        appCertificate, 
        channel, 
        uid, 
        RtcRole.PUBLISHER, 
        privilegeExpiredTs
      );

      // Generate RTM Token (for messaging/chat)
      const rtmToken = RtmTokenBuilder.buildToken(
        appID, 
        appCertificate, 
        uid, 
        RtmRole.Rtm_User, 
        privilegeExpiredTs
      );

      // Store tokens in User document for reference
      try {
        await User.findByIdAndUpdate(
          req.user._id, 
          { 
            $set: { 
              rtcToken: rtcToken,
              rtmToken: rtmToken,
              rtcChannel: channel,
              rtcUid: uid,
              rtmUid: uid,
              lastTokenGenerated: new Date(),
              tokenExpiresAt: new Date(privilegeExpiredTs * 1000)
            } 
          },
          { new: true }
        );
      } catch (dbError) {
        // Log but don't fail if database update fails
        console.warn('Failed to update user tokens in database:', dbError.message);
      }

      // Return tokens to client
      res.status(200).json({ 
        rtcToken,
        rtmToken,
        channel,
        uid,
        appId: appID, // Frontend needs this
        status: 'success',
        expiresAt: privilegeExpiredTs,
        expiresAtReadable: new Date(privilegeExpiredTs * 1000).toISOString()
      });

    } catch (tokenError) {
      console.error('Token generation error:', tokenError);
      return res.status(500).json({ 
        error: 'Failed to generate authentication tokens', 
        status: 'error',
        details: process.env.NODE_ENV === 'development' ? tokenError.message : undefined
      });
    }

  } catch (error) {
    console.error('Call tokens error:', error);
    next(error);
  }
};

// Get current user's active tokens (optional endpoint)
const getActiveTokens = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select('rtcToken rtmToken rtcChannel rtcUid tokenExpiresAt');
    
    if (!user) {
      return res.status(404).json({ 
        error: 'User not found', 
        status: 'error' 
      });
    }

    // Check if tokens are expired
    const isExpired = user.tokenExpiresAt && new Date() > user.tokenExpiresAt;

    res.status(200).json({
      status: 'success',
      hasTokens: !!(user.rtcToken && user.rtmToken),
      isExpired,
      channel: user.rtcChannel,
      uid: user.rtcUid,
      expiresAt: user.tokenExpiresAt,
      tokens: isExpired ? null : {
        rtc: user.rtcToken,
        rtm: user.rtmToken
      }
    });

  } catch (error) {
    console.error('Get active tokens error:', error);
    next(error);
  }
};

// Revoke user's tokens (for security)
const revokeTokens = async (req, res, next) => {
  try {
    await User.findByIdAndUpdate(
      req.user._id,
      {
        $unset: {
          rtcToken: '',
          rtmToken: '',
          rtcChannel: '',
          rtcUid: '',
          rtmUid: '',
          tokenExpiresAt: ''
        }
      }
    );

    res.status(200).json({
      status: 'success',
      message: 'Tokens revoked successfully'
    });

  } catch (error) {
    console.error('Revoke tokens error:', error);
    next(error);
  }
};

// Routes
router.get('/call-tokens', authenticateToken, generateCallTokens);
router.get('/active-tokens', authenticateToken, getActiveTokens);
router.post('/revoke-tokens', authenticateToken, revokeTokens);

// Health check for Agora configuration
router.get('/health', (req, res) => {
  const hasConfig = !!(process.env.AGORA_APP_ID && process.env.AGORA_APP_CERT);
  
  res.status(hasConfig ? 200 : 503).json({
    status: hasConfig ? 'healthy' : 'misconfigured',
    agoraConfigured: hasConfig,
    timestamp: new Date().toISOString()
  });
});

export default router;
