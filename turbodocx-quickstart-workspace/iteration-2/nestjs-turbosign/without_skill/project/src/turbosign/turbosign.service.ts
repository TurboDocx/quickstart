import { Injectable, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { SendForSigningDto } from './dto/send-for-signing.dto';

/**
 * TurboSignService wraps the TurboDocx TurboSign REST API.
 *
 * Required environment variables:
 *   TURBODOCX_API_KEY   – your TurboDocx API key
 *   TURBODOCX_BASE_URL  – API base URL (default: https://api.turbodocx.com)
 */
@Injectable()
export class TurboSignService {
  private readonly logger = new Logger(TurboSignService.name);
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor() {
    this.apiKey = process.env.TURBODOCX_API_KEY || '';
    this.baseUrl =
      process.env.TURBODOCX_BASE_URL || 'https://api.turbodocx.com';

    if (!this.apiKey) {
      this.logger.warn(
        'TURBODOCX_API_KEY is not set. TurboSign requests will fail.',
      );
    }
  }

  /**
   * Send a document for digital signature via TurboSign.
   */
  async sendForSigning(dto: SendForSigningDto) {
    const url = `${this.baseUrl}/v1/turbosign/send`;

    const body = {
      documentId: dto.documentId,
      documentName: dto.documentName,
      message: dto.message,
      signers: dto.signers.map((s) => ({
        name: s.name,
        email: s.email,
      })),
    };

    this.logger.log(
      `Sending document ${dto.documentId} for signing to ${dto.signers.length} signer(s)`,
    );

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      this.logger.error(
        `TurboSign send failed: ${response.status} ${errorBody}`,
      );
      throw new HttpException(
        {
          message: 'Failed to send document for signing',
          statusCode: response.status,
          detail: errorBody,
        },
        response.status >= 500
          ? HttpStatus.BAD_GATEWAY
          : HttpStatus.BAD_REQUEST,
      );
    }

    return response.json();
  }

  /**
   * Check the signature status of a previously sent document.
   */
  async getSignatureStatus(signatureRequestId: string) {
    const url = `${this.baseUrl}/v1/turbosign/status/${encodeURIComponent(signatureRequestId)}`;

    this.logger.log(
      `Checking signature status for request ${signatureRequestId}`,
    );

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
      },
    });

    if (!response.ok) {
      const errorBody = await response.text();
      this.logger.error(
        `TurboSign status check failed: ${response.status} ${errorBody}`,
      );
      throw new HttpException(
        {
          message: 'Failed to retrieve signature status',
          statusCode: response.status,
          detail: errorBody,
        },
        response.status === 404
          ? HttpStatus.NOT_FOUND
          : HttpStatus.BAD_GATEWAY,
      );
    }

    return response.json();
  }
}
