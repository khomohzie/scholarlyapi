import express from "express";

const router = express.Router();

// middleware
import { requireSignin } from "../middlewares";

const { uploadImage, removeImage } = require("../controllers/course");

router.post("/course/upload-image", uploadImage);
router.post("/course/remove-image", removeImage);

module.exports = router;
