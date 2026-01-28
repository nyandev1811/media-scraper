import { Media, MediaType } from '../../core/entities/media.entity';

export interface IScraperStrategy {
  name: string;
  scrape(url: string): Promise<Partial<Media>[]>;
}
