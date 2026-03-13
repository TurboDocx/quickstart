import { Controller, Post, Get, Body, Param } from '@nestjs/common';
import { TurboSignService } from './turbosign.service';
import { SendForSigningDto } from './dto/send-for-signing.dto';

@Controller('turbosign')
export class TurboSignController {
  constructor(private readonly turboSignService: TurboSignService) {}

  /**
   * POST /turbosign/send
   * Send a document for digital signature.
   */
  @Post('send')
  async sendForSigning(@Body() dto: SendForSigningDto) {
    return this.turboSignService.sendForSigning(dto);
  }

  /**
   * GET /turbosign/status/:id
   * Check the signature status of a request.
   */
  @Get('status/:id')
  async getStatus(@Param('id') signatureRequestId: string) {
    return this.turboSignService.getSignatureStatus(signatureRequestId);
  }
}
