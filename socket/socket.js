import { Server } from "socket.io"
import express from "express"
import http from "http"
import cors from "cors"

const app = express()
app.use(
  cors({
    origin: "http://localhost:3000",
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
)

const server = http.createServer(app)

const io = new Server(server)

let userSocketMap = {}

export const getReceiverSocketId = (receiverId) => userSocketMap[receiverId]

io.on("connection", (socket) => {
  console.log("socket io connected")

  const username = socket.handshake.query.username
  if (username) {
    userSocketMap[username] = socket.id
  }

  // io.emit("")

  io.emit("getOnlineUsers", Object.keys(userSocketMap))

  socket.on("disconnect", () => {
    if (username) {
      delete userSocketMap[username]
    }
    io.emit("getOnlineUsers", Object.keys(userSocketMap))
  })
})

export { app, server, io }
