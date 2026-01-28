import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { IScraperStrategy } from './scraper-strategy.interface';
import { Media, MediaType } from '../../core/entities/media.entity';

@Injectable()
export class YouTubeScraperStrategy implements IScraperStrategy {
  private readonly logger = new Logger(YouTubeScraperStrategy.name);
  name = 'YouTube';

  async scrape(url: string): Promise<Partial<Media>[]> {
    try {
      const videoId = this.extractVideoId(url);
      if (!videoId) {
        this.logger.warn(`Could not extract video ID from URL: ${url}`);
        return [];
      }

      const metadata = await this.getVideoMetadata(url, videoId);

      return [
        {
          url: `https://www.youtube.com/embed/${videoId}`,
          sourceUrl: url,
          type: MediaType.VIDEO,
          title: metadata.title || `YouTube Video - ${videoId}`,
          metadata: {
            videoId,
            platform: 'youtube',
            thumbnailUrl: metadata.thumbnail_url,
            embedUrl: `https://www.youtube.com/embed/${videoId}?autoplay=0&mute=1&controls=1&rel=0`,
            duration: metadata.duration || undefined,
            author: metadata.author_name || undefined,
          },
        },
      ];
    } catch (error) {
      this.logger.error(`YouTube scrape failed for ${url}: ${(error as Error).message}`);
      throw error;
    }
  }

  private extractVideoId(url: string): string | null {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/,
      /youtube\.com\/embed\/([^&\n?#]+)/,
      /youtube\.com\/v\/([^&\n?#]+)/,
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return match[1];
    }
    return null;
  }

  private async getVideoMetadata(url: string, videoId: string) {
    try {
      const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`;
      const response = await axios.get(oembedUrl, { timeout: 5000 });

      return {
        title: (response.data as any).title as string,
        thumbnail_url: (response.data as any).thumbnail_url as string,
        author_name: (response.data as any).author_name as string,
        duration: null,
      };
    } catch (error) {
      this.logger.warn(
        `Failed to fetch YouTube metadata for ${videoId}: ${(error as Error).message}`,
      );
      // Return basic info if oEmbed fails
      return {
        title: 'YouTube Video',
        thumbnail_url: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
        author_name: null,
        duration: null,
      };
    }
  }
}
