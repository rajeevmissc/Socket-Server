const chatSocketHandler = (io) => {
  io.on('connection', (socket) => {
    console.log('🔗 User connected:', socket.id);

    // Join chat room
    socket.on('join_chat', (roomId) => {
      socket.join(roomId);
      console.log(`👥 User ${socket.id} joined room: ${roomId}`);
      
      // Notify others in the room
      socket.to(roomId).emit('user_joined', {
        userId: socket.id,
        timestamp: new Date()
      });
    });

    // Leave chat room
    socket.on('leave_chat', (roomId) => {
      socket.leave(roomId);
      console.log(`🚪 User ${socket.id} left room: ${roomId}`);
    });

    // Typing indicators
    socket.on('typing_start', (data) => {
      socket.to(data.roomId).emit('user_typing', {
        userId: socket.id,
        userName: data.userName,
        isTyping: true
      });
    });

    socket.on('typing_stop', (data) => {
      socket.to(data.roomId).emit('user_typing', {
        userId: socket.id,
        userName: data.userName,
        isTyping: false
      });
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      console.log('🔴 User disconnected:', socket.id);
    });

    // Error handling
    socket.on('error', (error) => {
      console.error('Socket error:', error);
    });
  });
};

export default chatSocketHandler;
