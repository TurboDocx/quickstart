import express from 'express';
import htmlToDocx from '@turbodocx/html-to-docx';

const app = express();
app.use(express.json());

app.get('/health', (req, res) => res.json({ ok: true }));

app.post('/convert', async (req, res) => {
  try {
    const { html } = req.body;

    if (!html || typeof html !== 'string') {
      res.status(400).json({ error: 'Request body must include an "html" string field.' });
      return;
    }

    const docxBuffer = await htmlToDocx(html, null, {
      table: { row: { cantSplit: true } },
      footer: true,
      pageNumber: true,
    });

    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'Content-Disposition': 'attachment; filename="document.docx"',
    });

    res.send(Buffer.from(docxBuffer));
  } catch (err) {
    console.error('Conversion error:', err);
    res.status(500).json({ error: 'Failed to convert HTML to DOCX.' });
  }
});

app.listen(3000, () => console.log('Server running on :3000'));
