import http from 'k6/http';
import { check, sleep } from 'k6';
import { SharedArray } from 'k6/data';
import { uuidv4 } from 'https://jslib.k6.io/k6-utils/1.4.0/index.js';

// Load URLs from CSV for unique scenario
const csvData = new SharedArray('urls', function () {
  return open('./urls.csv').split('\n').slice(1); // Skip header
});

export const options = {
  scenarios: {
    stress_test: {
      executor: 'ramping-arrival-rate',
      startRate: 10,
      timeUnit: '1s',
      preAllocatedVUs: 50,
      maxVUs: 200,
      stages: [
        { target: 50, duration: '30s' }, // Ramp up to 50 req/s
        { target: 100, duration: '1m' }, // Stay at 100 req/s
        { target: 0, duration: '30s' },  // Ramp down
      ],
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.01'], // <1% errors
    http_req_duration: ['p(95)<2000'], // 95% of requests < 2s
  },
};

export default function () {
  const BASE_URL = __ENV.API_URL || 'http://localhost:3000';
  const SCENARIO = __ENV.SCENARIO || 'unique'; // 'fixed' or 'unique'
  const SESSION_ID = uuidv4();

  let targetUrl;

  if (SCENARIO === 'unique') {
    // Pick a random URL from the CSV
    const randomIndex = Math.floor(Math.random() * csvData.length);
    targetUrl = csvData[randomIndex];
    // fallback if empty line
    if (!targetUrl || targetUrl.trim() === '') targetUrl = 'https://example.com'; 
  } else {
    targetUrl = 'https://www.google.com';
  }

  const payload = JSON.stringify({
    urls: [targetUrl],
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
      'x-session-id': SESSION_ID,
    },
  };

  const res = http.post(`${BASE_URL}/scrape`, payload, params);

  check(res, {
    'is status 201': (r) => r.status === 201,
  });

  sleep(1);
}
