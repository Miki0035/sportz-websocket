import express from 'express';
import matchRouter from './routes/matches.js';
import 'dotenv/config';

if (!process.env.PORT) {
    throw new Error('PORT is not defined in .env file');
}
const PORT = process.env.PORT;
const app = express();

app.use(express.json());
app.use("/api/matches", matchRouter);

app.get('/', (req, res) => {
    res.send('Welcome to the Sportz API!');
});

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});