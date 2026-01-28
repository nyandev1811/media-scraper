import { Search, Calendar, Filter } from 'lucide-react';

interface Props {
    search: string;
    setSearch: (val: string) => void;
    type: string;
    setType: (val: any) => void;
    startTime: string;
    setStartTime: (val: string) => void;
    endTime: string;
    setEndTime: (val: string) => void;
}

export const FilterBar = ({
    search, setSearch,
    type, setType,
    startTime, setStartTime,
    endTime, setEndTime
}: Props) => {
    return (
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-6 space-y-4">
            {/* Top Row: Search and Type */}
            <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input
                        type="text"
                        placeholder="Search by URL or Title..."
                        className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none bg-gray-50/50"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>

                <div className="flex gap-2 shrink-0">
                    {(['', 'IMAGE', 'VIDEO'] as const).map((t) => (
                        <button
                            key={t}
                            onClick={() => setType(t)}
                            className={`px-4 py-2.5 rounded-lg text-sm font-medium border transition-colors ${type === t
                                ? 'bg-blue-50 text-blue-600 border-blue-200'
                                : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                                }`}
                        >
                            {t === '' ? 'All' : t.charAt(0) + t.slice(1).toLowerCase() + 's'}
                        </button>
                    ))}
                </div>
            </div>

            {/* Bottom Row: Date Filters */}
            <div className="flex flex-wrap items-center gap-4 pt-2 border-t border-gray-50">
                <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Filter size={16} />
                    <span>Filters:</span>
                </div>

                <div className="flex items-center gap-2">
                    <label className="text-xs font-medium text-gray-400">From</label>
                    <div className="relative">
                        <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                        <input
                            type="date"
                            className="pl-8 pr-3 py-1.5 rounded-md border border-gray-200 text-sm focus:border-blue-500 outline-none"
                            value={startTime}
                            onChange={(e) => setStartTime(e.target.value)}
                        />
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <label className="text-xs font-medium text-gray-400">To</label>
                    <div className="relative">
                        <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                        <input
                            type="date"
                            className="pl-8 pr-3 py-1.5 rounded-md border border-gray-200 text-sm focus:border-blue-500 outline-none"
                            value={endTime}
                            onChange={(e) => setEndTime(e.target.value)}
                        />
                    </div>
                </div>

                {(startTime || endTime || search || type) && (
                    <button
                        onClick={() => {
                            setSearch('');
                            setType('');
                            setStartTime('');
                            setEndTime('');
                        }}
                        className="text-xs text-red-500 hover:text-red-600 ml-auto font-medium"
                    >
                        Clear Filters
                    </button>
                )}
            </div>
        </div>
    );
};
