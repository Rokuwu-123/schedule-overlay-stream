import {dasboard, overlay} from "../controller/controller.js";
import express from "express";
const router = express.Router();

router.get("/", dasboard);

export default router;
