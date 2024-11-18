import express from "express"
import isAuthenticated from "../middlewares/isAuthenticated.js"
import { addComment, getComments, deleteComment } from "../controllers/post.js"

const router = express.Router()

router.route("/create").post(isAuthenticated, addComment)
router.route("/getAll/:postId").get(isAuthenticated, getComments)
router.route("/:id/comment/:commentId").delete(isAuthenticated, deleteComment)

export default router
