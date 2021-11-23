import expressJwt from "express-jwt";
import User from "../models/user";

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
