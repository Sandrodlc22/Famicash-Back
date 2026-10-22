import { AppError } from "../../lib/errors/app-error.js";
import { createUser } from "./usuario.service.js";

export const create = async (req, res) => {
    const data = req.body;
    if (!data.nombre || !data.email || !data.password) throw new AppError('Nombre, Email, Password son obligatorios.', 400);
    const user = await createUser(data);
    res.status(201).json(user);
}