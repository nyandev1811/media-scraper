import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getSessionId } from '../lib/session';
import { toast } from 'sonner';

interface ScrapeEventData {
  sessionId: string;
  type: 'completed' | 'failed';
  data: {
    url: string;
    count?: number;
    error?: string;
  };
}

export const useScrapeEvents = () => {
    const queryClient = useQueryClient();
    const [lastEvent, setLastEvent] = useState<ScrapeEventData | null>(null);

    useEffect(() => {
        const sessionId = getSessionId();
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
        const url = `${apiUrl}/scrape/events?sessionId=${sessionId}`;
        
        const eventSource = new EventSource(url);

        eventSource.onopen = () => {
            console.log('SSE Connected');
        };

        eventSource.onmessage = (event) => {
            try {
                const rawParsed = JSON.parse(event.data);
                const parsedData = rawParsed.data ? rawParsed.data : rawParsed;
                
                setLastEvent(parsedData);
                
                if (parsedData.type === 'completed') {
                    queryClient.invalidateQueries({ queryKey: ['media'] });
                    queryClient.invalidateQueries({ queryKey: ['history'] });
                    queryClient.invalidateQueries({ queryKey: ['queue-status'] });
                    
                    toast.success(`Success! Found ${parsedData.data.count} items from ${parsedData.data.url}`, {
                        description: "Refresh complete!" 
                    });
                } else if (parsedData.type === 'failed') {
                    toast.error(`Scrape failed for ${parsedData.data.url}`, {
                        description: parsedData.data.error
                    });
                }
            } catch (e) {
                console.error('Failed to parse SSE event', e);
            }
        };

        eventSource.onerror = (err) => {
            console.error('SSE Error', err);
        };

        return () => {
            eventSource.close();
        };
    }, [queryClient]);

    return { lastEvent };
};
