const express = require('express');
const bcrypt = require('bcrypt');
const User = require('../models/User');
const sendResetEmail = require('../utils/email');

const router = express.Router();

module.exports = (redisClient, producer) => {
    // Ruta para verificar si el correo electrónico está en la base de datos y generar un código de 4 dígitos
    router.post('/check-email', async (req, res) => {
        const { email } = req.body;
        const user = await User.findOne({ email });

        if (!user) {
            return res.status(404).json({ error: 'Email not found' });
        }

        const resetCode = Math.floor(1000 + Math.random() * 9000).toString(); // Generar un código de 4 dígitos
        const hashedCode = await bcrypt.hash(resetCode, 10); // Encriptar el código
        redisClient.setex(user._id.toString(), 180, hashedCode); // Código válido por 3 minutos

        try {
            await sendResetEmail(email, resetCode);
            await producer.send({
                topic: 'pass.recovery',
                messages: [
                    { value: JSON.stringify({ userId: user._id, resetCode: hashedCode }) }
                ]
            });
            res.send({ userId: user._id });
        } catch (error) {
            console.error('Error sending email or Kafka message:', error);
            res.status(500).json({ error: 'Error sending email or Kafka message' });
        }
    });

    return router;
};
