import type { MediaItem } from '../api/media';
import { useState } from 'react';
import { ExternalLink, AlertCircle, Youtube, Play } from 'lucide-react';
import { analyzeMediaUrl, formatPlatformName, getPlatformColor } from '../lib/media-utils';
import { VideoModal } from './VideoModal';

interface Props {
    media: MediaItem;
}

export const MediaCard = ({ media }: Props) => {
    const [videoError, setVideoError] = useState(false);
    const [showModal, setShowModal] = useState(false);

    const mediaMetadata = analyzeMediaUrl(media.url, media.sourceUrl);
    const canPlayVideo = mediaMetadata.canEmbed && !videoError;

    const handleVideoError = () => {
        setVideoError(true);
    };

    const renderVideoContent = () => {
        // For preview, show thumbnail with play button overlay
        const thumbnailUrl = mediaMetadata.platform === 'youtube' && mediaMetadata.videoId
            ? `https://img.youtube.com/vi/${mediaMetadata.videoId}/maxresdefault.jpg`
            : null;

        return (
            <div 
                className="w-full h-full relative bg-black cursor-pointer group/video"
                onClick={() => setShowModal(true)}
            >
                {thumbnailUrl ? (
                    <img
                        src={thumbnailUrl}
                        alt={media.title || 'Video thumbnail'}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                            e.currentTarget.src = `https://img.youtube.com/vi/${mediaMetadata.videoId}/hqdefault.jpg`;
                        }}
                    />
                ) : canPlayVideo ? (
                    <video
                        src={mediaMetadata.embedUrl || media.url}
                        className="w-full h-full object-cover"
                        muted
                        preload="metadata"
                        onError={handleVideoError}
                    />
                ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-gray-800 text-white">
                        <AlertCircle size={32} className="mb-2 text-yellow-400" />
                        <p className="text-sm text-center px-4">
                            {mediaMetadata.platform === 'blob' 
                                ? 'Blob URL không thể xem trực tiếp' 
                                : 'Video không tải được'}
                        </p>
                    </div>
                )}

                {/* Play Button Overlay */}
                <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover/video:bg-black/40 transition-all">
                    <div className="bg-white/90 backdrop-blur rounded-full p-4 group-hover/video:scale-110 transition-transform">
                        <Play className="w-8 h-8 text-gray-800 ml-1" fill="currentColor" />
                    </div>
                </div>

                {/* Platform Badge */}
                {mediaMetadata.platform === 'youtube' && (
                    <div className="absolute top-2 left-2 bg-red-600 text-white px-2 py-1 rounded text-xs font-bold flex items-center gap-1">
                        <Youtube size={12} />
                        YouTube
                    </div>
                )}
            </div>
        );
    };

    // Dynamic aspect ratio - videos get larger size
    const aspectRatio = media.type === 'VIDEO' ? 'aspect-video' : 'aspect-square';
    const cardSize = media.type === 'VIDEO' ? 'col-span-2' : 'col-span-1';

    return (
        <>
            <div className={`group relative bg-white rounded-xl overflow-hidden shadow-sm border border-gray-100 hover:shadow-xl transition-all duration-300 ${cardSize}`}>
            <div className={`${aspectRatio} bg-gray-100 relative overflow-hidden`}>
                {media.type === 'IMAGE' ? (
                    <img
                        src={media.url}
                        alt={media.title || "Scraped content"}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        loading="lazy"
                    />
                ) : (
                    renderVideoContent()
                )}

                {/* Action Buttons */}
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="flex gap-2">
                        <a
                            href={media.sourceUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="p-2 bg-white/90 backdrop-blur rounded-full text-gray-700 hover:text-blue-600 shadow-sm block"
                            title="Xem nguồn gốc"
                        >
                            <ExternalLink size={16} />
                        </a>
                    </div>
                </div>

                {/* Title Overlay */}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-3 opacity-0 group-hover:opacity-100 transition-opacity">
                    <p className="text-white text-sm font-medium truncate">
                        {media.title || 'Untitled'}
                    </p>
                    {media.type === 'VIDEO' && (
                        <p className="text-white/70 text-xs mt-1">
                            {formatPlatformName(mediaMetadata.platform)} Content
                        </p>
                    )}
                </div>
            </div>

            <div className="p-4">
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                        <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                            media.type === 'VIDEO' 
                                ? 'bg-purple-100 text-purple-700' 
                                : 'bg-blue-100 text-blue-700'
                        }`}>
                            {media.type}
                        </span>
                        {media.type === 'VIDEO' && (
                            <span className={`text-xs px-2 py-1 rounded-full font-bold ${getPlatformColor(mediaMetadata.platform)}`}>
                                {formatPlatformName(mediaMetadata.platform)}
                            </span>
                        )}
                    </div>
                    <span className="text-xs text-gray-400">
                        {new Date(media.createdAt).toLocaleDateString('vi-VN')}
                    </span>
                </div>
                <a
                    href={media.sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm text-gray-600 hover:text-blue-600 hover:underline truncate block font-medium"
                    title={media.sourceUrl}
                >
                    {new URL(media.sourceUrl).hostname}
                </a>
            </div>
        </div>

        {/* Video Modal */}
        {media.type === 'VIDEO' && (
            <VideoModal
                media={media}
                isOpen={showModal}
                onClose={() => setShowModal(false)}
            />
        )}
        </>
    );
};