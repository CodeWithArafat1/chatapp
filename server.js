import { createServer } from "node:http";
import next from "next";
import { Server } from "socket.io";

const dev = process.env.NODE_ENV !== "production";
const hostname = "localhost";
const port = 3000;

// when using middleware `hostname` and `port` must be provided below
const app = next({ dev, hostname, port });
const handler = app.getRequestHandler();

app.prepare().then(async () => {
  const httpServer = createServer((req, res) => {
    // If the request is for Socket.io, do not pass to Next.js handler.
    // Socket.io will intercept it internally. Next.js catching it causes 404s.
    if (req.url && req.url.startsWith('/socket.io')) {
      return;
    }
    
    return handler(req, res);
  });

  // Connect to MongoDB using the env var Next.js loaded during app.prepare()
  const mongoose = await import("mongoose");
  mongoose.connect(process.env.MONGODB_URI).then(() => console.log("> MongoDB connected for WebSockets"));

  const messageSchema = new mongoose.Schema({
    senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    receiverId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    text: String,
    timestamp: { type: Date, default: Date.now }
  });
  
  // Create or retrieve the model safely
  const MessageModel = mongoose.models?.Message || mongoose.model("Message", messageSchema);

  const io = new Server(httpServer);

  io.on("connection", (socket) => {
    console.log(`Socket connected: ${socket.id}`);

    // Register a user to their dedicated private room
    socket.on("register_user", (userId) => {
      socket.join(userId);
      console.log(`Socket ${socket.id} registered for updates to user: ${userId}`);
    });

    // Handle sending message
    socket.on("send_message", async (data) => {
      // data: { senderId, receiverId, text, timestamp }
      console.log(`Message from ${data.senderId} to ${data.receiverId}: ${data.text}`);
      
      try {
        // Save to Database
        await MessageModel.create({
          senderId: data.senderId,
          receiverId: data.receiverId,
          text: data.text,
          timestamp: new Date(data.timestamp)
        });

        // Broadcast directly to the receiver's room (so they see it)
        io.to(data.receiverId).emit("receive_message", data);
        
        // Broadcast to the sender's own room too (so all their active tabs see it)
        io.to(data.senderId).emit("receive_message", data);
      } catch (err) {
        console.error('Error saving message payload:', err);
      }
    });

    socket.on("disconnect", () => {
      console.log(`Socket disconnected: ${socket.id}`);
    });
  });

  httpServer
    .once("error", (err) => {
      console.error(err);
      process.exit(1);
    })
    .listen(port, () => {
      console.log(`> Ready on http://${hostname}:${port}`);
    });
});
