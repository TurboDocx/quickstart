import { Router, Request, Response } from 'express';
import { generateDocx } from '../lib/generateDocx.js';

const router = Router();

router.post('/generate', async (req: Request, res: Response) => {
  try {
    const { html, filename = 'document', options, headerHtml, footerHtml } = req.body;

    if (!html) {
      res.status(400).json({ error: 'html field is required' });
      return;
    }

    const buffer = await generateDocx(html, options, headerHtml, footerHtml);

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${filename}.docx"`,
    );
    res.send(buffer);
  } catch (error) {
    console.error('Document generation failed:', error);
    res.status(500).json({ error: 'Document generation failed' });
  }
});

export default router;
