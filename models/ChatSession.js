import mongoose from 'mongoose';
// Chat Session Schema
const chatSessionSchema = new mongoose.Schema({
  channelName: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  participants: [{
    type: String,
    required: true
  }],
  lastMessageAt: {
    type: Date,
    default: Date.now
  },
  lastMessageText: {
    type: String,
    default: ''
  },
  lastMessageSender: {
    type: String,
    default: ''
  },
  active: {
    type: Boolean,
    default: true
  },
  metadata: {
    type: Map,
    of: String
  }
}, {
  timestamps: true
});

// Indexes
chatSessionSchema.index({ participants: 1, lastMessageAt: -1 });
const ChatSession = mongoose.model('ChatSession', chatSessionSchema);

export ChatSession;
