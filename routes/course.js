import express from "express";

const router = express.Router();

// middleware
import { isInstructor, requireSignin } from "../middlewares";

const {
	uploadImage,
	removeImage,
	createCourse,
	readCourse
} = require("../controllers/course");

// Image
router.post("/course/upload-image", uploadImage);
router.post("/course/remove-image", removeImage);
// Course
router.post("/course", requireSignin, isInstructor, createCourse);
router.get("/course/:slug", readCourse);

module.exports = router;
