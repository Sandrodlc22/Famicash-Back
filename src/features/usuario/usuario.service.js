import bcrypt from 'bcrypt';
import { prisma } from "../../lib/prisma/prisma.js"

export const createUser = async (data) => {
    const hashedPassword = await bcrypt.hash(data.password, 10);
    const newUser = await prisma.usuario.create({
        data: {
            nombre: data.nombre,
            email: data.email,
            passwordHash: hashedPassword,
        }
    })
    return newUser;
}