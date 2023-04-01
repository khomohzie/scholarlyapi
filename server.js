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
const uri =
  process.env.NODE_ENV === "production"
    ? process.env.DATABASE_CLOUD
    : process.env.DATABASE;

mongoose
  .connect(uri)
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

// default route
app.get("/", (req, res) => {
  res.json({
    message: "Welcome to Scholarly API. All routes begin with /api.",
  });
});

// port
const port = process.env.PORT || 8000;

// start listening on port
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
