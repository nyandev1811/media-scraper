# Media Scraper Service

A high-performance, resilient media scraper built with NestJS (Backend) and React (Frontend).

## Prerequisites

- **Docker** and **Docker Compose** installed on your machine.
- **Node.js** (optional, for local development outside Docker).

## Setup & Run

The entire project is containerized. To start the application, simply run:

```bash
docker-compose up -d --build
```

This will spin up the following services:

- **Frontend**: `http://localhost:3005` (Admin Dashboard & Scrape Form)
- **Backend API**: `http://localhost:3000`
- **Redis**: For job queue management.
- **MySQL**: (Optional/Planned) For persistence.
- **Prometheus/Grafana**: (Optional) For monitoring.

## Features

- **Multi-Strategy Scraping**:
  - `YouTube`: Uses efficient oEmbed API.
  - `Cheerio`: Lightweight HTML parsing (fastest).
  - `Puppeteer`: Full browser automation (currently disabled for optimization).
  - `Stealth Puppeteer`: Evasion techniques (currently disabled).
- **Resilience**:
  - Circuit Breakers for failing strategies.
  - Concurrency Limiting (Manual & Auto-scaling).
  - Robust Error Handling & Retry logic.
- **Admin Dashboard**:
  - Real-time System Metrics (CPU, Memory, Concurrency).
  - Manual Concurrency Control.
  - Queue Health Monitoring.
- **Performance**:
  - Optimized for low memory footprint (Cheerio-first approach).
  - Docker resource constraints configured.

## Development

To run locally without Docker (e.g., for debugging):

### Backend

```bash
cd media_scraper_backend
npm install
npm run start:dev
```

### Frontend

Prerequisite: [Bun](https://bun.sh/) installed.

```bash
cd media_scraper_frontend
bun install
bun run dev
```

## Git Setup

(Already configured locally)

- **Name**: Nhan Dang
- **Email**: vannhanuit2018@gamil.com

## Load Testing

The system is designed to handle ~5000 concurrent scraping requests on constrained hardware (1 CPU, 1GB RAM) by leveraging a queue-based architecture with concurrency limiting.

### Prerequisites

- [k6](https://k6.io/docs/get-started/installation/) installed.

### How to Run

After running the Docker stack, navigate to the load tests directory and run the `stress-test.js` file using `k6`.

```bash
cd media_scraper_backend/load-tests

# Scenario 1: High Concurrency (Same URL - Cache Test)
k6 run -e SCENARIO=fixed stress-test.js

# Scenario 2: High Stress (Unique URLs - Real Scraping)
k6 run -e SCENARIO=unique stress-test.js
```

**Note**: Ensure the backend is running at `http://localhost:3000` (default).

## Requirements Compliance

| Requirement | Implementation |
| :--- | :--- |
| **API for Web URL Array** | `POST /scrape` accepts `{ "urls": ["..."] }` |
| **Scrape Img/Video URLs** | Extractors for `<img>` and `<video>` tags implemented. |
| **Store Data in SQL** | TypeORM entities (`Media`, `ScrapeJob`) configured for MySQL/PostgreSQL. |
| **Simple Web Page** | React Dashboard with Live Search & Filter. |
| **Pagination & Filter** | Backend API supports pagination; Frontend implements Infinite Scroll & Search. |
| **Node.js & React.js** | Stack: NestJS (Node) + React 19 (Vite). |
| **Dockerize** | `docker-compose.yml` orchestrates Frontend, Backend, Redis, and Database. |
| **Handle ~5k Requests @ 1CPU/1GB** | Implemented via BullMQ Queue, Rate Limiting (default 5 concurrent), and lightweight Cheerio strategy. |

