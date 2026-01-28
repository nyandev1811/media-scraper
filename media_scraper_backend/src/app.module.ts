import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MediaModule } from './media/media.module';
import { ScrapingModule } from './scraping/scraping.module';
import { SystemModule } from './system/system.module';
import { CoreDatabaseModule } from './core/database/core-database.module';
import { CoreQueueModule } from './core/queue/core-queue.module';
import { CoreCommonModule } from './core/common/core-common.module';
import { HealthController } from './health/health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    CoreDatabaseModule,
    CoreQueueModule,
    CoreCommonModule,
    MediaModule,
    ScrapingModule,
    SystemModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
