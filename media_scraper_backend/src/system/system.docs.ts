export const SYSTEM_STATUS_DOCS = {
  summary: 'System Health & Capacity Metrics',
  description: `
Provides real-time visibility into the backend server's resource usage. 
Used to determine safe concurrency limits for new scraping jobs.

### Capacity Calculation Logic
The \`recommendedConcurrency\` is dynamically calculated:
1.  **Metric**: Free RAM (Physical Memory)
2.  **Assumption**: ~300MB per Headless Browser Instance.
3.  **Safety Buffer**: Uses only 80% of currently free RAM.

\`\`\`math
Concurrency = (FreeRAM * 0.8) / 300MB
\`\`\`

### 📡 Response Fields
- **memory**: Total, Used, and Free RAM with percentage.
- **cpu**: Load averages.
- **capacity**: Dynamic suggestion for scaling workers.
  `,
};
