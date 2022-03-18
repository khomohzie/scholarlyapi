import Course from "../models/course";
import User from "../models/user";
import Completed from "../models/completed";
import AWS from "aws-sdk";
import { nanoid } from "nanoid";
import slugify from "slugify";
import { translateError } from "../utils/mongo_helper";
import { readFileSync } from "fs";
const stripe = require("stripe")(process.env.STRIPE_SECRET);

const awsConfig = {
	accessKeyId: process.env.AWS_ACCESS_KEY_ID,
	secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
	region: process.env.AWS_REGION,
	apiVersion: process.env.AWS_API_VERSION,
};

const S3 = new AWS.S3(awsConfig);

export const uploadImage = async (req, res) => {
	try {
		const { image } = req.body;
		if (!image) return res.status(400).send("No image!");

		// Prepare the image
		const base64Data = new Buffer.from(
			image.replace(/^data:image\/\w+;base64,/, ""),
			"base64"
		);

		const type = image.split(";")[0].split("/")[1];

		// image params
		const params = {
			Bucket: "scholarly-bucket",
			Key: `${nanoid()}.${type}`,
			Body: base64Data,
			ACL: "public-read",
			ContentEncoding: "base64",
			ContentType: `image/${type}`,
		};

		// Upload to s3
		S3.upload(params, (err, data) => {
			if (err) {
				console.log(err);
				return res.sendStatus(400);
			}

			res.send(data);
		});
	} catch (error) {
		console.log(error);
	}
};

export const removeImage = async (req, res) => {
	try {
		const { image } = req.body;

		const params = {
			Bucket: image.Bucket,
			Key: image.Key,
		};

		// Send remove request to s3
		S3.deleteObject(params, (err, data) => {
			if (err) {
				console.log(err);
				res.sendStatus(400);
			}
			res.send({ ok: true });
		});
	} catch (error) {
		console.log(error);
	}
};

export const createCourse = async (req, res) => {
	try {
		const alreadyExists = await Course.findOne({
			slug: slugify(req.body.name.toLowerCase()),
		});
		if (alreadyExists) return res.status(400).send("Title is taken!");

		const course = new Course({
			slug: slugify(req.body.name),
			instructor: req.user._id,
			description: req.body.editorDescription,
			...req.body,
		});
		await course.save((err, course) => {
			if (err) return res.status(400).send(translateError(err));

			return res.json(course);
		});

		// This adds a created course to the owner's course list
		// so they don't need to enroll or pay for their own course.
		await User.findByIdAndUpdate(
			req.user._id,
			{
				$addToSet: { courses: course._id },
			},
			{ new: true }
		).exec();
	} catch (error) {
		console.log(error);
		return res.status(400).send("Failed to create course! Try again.");
	}
};

export const readCourse = async (req, res) => {
	try {
		const course = await Course.findOne({ slug: req.params.slug })
			.populate("instructor", "_id name")
			.exec();

		res.json(course);
	} catch (error) {
		console.log(error);
	}
};

export const uploadVideo = async (req, res) => {
	try {
		if (req.user._id != req.params.instructorId)
			return res.status(401).send("Unauthorized!");

		const { video } = req.files;

		if (!video) return res.status(400).send("No video!");

		const params = {
			Bucket: "scholarly-bucket",
			Key: `${nanoid()}.${video.type.split("/")[1]}`, // e.g video/mp4
			Body: readFileSync(video.path),
			ACL: "public-read",
			ContentType: video.type,
		};

		S3.upload(params, (err, data) => {
			if (err) {
				console.log(err);
				res.sendStatus(400);
			}

			res.send(data);
		});
	} catch (error) {
		console.log(error);
	}
};

export const removeVideo = async (req, res) => {
	try {
		if (req.user._id != req.params.instructorId)
			return res.status(401).send("Unauthorized!");

		const { Bucket, Key } = req.body;

		const params = {
			Bucket,
			Key,
		};

		S3.deleteObject(params, (err, data) => {
			if (err) {
				console.log(err);
				res.sendStatus(400);
			}

			res.send({ ok: true });
		});
	} catch (error) {
		console.log(error);
	}
};

export const addLesson = async (req, res) => {
	try {
		const { slug, instructorId } = req.params;
		const { title, content, video } = req.body;

		if (req.user._id != instructorId)
			return res.status(401).send("Unauthorized!");

		const updated = await Course.findOneAndUpdate(
			{ slug },
			{
				$push: {
					lessons: { title, content, video, slug: slugify(title) },
				},
			},
			{ new: true }
		)
			.populate("instructor", "_id name")
			.exec();

		res.json(updated);
	} catch (error) {
		console.log(error);
		return res.status(400).send("Failed to add lesson!");
	}
};

export const updateCourse = async (req, res) => {
	try {
		const { slug } = req.params;

		const course = await Course.findOne({ slug }).exec();

		if (req.user._id != course.instructor)
			return res.status(400).send("Unauthorized!");

		const updated = await Course.findOneAndUpdate(
			{ slug },
			{ ...req.body, description: req.body.editorDescription },
			{
				new: true,
			}
		).exec();

		res.json(updated);
	} catch (error) {
		console.log(error);
		return res.status(400).send(error.message);
	}
};

export const publishCourse = async (req, res) => {
	try {
		const { courseId } = req.params;

		const course = await Course.findById(courseId)
			.select("instructor")
			.exec();

		if (course.instructor._id != req.user._id) {
			return res.status(400).send("Unauthorized!");
		}

		const updated = await Course.findByIdAndUpdate(
			courseId,
			{ published: true },
			{ new: true }
		).exec();

		res.json(updated);
	} catch (err) {
		console.log(err);
		return res.status(400).send("Publish course failed!");
	}
};

export const unpublishCourse = async (req, res) => {
	try {
		const { courseId } = req.params;

		const course = await Course.findById(courseId)
			.select("instructor")
			.exec();

		if (course.instructor._id != req.user._id) {
			return res.status(400).send("Unauthorized!");
		}

		const updated = await Course.findByIdAndUpdate(
			courseId,
			{ published: false },
			{ new: true }
		).exec();

		res.json(updated);
	} catch (err) {
		console.log(err);
		return res.status(400).send("Failed to unpublish course!");
	}
};

export const updateLesson = async (req, res) => {
	try {
		const { slug } = req.params;
		const { _id, title, content, video, free_preview } = req.body;

		const course = await Course.findOne({ slug })
			.select("instructor")
			.exec();

		if (course.instructor._id != req.user._id) {
			return res.status(400).send("Unauthorized!");
		}

		const updated = await Course.updateOne(
			{ "lessons._id": _id },
			{
				$set: {
					"lessons.$.title": title,
					"lessons.$.content": content,
					"lessons.$.video": video,
					"lessons.$.free_preview": free_preview,
				},
			},
			{ new: true }
		).exec();

		res.json({ ok: true });
	} catch (err) {
		console.log(err);
		return res.status(400).send("Update lesson failed");
	}
};

export const removeLesson = async (req, res) => {
	try {
		const { slug, lessonId } = req.params;

		const course = await Course.findOne({ slug }).exec();

		if (req.user._id != course.instructor)
			return res.status(400).send("Unauthorized!");

		const deletedCourse = await Course.findByIdAndUpdate(course._id, {
			$pull: { lessons: { _id: lessonId } },
		}).exec();

		res.json({ ok: true });
	} catch (error) {
		console.log(error);
	}
};

export const courses = async (req, res) => {
	const limit = req.query.limit ? parseInt(req.query.limit) : undefined;

	const all = await Course.find({ published: true })
		.populate("instructor", "_id name")
		.limit(limit)
		.exec();

	res.json(all);
};

export const checkEnrollment = async (req, res) => {
	const { courseId } = req.params;

	// find courses of the currently logged in user
	const user = await User.findById(req.user._id).exec();

	// check if course id is found in user courses array
	let ids = [];
	let coursesLength = user.courses && user.courses.length;

	for (let i = 0; i < coursesLength; i++) {
		ids.push(user.courses[i].toString());
	}

	res.json({
		status: ids.includes(courseId),
		course: await Course.findById(courseId).exec(),
	});
};

export const freeEnrollment = async (req, res) => {
	try {
		// check if course is free or paid
		const course = await Course.findById(req.params.courseId).exec();
		if (course.paid) return;

		const result = await User.findByIdAndUpdate(
			req.user._id,
			{
				$addToSet: { courses: course._id },
			},
			{ new: true }
		).exec();

		res.json({
			message: "Congratulations! Enrollment successful.",
			course,
		});
	} catch (error) {
		console.log("free enrollment err", error);
		return res.status(400).send("Enrollment failed!");
	}
};

export const paidEnrollment = async (req, res) => {
	try {
		// check if course is free or paid
		const course = await Course.findById(req.params.courseId)
			.populate("instructor")
			.exec();
		if (!course.paid) return;

		// Application fee 30%
		const fee = (course.price * 30) / 100;

		// Create stripe session
		const session = await stripe.checkout.sessions.create({
			payment_method_types: ["card"],

			// purchase details
			line_items: [
				{
					name: course.name,
					amount: Math.round(course.price.toFixed(2) * 100),
					currency: "usd",
					quantity: 1,
				},
			],

			// charge buyer and transfer remaining balance to seller (after fee)
			payment_intent_data: {
				application_fee_amount: Math.round(fee.toFixed(2) * 100),
				transfer_data: {
					destination: course.instructor.stripe_account_id,
				},
			},

			// redirect url after successful payment
			success_url: `${process.env.STRIPE_SUCCESS_URL}/${course._id}`,
			cancel_url: process.env.STRIPE_CANCEL_URL,
		});

		await User.findByIdAndUpdate(req.user._id, {
			stripeSession: session,
		}).exec();

		res.send(session.id);
	} catch (error) {
		console.log("paid enrollment error", error);
		return res.status(400).send("Enrollment failed!");
	}
};

export const stripeSuccess = async (req, res) => {
	try {
		const course = await Course.findById(req.params.courseId).exec();

		// Get user from db to get stripe session id
		const user = await User.findById(req.user._id).exec();
		// If no stripe session return
		if (!user.stripeSession.id) return res.sendStatus(400);

		// Retrieve Stripe session data from Stripe
		const session = await stripe.checkout.sessions.retrieve(
			user.stripeSession.id
		);

		// If session payment status is paid, push course to user's course []
		if (session.payment_status === "paid") {
			await User.findByIdAndUpdate(user._id, {
				$addToSet: { courses: course._id },
				$set: { stripeSession: {} },
			}).exec();
		}

		res.json({ success: true, course });
	} catch (error) {
		console.log("STRIPE success error", error);
		res.json({ success: false });
	}
};

export const userCourses = async (req, res) => {
	const user = await User.findById(req.user._id).exec();

	const courses = await Course.find({ _id: { $in: user.courses } })
		.populate("instructor", "_id name")
		.exec();

	res.json(courses);
};

export const markCompleted = async (req, res) => {
	try {
		const { courseId, lessonId } = req.body;

		// Find if user with that course is already created
		const existing = await Completed.findOne({
			user: req.user._id,
			course: courseId,
		}).exec();

		if (existing) {
			// update
			const updated = await Completed.findOneAndUpdate(
				{
					user: req.user._id,
					course: courseId,
				},
				{
					$addToSet: { lessons: lessonId },
				}
			).exec();

			res.json({ ok: true });
		} else {
			// create
			const created = await new Completed({
				user: req.user._id,
				course: courseId,
				lessons: lessonId,
			}).save();

			res.json({ ok: true });
		}
	} catch (error) {
		console.log(error);
	}
};

export const listCompleted = async (req, res) => {
	try {
		const list = await Completed.findOne({
			user: req.user._id,
			course: req.body.courseId,
		}).exec();

		list && res.json(list.lessons);
	} catch (error) {
		console.log(error);
	}
};

export const markIncomplete = async (req, res) => {
	try {
		const { courseId, lessonId } = req.body;

		const updated = await Completed.findOneAndUpdate(
			{ user: req.user._id, course: courseId },
			{
				$pull: { lessons: lessonId },
			}
		).exec();

		res.json({ ok: true });
	} catch (error) {
		console.log(error);
	}
};
