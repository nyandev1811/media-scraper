import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import { join } from 'path';
import { Media } from '../entities/media.entity';
import { User } from '../entities/user.entity';
import { ScrapeHistory } from '../entities/scrape-history.entity';

config();

export const AppDataSource = new DataSource({
  type: 'mysql',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  username: process.env.DB_USER || 'mysql_user',
  password: process.env.DB_PASSWORD || 'password',
  database: process.env.DB_NAME || 'media_scraper',
  entities: [Media, User, ScrapeHistory],
  migrations: [join(__dirname, '../../../migrations/*.ts')],
  synchronize: process.env.DB_SYNCHRONIZE === 'true',
  logging: true,
});
