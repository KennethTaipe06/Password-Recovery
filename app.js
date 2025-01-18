require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const redis = require('redis');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const cors = require('cors');

const app = express();
app.use(bodyParser.json());
app.use(cors()); // Habilitar CORS

// Conexión a MongoDB
mongoose.connect(process.env.MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true });

// Conexión a Redis
const redisClient = redis.createClient({ host: process.env.REDIS_HOST, port: process.env.REDIS_PORT });
redisClient.on('error', (err) => {
    console.log('Redis error: ', err);
});

// Modelo de Usuario
const User = mongoose.model('User', new mongoose.Schema({
    email: String,
    password: String
}));

// Configuración de Nodemailer
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS // Contraseña de aplicación
    }
});

// Ruta para verificar si el correo electrónico está en la base de datos y generar un código de 4 dígitos
app.post('/check-email', async (req, res) => {
    const { email } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
        return res.status(404).json({ error: 'Email not found' });
    }

    const resetCode = Math.floor(1000 + Math.random() * 9000).toString(); // Generar un código de 4 dígitos
    redisClient.setex(user._id.toString(), 180, resetCode); // Código válido por 3 minutos

    const mailOptions = {
        from: 'kennethtaipe@gmail.com',
        to: email,
        subject: 'Password Reset Code',
        text: `Your password reset code is: ${resetCode}`
    };

    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            console.error('Error sending email:', error);
            return res.status(500).json({ error: 'Error sending email' });
        }
        res.send({ userId: user._id });
    });
});

// Ruta para restablecer la contraseña
app.patch('/reset-password', async (req, res) => {
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

// Configuración de Swagger
const swaggerUi = require('swagger-ui-express');
const swaggerJsDoc = require('swagger-jsdoc');
const yaml = require('yamljs');

const swaggerDocument = yaml.load('./swagger.yaml');

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

app.listen(process.env.PORT, () => {
    console.log(`Server running on port ${process.env.PORT}`);
});
