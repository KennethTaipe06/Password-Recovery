const express = require('express');
const bcrypt = require('bcrypt');
const User = require('../models/User');
const sendResetEmail = require('../utils/email');

const router = express.Router();

module.exports = (redisClient) => {
    // Ruta para verificar si el correo electrónico está en la base de datos y generar un código de 4 dígitos
    router.post('/check-email', async (req, res) => {
        const { email } = req.body;
        const user = await User.findOne({ email });

        if (!user) {
            return res.status(404).json({ error: 'Email not found' });
        }

        const resetCode = Math.floor(1000 + Math.random() * 9000).toString(); // Generar un código de 4 dígitos
        redisClient.setex(user._id.toString(), 180, resetCode); // Código válido por 3 minutos

        try {
            await sendResetEmail(email, resetCode);
            res.send({ userId: user._id });
        } catch (error) {
            console.error('Error sending email:', error);
            res.status(500).json({ error: 'Error sending email' });
        }
    });

    // Ruta para restablecer la contraseña
    router.patch('/reset-password', async (req, res) => {
        const { userId, resetCode, newPassword } = req.body;

        redisClient.get(userId, async (err, storedCode) => {
            if (err || storedCode !== resetCode) {
                return res.status(400).json({ success: false, message: 'Invalid or expired reset code' });
            }

            const hashedPassword = await bcrypt.hash(newPassword, 10);
            await User.updateOne({ _id: userId }, { password: hashedPassword });
            redisClient.del(userId); // Eliminar el código usado
            res.json({ success: true, message: 'Password updated successfully' });
        });
    });

    return router;
};
