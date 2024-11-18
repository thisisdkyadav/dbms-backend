import express from "express"
import {
  register,
  login,
  getProfile,
  editProfile,
  toggleFollow,
  searchUsers,
  deleteUser,
  getMiniProfile,
} from "../controllers/user.js"
import isAuthenticated from "../middlewares/isAuthenticated.js"

const router = express.Router()

router.route("/register").post(register)
router.route("/login").post(login)
router.route("/:id/profile").get(isAuthenticated, getProfile)
router.route("/:id/miniprofile").get(isAuthenticated, getMiniProfile)
router.route("/search/:query").get(isAuthenticated, searchUsers)
router.route("/updateProfile").post(isAuthenticated, editProfile)
router.route("/:id/followToggle").post(isAuthenticated, toggleFollow)
router.route("/delete").delete(isAuthenticated, deleteUser)

export default router
