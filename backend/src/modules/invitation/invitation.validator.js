const validateCreateInvitation = (req, res, next) => {
    const errors = [];
    const { email } = req.body;

    if (!email || email.trim() === '') {
        errors.push('El correo del trabajador es obligatorio.');
    } else {
        const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        if (!emailRegex.test(email.trim())) {
            errors.push('El correo no tiene un formato válido.');
        }
    }

    if (errors.length > 0) return res.status(400).json({ success: false, errors });
    next();
};

module.exports = { validateCreateInvitation };
