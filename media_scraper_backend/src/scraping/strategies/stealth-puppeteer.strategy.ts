import { Injectable, Logger } from '@nestjs/common';
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { IScraperStrategy } from './scraper-strategy.interface';
import { Media, MediaType } from '../../core/entities/media.entity';
import { getPuppeteerConfig, getRandomUserAgent } from '../../core/config/puppeteer-alpine.config';

puppeteer.use(StealthPlugin());

@Injectable()
export class StealthPuppeteerStrategy implements IScraperStrategy {
  name = 'Stealth Puppeteer';
  private readonly logger = new Logger(StealthPuppeteerStrategy.name);

  async scrape(url: string): Promise<Partial<Media>[]> {
    let browser;
    let page;

    try {
      const config = getPuppeteerConfig(true); // Stealth mode
      browser = await puppeteer.launch(config);

      page = await browser.newPage();

      await this.setupStealthMode(page);
      await this.randomizeFingerprint(page);

      await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });

      await new Promise((resolve) => setTimeout(resolve, 2000 + Math.random() * 3000));

      await page.evaluate(async () => {
        await new Promise<void>((resolve) => {
          let totalHeight = 0;
          const distance = 200;
          const timer = setInterval(
            () => {
              const scrollHeight = document.body.scrollHeight;
              window.scrollBy(0, distance);
              totalHeight += distance;
              if (totalHeight >= scrollHeight - window.innerHeight) {
                clearInterval(timer);
                resolve();
              }
            },
            100 + Math.random() * 100,
          );
        });
      });

      const extractedMedia = await page.evaluate(() => {
        const results: { url: string; type: 'IMAGE' | 'VIDEO'; title?: string }[] = [];
        const seen = new Set<string>();

        const add = (link: string, type: 'IMAGE' | 'VIDEO', title?: string) => {
          if (!link || link.startsWith('data:') || seen.has(link)) return;
          seen.add(link);
          results.push({ url: link, type, title });
        };

        document.querySelectorAll('img[srcset], img[src]').forEach((img: HTMLImageElement) => {
          let src = img.srcset || img.src;
          if (src && src.includes(',')) {
            src = src.split(',')[0].trim().split(' ')[0];
          }
          if (src && img.naturalWidth > 100 && img.naturalHeight > 100) {
            add(src, 'IMAGE', img.alt || 'Scraped Image');
          }
        });

        document.querySelectorAll('video, video source').forEach((el) => {
          const vid = el as HTMLVideoElement | HTMLSourceElement;
          const src = vid.src;
          if (src) {
            add(src, 'VIDEO', 'Scraped Video');
          }
        });

        return results;
      });

      return extractedMedia.map((item) => ({
        url: item.url,
        sourceUrl: url,
        type: item.type === 'IMAGE' ? MediaType.IMAGE : MediaType.VIDEO,
        title: item.title || `Scraped ${item.type}`,
      }));
    } catch (error) {
      this.logger.error(`Stealth Puppeteer failed for ${url}: ${error.message}`);
      throw error;
    } finally {
      if (page) await page.close().catch(() => {});
      if (browser) await browser.close().catch(() => {});
    }
  }

  private async setupStealthMode(page: any) {
    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, 'webdriver', {
        get: () => undefined,
      });
    });
  }

  private async randomizeFingerprint(page: any) {
    // Use Alpine-optimized user agents
    await page.setUserAgent(getRandomUserAgent());

    // Use Alpine-optimized viewport with slight randomization
    const config = getPuppeteerConfig(true);
    await page.setViewport({
      width: config.defaultViewport.width + Math.floor(Math.random() * 100),
      height: config.defaultViewport.height + Math.floor(Math.random() * 100),
      deviceScaleFactor: 1,
      isMobile: false,
      hasTouch: false,
    });
  }
}
