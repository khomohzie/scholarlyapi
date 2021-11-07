require("dotenv").config();
import express from 'express';
import cors from 'cors';
import { readdirSync } from 'fs';
import mongoose from 'mongoose';
const morgan = require('morgan');

// create express app
const app = express();

// apply middlewares
app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

// database
mongoose.connect(process.env.DATABASE)
    .then(() => console.log("DB connected"))
    .catch((err) => console.log("Error from DB: ", err));

// routes
readdirSync("./routes").map((fileName) => {
    app.use("/api", require(`./routes/${fileName}`));
});

// port
const port = process.env.PORT || 8000;

// start listening on port
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});