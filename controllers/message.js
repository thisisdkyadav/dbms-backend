import { getReceiverSocketId, io } from "../socket/socket.js"
import db from "../utils/db.js"

// const findMessages = async (chatId) => {
//   let messages = null

//   db.query(`SELECT * FROM Message WHERE chat = ? ORDER BY time ASC`, [chatId], (error, results) => {
//     if (results && results.length > 0) {
//       messages = results
//       return messages
//     } else {
//       return []
//     }
//   })
// }

export const sendMessage = async (req, res) => {
  try {
    const senderId = req.username
    const { chatId, text, receiverIds } = req.body

    if (!chatId || !text || !senderId) {
      return res.status(400).json({
        message: "Chat ID, text and sender are required",
        success: false,
      })
    }

    if (text.length > 1000) {
      return res.status(400).json({
        message: "Message text cannot exceed 1000 characters",
        success: false,
      })
    }

    const [chatExists] = await db.promise().query(`SELECT id FROM Chat WHERE id = ?`, [chatId])

    if (chatExists.length === 0) {
      return res.status(404).json({
        message: "Chat not found",
        success: false,
      })
    }

    const [senderExists] = await db
      .promise()
      .query(`SELECT username FROM User WHERE username = ?`, [senderId])

    if (senderExists.length === 0) {
      return res.status(404).json({
        message: "Sender not found",
        success: false,
      })
    }

    db.query(
      `INSERT INTO Message (chat, sender, text, time) VALUES (?, ?, ?, ?)`,
      [chatId, senderId, text, new Date()],
      (error, results) => {
        if (error) {
          console.error(error)
          return res.status(500).json({
            message: "An error occurred while sending the message",
            success: false,
          })
        }

        const newMessage = {
          id: results.insertId,
          chat: chatId,
          sender: senderId,
          text,
          time: new Date(),
        }

        // -- Find the receiver's socket ID and send the message --
        const receiverSocketIds =
          receiverIds.map((receiverId) => getReceiverSocketId(receiverId)) || []
        console.log(
          receiverSocketIds,
          receiverIds.map((receiverId) => getReceiverSocketId(receiverId))
        )

        if (receiverSocketIds && receiverSocketIds.length > 0) {
          io.to(receiverSocketIds).emit("newMessage", newMessage)
        }

        return res.status(201).json({
          message: "Message sent successfully",
          success: true,
          newMessage,
        })
      }
    )
  } catch (error) {
    console.error(error)
    return res.status(500).json({
      message: "An error occurred while sending the message",
      success: false,
    })
  }
}

export const getMessages = async (req, res) => {
  try {
    const userId = req.username
    const chatId = req.params.id
    db.query(
      `SELECT * FROM Message WHERE chat = ? ORDER BY time ASC`,
      [chatId],
      (error, results) => {
        return res.status(200).json({
          message: "Messages retrieved successfully.",
          success: true,
          messages: results || [],
        })
      }
    )
    // const messages = await findMessages(chatId)

    // }
  } catch (error) {
    return res.status(500).json({
      message: "An error occurred while retrieving messages.",
      success: false,
    })
  }
}

export const deleteMessage = async (req, res) => {
  try {
    const messageId = req.params.id
    db.query(`DELETE FROM Message WHERE id = ?`, [messageId], (error, results) => {
      if (results.affectedRows > 0) {
        return res.status(200).json({
          message: "Message deleted successfully.",
          success: true,
        })
      } else {
        return res.status(404).json({
          message: "Message not found.",
          success: false,
        })
      }
    })
  } catch (error) {
    return res.status(500).json({
      message: "An error occurred while deleting the message.",
      success: false,
    })
  }
}

export const getChats = async (req, res) => {
  try {
    const userId = req.username
    db.query(
      `SELECT * FROM Chat WHERE user1 = ? OR user2 = ?`,
      [userId, userId],
      (error, results) => {
        if (!error) {
          return res.status(200).json({
            message: "Chats retrieved successfully.",
            success: true,
            chats: results,
          })
        } else {
          return res.status(500).json({
            message: "An error occurred while retrieving chats.",
            success: false,
          })
        }
      }
    )
  } catch (error) {
    return res.status(500).json({
      message: "An error occurred while retrieving chats.",
      success: false,
    })
  }
}

export const createChat = async (req, res) => {
  try {
    const userId = req.username
    const { receiverId } = req.body

    // Input validation
    if (!userId || !receiverId) {
      return res.status(400).json({
        message: "Both users must be specified",
        success: false,
      })
    }

    if (userId === receiverId) {
      return res.status(400).json({
        message: "Cannot create chat with yourself",
        success: false,
      })
    }

    db.beginTransaction(async (err) => {
      if (err) throw err

      try {
        db.query(
          `SELECT username FROM User WHERE username IN (?, ?)`,
          [userId, receiverId],
          (error, results) => {
            if (error) throw error
            if (results.length !== 2) {
              return res.status(404).json({
                message: "One or both users do not exist",
                success: false,
              })
            }

            db.query(
              `SELECT * FROM Chat WHERE (user1 = ? AND user2 = ?) OR (user1 = ? AND user2 = ?)`,
              [userId, receiverId, receiverId, userId],
              (error, results) => {
                if (error) throw error
                if (results && results.length > 0) {
                  return res.status(400).json({
                    message: "Chat already exists",
                    success: false,
                  })
                }

                db.query(
                  `INSERT INTO Chat (user1, user2) VALUES (?, ?)`,
                  [userId, receiverId],
                  (error, results) => {
                    if (error) {
                      if (error.code === "ER_DUP_ENTRY") {
                        return res.status(400).json({
                          message: "Chat already exists",
                          success: false,
                        })
                      }
                      throw error
                    }

                    db.commit((err) => {
                      if (err) throw err
                      return res.status(201).json({
                        message: "Chat created successfully",
                        success: true,
                        chatId: results.insertId,
                      })
                    })
                  }
                )
              }
            )
          }
        )
      } catch (error) {
        db.rollback(() => {
          throw error
        })
      }
    })
  } catch (error) {
    console.error("Error creating chat:", error)
    return res.status(500).json({
      message: "Internal server error",
      success: false,
    })
  }
}
