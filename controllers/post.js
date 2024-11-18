import sharp from "sharp"
import db from "../utils/db.js"

export const addNewPost = async (req, res) => {
  try {
    const { text, media } = req.body
    const author = req.username

    const currentDateTime = new Date().toISOString().slice(0, 19).replace("T", " ")

    db.query(
      "INSERT INTO Post (author, text, media, time) VALUES (?, ?, ?, ?)",
      [author, text, media, currentDateTime],
      (error, results) => {
        if (error) {
          return res.status(500).json({
            message: "An error occurred while creating the post.",
            success: false,
          })
        }

        return res.status(201).json({
          message: "Post created successfully.",
          success: true,
          post: {
            id: results.insertId,
            authorId: author,
            text,
            media,
            time: currentDateTime,
          },
        })
      }
    )
  } catch (error) {
    return res.status(500).json({
      message: "An error occurred while creating the post.",
      success: false,
    })
  }
}

export const getUserPosts = async (req, res) => {
  try {
    const username = req.params.username

    db.query(
      `SELECT p.*, 
              GROUP_CONCAT(l.user) AS liked_by 
       FROM Post p 
       LEFT JOIN Likes l ON p.id = l.post 
       WHERE p.author = ? 
       GROUP BY p.id 
       ORDER BY p.time DESC`,
      [username],
      (error, results) => {
        if (error) {
          return res.status(500).json({
            message: "An error occurred while retrieving posts.",
            success: false,
          })
        }

        // Transform the results to include the liked_by array
        const posts = results.map((post) => ({
          ...post,
          liked_by: post.liked_by ? post.liked_by.split(",") : [],
        }))

        return res.status(200).json({
          success: true,
          posts,
        })
      }
    )
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

    db.query(
      `SELECT p.*, 
              GROUP_CONCAT(l.user) AS liked_by 
       FROM Post p 
       LEFT JOIN Likes l ON p.id = l.post 
       WHERE p.id = ? 
       GROUP BY p.id`,
      [postId],
      (error, results) => {
        if (error) {
          return res.status(500).json({
            message: "An error occurred while retrieving the post.",
            success: false,
          })
        }

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
      }
    )
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

    db.query(
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
      (error, results) => {
        if (error) {
          return res.status(500).json({
            message: "An error occurred while retrieving posts.",
            success: false,
          })
        }

        // Transform the results to include the liked_by array
        const posts = results.map((post) => ({
          ...post,
          liked_by: post.liked_by ? post.liked_by.split(",") : [],
        }))

        return res.status(200).json({
          success: true,
          posts,
        })
      }
    )
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

    db.query("DELETE FROM Post WHERE id = ?", [postId], (error) => {
      if (error) {
        return res.status(500).json({
          message: "An error occurred while deleting the post.",
          success: false,
        })
      }

      return res.status(200).json({
        message: "Post deleted successfully.",
        success: true,
      })
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

    db.query(
      "Select *FROM Likes WHERE user = ? AND post = ?",
      [userId, postId],
      (error, results) => {
        if (error) {
          return res.status(500).json({
            message: "An error occurred while liking/unliking the post.",
            success: false,
          })
        }

        if (results.length === 0) {
          db.query("INSERT INTO Likes (user, post) VALUES (?, ?)", [userId, postId], (error) => {
            if (error) {
              return res.status(500).json({
                message: "An error occurred while liking the post.",
                success: false,
              })
            }

            return res.status(200).json({
              message: "Post liked successfully",
              isLiked: true,
              success: true,
            })
          })
        } else {
          db.query("DELETE FROM Likes WHERE user = ? AND post = ?", [userId, postId], (error) => {
            if (error) {
              return res.status(500).json({
                message: "An error occurred while unliking the post.",
                success: false,
              })
            }

            return res.status(200).json({
              message: "Post unliked successfully",
              isLiked: false,
              success: true,
            })
          })
        }
      }
    )
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

    const currentDateTime = new Date().toISOString().slice(0, 19).replace("T", " ")

    db.query(
      "INSERT INTO Comment (author, post, text, parent_comment, time) VALUES (?, ?, ?, ?, ?)",
      [userId, postId, text, parentComment, currentDateTime],
      (error, results) => {
        if (error) {
          return res.status(500).json({
            message: "An error occurred while adding the comment.",
            success: false,
          })
        }

        return res.status(201).json({
          message: "Comment added successfully.",
          success: true,
        })
      }
    )

    // // -- Find the post in the new database --
    // const post = null // Placeholder

    // if (!post) {
    //   return res.status(404).json({
    //     message: "Post not found.",
    //     success: false,
    //   })
    // }

    // // -- Create a new comment in the new database --
    // const comment = null // Placeholder

    // // -- Add the comment to the post in the new database --

    // return res.status(201).json({
    //   message: "Comment added successfully.",
    //   success: true,
    //   comment,
    // })
  } catch (error) {
    return res.status(500).json({
      message: "An error occurred while adding the comment.",
      success: false,
    })
  }
}

export const deleteComment = async (req, res) => {
  try {
    const commentId = req.params.commentId

    db.query("DELETE FROM Comment WHERE id = ?", [commentId], (error) => {
      if (error) {
        return res.status(500).json({
          message: "An error occurred while deleting the comment.",
          success: false,
        })
      }

      return res.status(200).json({
        message: "Comment deleted successfully.",
        success: true,
      })
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

    db.query("SELECT * FROM Comment WHERE post = ?", [postId], (error, results) => {
      if (error) {
        return res.status(500).json({
          message: "An error occurred while retrieving comments.",
          success: false,
        })
      }

      return res.status(200).json({
        success: true,
        comments: results,
      })
    })
  } catch (error) {
    return res.status(500).json({
      message: "An error occurred while retrieving comments.",
      success: false,
    })
  }
}
