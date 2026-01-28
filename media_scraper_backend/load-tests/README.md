# Media Scraper Load Tests

This directory contains load tests for the Media Scraper backend using [k6](https://k6.io/).

## Prerequisites

-   [k6](https://k6.io/docs/get-started/installation/) installed.

## Test Data

A `urls.csv` file containing 5000+ real-world URLs is generated automatically. If missing, run:
```bash
node ../../generate_urls_script.js
```

## Running Tests

### 1. Scenario: Same URL (High Concurrency)
Tests how the system handles many requests for the **same** URL (caching caching).
```bash
k6 run -e SCENARIO=fixed stress-test.js
```

### 2. Scenario: Unique URLs (High Stress)
Tests how the system handles **unique** URLs (forcing actual scraping/browser usage).
This creates the most pressure on Docker memory/CPU.
```bash
k6 run -e SCENARIO=unique stress-test.js
```

### Configuration
You can override defaults using environment variables:

-   `API_URL`: Backend URL (default: `http://localhost:3000`)
-   `SCENARIO`: `fixed` or `unique`

Example:
```bash
k6 run -e API_URL=http://localhost:3001 -e SCENARIO=unique stress-test.js
```
