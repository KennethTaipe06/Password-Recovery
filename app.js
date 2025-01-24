require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const swaggerUi = require('swagger-ui-express');
const yaml = require('yamljs');
const connectDB = require('./config/db');
const connectRedis = require('./config/redis');
const emailRoutes = require('./routes/emailRoutes');
const userRoutes = require('./routes/userRoutes');
const { Kafka } = require('kafkajs');

const app = express();
app.use(bodyParser.json());
app.use(cors()); // Habilitar CORS

// Conexión a MongoDB
connectDB();

// Conexión a Redis
const redisClient = connectRedis();

// Configuración de Kafka
const kafka = new Kafka({
    clientId: 'password-recovery-service',
    brokers: [process.env.KAFKA_BROKER]
});
const producer = kafka.producer();
producer.connect().catch(err => console.error('Error connecting to Kafka:', err));

// Configuración de Swagger
const swaggerDocument = yaml.load('./swagger.yaml');
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// Rutas
app.use('/email', emailRoutes(redisClient, producer));
app.use('/user', userRoutes(redisClient));

app.listen(process.env.PORT, () => {
    console.log(`Server running on port ${process.env.PORT}`);
});
