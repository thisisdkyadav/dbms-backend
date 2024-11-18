import express from "express"
import isAuthenticated from "../middlewares/isAuthenticated.js"
import {
  addNewPost,
  deletePost,
  getPostById,
  getPostOfFollowedUsers,
  getUserPosts,
  likePost,
} from "../controllers/post.js"

const router = express.Router()

router.route("/create").post(isAuthenticated, addNewPost)
router.route("/user/:username").get(isAuthenticated, getUserPosts)
router.route("/:id/get").get(isAuthenticated, getPostById)
router.route("/followed").get(isAuthenticated, getPostOfFollowedUsers)
router.route("/:id/like").get(isAuthenticated, likePost)
router.route("/delete/:id").delete(isAuthenticated, deletePost)

export default router
