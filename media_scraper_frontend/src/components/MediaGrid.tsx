import { useState } from 'react';
import { useMedia } from '../api/media';
import { MediaCard } from './MediaCard';
import { FilterBar } from './FilterBar';
import { Loader2, ChevronLeft, ChevronRight } from 'lucide-react';

export const MediaGrid = () => {
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState('');
    const [type, setType] = useState<'' | 'IMAGE' | 'VIDEO'>('');
    const [startTime, setStartTime] = useState('');
    const [endTime, setEndTime] = useState('');
    const size = 12;

    const { data, isLoading, isPlaceholderData } = useMedia({
        page,
        size,
        type,
        search,
        startTime,
        endTime
    });

    const mediaItems = data?.data || [];
    const totalItems = data?.meta?.total || 0;
    const totalPages = Math.ceil(totalItems / size);

    return (
        <div>
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-800">Scraped Gallery</h2>
                {totalItems > 0 && <span className="text-sm text-gray-500">{totalItems} items found</span>}
            </div>

            <FilterBar
                search={search} setSearch={setSearch}
                type={type} setType={setType}
                startTime={startTime} setStartTime={setStartTime}
                endTime={endTime} setEndTime={setEndTime}
            />

            {isLoading && !data ? (
                <div className="flex justify-center py-20">
                    <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
                </div>
            ) : (
                <>
                    {mediaItems.length === 0 ? (
                        <div className="text-center py-20 bg-white rounded-xl border border-dashed border-gray-300">
                            <p className="text-gray-500">No media found matching your criteria.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 animate-fade-in-up">
                            {mediaItems.map((item) => (
                                <MediaCard key={item.id} media={item} />
                            ))}
                        </div>
                    )}

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="flex justify-center items-center gap-4 mt-8 pb-8">
                            <button
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={page === 1}
                                className="p-2 rounded-lg bg-white shadow-sm border border-gray-100 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                            >
                                <ChevronLeft size={20} />
                            </button>
                            <span className="text-sm font-medium text-gray-600 bg-white px-4 py-2 rounded-lg border border-gray-100 shadow-sm">
                                Page {page} of {totalPages}
                            </span>
                            <button
                                onClick={() => setPage(p => (!isPlaceholderData && p < totalPages ? p + 1 : p))}
                                disabled={isPlaceholderData || page >= totalPages}
                                className="p-2 rounded-lg bg-white shadow-sm border border-gray-100 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                            >
                                <ChevronRight size={20} />
                            </button>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};
