require("dotenv").config();
import express from "express";
import cors from "cors";
import { readdirSync } from "fs";
import mongoose from "mongoose";
import csrf from "csurf";
import cookieParser from "cookie-parser";
const morgan = require("morgan");

const csrfProtection = csrf({ cookie: true });

// create express app
const app = express();

// apply middlewares
app.use(cors());
app.use(express.json({ limit: "5mb" }));
// parse cookies: we need this because "cookie" is true in csrfProtection
app.use(cookieParser());
app.use(morgan("dev"));

// database
mongoose
	.connect(process.env.DATABASE)
	.then(() => console.log("DB connected"))
	.catch((err) => console.log("Error from DB: ", err));

// routes
readdirSync("./routes").map((fileName) => {
	app.use("/api", require(`./routes/${fileName}`));
});

// csrf
app.use(csrfProtection);

app.get("/api/csrf-token", (req, res) => {
	res.json({ csrfToken: req.csrfToken() });
});

// port
const port = process.env.PORT || 8000;

// start listening on port
app.listen(port, () => {
	console.log(`Server is running on port ${port}`);
});
