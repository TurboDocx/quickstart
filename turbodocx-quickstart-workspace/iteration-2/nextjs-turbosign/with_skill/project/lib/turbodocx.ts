import { TurboSign } from '@turbodocx/sdk';

// Next.js automatically loads .env.local — no dotenv import needed.
TurboSign.configure({
  apiKey: process.env.TURBODOCX_API_KEY!,
  orgId: process.env.TURBODOCX_ORG_ID!,
  senderEmail: process.env.TURBODOCX_SENDER_EMAIL!,
  senderName: process.env.TURBODOCX_SENDER_NAME,
});

export { TurboSign };
