import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
  sessionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ChatSession',
    required: true
  },
  senderId: {
    type: String,
    required: true
  },
  senderName: {
    type: String,
    required: true
  },
  senderRole: {
    type: String,
    enum: ['user', 'provider'],
    required: true
  },
  text: {
    type: String,
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  read: {
    type: Boolean,
    default: false
  },
  readBy: [{
    userId: String,
    timestamp: Date
  }]
});

const chatSessionSchema = new mongoose.Schema({
  roomId: {
    type: String,
    required: true,
    unique: true
  },
  providerId: {
    type: String,
    required: true
  },
  providerName: {
    type: String,
    required: true
  },
  userId: {
    type: String,
    required: true
  },
  userName: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['active', 'ended', 'waiting'],
    default: 'waiting'
  },
  rate: {
    type: Number,
    required: true
  },
  mode: {
    type: String,
    enum: ['chat', 'call', 'video'],
    default: 'chat'
  },
  startTime: {
    type: Date,
    default: Date.now
  },
  endTime: {
    type: Date
  },
  totalDuration: {
    type: Number,
    default: 0
  },
  totalCharged: {
    type: Number,
    default: 0
  },
  lastMessage: {
    type: String
  },
  lastMessageTime: {
    type: Date
  }
}, {
  timestamps: true
});

// Index for better query performance
chatSessionSchema.index({ providerId: 1, status: 1 });
chatSessionSchema.index({ userId: 1, status: 1 });
chatSessionSchema.index({ roomId: 1 });
messageSchema.index({ sessionId: 1, timestamp: 1 });

export const ChatSession = mongoose.model('ChatSession', chatSessionSchema);
export const ChatMessage = mongoose.model('ChatMessage', messageSchema);
