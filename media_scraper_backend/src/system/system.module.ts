import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { SystemController } from './system.controller';
import { AdminController } from './admin.controller';
import { SystemService } from './system.service';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'scrape-queue',
    }),
  ],
  controllers: [SystemController, AdminController],
  providers: [SystemService],
  exports: [SystemService],
})
export class SystemModule {}
