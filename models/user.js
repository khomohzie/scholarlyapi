import mongoose from "mongoose";

const { Schema } = mongoose;

const userSchema = new Schema(
	{
		name: {
			type: String,
			trim: true,
			required: true,
		},
		email: {
			type: String,
			trim: true,
			required: true,
			unique: true,
		},
		password: {
			type: String,
			required: true,
			minlength: 6,
			maxlength: 64,
		},
		picture: {
			type: String,
			default: "/avatar.png",
		},
		role: {
			type: [String],
			default: ["Subscriber"],
			enum: ["Subscriber", "Instructor", "Admin"],
		},
		passwordResetCode: {
			data: String,
			default: "",
		},
		stripe_account_id: "",
		stripe_seller: {},
		stripeSession: {},
		courses: [{ type: mongoose.Schema.Types.ObjectId, ref: "Course" }],
	},
	{
		timestamps: true,
	}
);

export default mongoose.model("User", userSchema);
