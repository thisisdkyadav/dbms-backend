import express, { urlencoded } from "express"
import dotenv from "dotenv"
import userRoute from "./routes/user.js"
import postRoute from "./routes/post.js"
import messageRoute from "./routes/message.js"
import commentRoute from "./routes/comment.js"
import { app, server } from "./socket/socket.js"
import multer from "multer"
import path from "path"
import { fileURLToPath } from "url"
import isAuthenticated from "./middlewares/isAuthenticated.js"
import upload from "./middlewares/multer.js"

dotenv.config()

const port = process.env.PORT || 8000

// Get the directory name
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use("/api/user", userRoute)
app.use("/api/post", postRoute)
app.use("/api/message", messageRoute)
app.use("/api/comment", commentRoute)

app.get("/", (req, res) => {
  res.send("Hello World!")
})

app.use("/uploads", express.static(path.join(__dirname, "uploads")))

app.post("/api/upload", isAuthenticated, upload.single("file"), (req, res) => {
  try {
    res.status(200).json({
      message: "File uploaded successfully",
      success: true,
      file: req.file,
    })
  } catch (error) {
    res.status(500).json({
      message: "An error occurred while uploading the file",
      success: false,
      error: error.message,
    })
  }
})

server.listen(port, () => {
  console.log(`Server is running on port ${port}`)
})
