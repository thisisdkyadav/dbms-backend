import express from "express"
import isAuthenticated from "../middlewares/isAuthenticated.js"
import {
  getChats,
  createChat,
  getMessages,
  sendMessage,
  deleteMessage,
} from "../controllers/message.js"

const router = express.Router()

router.route("/send/").post(isAuthenticated, sendMessage)
router.route("/all/:id").get(isAuthenticated, getMessages)
router.route("/delete/:id").delete(isAuthenticated, deleteMessage)
router.route("/chats").get(isAuthenticated, getChats)
router.route("/createChat").post(isAuthenticated, createChat)

export default router
