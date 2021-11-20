import User from "../models/user";
import { errorHandler } from "../utils/dbErrorHandler";
import { hashPassword, comparePassword } from "../utils/auth";
import jwt from "jsonwebtoken";
import AWS from "aws-sdk";
import { nanoid } from "nanoid";

const awsConfig = {
	accessKeyId: process.env.AWS_ACCESS_KEY_ID,
	secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
	region: process.env.AWS_REGION,
	apiVersion: process.env.AWS_API_VERSION,
};

const SES = new AWS.SES(awsConfig);

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
		if (!matchPassword) return res.status(400).send("Wrong password!");

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

export const forgotPassword = async (req, res) => {
	try {
		const { email } = req.body;
		// Generate code to reset password
		const shortCode = nanoid(6).toUpperCase();

		// Query database for user
		const user = await User.findOneAndUpdate(
			{ email },
			{ passwordResetCode: shortCode }
		);
		if (!user) return res.status(400).send("User not found!");

		// Prepare for email
		const params = {
			Source: process.env.EMAIL_FROM,
			Destination: {
				ToAddresses: [email],
			},
			Message: {
				Body: {
					Html: {
						Charset: "UTF-8",
						Data: `
						<html>
							<body style="background: #121212; color: #ffffff; 
							border: 1px solid #000000; border-radius: 5px; padding: 10px">
								<h1 style="text-align: center"><b>Hello</b></h1>
								<p>
									No need to worry, you can reset your <b>${process.env.APP_NAME}</b> password by 
									clicking the button below:
								</p>
								<p style="text-align: center">
									<a href="${process.env.CLIENT_URL}/auth/password/reset-password/${shortCode}">
										<button style="text-align: center; padding: 5px; 
										background-color: #047940; border: 1px solid #047940; border-radius: 5px">
											<b style="color: white">Reset password</b>
										</button>
									</a>
								</p>
								<p>
									If you didn't request a password reset, feel free to delete this email and 
									carry on with your studies!
								</p>
								<p>
									All the best,<br />
									The <b>${process.env.APP_NAME}</b> team
								</p>
								<hr />
								<p>This email may contain sensitive information</p>
								<p>${process.env.DOMAIN}</p>
							</body>
						</html>
					`,
					},
				},
				Subject: {
					Charset: "UTF-8",
					Data: "Reset password",
				},
			},
		};

		const emailSent = SES.sendEmail(params).promise();

		emailSent
			.then((data) => {
				console.log(data);
				res.json({ ok: true });
			})
			.catch((err) => {
				console.log(err);
			});
	} catch (error) {
		console.log(error);

		res.status(400).send("Error! Please try again.");
	}
};

export const resetPassword = async (req, res) => {
	try {
		const { email, code, newPassword } = req.body;

		if (newPassword && newPassword.length < 6) {
			return res
				.status(400)
				.send("Password should be at least 6 characters long.");
		}

		const hashedPassword = await hashPassword(newPassword);

		const user = User.findOneAndUpdate(
			{
				email,
				passwordResetCode: code,
			},
			{
				password: hashedPassword,
				passwordResetCode: "",
			}
		)
			.exec()
			.then(async () => {
				// Query database for data associated with inputted email
				const userData = await User.findOne({ email }).exec();
				// Check for an incorrect email and inform the user of their error. MongoDB does not help me
				// do that in the .exec() function, so I chained .then() to handle it manually and .catch() too.
				if (!userData) {
					return res.status(400).send("Email is incorrect!");
				}
				res.json({
					message: "Success! You can login with your new password.",
				});
			})
			.catch((err) => errorHandler(err));
	} catch (err) {
		console.log(err);
		return res.status(400).send("Error! Please try again.");
	}
};
