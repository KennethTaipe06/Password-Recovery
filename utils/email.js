const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS // Contraseña de aplicación
    }
});

const sendResetEmail = (email, resetCode) => {
    const mailOptions = {
        from: 'kennethtaipe@gmail.com',
        to: email,
        subject: 'Password Reset Code',
        text: `Your password reset code is: ${resetCode}`
    };

    return transporter.sendMail(mailOptions);
};

module.exports = sendResetEmail;
