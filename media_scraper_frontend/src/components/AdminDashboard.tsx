import { useState, useEffect } from 'react';
import {
  Activity,
  Cpu,
  HardDrive,
  Clock,
  Users,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Loader2
} from 'lucide-react';

interface SystemMetrics {
  memory: {
    total: string;
    used: string;
    free: string;
    freePercentage: string;
    usedPercentage: string;
  };
  cpu: {
    loadAvg1m: string;
    loadAvg5m: string;
    loadAvg15m: string;
    cores: number;
    utilization: string;
  };
  queue: {
    waiting: number;
    active: number;
    completed: number;
    failed: number;
    delayed: number;
    total: number;
  };
  capacity: {
    estimatedInstanceSize: string;
    recommendedConcurrency: number;
    currentLoad: number;
    note: string;
  };
  health: {
    status: 'healthy' | 'warning' | 'critical';
    alerts: string[] | null;
    metrics: {
      cpu: string;
      memory: string;
      queue: string;
    };
  };
  timestamp: string;
}

const StatusBadge = ({ status }: { status: string }) => {
  const colors = {
    healthy: 'bg-green-100 text-green-800 border-green-200',
    warning: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    critical: 'bg-red-100 text-red-800 border-red-200'
  };

  const icons = {
    healthy: <CheckCircle size={16} />,
    warning: <AlertTriangle size={16} />,
    critical: <XCircle size={16} />
  };

  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border text-sm font-medium ${colors[status as keyof typeof colors] || colors.critical}`}>
      {icons[status as keyof typeof icons] || icons.critical}
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </div>
  );
};

const MetricCard = ({
  title,
  value,
  subtitle,
  icon: Icon,
  color = 'blue'
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: any;
  color?: string;
}) => {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600 border-blue-200',
    green: 'bg-green-50 text-green-600 border-green-200',
    yellow: 'bg-yellow-50 text-yellow-600 border-yellow-200',
    red: 'bg-red-50 text-red-600 border-red-200',
    purple: 'bg-purple-50 text-purple-600 border-purple-200'
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-gray-600">{title}</h3>
        <div className={`p-2 rounded-lg border ${colorClasses[color as keyof typeof colorClasses] || colorClasses.blue}`}>
          <Icon size={20} />
        </div>
      </div>
      <div className="space-y-1">
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
      </div>
    </div>
  );
};

export const AdminDashboard = () => {
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {

    const pollData = async () => {
      try {
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
        const response = await fetch(`${apiUrl}/admin/dashboard`);
        const result = await response.json();
        setMetrics(result.data);
        setLastUpdate(new Date());
        setIsConnected(true);
        setError(null);
      } catch (err) {

        setIsConnected(false);
        setError('Failed to fetch data');
      }
    };


    pollData();


    const interval = setInterval(pollData, 5000);

    return () => {
      clearInterval(interval);
    };
  }, []);

  if (!metrics) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading admin dashboard...</p>
          {error && <p className="text-red-600 text-sm mt-2">{error}</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold text-gray-900">Admin Dashboard</h1>
            <StatusBadge status={metrics.health.status} />
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
              {isConnected ? 'Live' : 'Disconnected'}
            </div>

            {lastUpdate && (
              <div className="text-sm text-gray-500">
                Last update: {lastUpdate.toLocaleTimeString()}
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Alerts */}
        {metrics.health.alerts && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="text-red-600" size={20} />
              <h3 className="font-medium text-red-800">System Alerts</h3>
            </div>
            <ul className="list-disc list-inside text-red-700 text-sm space-y-1">
              {metrics.health.alerts.map((alert, index) => (
                <li key={index}>{alert}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Manual Concurrency Control */}
        <div className="mb-6 bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Clock size={20} />
            Manual Concurrency Limit
          </h3>
          <div className="flex items-center gap-4">
            <input
              type="number"
              min="1"
              max="20"
              placeholder="4"
              className="border border-gray-300 rounded px-3 py-2 w-32"
              onKeyDown={async (e) => {
                if (e.key === 'Enter') {
                  const val = parseInt(e.currentTarget.value);
                  if (val > 0) {
                    try {
                      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
                      await fetch(`${apiUrl}/scrape/concurrency`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ limit: val })
                      });
                      alert('Concurrency limit updated!');
                    } catch (err) {
                      alert('Failed to update concurrency limit');
                    }
                  }
                }
              }}
            />
            <span className="text-sm text-gray-500">Press Enter to Apply (Default: 4)</span>
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <MetricCard
            title="CPU Usage"
            value={metrics.cpu.utilization}
            subtitle={`${metrics.cpu.cores} cores • Load: ${metrics.cpu.loadAvg1m}`}
            icon={Cpu}
            color="blue"
          />

          <MetricCard
            title="Memory Usage"
            value={!isNaN(parseFloat(metrics.memory?.usedPercentage)) ? metrics.memory.usedPercentage : 'N/A'}
            subtitle={!isNaN(parseFloat(metrics.memory?.used)) ? `${metrics.memory.used} / ${metrics.memory.total}` : 'N/A'}
            icon={HardDrive}
            color="green"
          />

          <MetricCard
            title="Active Jobs"
            value={metrics.queue.active}
            subtitle={`${metrics.queue.waiting} waiting • ${metrics.queue.total} total`}
            icon={Activity}
            color="purple"
          />

          <MetricCard
            title="Queue Health"
            value={`${metrics.queue.active}/${metrics.capacity.recommendedConcurrency}`}
            subtitle="Active / Recommended"
            icon={Users}
            color={metrics.queue.active > metrics.capacity.recommendedConcurrency ? 'red' : 'yellow'}
          />
        </div>

        {/* Detailed Stats */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Queue Statistics */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Clock size={20} />
              Queue Statistics
            </h3>

            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Waiting</span>
                <span className="font-medium">{metrics.queue.waiting}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Active</span>
                <span className="font-medium text-blue-600">{metrics.queue.active}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Completed</span>
                <span className="font-medium text-green-600">{metrics.queue.completed}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Failed</span>
                <span className="font-medium text-red-600">{metrics.queue.failed}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Delayed</span>
                <span className="font-medium text-yellow-600">{metrics.queue.delayed}</span>
              </div>
            </div>
          </div>

          {/* System Resources */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Activity size={20} />
              System Resources
            </h3>

            <div className="space-y-4">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-600">CPU Load (1m/5m/15m)</span>
                  <span className="font-medium">{metrics.cpu.loadAvg1m}/{metrics.cpu.loadAvg5m}/{metrics.cpu.loadAvg15m}</span>
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-600">Memory Free</span>
                  <span className="font-medium">{!isNaN(parseFloat(metrics.memory?.freePercentage)) ? metrics.memory.freePercentage : 'N/A'}</span>
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-600">Recommended Concurrency</span>
                  <span className="font-medium">{metrics.capacity.recommendedConcurrency}</span>
                </div>
                <p className="text-xs text-gray-500">{metrics.capacity.note}</p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
