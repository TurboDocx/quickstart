import { TurboSign } from '@turbodocx/sdk';

// Configure TurboSign with environment variables.
// Make sure dotenv is loaded before this module is imported (see main.ts).
TurboSign.configure({
  apiKey: process.env.TURBODOCX_API_KEY!,
  orgId: process.env.TURBODOCX_ORG_ID!,
  senderEmail: process.env.TURBODOCX_SENDER_EMAIL!,
  senderName: process.env.TURBODOCX_SENDER_NAME,
});

export { TurboSign };
