export interface MediaMetadata {
  platform: 'youtube' | 'direct' | 'blob' | 'unknown';
  canEmbed: boolean;
  embedUrl?: string;
  thumbnailUrl?: string;
  videoId?: string;
}

export const getYouTubeVideoId = (url: string): string | null => {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/,
    /youtube\.com\/embed\/([^&\n?#]+)/,
    /youtube\.com\/v\/([^&\n?#]+)/
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
};

export const getYouTubeEmbedUrl = (videoId: string): string => {
  return `https://www.youtube.com/embed/${videoId}?autoplay=0&mute=1&controls=1&rel=0&modestbranding=1`;
};

export const getYouTubeThumbnail = (videoId: string): string => {
  return `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
};

export const isYouTubeUrl = (url: string): boolean => {
  return /(?:youtube\.com|youtu\.be)/i.test(url);
};

export const isBlobUrl = (url: string): boolean => {
  return url.startsWith('blob:');
};

export const isDirectVideoUrl = (url: string): boolean => {
  const videoExtensions = ['.mp4', '.webm', '.ogg', '.avi', '.mov', '.wmv', '.flv'];
  return videoExtensions.some(ext => url.toLowerCase().includes(ext));
};

export const analyzeMediaUrl = (mediaUrl: string, sourceUrl: string): MediaMetadata => {
  // Check if source is YouTube (prioritize this over blob detection)
  if (isYouTubeUrl(sourceUrl)) {
    const videoId = getYouTubeVideoId(sourceUrl);
    if (videoId) {
      return {
        platform: 'youtube',
        canEmbed: true,
        embedUrl: getYouTubeEmbedUrl(videoId),
        thumbnailUrl: getYouTubeThumbnail(videoId),
        videoId
      };
    }
  }

  if (isBlobUrl(mediaUrl)) {
    return {
      platform: 'blob',
      canEmbed: false
    };
  }

  if (isDirectVideoUrl(mediaUrl)) {
    return {
      platform: 'direct',
      canEmbed: true,
      embedUrl: mediaUrl
    };
  }

  return {
    platform: 'unknown',
    canEmbed: false
  };
};

export const formatPlatformName = (platform: MediaMetadata['platform']): string => {
  switch (platform) {
    case 'youtube': return 'YouTube';
    case 'direct': return 'Video';
    case 'blob': return 'Blob URL';
    default: return 'Unknown';
  }
};

export const getPlatformColor = (platform: MediaMetadata['platform']): string => {
  switch (platform) {
    case 'youtube': return 'bg-red-100 text-red-600';
    case 'direct': return 'bg-green-100 text-green-600';
    case 'blob': return 'bg-yellow-100 text-yellow-600';
    default: return 'bg-gray-100 text-gray-600';
  }
};
