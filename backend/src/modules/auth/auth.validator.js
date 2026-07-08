/**
 * Validadores para los endpoints de autenticación.
 */

const validateUsername = (username, errors) => {
    if (!username || username.trim() === '') {
        errors.push('El nombre de usuario es obligatorio.');
    } else {
        const usernameRegex = /^\w+$/;
        if (!usernameRegex.test(username.trim())) {
            errors.push('El nombre de usuario solo puede contener letras, números y guión bajo (_).');
        } else if (username.trim().length < 4) {
            errors.push('El nombre de usuario debe tener al menos 4 caracteres.');
        } else if (username.trim().length > 50) {
            errors.push('El nombre de usuario no puede superar 50 caracteres.');
        }
    }
};

const validateEmail = (email, errors) => {
    if (!email || email.trim() === '') {
        errors.push('El correo electrónico es obligatorio.');
    } else {
        const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        if (!emailRegex.test(email.trim())) {
            errors.push('El correo electrónico no tiene un formato válido.');
        }
    }
};

const validateFullName = (fullName, errors) => {
    if (!fullName || fullName.trim() === '') {
        errors.push('El nombre completo es obligatorio.');
    } else {
        const nameRegex = /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/;
        if (!nameRegex.test(fullName.trim())) {
            errors.push('El nombre completo solo puede contener letras y espacios.');
        }
    }
};

const validateRegister = (req, res, next) => {
    const errors = [];
    const { username, email, fullName, password, confirmPassword } = req.body;

    validateUsername(username, errors);
    validateEmail(email, errors);
    validateFullName(fullName, errors);

    // Contraseña
    if (!password || password.length < 6) {
        errors.push('La contraseña debe tener al menos 6 caracteres.');
    }

    if (password !== confirmPassword) {
        errors.push('Las contraseñas no coinciden.');
    }

    if (errors.length > 0) return res.status(400).json({ success: false, errors });
    next();
};

const validateLogin = (req, res, next) => {
    const errors = [];
    const { identifier, password } = req.body;

    if (!identifier || identifier.trim() === '') {
        errors.push('El usuario o correo es obligatorio.');
    }

    if (!password || password.trim() === '') {
        errors.push('La contraseña es obligatoria.');
    }

    if (errors.length > 0) return res.status(400).json({ success: false, errors });
    next();
};

module.exports = { validateRegister, validateLogin };
