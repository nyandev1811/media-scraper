import { Injectable, Logger } from '@nestjs/common';
import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai';
import axios from 'axios';

@Injectable()
export class GeminiService {
  private readonly logger = new Logger(GeminiService.name);
  private genAI: GoogleGenerativeAI;
  private model: GenerativeModel;
  private apiKeyAvailable = false;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey) {
      this.genAI = new GoogleGenerativeAI(apiKey);
      this.model = this.genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
      this.apiKeyAvailable = true;
      this.logger.log('Gemini AI Service initialized successfully.');
    } else {
      this.logger.warn('GEMINI_API_KEY not found. AI features will be disabled.');
    }
  }

  async generateMediaDescription(
    mediaUrl: string,
    type: 'IMAGE' | 'VIDEO',
  ): Promise<{ title: string; description: string } | null> {
    if (!this.apiKeyAvailable) {
      return null;
    }

    try {
      this.logger.log(`Generating AI description for ${type}: ${mediaUrl}`);

      const mediaBuffer = await this.fetchMedia(mediaUrl);
      if (!mediaBuffer) return null;

      const sizeInMB = mediaBuffer.length / (1024 * 1024);
      if (sizeInMB > 18) {
        // Safe margin
        this.logger.warn(
          `Media too large for inline AI processing (${sizeInMB.toFixed(2)}MB). Skipping.`,
        );
        return null;
      }

      const prompt = `Analyze this ${type.toLowerCase()}. Generate a short, catchy title and a concise description (max 2 sentences). Return ONLY valid JSON in this format: { "title": "string", "description": "string" }`;

      const extension = mediaUrl.split('.').pop()?.split('?')[0].toLowerCase();
      let mimeType = type === 'IMAGE' ? 'image/jpeg' : 'video/mp4';

      if (type === 'IMAGE') {
        if (extension === 'png') mimeType = 'image/png';
        else if (extension === 'webp') mimeType = 'image/webp';
      } else if (type === 'VIDEO') {
        if (extension === 'webm') mimeType = 'video/webm';
        else if (extension === 'mov') mimeType = 'video/quicktime';
      }

      const result = await this.model.generateContent([
        prompt,
        {
          inlineData: {
            data: Buffer.from(mediaBuffer).toString('base64'),
            mimeType: mimeType,
          },
        },
      ]);

      const response = await result.response;
      const text = response.text();

      const jsonStr = text.replace(/```json\n?|\n?```/g, '').trim();
      return JSON.parse(jsonStr);
    } catch (error) {
      this.logger.error(`Failed to generate description for ${mediaUrl}: ${error.message}`);
      return null;
    }
  }

  private async fetchMedia(url: string): Promise<Buffer | null> {
    try {
      const response = await axios.get(url, {
        responseType: 'arraybuffer',
        timeout: 10000,
      });
      return Buffer.from(response.data);
    } catch (e) {
      this.logger.warn(`Could not fetch media for AI processing: ${e.message}`);
      return null;
    }
  }
}
