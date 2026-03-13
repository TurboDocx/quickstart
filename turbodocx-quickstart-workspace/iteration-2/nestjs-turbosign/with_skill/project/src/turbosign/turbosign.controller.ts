import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { TurboSignService } from './turbosign.service';
import { SendSignatureDto } from './dto/send-signature.dto';

@Controller('signatures')
export class TurboSignController {
  constructor(private readonly turboSignService: TurboSignService) {}

  /**
   * POST /signatures/send
   * Send a PDF document for e-signature.
   * Expects multipart/form-data with a "file" field (PDF) and JSON body fields.
   */
  @Post('send')
  @UseInterceptors(FileInterceptor('file'))
  async sendSignature(
    @UploadedFile() file: Express.Multer.File,
    @Body() body: SendSignatureDto,
  ) {
    if (!file) {
      throw new BadRequestException('A PDF file is required');
    }

    // Parse the JSON strings from the multipart form body
    const recipients = JSON.parse(body.recipients);
    const fields = JSON.parse(body.fields);

    const result = await this.turboSignService.sendSignature(
      file.buffer,
      body.documentName,
      recipients,
      fields,
    );

    return result;
  }

  /**
   * GET /signatures/:id/status
   * Check the signing status of a document.
   */
  @Get(':id/status')
  async getStatus(@Param('id') id: string) {
    return this.turboSignService.getStatus(id);
  }
}
