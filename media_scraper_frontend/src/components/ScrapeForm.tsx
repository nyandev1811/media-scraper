import { useState, useEffect } from 'react';
import { useScrapeMedia, useQueueStatus, useClearQueue } from '../api/media';
import { useScrapeEvents } from '../hooks/useScrapeEvents';
import { Loader2, Plus, Trash2, Zap, Activity, StopCircle } from 'lucide-react';
import { clsx } from 'clsx';

export const ScrapeForm = () => {
    const [urls, setUrls] = useState<string[]>(['']);
    const { mutate: scrape, isPending } = useScrapeMedia();
    const { mutate: clearQueue, isPending: isClearing } = useClearQueue();
    const [status, setStatus] = useState<string>('');
    const [isPolling, setIsPolling] = useState(false);

    const { data: queueStatus } = useQueueStatus(isPolling);
    useScrapeEvents();

    const currentQueueStatus = queueStatus;

    useEffect(() => {
        if (currentQueueStatus) {
            const totalPending = currentQueueStatus.waiting + currentQueueStatus.active + currentQueueStatus.delayed;
            if (totalPending === 0 && isPolling) {
                setIsPolling(false);
                setStatus('Queue finished.');
                setTimeout(() => setStatus(''), 3000);
            }
        }
    }, [currentQueueStatus, isPolling]);

    const handleAddUrl = () => setUrls([...urls, '']);

    const handleRemoveUrl = (index: number) => {
        const newUrls = urls.filter((_, i) => i !== index);
        setUrls(newUrls.length ? newUrls : ['']);
    };

    const handleChange = (index: number, value: string) => {
        const newUrls = [...urls];
        newUrls[index] = value;
        setUrls(newUrls);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const validUrls = urls.filter(u => u.trim().startsWith('http'));
        if (!validUrls.length) return;

        scrape(validUrls, {
            onSuccess: () => {
                setStatus('We are on it! 🚀 Grab a cup of tea 🍵 while we fetch your media.');
                setUrls(['']);
                setIsPolling(true);
            },
            onError: () => setStatus('Failed to submit request.')
        });
    };

    const handleClearQueue = () => {
        if (confirm('Are you sure you want to stop all pending jobs?')) {
            clearQueue(undefined, {
                onSuccess: () => setStatus('Queue cleared.')
            });
        }
    };

    return (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-8 relative overflow-hidden transition-all hover:shadow-md">
            <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                <Zap size={140} />
            </div>

            <div className="relative z-10">
                <div className="flex justify-between items-start mb-4">
                    <div>
                        <h2 className="text-xl font-semibold mb-1 text-gray-800">Scrape New Media</h2>
                        <p className="text-sm text-gray-500">Enter URLs to extract images and videos. System auto-caches results.</p>
                    </div>

                    {/* Queue Monitor Badge */}
                    {(isPolling || (queueStatus && (queueStatus.waiting + queueStatus.active) > 0)) && (
                        <div className="flex items-center gap-3 bg-gray-50 rounded-lg p-2 border border-gray-200 animate-fade-in">
                            <div className="flex flex-col items-end">
                                <span className="text-xs font-semibold text-blue-600 flex items-center gap-1">
                                    <Activity size={12} className="animate-pulse" /> Processing
                                </span>
                                <span className="text-[10px] text-gray-400">
                                    Wait: {queueStatus?.waiting} | Active: {queueStatus?.active}
                                </span>
                            </div>
                            <button
                                onClick={handleClearQueue}
                                disabled={isClearing}
                                className="text-red-500 hover:bg-red-50 p-1.5 rounded-full transition-colors"
                                title="Stop & Clear Queue"
                            >
                                {isClearing ? <Loader2 size={16} className="animate-spin" /> : <StopCircle size={16} />}
                            </button>
                        </div>
                    )}
                </div>

                <form onSubmit={handleSubmit} className="space-y-3">
                    {urls.map((url, index) => (
                        <div key={index} className="flex gap-2 group">
                            <input
                                type="url"
                                placeholder="https://example.com"
                                className="flex-1 p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all shadow-sm group-hover:border-blue-300"
                                value={url}
                                onChange={(e) => handleChange(index, e.target.value)}
                                required
                            />
                            {urls.length > 1 && (
                                <button
                                    type="button"
                                    onClick={() => handleRemoveUrl(index)}
                                    className="p-3 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                >
                                    <Trash2 size={20} />
                                </button>
                            )}
                        </div>
                    ))}

                    <div className="flex justify-between items-center pt-3">
                        <button
                            type="button"
                            onClick={handleAddUrl}
                            className="flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium px-3 py-1.5 rounded-lg hover:bg-blue-50 transition-colors"
                        >
                            <Plus size={18} /> <span className="text-sm">Add URL</span>
                        </button>

                        <button
                            type="submit"
                            disabled={isPending}
                            className={clsx(
                                "px-6 py-3 rounded-lg font-semibold text-white transition-all shadow-md flex items-center gap-2",
                                isPending
                                    ? "bg-gray-400 cursor-not-allowed"
                                    : "bg-gradient-to-r from-blue-600 to-indigo-600 hover:shadow-lg hover:scale-[1.02] active:scale-95"
                            )}
                        >
                            {isPending ? <><Loader2 className="animate-spin" /> Processing...</> : <><Zap size={18} /> Start Scraping</>}
                        </button>
                    </div>
                </form>

                {status && (
                    <div className={clsx("mt-4 p-3 rounded-lg text-sm font-medium animate-fade-in flex items-center gap-2",
                        status.includes('Failed') ? "bg-red-50 text-red-600" : "bg-green-50 text-emerald-600 border border-green-100")}>
                        {status}
                    </div>
                )}
                {/* Debug: {lastEvent?.type} */}
            </div>
        </div>
    );
};
