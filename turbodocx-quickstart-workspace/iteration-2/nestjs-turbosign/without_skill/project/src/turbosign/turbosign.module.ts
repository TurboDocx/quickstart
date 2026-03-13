import { Module } from '@nestjs/common';
import { TurboSignController } from './turbosign.controller';
import { TurboSignService } from './turbosign.service';

@Module({
  controllers: [TurboSignController],
  providers: [TurboSignService],
  exports: [TurboSignService],
})
export class TurboSignModule {}
