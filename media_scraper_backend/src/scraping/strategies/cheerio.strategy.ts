import { Injectable, Logger } from '@nestjs/common';
import * as cheerio from 'cheerio';
import axios from 'axios';
import { IScraperStrategy } from './scraper-strategy.interface';
import { Media, MediaType } from '../../core/entities/media.entity';

@Injectable()
export class CheerioScraperStrategy implements IScraperStrategy {
  name = 'Cheerio';
  private readonly logger = new Logger(CheerioScraperStrategy.name);

  async scrape(url: string): Promise<Partial<Media>[]> {
    try {
      const { data } = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
        },
        timeout: 5000,
      });

      const $ = cheerio.load(data);
      const mediaList: Partial<Media>[] = [];

      $('img, source').each((i, el) => {
        const img = $(el);
        let src = img.attr('data-src') || img.attr('srcset') || img.attr('src');

        if (src && src.includes(',')) {
          src = src.split(',')[0].trim().split(' ')[0];
        }

        if (src) {
          const fullUrl = this.normalizeUrl(src, url);
          if (this.isValidUrl(fullUrl)) {
            mediaList.push({
              url: fullUrl,
              sourceUrl: url,
              type: MediaType.IMAGE,
            });
          }
        }
      });

      $('video, video source').each((i, el) => {
        const vid = $(el);
        const src = vid.attr('src');
        const poster = vid.attr('poster');

        if (poster) {
          const fullPoster = this.normalizeUrl(poster, url);
          if (this.isValidUrl(fullPoster)) {
            mediaList.push({
              url: fullPoster,
              sourceUrl: url,
              type: MediaType.IMAGE,
            });
          }
        }

        if (src) {
          const fullUrl = this.normalizeUrl(src, url);
          if (this.isValidUrl(fullUrl)) {
            mediaList.push({
              url: fullUrl,
              sourceUrl: url,
              type: MediaType.VIDEO,
            });
          }
        }
      });

      return mediaList;
    } catch (error) {
      this.logger.error(`Cheerio scrape failed: ${error.message}`);
      throw error;
    }
  }

  private isValidUrl(url: string): boolean {
    return !url.startsWith('data:');
  }

  private normalizeUrl(src: string, baseUrl: string): string {
    try {
      if (src.startsWith('//')) {
        return `https:${src}`;
      }
      if (!src.startsWith('http')) {
        return new URL(src, baseUrl).href;
      }
      return src;
    } catch {
      return '';
    }
  }
}
