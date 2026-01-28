import { Injectable, Logger, MessageEvent } from '@nestjs/common';
import { EventEmitter } from 'events';
import { Observable, fromEvent } from 'rxjs';
import { map, filter, startWith } from 'rxjs/operators';

export interface ScrapeEvent {
  sessionId?: string;
  type: 'completed' | 'failed';
  data: {
    url: string;
    count?: number;
    error?: string;
  };
}

@Injectable()
export class ScrapingEventService {
  private readonly emitter = new EventEmitter();
  private readonly logger = new Logger(ScrapingEventService.name);

  constructor() {
    this.emitter.setMaxListeners(50);
  }

  emitJobComplete(sessionId: string | undefined, url: string, count: number) {
    this.logger.debug(`Emit complete: ${sessionId} - ${url}`);
    this.emitter.emit('scrape-event', {
      sessionId,
      type: 'completed',
      data: { url, count },
    } as ScrapeEvent);
  }

  emitJobFailed(sessionId: string | undefined, url: string, error: string) {
    this.logger.debug(`Emit failed: ${sessionId} - ${url}`);
    this.emitter.emit('scrape-event', {
      sessionId,
      type: 'failed',
      data: { url, error },
    } as ScrapeEvent);
  }

  subscribe(sessionId: string): Observable<MessageEvent> {
    return fromEvent(this.emitter, 'scrape-event').pipe(
      filter((event: ScrapeEvent) => event.sessionId === sessionId),
      map((event) => ({ data: event }) as MessageEvent),
      startWith({
        data: { type: 'connected', sessionId },
      } as MessageEvent),
    );
  }
}
