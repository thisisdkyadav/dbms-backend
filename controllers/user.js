import jwt from "jsonwebtoken"
import db from "../utils/db.js"
import dotenv from "dotenv"

dotenv.config()

export const register = async (req, res) => {
  const { username, email, password, phone, name } = req.body

  if (!username || !email || !password || !name || !phone) {
    return res.status(400).json({
      message: "All fields are required",
      success: false,
    })
  }

  if (username.length > 50) {
    return res.status(400).json({
      message: "Username must be less than 50 characters",
      success: false,
    })
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email) || email.length > 50) {
    return res.status(400).json({
      message: "Invalid email format or length exceeds 50 characters",
      success: false,
    })
  }

  if (password.length > 255) {
    return res.status(400).json({
      message: "Password length exceeds maximum limit",
      success: false,
    })
  }

  if (!/^\d{10}$/.test(phone)) {
    return res.status(400).json({
      message: "Phone number must be exactly 10 digits",
      success: false,
    })
  }

  if (name.length > 50) {
    return res.status(400).json({
      message: "Name must be less than 50 characters",
      success: false,
    })
  }

  try {
    db.query(`SELECT username FROM User WHERE username = ?`, [username], (error, results) => {
      if (error) {
        return res.status(500).json({
          message: "Database error while checking username",
          success: false,
        })
      }

      if (results && results.length > 0) {
        return res.status(409).json({
          message: "Username is already taken. Please try a different username.",
          success: false,
        })
      }

      db.query(`SELECT email FROM User WHERE email = ?`, [email], (error, results) => {
        if (error) {
          return res.status(500).json({
            message: "Database error while checking email",
            success: false,
          })
        }

        if (results && results.length > 0) {
          return res.status(409).json({
            message: "Email is already registered",
            success: false,
          })
        }

        db.query(`SELECT mobileno FROM User WHERE mobileno = ?`, [phone], (error, results) => {
          if (error) {
            return res.status(500).json({
              message: "Database error while checking phone number",
              success: false,
            })
          }

          if (results && results.length > 0) {
            return res.status(409).json({
              message: "Phone number is already registered",
              success: false,
            })
          }

          db.query(
            `INSERT INTO User (username, email, password, mobileno, name) VALUES (?, ?, ?, ?, ?)`,
            [username, email, password, phone, name],
            (error, results) => {
              if (error) {
                return res.status(500).json({
                  message: "Database error while creating user",
                  success: false,
                })
              }

              return res.status(201).json({
                message: "Account created successfully",
                success: true,
              })
            }
          )
        })
      })
    })
  } catch (error) {
    return res.status(500).json({
      message: "An error occurred while creating the account",
      success: false,
    })
  }
}

export const login = async (req, res) => {
  try {
    const { username, password } = req.body
    if (!username || !password) {
      return res.status(400).json({
        message: "All fields are required",
        success: false,
      })
    }

    let user
    db.query(
      `SELECT username,password FROM User WHERE username=?`,
      [username],
      async (error, results) => {
        if (!results || results.length === 0) {
          return res.status(401).json({
            message: "Incorrect username or password",
            success: false,
          })
        }
        user = results[0]

        if (!(password === user.password)) {
          return res.status(401).json({
            message: "Incorrect username or password",
            success: false,
          })
        }

        const token = await jwt.sign({ username: user.username }, process.env.SECRET_KEY)

        console.log(user)

        return res.json({
          message: `Welcome back ${user.username}`,
          success: true,
          token,
          user: user.username,
        })
      }
    )
  } catch (error) {
    console.log(error)
  }
}

export const getProfile = async (req, res) => {
  try {
    const username = req.params.id

    // -- Find the user in the database --
    db.query(
      `SELECT name,username, mobileno,email, profile_image FROM User WHERE username=?`,
      [username],
      async (error, results) => {
        if (!results || results.length === 0) {
          return res.status(404).json({
            message: "User not found.",
            success: false,
          })
        }
        const user = results[0]
        db.query(
          "SELECT followed FROM Follows where follower=?",
          [username],
          async (error, results) => {
            const followingList = results || []
            const following = followingList.map((item) => item.followed)
            db.query(
              "SELECT follower FROM Follows where followed=?",
              [username],
              async (error, results) => {
                const followersList = results || []
                const followers = followersList.map((item) => item.follower)
                return res.status(200).json({
                  user,
                  followers,
                  following,
                  success: true,
                })
              }
            )
          }
        )
      }
    )
  } catch (error) {
    console.log(error)
  }
}

export const getMiniProfile = async (req, res) => {
  try {
    const username = req.params.id

    db.query(
      `SELECT name , profile_image FROM User WHERE username=?`,
      [username],
      async (error, results) => {
        if (!results || results.length === 0) {
          return res.status(404).json({
            message: "User not found.",
            success: false,
          })
        }
        const user = results[0]
        return res.status(200).json({
          user,
          success: true,
        })
      }
    )
  } catch (error) {
    console.log(error)
  }
}

export const searchUsers = async (req, res) => {
  try {
    const usernameInitial = req.params.query
    db.query(
      `SELECT username FROM User WHERE username LIKE ?`,
      [`${usernameInitial}%`],
      async (error, results) => {
        if (!results || results.length === 0) {
          return res.status(404).json({
            message: "No users found.",
            success: false,
            users: [],
          })
        }
        return res.status(200).json({
          success: true,
          users: results,
        })
      }
    )
  } catch (error) {
    console.log(error)
  }
}

export const editProfile = async (req, res) => {
  try {
    const username = req.username
    const { name, email, mobileno, password, profile_image } = req.body

    if (name && name.length > 50) {
      return res.status(400).json({
        message: "Name must be less than 50 characters",
        success: false,
      })
    }

    if (email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(email) || email.length > 50) {
        return res.status(400).json({
          message: "Invalid email format or length exceeds 50 characters",
          success: false,
        })
      }

      const [emailConflict] = await db
        .promise()
        .query(`SELECT username FROM User WHERE email = ? AND username != ?`, [email, username])
      if (emailConflict.length > 0) {
        return res.status(409).json({
          message: "Email is already in use by another user",
          success: false,
        })
      }
    }

    if (mobileno) {
      if (!/^\d{10}$/.test(mobileno.toString())) {
        return res.status(400).json({
          message: "Phone number must be exactly 10 digits",
          success: false,
        })
      }

      const [phoneConflict] = await db
        .promise()
        .query(`SELECT username FROM User WHERE mobileno = ? AND username != ?`, [
          mobileno,
          username,
        ])
      if (phoneConflict.length > 0) {
        return res.status(409).json({
          message: "Phone number is already in use by another user",
          success: false,
        })
      }
    }

    if (password && password.length > 255) {
      return res.status(400).json({
        message: "Password length exceeds maximum limit",
        success: false,
      })
    }

    if (profile_image && profile_image.length > 255) {
      return res.status(400).json({
        message: "Profile image URL exceeds maximum length",
        success: false,
      })
    }

    const updateFields = []
    const updateValues = []

    if (name) {
      updateFields.push("name = ?")
      updateValues.push(name)
    }
    if (email) {
      updateFields.push("email = ?")
      updateValues.push(email)
    }
    if (mobileno) {
      updateFields.push("mobileno = ?")
      updateValues.push(mobileno)
    }
    if (password) {
      updateFields.push("password = ?")
      updateValues.push(password)
    }
    if (profile_image) {
      updateFields.push("profile_image = ?")
      updateValues.push(profile_image)
    }

    updateValues.push(username)

    if (updateFields.length > 0) {
      const updateQuery = `UPDATE User SET ${updateFields.join(", ")} WHERE username = ?`
      await db.promise().query(updateQuery, updateValues)
    }

    return res.status(200).json({
      message: "Profile updated successfully",
      success: true,
    })
  } catch (error) {
    console.log(error)
    return res.status(500).json({
      message: "An error occurred while updating the profile",
      success: false,
    })
  }
}

export const toggleFollow = async (req, res) => {
  try {
    const followerUsername = req.username
    const idToFollow = req.params.id

    if (followerUsername === idToFollow) {
      return res.status(400).json({
        message: "You cannot follow yourself",
        success: false,
      })
    }

    db.query(`SELECT * FROM User WHERE username=?`, [followerUsername], async (error, results) => {
      if (!results || results.length === 0) {
        return res.status(404).json({
          message: "User not found1",
          success: false,
        })
      }
      const user = results[0]
      db.query(`SELECT * FROM User WHERE username=?`, [idToFollow], async (error, results) => {
        if (!results || results.length === 0) {
          return res.status(404).json({
            message: "User not found2",
            success: false,
          })
        }
        const targetUser = results[0]

        db.query(
          `SELECT * FROM Follows WHERE follower=? AND followed=?`,
          [followerUsername, idToFollow],
          async (error, results) => {
            // if (!results || results.length === 0) {
            //   return res.status(404).json({
            //     message: "User not found3",
            //     success: false,
            //   })
            const isFollowing = results.length > 0 || false

            if (isFollowing) {
              db.query(
                `DELETE FROM Follows WHERE follower=? AND followed=?`,
                [followerUsername, idToFollow],
                async (error, results) => {
                  if (results) {
                    return res
                      .status(200)
                      .json({ message: "Unfollowed successfully", success: true })
                  }
                }
              )
            } else {
              db.query(
                `INSERT INTO Follows (follower, followed) VALUES (?, ?)`,
                [followerUsername, idToFollow],
                async (error, results) => {
                  if (results) {
                    return res.status(200).json({ message: "Followed successfully", success: true })
                  }
                }
              )
            }
          }
        )
      })
    })
  } catch (error) {
    console.log(error)
  }
}

export const deleteUser = async (req, res) => {
  try {
    const username = req.username

    db.query(`DELETE FROM User WHERE username=?`, [username], async (error, results) => {
      if (error) {
        return res.status(500).json({
          message: "An error occurred while deleting the account.",
          success: false,
        })
      }
      if (results) {
        return res.status(200).json({
          message: "Account deleted successfully.",
          success: true,
        })
      }
    })
  } catch (error) {
    console.log(error)
  }
}
