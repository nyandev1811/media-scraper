import { useState, useEffect, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';

interface QueueUpdate {
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
}

export const useRealTimeUpdates = () => {
  const [queueStatus, setQueueStatus] = useState<QueueUpdate | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const queryClient = useQueryClient();

  const connectToUpdates = useCallback(() => {
    // Use polling instead of SSE to prevent blocking other requests
    const pollUpdates = async () => {
      try {
        const response = await fetch('http://localhost:3000/scrape/status');
        const result = await response.json();

        if (result.data) {
          setQueueStatus(result.data);
          setIsConnected(true);

          // If there are completed jobs, invalidate media queries to refresh the gallery
          if (result.data.completed > 0) {
            queryClient.invalidateQueries({ queryKey: ['media'] });
          }
        }
      } catch (err) {
        console.error('Error polling updates:', err);
        setIsConnected(false);
      }
    };

    // Initial poll
    pollUpdates();

    // Poll every 5 seconds
    const interval = setInterval(pollUpdates, 5000);

    return interval;
  }, [queryClient]);

  useEffect(() => {
    const interval = connectToUpdates();

    return () => {
      if (typeof interval === 'number') {
        clearInterval(interval);
      }
    };
  }, [connectToUpdates]);

  return {
    queueStatus,
    isConnected,
  };
};
