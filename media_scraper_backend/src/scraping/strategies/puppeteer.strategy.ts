import { Injectable, Logger } from '@nestjs/common';
import puppeteer from 'puppeteer';
import { IScraperStrategy } from './scraper-strategy.interface';
import { Media, MediaType } from '../../core/entities/media.entity';
import { getPuppeteerConfig, getRandomUserAgent } from '../../core/config/puppeteer-alpine.config';

@Injectable()
export class PuppeteerScraperStrategy implements IScraperStrategy {
  name = 'Puppeteer';
  private readonly logger = new Logger(PuppeteerScraperStrategy.name);

  async scrape(url: string): Promise<Partial<Media>[]> {
    let browser;
    try {
      this.logger.log('Launching Puppeteer (Alpine optimized)...');
      const config = getPuppeteerConfig(false);
      browser = await puppeteer.launch(config);

      const page = await browser.newPage();
      await page.setViewport(config.defaultViewport);
      await page.setUserAgent(getRandomUserAgent());

      await page.setRequestInterception(true);
      page.on('request', (req) => {
        if (['font', 'stylesheet'].includes(req.resourceType())) {
          req.abort();
        } else {
          req.continue();
        }
      });

      await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });

      await page.evaluate(async () => {
        await new Promise<void>((resolve) => {
          let totalHeight = 0;
          const distance = 100;
          const timer = setInterval(() => {
            const scrollHeight = document.body.scrollHeight;
            window.scrollBy(0, distance);
            totalHeight += distance;

            if (totalHeight >= scrollHeight - window.innerHeight) {
              clearInterval(timer);
              resolve();
            }
          }, 100);
        });
      });

      await new Promise((r) => setTimeout(r, 2000));

      const extractedMedia = await page.evaluate(() => {
        const results: { url: string; type: 'IMAGE' | 'VIDEO' }[] = [];
        const seen = new Set<string>();

        const add = (link: string, type: 'IMAGE' | 'VIDEO') => {
          if (!link || link.startsWith('data:') || seen.has(link)) return;
          seen.add(link);
          results.push({ url: link, type });
        };

        document.querySelectorAll('img').forEach((img) => {
          if (img.naturalWidth > 200 && img.naturalHeight > 200) {
            const bestSrc = img.srcset
              ? img.srcset.split(',').pop()?.split(' ')[0] || img.src
              : img.src;
            add(bestSrc, 'IMAGE');
          }
        });

        document.querySelectorAll('*').forEach((el) => {
          const bg = window.getComputedStyle(el).backgroundImage;
          if (bg && bg.startsWith('url(')) {
            const url = bg.slice(4, -1).replace(/["']/g, '');
            if (url.length > 20) add(url, 'IMAGE');
          }
        });

        document.querySelectorAll('video, video source').forEach((el) => {
          const vid = el as HTMLVideoElement | HTMLSourceElement;
          if (vid.src) add(vid.src, 'VIDEO');
        });

        return results;
      });

      return extractedMedia.map((item) => ({
        url: item.url,
        sourceUrl: url,
        type: item.type === 'IMAGE' ? MediaType.IMAGE : MediaType.VIDEO,
        title: `Scraped ${item.type}`,
      }));
    } catch (error) {
      this.logger.error(`Puppeteer scrape failed: ${error.message}`);
      throw error;
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }
}
