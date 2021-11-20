import User from "../models/user";
import queryString from "query-string";
const stripe = require("stripe")(process.env.STRIPE_SECRET);

export const makeInstructor = async (req, res) => {
	try {
		// Query database for user information
		const user = await User.findById(req.user._id).exec();

		// If user does not have stripe_account_id yet, create new account
		if (!user.stripe_account_id) {
			const account = await stripe.accounts.create({ type: "express" });

			user.stripe_account_id = account.id;

			user.save();
		}

		// Create account link based on account id (for frontend to complete onboarding)
		let accountLink = await stripe.accountLinks.create({
			account: user.stripe_account_id,
			refresh_url: process.env.STRIPE_REDIRECT_URL,
			return_url: process.env.STRIPE_REDIRECT_URL,
			type: "account_onboarding",
		});

		// Pre-fill any info such as email (optional), then send url response to frontend
		accountLink = Object.assign(accountLink, {
			"stripe_user[email]": user.email,
		});

		// Then send the account link as response to frontend
		res.send(`${accountLink.url}?${queryString.stringify(accountLink)}`);
	} catch (error) {
		console.log("MAKE INSTRUCTOR ERROR: ", error);
	}
};

export const getAccountStatus = async (req, res) => {
	try {
		const user = await User.findById(req.user._id).exec();

		const account = await stripe.accounts.retrieve(user.stripe_account_id);

		if (!account.charges_enabled) {
			return res.staus(401).send("Unauthorized!");
		} else {
			const statusUpdated = await User.findByIdAndUpdate(
				user._id,
				{
					stripe_seller: account,
					$addToSet: { role: "Instructor" },
				},
				{ new: true }
			)
				.select("-password")
				.exec();

			res.json(statusUpdated);
		}
	} catch (err) {
		console.log(err);
	}
};

export const currentInstructor = async (req, res) => {
	try {
		let user = await User.findById(req.user._id).select("-password").exec();

		if (!user.role.includes("Instructor")) {
			return res.sendStatus(403);
		} else {
			res.json({ message: "Authorized!" });
		}
	} catch (error) {
		console.log(error);
	}
};