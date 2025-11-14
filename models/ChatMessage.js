import mongoose from 'mongoose';

// Chat Message Schema
const chatMessageSchema = new mongoose.Schema({
  messageId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  channelName: {
    type: String,
    required: true,
    index: true
  },
  text: {
    type: String,
    required: true
  },
  senderId: {
    type: String,
    required: true,
    index: true
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  },
  status: {
    type: String,
    enum: ['sending', 'sent', 'delivered', 'seen', 'failed'],
    default: 'sent'
  },
  deliveredTo: [{
    type: String
  }],
  seenBy: [{
    type: String
  }],
  deleted: {
    type: Boolean,
    default: false
  },
  deletedAt: {
    type: Date
  },
  metadata: {
    type: Map,
    of: String
  }
}, {
  timestamps: true
});

// Indexes for better query performance
chatMessageSchema.index({ channelName: 1, timestamp: -1 });
chatMessageSchema.index({ channelName: 1, senderId: 1 });
chatMessageSchema.index({ channelName: 1, seenBy: 1 });
const ChatMessage = mongoose.model('ChatMessage', chatMessageSchema);
export ChatMessage;
