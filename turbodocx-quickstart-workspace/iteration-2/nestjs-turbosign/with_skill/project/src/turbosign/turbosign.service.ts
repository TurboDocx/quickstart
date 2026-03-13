import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { TurboSign } from '../lib/turbodocx';
import { TurboDocxError } from '@turbodocx/sdk';

@Injectable()
export class TurboSignService {
  /**
   * Send a document for e-signature.
   * Accepts a PDF buffer, document name, recipients array, and signature fields.
   */
  async sendSignature(
    file: Buffer,
    documentName: string,
    recipients: { name: string; email: string; signingOrder: number }[],
    fields: { type: string; recipientEmail: string; template: Record<string, any> }[],
  ) {
    try {
      const result = await TurboSign.sendSignature({
        file,
        documentName,
        recipients,
        fields,
      });
      return result;
    } catch (error) {
      // Map SDK errors to NestJS HTTP exceptions
      if (error instanceof TurboDocxError) {
        if (error.status === 400) {
          throw new BadRequestException(error.message);
        }
        if (error.status === 404) {
          throw new NotFoundException(error.message);
        }
      }
      throw error;
    }
  }

  /**
   * Get the signing status of a document by its ID.
   */
  async getStatus(documentId: string) {
    try {
      const status = await TurboSign.getStatus(documentId);
      return status;
    } catch (error) {
      if (error instanceof TurboDocxError) {
        if (error.status === 404) {
          throw new NotFoundException(`Document ${documentId} not found`);
        }
      }
      throw error;
    }
  }
}
