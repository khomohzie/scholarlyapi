import express from "express";

const router = express.Router();

// middleware
import { requireSignin } from "../middlewares";

// controllers
import {
	makeInstructor,
	deleteInstructor,
	getAccountStatus,
	currentInstructor,
	instructorCourses,
	studentCount,
	instructorBalance,
	instructorPayoutSettings,
} from "../controllers/instructor";

router.post("/make-instructor", requireSignin, makeInstructor);
router.delete("/delete-instructor", requireSignin, deleteInstructor);
router.post("/get-account-status", requireSignin, getAccountStatus);
router.get("/current-instructor", requireSignin, currentInstructor);

router.get("/instructor-courses", requireSignin, instructorCourses);

router.post("/instructor/student-count", studentCount);

router.get("/instructor/balance", requireSignin, instructorBalance);

router.get(
	"/instructor/payout-settings",
	requireSignin,
	instructorPayoutSettings
);

module.exports = router;
