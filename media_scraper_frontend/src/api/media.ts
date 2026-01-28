import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../lib/api-client';

export interface ScrapeRequest {
  urls: string[];
  sessionId: string;
}

export interface MediaItem {
  id: string;
  url: string;
  sourceUrl: string;
  type: 'IMAGE' | 'VIDEO';
  title?: string;
  createdAt: string;
}

export interface MetaData {
  total: number;
  page: number;
  size: number;
}

export interface QueueStatus {
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
}

export const useScrapeMedia = () => {
    const queryClient = useQueryClient();
    
    return useMutation({
        mutationFn: async (urls: string[]) => {
            const response = await apiClient.post('/scrape', { urls });
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['media'] });
            queryClient.invalidateQueries({ queryKey: ['history'] });
            queryClient.invalidateQueries({ queryKey: ['queue-status'] });
        }
    });
};

export const useQueueStatus = (enabled: boolean = false) => {
  return useQuery<QueueStatus>({
    queryKey: ['queue-status'],
    queryFn: async () => {
      const response = await apiClient.get('/scrape/status');
      // Interceptor returns { data: ... }
      return response.data;
    },
    refetchInterval: enabled ? 2000 : false, // Poll every 2s if enabled
    refetchIntervalInBackground: false,
  });
};

export const useClearQueue = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async () => {
            const response = await apiClient.post('/scrape/clear');
            return response.data;
        },
        onSuccess: () => {
             queryClient.invalidateQueries({ queryKey: ['queue-status'] });
        }
    });
};

// ... existing useMedia ...
interface MediaParams {
    page: number;
    size: number;
    type?: 'IMAGE' | 'VIDEO' | '';
    search?: string;
    startTime?: string;
    endTime?: string;
}

export const useMedia = (params: MediaParams) => {
    return useQuery<{ data: MediaItem[], meta: MetaData }>({
        queryKey: ['media', params],
        queryFn: async () => {
            const queryParams: any = {
               page: params.page,
               size: params.size,
             };
             
             // STRICTLY CHECK: Only add if truthy (not empty string, not undefined, not null)
             if (params.type) queryParams.type = params.type;
             if (params.search && params.search.trim() !== '') queryParams.search = params.search;
             if (params.startTime) queryParams.startTime = params.startTime;
             if (params.endTime) queryParams.endTime = params.endTime;

            const response = await apiClient.get('/media', { params: queryParams });
            const rawBody = response.data;
            return {
                data: rawBody.data,
                meta: rawBody.meta || { total: 0, page: 1, size: 20 }
            };
        },
        placeholderData: (previousData) => previousData,
    });
};
