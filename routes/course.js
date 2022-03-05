import express from "express";
import formidable from "express-formidable";

const router = express.Router();

// middleware
import { isInstructor, requireSignin } from "../middlewares";

const {
	courses,
	uploadImage,
	removeImage,
	createCourse,
	updateCourse,
	readCourse,
	uploadVideo,
	removeVideo,
	publishCourse,
	unpublishCourse,
	addLesson,
	updateLesson,
	removeLesson,
	checkEnrollment,
	freeEnrollment,
	// paidEnrollment,
	// stripeSuccess
} = require("../controllers/course");

router.get("/courses", courses);
// Image
router.post("/course/upload-image", uploadImage);
router.post("/course/remove-image", removeImage);
// Course
router.post("/course", requireSignin, isInstructor, createCourse);
router.put("/course/:slug", requireSignin, updateCourse);
router.get("/course/:slug", readCourse);
router.post(
	"/course/video-upload/:instructorId",
	requireSignin,
	formidable(),
	uploadVideo
);
router.post("/course/video-remove/:instructorId", requireSignin, removeVideo);

// Publish or unpublish
router.put("/course/publish/:courseId", requireSignin, publishCourse);
router.put("/course/unpublish/:courseId", requireSignin, unpublishCourse);

// Lesson
router.post("/course/lesson/:slug/:instructorId", requireSignin, addLesson);
router.put("/course/lesson/:slug/:instructorId", requireSignin, updateLesson);
router.put("/course/:slug/:lessonId", requireSignin, removeLesson);

// Enrollment
router.get("/check-enrollment/:courseId", requireSignin, checkEnrollment);
router.post("/free-enrollment/:courseId", requireSignin, freeEnrollment);
// router.post("/paid-enrollment/:courseId", requireSignin, paidEnrollment);
// router.get("/stripe-success/:courseId", requireSignin, stripeSuccess);

module.exports = router;
