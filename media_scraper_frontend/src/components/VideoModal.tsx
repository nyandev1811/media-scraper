import { useState, useEffect } from 'react';
import { X, ExternalLink, Maximize2 } from 'lucide-react';
import type { MediaItem } from '../api/media';
import { analyzeMediaUrl } from '../lib/media-utils';

interface VideoModalProps {
  media: MediaItem;
  isOpen: boolean;
  onClose: () => void;
}

export const VideoModal = ({ media, isOpen, onClose }: VideoModalProps) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const mediaMetadata = analyzeMediaUrl(media.url, media.sourceUrl);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  if (!isOpen) return null;

  const renderVideoPlayer = () => {
    if (mediaMetadata.platform === 'youtube' && mediaMetadata.embedUrl) {
      return (
        <iframe
          src={mediaMetadata.embedUrl}
          className="w-full h-full"
          frameBorder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          title={media.title || 'YouTube Video'}
        />
      );
    }

    if (mediaMetadata.canEmbed) {
      return (
        <video
          src={mediaMetadata.embedUrl || media.url}
          className="w-full h-full"
          controls
          autoPlay
          preload="metadata"
        />
      );
    }

    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-gray-900 text-white">
        <div className="text-center">
          <p className="text-lg mb-4">Video không thể phát trực tiếp</p>
          <a
            href={media.sourceUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
          >
            <ExternalLink size={16} />
            Xem trên trang gốc
          </a>
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal Content */}
      <div className={`relative bg-black rounded-xl overflow-hidden shadow-2xl transition-all duration-300 ${
        isFullscreen 
          ? 'w-screen h-screen rounded-none' 
          : 'w-[90vw] h-[80vh] max-w-6xl max-h-[80vh]'
      }`}>
        
        {/* Header */}
        <div className="absolute top-0 left-0 right-0 z-10 bg-gradient-to-b from-black/80 to-transparent p-4">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <h2 className="text-white font-semibold text-lg truncate">
                {media.title || 'Untitled Video'}
              </h2>
              <p className="text-white/70 text-sm truncate">
                {new URL(media.sourceUrl).hostname}
              </p>
            </div>
            
            <div className="flex items-center gap-2 ml-4">
              <button
                onClick={toggleFullscreen}
                className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-all"
                title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
              >
                <Maximize2 size={20} />
              </button>
              
              <a
                href={media.sourceUrl}
                target="_blank"
                rel="noreferrer"
                className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-all"
                title="Open original"
              >
                <ExternalLink size={20} />
              </a>
              
              <button
                onClick={onClose}
                className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-all"
                title="Close"
              >
                <X size={20} />
              </button>
            </div>
          </div>
        </div>

        {/* Video Player */}
        <div className="w-full h-full">
          {renderVideoPlayer()}
        </div>

        {/* Footer Info (only in windowed mode) */}
        {!isFullscreen && (
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
            <div className="flex items-center justify-between text-white/70 text-sm">
              <span>
                {mediaMetadata.platform === 'youtube' ? 'YouTube Video' : 'Video Content'}
              </span>
              <span>
                {new Date(media.createdAt).toLocaleDateString('vi-VN')}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
