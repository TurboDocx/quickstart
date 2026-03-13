import express from 'express';
import docxRouter from './routes/docx.js';

const app = express();
app.use(express.json());

app.get('/health', (req, res) => res.json({ ok: true }));
app.use('/docx', docxRouter);

app.listen(3000, () => console.log('Server running on :3000'));
