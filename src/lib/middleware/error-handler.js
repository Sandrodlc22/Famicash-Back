import { AppError } from '../errors/app-error.js';

export const errorHandler = (
    err,
    req,
    res,
    next
) => {
    if (err instanceof AppError) {
        res.status(err.statusCode).json({
            error: err.message,
        });

        return;
    }

    console.error(err);

    res.status(500).json({
        error: 'Error interno del servidor.',
    });
};
