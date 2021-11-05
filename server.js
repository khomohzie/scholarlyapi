require("dotenv").config();
import express from 'express';
import cors from 'cors';
import { readdirSync } from 'fs';
const morgan = require('morgan');

// create express app
const app = express();

// apply middlewares
app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

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