import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Media } from '../core/entities/media.entity';
import { MediaService } from './media.service';
import { MediaController } from './media.controller';

import { UserModule } from '../user/user.module';

@Module({
  imports: [TypeOrmModule.forFeature([Media]), UserModule],
  controllers: [MediaController],
  providers: [MediaService],
  exports: [MediaService],
})
export class MediaModule {}
