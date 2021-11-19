import User from "../models/user";
import { errorHandler } from "../utils/dbErrorHandler";
import { hashPassword, comparePassword } from "../utils/auth";
import jwt from "jsonwebtoken";

// Use async and await because the hashPassword function returns a promise
export const register = async (req, res) => {
	try {
		const { name, email, password } = req.body;

		/* Validation of received values */
		if (!name) return res.status(400).send("Name is required!");
		if (!email) return res.status(400).send("Email is required!");
		if (!password) return res.status(400).send("Password is required!");
		if (password && password.length < 6) {
			return res
				.status(400)
				.send("Password should be at least 6 characters long.");
		}

		// Check if email is already in the database
		let userExists = await User.findOne({ email }).exec();
		if (userExists) return res.status(400).send("Email is taken!");
		/*------ End of validation -----*/

		// Hash the password
		const hashedPassword = await hashPassword(password);

		// Save the user in the database
		const user = new User({
			name,
			email,
			password: hashedPassword,
		});

		await user.save((err, user) => {
			if (err) {
				return res.status(401).json({ error: errorHandler(err) });
			}

			return res.json({ message: "Signup success!" });
		});
	} catch (err) {
		console.log(err);

		res.status(400).send("Error! Please try again.");
	}
};

export const login = async (req, res) => {
	try {
		const { email, password } = req.body;

		// Check if the email exists in the database
		const user = await User.findOne({ email }).exec();
		if (!user) return res.status(400).send("No user found!");

		// Compare incoming password against stored password
		const matchPassword = await comparePassword(password, user.password);

		// Create signed jwt
		const token = jwt.sign({ _id: user._id }, process.env.JWT_SECRET, {
			expiresIn: "7d",
		});

		// Respond to client with user details, token and exclude hashed password
		user.password = undefined;

		// Send the token in a cookie
		res.cookie("token", token, {
			httpOnly: true,
			// secure: true // Only works on https
		});

		// Send the user as a json response
		await res.json({
			user,
			message: "Login success!",
		});
	} catch (error) {
		console.log(error);

		res.status(400).send("Error! Please try again.");
	}
};

export const currentUser = async (req, res) => {
	try {
		const user = await User.findById(req.user._id)
			.select("-password")
			.exec();

		return res.json({ message: "Authorized!" });
	} catch (error) {
		console.log(error);

		res.status(400).send("Cannot authenticate user!");
	}
};

export const logout = (req, res) => {
	try {
		res.clearCookie("token");

		return res.json({
			message: "Signout success! Hope to see you soon.",
		});
	} catch (error) {
		console.log(error);

		res.status(400).send("Error! Please try again.");
	}
};
