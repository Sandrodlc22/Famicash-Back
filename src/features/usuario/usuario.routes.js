import { Router } from "express";
import { create } from "./usuario.controller.js";

const router = Router();

router.post(
    "/",
    create,
)

export default router;