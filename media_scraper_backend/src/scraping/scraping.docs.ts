export const SCRAPE_DOCS = {
  summary: 'Submit URLs for Intelligent Scraping',
  description: `
Initiates a high-performance background scraping job for the provided URLs. 

### 🚀 Key Features
- **Smart Strategy Selection**: Automatically attempts **Cheerio** (fast) first, falling back to **Puppeteer** (headless browser) for dynamic content.
- **Queue Management**: Jobs are pushed to a Redis Queue for reliable processing.
- **Deduplication**: Checks global cache (Postgres) before scraping to return instant results if available.

### 📋 Request Body
| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| **urls** | \`string[]\` | ✅ | List of valid HTTP/HTTPS URLs to process. |
| **sessionId** | \`string\` | ❌ | Unique Guest ID. If provided, history is linked to this session. |

### ⚡ Performance & Limits
- **Concurrency**: Auto-scales based on system resources (default ~5 parallel browsers).
- **Timeouts**: 
  - Cheerio: 5s
  - Puppeteer: 30s
  - Global Job Timeout: 60s

### 🔄 Response
Returns immediate confirmation that jobs are queued. Use \`GET /scrape/status\` to track progress.
  `,
};

export const STATUS_DOCS = {
  summary: 'Real-time Queue Health Check',
  description: `
Returns the current counts of jobs in the scraping pipeline.

### 📊 Metric Definitions
| Metric | Description |
| :--- | :--- |
| **waiting** | Jobs queued but not yet picked up by a worker. |
| **active** | Jobs currently being processed (Browser/HTTP active). |
| **completed** | Jobs successfully finished (stored in DB). |
| **failed** | Jobs that errored out after all retries. |
| **delayed** | Jobs scheduled for later retry (backoff strategy). |

Use this API to power progress bars or system dashboards.
  `,
};

export const CLEAR_DOCS = {
  summary: 'Emergency Queue Drain',
  description: `
⚠️ **ADMIN ONLY** (Conceptually)

Instantly removes **ALL** jobs from the Waiting queue and cleans up Failed/Completed logs. 
Active jobs will continue until they finish or timeout.

### 🖼️ UI Integration
Useful for "Stop Scraping" buttons in the frontend to prevent system overload during load testing.
  `,
};
