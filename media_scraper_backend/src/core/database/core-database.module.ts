import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Media } from '../entities/media.entity';
import { User } from '../entities/user.entity';
import { ScrapeHistory } from '../entities/scrape-history.entity';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        type: 'mysql',
        host: configService.get('DB_HOST') || 'localhost',
        port: parseInt(configService.get('DB_PORT') || '3306', 10),
        username: configService.get('DB_USER') || 'mysql_user',
        password: configService.get('DB_PASSWORD') || 'password',
        database: configService.get('DB_NAME') || 'media_scraper',
        entities: [Media, User, ScrapeHistory],
        synchronize: configService.get('DB_SYNCHRONIZE') === 'true',
        migrationsRun: false,
        migrations: [`${__dirname}/../../../migrations/*.js`],
        logging: configService.get('NODE_ENV') === 'development',
        autoLoadEntities: true,
      }),
      inject: [ConfigService],
    }),
  ],
  exports: [TypeOrmModule],
})
export class CoreDatabaseModule {}
