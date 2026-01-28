import { Processor, WorkerHost, InjectQueue } from '@nestjs/bullmq';
import { Job, Queue } from 'bullmq';
import { Logger } from '@nestjs/common';
import { ScrapingService } from './scraping.service';
import { MediaService } from '../media/media.service';
import { Media } from '../core/entities/media.entity';
import { UserService } from '../user/user.service';
import { GeminiService } from '../infrastructure/ai/gemini.service';
import { ScrapingEventService } from './scraping.event.service';

@Processor('scrape-queue', { concurrency: 3 })
export class ScrapingProcessor extends WorkerHost {
  private readonly logger = new Logger(ScrapingProcessor.name);

  constructor(
    private readonly scrapingService: ScrapingService,
    private readonly mediaService: MediaService,
    private readonly userService: UserService,
    private readonly geminiService: GeminiService,
    private readonly eventService: ScrapingEventService,
    @InjectQueue('scrape-queue') private readonly scrapeQueue: Queue,
  ) {
    super();
  }

  async process(job: Job<{ url: string; sessionId?: string }>): Promise<any> {
    const { url, sessionId } = job.data;
    this.logger.log(
      `Processing job ${job.id}: Scrape ${url} (Session: ${sessionId || 'Anonymous'})`,
    );

    try {
      const cachedMedia = await this.mediaService.findBySourceUrl(url);
      if (cachedMedia.length > 0) {
        this.logger.log(`CACHE HIT: Found ${cachedMedia.length} items for ${url}`);

        if (sessionId) {
          await this.linkUserHistory(sessionId, url, cachedMedia.length);
        }
        return { status: 'cached', count: cachedMedia.length };
      }

      const queueCounts = await this.scrapeQueue.getJobCounts();
      const queueLength = (queueCounts.waiting || 0) + (queueCounts.delayed || 0);

      const results = await this.scrapingService.scrape(url, queueLength);

      const enrichedResults: Partial<Media>[] = [];
      const batchSize = 3;

      for (let i = 0; i < results.length; i += batchSize) {
        const batch = results.slice(i, i + batchSize);
        if (results.length > 3) {
          this.logger.log(
            `Processing batch ${Math.ceil(i / batchSize) + 1} / ${Math.ceil(results.length / batchSize)}`,
          );
        }

        const processedBatch = await Promise.all(
          batch.map(async (media) => {
            return media;
          }),
        );
        enrichedResults.push(...processedBatch);

        if (i + batchSize < results.length) {
          // await new Promise((r) => setTimeout(r, 2000)); // Removed artificial delay
        }
      }

      if (enrichedResults.length > 0) {
        const mediaToSave = enrichedResults.map((r) => ({
          ...r,
          sourceUrl: url,
          title: r.title || 'Scraped Media',
        }));

        await this.mediaService.saveBulk(mediaToSave as any);
        this.logger.log(`Saved ${results.length} media items for ${url}`);

        if (sessionId) {
          await this.linkUserHistory(sessionId, url, results.length);
        }
      } else {
        this.logger.warn(`No media found for ${url}`);
      }

      return { status: 'success', count: results.length };
    } catch (error) {
      this.logger.error(`Job ${job.id} failed: ${error.message}`, error.stack);
      this.eventService.emitJobFailed(sessionId, url, error.message);
      throw error;
    }
  }

  private async linkUserHistory(sessionId: string, url: string, count: number) {
    try {
      const user = await this.userService.findOrCreateGuest(sessionId);
      await this.userService.recordHistory(user, url, 'Scraped Page', count);

      this.eventService.emitJobComplete(sessionId, url, count);
    } catch (e) {
      this.logger.error(`Failed to record history for ${sessionId}: ${e.message}`);
    }
  }
}
