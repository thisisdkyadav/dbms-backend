import db, { executeTransaction } from "../utils/db.js"

export const addNewPost = async (req, res) => {
  try {
    const { text, media } = req.body
    const author = req.username

    if (!text || text.trim().length === 0) {
      return res.status(400).json({
        message: "Post text is required",
        success: false,
      })
    }

    if (text.length > 255) {
      return res.status(400).json({
        message: "Post text cannot exceed 255 characters",
        success: false,
      })
    }

    if (media && media.length > 500) {
      return res.status(400).json({
        message: "Media URL cannot exceed 500 characters",
        success: false,
      })
    }

    const currentDateTime = new Date().toISOString().slice(0, 19).replace("T", " ")

    const queries = [
      ["SELECT username FROM User WHERE username = ?", [author]],
      [
        "INSERT INTO Post (author, text, media, time, like_count) VALUES (?, ?, ?, ?, 0)",
        [author, text, media, currentDateTime],
      ],
    ]

    const [userResults, insertResults] = await executeTransaction(queries)

    if (!userResults || userResults.length === 0) {
      return res.status(404).json({
        message: "User does not exist",
        success: false,
      })
    }

    return res.status(201).json({
      message: "Post created successfully",
      success: true,
      post: {
        id: insertResults.insertId,
        author,
        text,
        media,
        time: currentDateTime,
        like_count: 0,
      },
    })
  } catch (error) {
    console.error("Error:", error)
    return res.status(500).json({
      message: "An error occurred",
      success: false,
    })
  }
}

export const getUserPosts = async (req, res) => {
  try {
    const username = req.params.username
    const queries = [
      [
        `SELECT p.*, GROUP_CONCAT(l.user) AS liked_by 
         FROM Post p 
         LEFT JOIN Likes l ON p.id = l.post 
         WHERE p.author = ? 
         GROUP BY p.id 
         ORDER BY p.time DESC`,
        [username],
      ],
    ]

    const [results] = await executeTransaction(queries)
    const posts = results.map((post) => ({
      ...post,
      liked_by: post.liked_by ? post.liked_by.split(",") : [],
    }))

    return res.status(200).json({
      success: true,
      posts,
    })
  } catch (error) {
    return res.status(500).json({
      message: "An error occurred while retrieving posts.",
      success: false,
    })
  }
}

export const getPostById = async (req, res) => {
  try {
    const postId = req.params.id

    const queries = [
      [
        `SELECT p.*, 
              GROUP_CONCAT(l.user) AS liked_by 
       FROM Post p 
       LEFT JOIN Likes l ON p.id = l.post 
       WHERE p.id = ? 
       GROUP BY p.id`,
        [postId],
      ],
    ]

    const [results] = await executeTransaction(queries)

    if (results.length === 0) {
      return res.status(404).json({
        message: "Post not found.",
        success: false,
      })
    }

    const post = results[0]
    post.liked_by = post.liked_by ? post.liked_by.split(",") : []

    return res.status(200).json({
      success: true,
      post,
    })
  } catch (error) {
    return res.status(500).json({
      message: "An error occurred while retrieving the post.",
      success: false,
    })
  }
}

export const getPostOfFollowedUsers = async (req, res) => {
  try {
    const userId = req.username

    const queries = [
      [
        `SELECT p.*, 
              GROUP_CONCAT(l.user) AS liked_by 
       FROM Post p 
       LEFT JOIN Likes l ON p.id = l.post 
       WHERE p.author IN (
         SELECT followed FROM Follows WHERE follower = ?
       ) 
       GROUP BY p.id 
       ORDER BY p.time DESC`,
        [userId],
      ],
    ]

    const [results] = await executeTransaction(queries)

    const posts = results.map((post) => ({
      ...post,
      liked_by: post.liked_by ? post.liked_by.split(",") : [],
    }))

    return res.status(200).json({
      success: true,
      posts,
    })
  } catch (error) {
    return res.status(500).json({
      message: "An error occurred while retrieving posts.",
      success: false,
    })
  }
}

export const deletePost = async (req, res) => {
  try {
    const postId = req.params.id
    await executeTransaction([["DELETE FROM Post WHERE id = ?", [postId]]])

    return res.status(200).json({
      message: "Post deleted successfully.",
      success: true,
    })
  } catch (error) {
    return res.status(500).json({
      message: "An error occurred while deleting the post.",
      success: false,
    })
  }
}

export const likePost = async (req, res) => {
  try {
    const postId = req.params.id
    const userId = req.username

    const queries = [["SELECT * FROM Likes WHERE user = ? AND post = ?", [userId, postId]]]
    const [results] = await executeTransaction(queries)

    if (results.length === 0) {
      await executeTransaction([["INSERT INTO Likes (user, post) VALUES (?, ?)", [userId, postId]]])
      return res.status(200).json({
        message: "Post liked successfully",
        isLiked: true,
        success: true,
      })
    } else {
      await executeTransaction([
        ["DELETE FROM Likes WHERE user = ? AND post = ?", [userId, postId]],
      ])
      return res.status(200).json({
        message: "Post unliked successfully",
        isLiked: false,
        success: true,
      })
    }
  } catch (error) {
    return res.status(500).json({
      message: "An error occurred while liking/unliking the post.",
      success: false,
    })
  }
}

export const addComment = async (req, res) => {
  try {
    const { postId, text, parentComment = null } = req.body
    const userId = req.username

    if (!text || text.trim().length === 0) {
      return res.status(400).json({
        message: "Comment text is required",
        success: false,
      })
    }

    if (!postId) {
      return res.status(400).json({
        message: "Post ID is required",
        success: false,
      })
    }

    if (text.length > 500) {
      return res.status(400).json({
        message: "Comment text cannot exceed 500 characters",
        success: false,
      })
    }

    const currentDateTime = new Date().toISOString().slice(0, 19).replace("T", " ")

    db.beginTransaction(async (err) => {
      if (err) throw err

      try {
        const userExists = await new Promise((resolve, reject) => {
          db.query("SELECT username FROM User WHERE username = ?", [userId], (error, results) => {
            if (error) reject(error)
            resolve(results && results.length > 0)
          })
        })

        if (!userExists) {
          return res.status(404).json({
            message: "User does not exist",
            success: false,
          })
        }

        const postExists = await new Promise((resolve, reject) => {
          db.query("SELECT id FROM Post WHERE id = ?", [postId], (error, results) => {
            if (error) reject(error)
            resolve(results && results.length > 0)
          })
        })

        if (!postExists) {
          return res.status(404).json({
            message: "Post does not exist",
            success: false,
          })
        }

        if (parentComment) {
          const parentCommentExists = await new Promise((resolve, reject) => {
            db.query("SELECT id FROM Comment WHERE id = ?", [parentComment], (error, results) => {
              if (error) reject(error)
              resolve(results && results.length > 0)
            })
          })

          if (!parentCommentExists) {
            return res.status(404).json({
              message: "Parent comment does not exist",
              success: false,
            })
          }
        }

        db.query(
          "INSERT INTO Comment (author, post, text, parent_comment, time) VALUES (?, ?, ?, ?, ?)",
          [userId, postId, text, parentComment, currentDateTime],
          (error, results) => {
            if (error) {
              db.rollback(() => {
                throw error
              })
            }

            db.commit((err) => {
              if (err) {
                db.rollback(() => {
                  throw err
                })
              }

              return res.status(201).json({
                message: "Comment added successfully",
                success: true,
                commentId: results.insertId,
              })
            })
          }
        )
      } catch (error) {
        db.rollback(() => {
          console.error("Error adding comment:", error)
          return res.status(500).json({
            message: "An error occurred while adding the comment",
            success: false,
          })
        })
      }
    })
  } catch (error) {
    console.error("Unexpected error:", error)
    return res.status(500).json({
      message: "An error occurred while adding the comment",
      success: false,
    })
  }
}

export const deleteComment = async (req, res) => {
  try {
    const commentId = req.params.commentId
    await executeTransaction([["DELETE FROM Comment WHERE id = ?", [commentId]]])

    return res.status(200).json({
      message: "Comment deleted successfully.",
      success: true,
    })
  } catch (error) {
    return res.status(500).json({
      message: "An error occurred while deleting the comment.",
      success: false,
    })
  }
}

export const getComments = async (req, res) => {
  try {
    const postId = req.params.postId

    const queries = [["SELECT * FROM Comment WHERE post = ?", [postId]]]

    const [results] = await executeTransaction(queries)

    return res.status(200).json({
      success: true,
      comments: results,
    })
  } catch (error) {
    return res.status(500).json({
      message: "An error occurred while retrieving comments.",
      success: false,
    })
  }
}
