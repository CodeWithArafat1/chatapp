import { io } from "socket.io-client";

const args = process.argv.slice(2);
const senderId = args[0] || "60d5ecb8b392d70034a7428e";
const receiverId = args[1] || "60d5ecb8b392d70034a7428f";

console.log(`Connecting as ${senderId}...`);
const socket = io("http://localhost:3000", { transports: ["websocket"] });

socket.on("connect", () => {
  console.log("Connected! socket id:", socket.id);
  socket.emit("register_user", senderId);
  
  setTimeout(() => {
    const msg = {
      id: "abc",
      senderId,
      receiverId,
      text: "Test message from script",
      timestamp: Date.now()
    };
    console.log("Sending msg:", msg);
    socket.emit("send_message", msg);
  }, 1000);
});

socket.on("receive_message", (msg) => {
  console.log("Received via broadcast:", msg);
  setTimeout(() => process.exit(0), 1000);
});

setTimeout(() => {
  console.log("Timeout");
  process.exit(1);
}, 5000);
