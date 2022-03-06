import expressJwt from "express-jwt";
import User from "../models/user";
import Course from "../models/course";

// If valid, will return req.user else throw an error.
export const requireSignin = expressJwt({
	getToken: (req, res) => req.cookies.token,
	secret: process.env.JWT_SECRET,
	algorithms: ["HS256"],
});

// Check to see if user is an instructor before they can create courses.
export const isInstructor = async (req, res, next) => {
	try {
		const user = await User.findById(req.user._id).exec();

		if (!user.role.includes("Instructor")) {
			res.sendStatus(403);
		} else {
			next();
		}
	} catch (err) {
		console.log(err);
	}
};

// Check to see if user is enrolled in a course
export const isEnrolled = async (req, res, next) => {
	try {
		const user = await User.findById(req.user._id).exec();

		const course = await Course.findOne({
			slug: req.params.slug,
		}).exec();

		// check if course id is found in user's courses array
		let ids = [];

		for (let i = 0; i < user.courses.length; i++) {
			ids.push(user.courses[i].toString());
		}

		if (!ids.includes(course._id.toString())) {
			res.sendStatus(403);
		} else {
			next();
		}
	} catch (error) {
		console.log(error);
	}
};
