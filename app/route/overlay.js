import {dasboard, overlay} from "../controller/controller.js";
import express from "express";
const router = express.Router();

router.get("/overlay/:uuid", overlay);

export default router;