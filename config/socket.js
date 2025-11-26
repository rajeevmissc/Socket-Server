// import { Server } from 'socket.io';
// import Provider from '../models/Provider.js';

// let io;

// export const initSocket = (server) => {
//   io = new Server(server, {
//     cors: {
//       origin: '*', // change to your frontend URL if needed
//       methods: ['GET', 'POST']
//     }
//   });

//   io.on('connection', (socket) => {
//     console.log('New client connected', socket.id);

//     // Provider updates presence
//    socket.on("updatePresence", async ({ providerId, isOnline }) => {
//   try {
//     console.log("Received updatePresence:", providerId, isOnline);

//     const status = isOnline ? "online" : "offline";

//     const result = await Provider.findByIdAndUpdate(
//       providerId,
//       {
//         $set: {
//           "presence.isOnline": isOnline,
//           "presence.availabilityStatus": status,
//           "presence.lastSeen": new Date()
//         }
//       },
//       { new: true }
//     );

//     console.log("DB Updated Provider:", result);

//     io.emit("presenceChanged", { providerId, isOnline, status });
//   } catch (err) {
//     console.error("Error updating presence", err);
//   }
// });



//     socket.on('disconnect', () => {
//       console.log('Client disconnected', socket.id);
//     });
//   });

//   return io;
// };

// export const getIo = () => {
//   if (!io) throw new Error('Socket.io not initialized!');
//   return io;
// };





import { Server } from 'socket.io';
import Provider from '../models/Provider.js';

let io;

export const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST']
    }
  });

  io.on('connection', (socket) => {
    console.log('New client connected', socket.id);

    // ---------------------------------------
    // 1️⃣ ONLINE / OFFLINE PRESENCE UPDATE
    // ---------------------------------------
    socket.on("updatePresence", async ({ providerId, isOnline }) => {
      try {
        const status = isOnline ? "online" : "offline";

        await Provider.findByIdAndUpdate(
          providerId,
          {
            $set: {
              "presence.isOnline": isOnline,
              "presence.availabilityStatus": status,
              "presence.lastSeen": new Date()
            }
          },
          { new: true }
        );

        io.emit("presenceChanged", { providerId, isOnline, status });
      } catch (err) {
        console.error("Error updating presence", err);
      }
    });

    // ---------------------------------------
    // 2️⃣ PROVIDER → BUSY (during call)
    // ---------------------------------------
    socket.on("provider-busy", async ({ providerId }) => {
      try {
        console.log("🚨 Provider busy:", providerId);

        await Provider.findByIdAndUpdate(
          providerId,
          {
            $set: {
              "presence.isOnline": true,
              "presence.availabilityStatus": "busy",
              "presence.lastSeen": new Date()
            }
          },
          { new: true }
        );

        io.emit("presenceChanged", {
          providerId,
          isOnline: true,
          status: "busy"
        });
      } catch (err) {
        console.error("Error marking provider busy:", err);
      }
    });

    // ---------------------------------------
    // 3️⃣ PROVIDER → AVAILABLE (call ended)
    // ---------------------------------------
    socket.on("provider-available", async ({ providerId }) => {
      try {
        console.log("🟢 Provider available:", providerId);

        await Provider.findByIdAndUpdate(
          providerId,
          {
            $set: {
              "presence.isOnline": true,
              "presence.availabilityStatus": "available",
              "presence.lastSeen": new Date()
            }
          },
          { new: true }
        );

        io.emit("presenceChanged", {
          providerId,
          isOnline: true,
          status: "available"
        });
      } catch (err) {
        console.error("Error marking provider available:", err);
      }
    });

    socket.on('disconnect', () => {
      console.log('Client disconnected', socket.id);
    });
  });

  return io;
};

export const getIo = () => {
  if (!io) throw new Error('Socket.io not initialized!');
  return io;
};

