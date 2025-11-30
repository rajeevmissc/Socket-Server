// // middleware/wallet.middleware.js
// import { Wallet } from '../models/wallet.model.js';
// import { resetLimitsIfNeeded, validateSpendingLimits } from '../utils/limits.util.js';

// export const ensureWallet = async (req, res, next) => {
//   try {
//     if (!req.user || !req.user._id) {
//       return res.status(401).json({
//         success: false,
//         error: 'Authentication required'
//       });
//     }

//     let wallet = await Wallet.findOne({ userId: req.user._id });
    
//     if (!wallet) {
//       wallet = new Wallet({
//         userId: req.user._id,
//         balance: 0,
//         currency: 'INR',
//         dailyLimit: 50000,
//         monthlyLimit: 200000,
//         isActive: true
//       });
      
//       await wallet.save();
//     }
    
//     await resetLimitsIfNeeded(wallet);
//     req.wallet = wallet;
//     next();
    
//   } catch (error) {
//     console.error('Error in ensureWallet middleware:', error);
//     res.status(500).json({
//       success: false,
//       error: 'Failed to initialize wallet',
//       details: process.env.NODE_ENV === 'development' ? error.message : undefined
//     });
//   }
// };

// export const checkWalletStatus = (req, res, next) => {
//   try {
//     if (!req.wallet) {
//       return res.status(500).json({
//         success: false,
//         error: 'Wallet not initialized'
//       });
//     }

//     if (!req.wallet.isActive) {
//       return res.status(403).json({
//         success: false,
//         error: 'Wallet is currently inactive',
//         code: 'WALLET_INACTIVE'
//       });
//     }

//     if (req.wallet.isBlocked) {
//       return res.status(403).json({
//         success: false,
//         error: 'Wallet is currently blocked',
//         code: 'WALLET_BLOCKED',
//         reason: req.wallet.blockedReason,
//         blockedAt: req.wallet.blockedAt
//       });
//     }

//     next();
//   } catch (error) {
//     console.error('Error in checkWalletStatus middleware:', error);
//     res.status(500).json({
//       success: false,
//       error: 'Failed to check wallet status'
//     });
//   }
// };

// export const validateSpending = (req, res, next) => {
//   try {
//     const { amount } = req.body;

//     if (!amount || typeof amount !== 'number' || amount <= 0) {
//       return res.status(400).json({
//         success: false,
//         error: 'Invalid amount specified',
//         code: 'INVALID_AMOUNT'
//       });
//     }

//     const validation = validateSpendingLimits(req.wallet, amount);
    
//     if (!validation.isValid) {
//       return res.status(400).json({
//         success: false,
//         error: 'Spending validation failed',
//         code: 'SPENDING_LIMIT_EXCEEDED',
//         details: validation.errors,
//         maxSpendableAmount: validation.maxSpendableAmount
//       });
//     }

//     req.spendingValidation = validation;
//     next();
    
//   } catch (error) {
//     console.error('Error in validateSpending middleware:', error);
//     res.status(500).json({
//       success: false,
//       error: 'Failed to validate spending limits'
//     });
//   }
// };

// export const checkMinimumBalance = (minBalance = 0) => {
//   return (req, res, next) => {
//     try {
//       if (!req.wallet) {
//         return res.status(500).json({
//           success: false,
//           error: 'Wallet not initialized'
//         });
//       }

//       if (req.wallet.balance < minBalance) {
//         return res.status(400).json({
//           success: false,
//           error: `Minimum balance of ₹${minBalance} required`,
//           code: 'MINIMUM_BALANCE_REQUIRED',
//           currentBalance: req.wallet.balance,
//           requiredBalance: minBalance
//         });
//       }

//       next();
//     } catch (error) {
//       console.error('Error in checkMinimumBalance middleware:', error);
//       res.status(500).json({
//         success: false,
//         error: 'Failed to check minimum balance'
//       });
//     }
//   };
// };

// export const logWalletOperation = (operation) => {
//   return (req, res, next) => {
//     req.walletOperation = {
//       operation,
//       userId: req.user?._id,
//       walletId: req.wallet?._id,
//       timestamp: new Date(),
//       ipAddress: req.ip,
//       userAgent: req.get('User-Agent'),
//       requestBody: { ...req.body }
//     };

//     if (req.walletOperation.requestBody.password) {
//       delete req.walletOperation.requestBody.password;
//     }
//     if (req.walletOperation.requestBody.pin) {
//       delete req.walletOperation.requestBody.pin;
//     }

//     next();
//   };
// };

// export const validateTransactionLimits = (limits = {}) => {
//   const { min = 1, max = 50000 } = limits;
  
//   return (req, res, next) => {
//     try {
//       const { amount } = req.body;

//       if (!amount || typeof amount !== 'number') {
//         return res.status(400).json({
//           success: false,
//           error: 'Amount is required and must be a number',
//           code: 'INVALID_AMOUNT'
//         });
//       }

//       if (amount/100 < min) {
//         return res.status(400).json({
//           success: false,
//           error: `Minimum transaction amount is ₹${min}`,
//           code: 'AMOUNT_TOO_LOW',
//           minAmount: min
//         });
//       }

//       if (amount/100 > max) {
//         return res.status(400).json({
//           success: false,
//           error: `Maximum transaction amount is ₹${max}`,
//           code: 'AMOUNT_TOO_HIGH',
//           maxAmount: max
//         });
//       }

//       next();
//     } catch (error) {
//       console.error('Error in validateTransactionLimits middleware:', error);
//       res.status(500).json({
//         success: false,
//         error: 'Failed to validate transaction limits'
//       });
//     }
//   };
// };

// export const walletRateLimit = (options = {}) => {
//   const { 
//     windowMs = 60000,
//     max = 10,
//     operation = 'wallet_operation'
//   } = options;

//   const requestCounts = new Map();

//   return (req, res, next) => {
//     try {
//       const userId = req.user._id.toString();
//       const now = Date.now();
//       const key = `${userId}:${operation}`;

//       const userRequests = requestCounts.get(key) || { count: 0, resetTime: now + windowMs };

//       if (now > userRequests.resetTime) {
//         userRequests.count = 0;
//         userRequests.resetTime = now + windowMs;
//       }

//       if (userRequests.count >= max) {
//         const resetIn = Math.ceil((userRequests.resetTime - now) / 1000);
        
//         return res.status(429).json({
//           success: false,
//           error: 'Rate limit exceeded',
//           code: 'RATE_LIMIT_EXCEEDED',
//           retryAfter: resetIn,
//           maxRequests: max,
//           windowMs: windowMs / 1000
//         });
//       }

//       userRequests.count++;
//       requestCounts.set(key, userRequests);

//       if (Math.random() < 0.01) {
//         for (const [mapKey, data] of requestCounts.entries()) {
//           if (now > data.resetTime) {
//             requestCounts.delete(mapKey);
//           }
//         }
//       }

//       next();
//     } catch (error) {
//       console.error('Error in walletRateLimit middleware:', error);
//       next();
//     }
//   };
// };

// export const validateWalletRequest = (requiredFields = [], options = {}) => {
//   return (req, res, next) => {
//     try {
//       const { 
//         allowEmpty = false, 
//         customValidator = null,
//         skipFieldValidation = false 
//       } = options;
      
//       if (customValidator) {
//         try {
//           customValidator(req);
//           return next();
//         } catch (validationError) {
//           return res.status(400).json({
//             success: false,
//             error: validationError.message,
//             code: 'VALIDATION_ERROR'
//           });
//         }
//       }

//       if (req.route?.path === '/verify' && req.method === 'POST') {
//         return validatePaymentVerificationData(req, res, next);
//       }

//       if (allowEmpty && requiredFields.length === 0) {
//         return next();
//       }

//       const errors = [];

//       requiredFields.forEach(field => {
//         if (req.body[field] === undefined || req.body[field] === null || req.body[field] === '') {
//           errors.push(`Field '${field}' is required`);
//         }
//       });

//       if (!skipFieldValidation) {
//         if (req.body.amount !== undefined) {
//           if (typeof req.body.amount !== 'number' || req.body.amount <= 0) {
//             errors.push('Amount must be a positive number');
//           }
//         }

//         if (req.body.description !== undefined) {
//           if (typeof req.body.description !== 'string' || req.body.description.trim().length === 0) {
//             errors.push('Description must be a non-empty string');
//           } else if (req.body.description.length > 255) {
//             errors.push('Description must be less than 255 characters');
//           }
//         }

//         if (req.body.serviceType !== undefined) {
//           const validServiceTypes = ['call', 'video', 'visit', 'subscription', 'other'];
//           if (!validServiceTypes.includes(req.body.serviceType)) {
//             errors.push(`Service type must be one of: ${validServiceTypes.join(', ')}`);
//           }
//         }

//         if (req.body.paymentMethod !== undefined) {
//           const validPaymentMethods = ['UPI', 'Credit Card', 'Debit Card', 'Net Banking', 'Wallet', 'Cash', 'Stripe', 'Stripe Checkout', 'Cashfree Checkout', 'Cashfree'];
//           if (typeof req.body.paymentMethod !== 'string' || req.body.paymentMethod.trim().length === 0) {
//             errors.push('Payment method must be a non-empty string');
//           } else if (!validPaymentMethods.includes(req.body.paymentMethod)) {
//             errors.push(`Payment method must be one of: ${validPaymentMethods.join(', ')}`);
//           }
//         }

//         if (req.body.currency !== undefined) {
//           const validCurrencies = ['INR', 'inr', 'USD', 'usd'];
//           if (!validCurrencies.includes(req.body.currency)) {
//             errors.push('Currency must be one of: INR, USD');
//           }
//         }

//         if (req.body.payment_method_types !== undefined) {
//           if (!Array.isArray(req.body.payment_method_types)) {
//             errors.push('payment_method_types must be an array');
//           } else {
//             const validTypes = ['card', 'upi', 'netbanking', 'wallet'];
//             const invalidTypes = req.body.payment_method_types.filter(type => !validTypes.includes(type));
//             if (invalidTypes.length > 0) {
//               errors.push(`Invalid payment method types: ${invalidTypes.join(', ')}`);
//             }
//           }
//         }
//       }

//       if (errors.length > 0) {
//         return res.status(400).json({
//           success: false,
//           error: 'Validation failed',
//           code: 'VALIDATION_ERROR',
//           details: errors
//         });
//       }

//       next();
//     } catch (error) {
//       console.error('Error in validateWalletRequest middleware:', error);
//       res.status(500).json({
//         success: false,
//         error: 'Failed to validate request'
//       });
//     }
//   };
// };

// const validatePaymentVerificationData = (req, res, next) => {
//   const { 
//     razorpay_payment_id, 
//     razorpay_order_id, 
//     razorpay_signature,
//     payment_intent_id,
//     payment_intent_client_secret,
//     session_id
//   } = req.body;

//   if (razorpay_payment_id && razorpay_order_id && razorpay_signature) {
//     if (typeof razorpay_payment_id !== 'string' || !razorpay_payment_id.startsWith('pay_')) {
//       return res.status(400).json({
//         success: false,
//         error: 'Invalid Razorpay payment ID format',
//         code: 'VALIDATION_ERROR'
//       });
//     }

//     if (typeof razorpay_order_id !== 'string' || !razorpay_order_id.startsWith('order_')) {
//       return res.status(400).json({
//         success: false,
//         error: 'Invalid Razorpay order ID format',
//         code: 'VALIDATION_ERROR'
//       });
//     }

//     if (typeof razorpay_signature !== 'string' || razorpay_signature.length < 10) {
//       return res.status(400).json({
//         success: false,
//         error: 'Invalid Razorpay signature format',
//         code: 'VALIDATION_ERROR'
//       });
//     }

//     req.paymentGateway = 'razorpay';
//     return next();
//   }
  
//   if (payment_intent_id) {
//     if (typeof payment_intent_id !== 'string' || !payment_intent_id.startsWith('pi_')) {
//       return res.status(400).json({
//         success: false,
//         error: 'Invalid Stripe Payment Intent ID format',
//         code: 'VALIDATION_ERROR'
//       });
//     }

//     req.paymentGateway = 'stripe_intent';
//     return next();
//   }

//   if (session_id) {
//     if (typeof session_id !== 'string' || !session_id.startsWith('cs_')) {
//       return res.status(400).json({
//         success: false,
//         error: 'Invalid Stripe Session ID format',
//         code: 'VALIDATION_ERROR'
//       });
//     }

//     req.paymentGateway = 'stripe_session';
//     return next();
//   }

//   return res.status(400).json({
//     success: false,
//     error: 'Invalid payment verification data',
//     code: 'VALIDATION_ERROR'
//   });
// };

// export const trackWalletRequest = (req, res, next) => {
//   const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
//   req.requestId = requestId;
//   req.requestStartTime = Date.now();

//   const originalJson = res.json;
//   res.json = function(data) {
//     if (!data.success && data.error) {
//       console.log(`[${requestId}] Error: ${data.error}`);
//     }
    
//     return originalJson.call(this, data);
//   };

//   next();
// };

// export const walletErrorHandler = (error, req, res, next) => {
//   console.error('Wallet operation error:', {
//     requestId: req.requestId,
//     userId: req.user?._id,
//     error: error.message,
//     stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
//   });

//   if (error.name === 'ValidationError') {
//     return res.status(400).json({
//       success: false,
//       error: 'Validation error',
//       code: 'VALIDATION_ERROR',
//       details: Object.values(error.errors).map(err => err.message)
//     });
//   }

//   if (error.name === 'MongoError' && error.code === 11000) {
//     return res.status(409).json({
//       success: false,
//       error: 'Duplicate entry',
//       code: 'DUPLICATE_ENTRY'
//     });
//   }

//   if (error.name === 'CastError') {
//     return res.status(400).json({
//       success: false,
//       error: 'Invalid ID format',
//       code: 'INVALID_ID'
//     });
//   }

//   if (error.type && error.type.startsWith('Stripe')) {
//     return res.status(400).json({
//       success: false,
//       error: 'Payment gateway error',
//       code: 'PAYMENT_GATEWAY_ERROR',
//       details: process.env.NODE_ENV === 'development' ? error.message : undefined
//     });
//   }

//   res.status(500).json({
//     success: false,
//     error: 'Internal server error',
//     code: 'INTERNAL_ERROR',
//     requestId: req.requestId
//   });
// };

// // middleware/wallet.middleware.js (continued - checkWalletOwnership function)
// export const checkWalletOwnership = async (req, res, next) => {
//   try {
//     const { walletId } = req.params;
    
//     if (!walletId) {
//       return res.status(400).json({
//         success: false,
//         error: 'Wallet ID is required'
//       });
//     }

//     const wallet = await Wallet.findById(walletId);
    
//     if (!wallet) {
//       return res.status(404).json({
//         success: false,
//         error: 'Wallet not found',
//         code: 'WALLET_NOT_FOUND'
//       });
//     }

//     if (req.user.role !== 'admin' && wallet.userId.toString() !== req.user._id.toString()) {
//       return res.status(403).json({
//         success: false,
//         error: 'Access denied to this wallet',
//         code: 'ACCESS_DENIED'
//       });
//     }

//     req.targetWallet = wallet;
//     next();
//   } catch (error) {
//     console.error('Error in checkWalletOwnership middleware:', error);
//     res.status(500).json({
//       success: false,
//       error: 'Failed to verify wallet ownership'
//     });
//   }
// };

// export default {
//   ensureWallet,
//   checkWalletStatus,
//   validateSpending,
//   checkMinimumBalance,
//   logWalletOperation,
//   validateTransactionLimits,
//   walletRateLimit,
//   validateWalletRequest,
//   trackWalletRequest,
//   walletErrorHandler,
//   checkWalletOwnership

// };





// middleware/wallet.middleware.js
import { Wallet } from "../models/wallet.model.js";
import { resetLimitsIfNeeded, validateSpendingLimits } from "../utils/limits.util.js";

/* ------------------------------------------------------------
   1️⃣ Ensure Wallet Exists
------------------------------------------------------------ */
export const ensureWallet = async (req, res, next) => {
  try {
    if (!req.user?._id) {
      return res.status(401).json({
        success: false,
        error: "Authentication required",
      });
    }

    let wallet = await Wallet.findOne({ userId: req.user._id });

    if (!wallet) {
      wallet = await Wallet.create({
        userId: req.user._id,
        balance: 0,
        currency: "INR",
        dailyLimit: 50000,
        monthlyLimit: 200000,
        isActive: true,
      });
    }

    await resetLimitsIfNeeded(wallet);
    req.wallet = wallet;

    next();
  } catch (error) {
    console.error("Error in ensureWallet:", error);
    res.status(500).json({
      success: false,
      error: "Failed to initialize wallet",
    });
  }
};

/* ------------------------------------------------------------
   2️⃣ Check wallet active & unblock status
------------------------------------------------------------ */
export const checkWalletStatus = (req, res, next) => {
  try {
    if (!req.wallet) {
      return res.status(500).json({
        success: false,
        error: "Wallet not initialized",
      });
    }

    if (!req.wallet.isActive) {
      return res.status(403).json({
        success: false,
        error: "Wallet is inactive",
        code: "WALLET_INACTIVE",
      });
    }

    if (req.wallet.isBlocked) {
      return res.status(403).json({
        success: false,
        error: "Wallet is blocked",
        code: "WALLET_BLOCKED",
        reason: req.wallet.blockedReason,
      });
    }

    next();
  } catch (error) {
    console.error("Error in checkWalletStatus:", error);
    res.status(500).json({
      success: false,
      error: "Failed to check wallet status",
    });
  }
};

/* ------------------------------------------------------------
   3️⃣ Validate spending
------------------------------------------------------------ */
export const validateSpending = (req, res, next) => {
  try {
    const { amount } = req.body;

    if (!amount || typeof amount !== "number" || amount <= 0) {
      return res.status(400).json({
        success: false,
        error: "Invalid amount",
        code: "INVALID_AMOUNT",
      });
    }

    const validation = validateSpendingLimits(req.wallet, amount);

    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        error: "Spending limit exceeded",
        code: "SPENDING_LIMIT_EXCEEDED",
        details: validation.errors,
      });
    }

    req.spendingValidation = validation;
    next();
  } catch (error) {
    console.error("Error in validateSpending:", error);
    res.status(500).json({
      success: false,
      error: "Failed to validate spending",
    });
  }
};

/* ------------------------------------------------------------
   4️⃣ Minimum Balance Check
------------------------------------------------------------ */
export const checkMinimumBalance = (minBalance = 0) => {
  return (req, res, next) => {
    try {
      if (req.wallet.balance < minBalance) {
        return res.status(400).json({
          success: false,
          error: `Minimum balance of ₹${minBalance} required`,
        });
      }

      next();
    } catch (error) {
      console.error("Error in checkMinimumBalance:", error);
      res.status(500).json({
        success: false,
        error: "Failed to check balance",
      });
    }
  };
};

/* ------------------------------------------------------------
   5️⃣ Log wallet operations
------------------------------------------------------------ */
export const logWalletOperation = (operation) => (req, res, next) => {
  req.walletOperation = {
    operation,
    userId: req.user?._id,
    walletId: req.wallet?._id,
    timestamp: new Date(),
    ip: req.ip,
    userAgent: req.get("User-Agent"),
    body: { ...req.body },
  };

  delete req.walletOperation.body.password;
  delete req.walletOperation.body.pin;

  next();
};

/* ------------------------------------------------------------
   ❌ 6️⃣ REMOVE MIN/MAX VALIDATION COMPLETELY  
   ✔ Only check amount > 0
------------------------------------------------------------ */
export const validateTransactionLimits = () => {
  return (req, res, next) => {
    try {
      const { amount } = req.body;

      if (!amount || typeof amount !== "number" || amount <= 0) {
        return res.status(400).json({
          success: false,
          error: "Amount must be greater than 0",
          code: "INVALID_AMOUNT",
        });
      }

      next();
    } catch (error) {
      console.error("Error in validateTransactionLimits:", error);
      res.status(500).json({
        success: false,
        error: "Failed to validate amount",
      });
    }
  };
};

/* ------------------------------------------------------------
   7️⃣ Rate Limiter
------------------------------------------------------------ */
export const walletRateLimit = ({ windowMs = 60000, max = 10 } = {}) => {
  const requestCounts = new Map();

  return (req, res, next) => {
    try {
      const id = req.user._id.toString();
      const now = Date.now();

      let entry = requestCounts.get(id) || {
        count: 0,
        resetTime: now + windowMs,
      };

      if (now > entry.resetTime) {
        entry = { count: 0, resetTime: now + windowMs };
      }

      if (entry.count >= max) {
        return res.status(429).json({
          success: false,
          error: "Rate limit exceeded",
        });
      }

      entry.count++;
      requestCounts.set(id, entry);

      next();
    } catch (error) {
      console.error("Rate limit error:", error);
      next();
    }
  };
};

/* ------------------------------------------------------------
   8️⃣ Field Validation (ES6)
------------------------------------------------------------ */
export const validateWalletRequest = (requiredFields = []) => {
  return (req, res, next) => {
    try {
      const errors = [];

      for (const f of requiredFields) {
        if (!req.body[f]) errors.push(`Field '${f}' is required`);
      }

      if (req.body.amount !== undefined && req.body.amount <= 0) {
        errors.push("Amount must be greater than 0");
      }

      const validMethods = [
        "UPI",
        "Credit Card",
        "Debit Card",
        "Net Banking",
        "Wallet",
        "Cash",
        "Stripe",
        "Stripe Checkout",
        "Cashfree",
        "Cashfree Checkout",
      ];

      if (
        req.body.paymentMethod &&
        !validMethods.includes(req.body.paymentMethod)
      ) {
        errors.push(
          `Payment method must be one of: ${validMethods.join(", ")}`
        );
      }

      if (errors.length) {
        return res.status(400).json({
          success: false,
          error: "Validation failed",
          details: errors,
        });
      }

      next();
    } catch (error) {
      console.error("validateWalletRequest error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to validate request",
      });
    }
  };
};

/* ------------------------------------------------------------
   9️⃣ Track Requests
------------------------------------------------------------ */
export const trackWalletRequest = (req, res, next) => {
  const id = `req_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  req.requestId = id;

  const json = res.json;
  res.json = function (data) {
    if (!data.success) console.log(`[${id}]`, data.error);
    return json.call(this, data);
  };

  next();
};

/* ------------------------------------------------------------
   🔟 Global Error Handler
------------------------------------------------------------ */
export const walletErrorHandler = (error, req, res, next) => {
  console.error("Wallet Error:", error);

  res.status(500).json({
    success: false,
    error: "Internal wallet error",
  });
};

/* ------------------------------------------------------------
   1️⃣1️⃣ Wallet Ownership
------------------------------------------------------------ */
export const checkWalletOwnership = async (req, res, next) => {
  try {
    const wallet = await Wallet.findById(req.params.walletId);

    if (!wallet) {
      return res.status(404).json({
        success: false,
        error: "Wallet not found",
      });
    }

    if (
      req.user.role !== "admin" &&
      wallet.userId.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({
        success: false,
        error: "Access denied",
      });
    }

    req.targetWallet = wallet;
    next();
  } catch (error) {
    console.error("checkWalletOwnership error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to verify wallet ownership",
    });
  }
};

export default {
  ensureWallet,
  checkWalletStatus,
  validateSpending,
  checkMinimumBalance,
  logWalletOperation,
  validateTransactionLimits,
  walletRateLimit,
  validateWalletRequest,
  trackWalletRequest,
  walletErrorHandler,
  checkWalletOwnership,
};
