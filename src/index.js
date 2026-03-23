import express from 'express';

const PORT = 8000;
const app = express();

app.use(express.json());

app.get('/', (req, res) => {
    res.send('Welcome to the Sportz API!');
});

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});