/**
 * Puppeteer Configuration Optimized for Alpine Linux
 * Ultra-lightweight setup for minimal resource usage
 */

export const ALPINE_PUPPETEER_CONFIG = {
  headless: true,

  // Alpine-specific executable paths
  executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/chromium-browser',

  args: [
    // Security & Sandboxing
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',

    // Performance optimizations for 1GB RAM
    '--memory-pressure-off',
    '--max_old_space_size=512',
    '--disable-background-timer-throttling',
    '--disable-renderer-backgrounding',
    '--disable-backgrounding-occluded-windows',

    // Disable heavy features
    '--disable-gpu',
    '--disable-gpu-compositing',
    '--disable-gpu-rasterization',
    '--disable-gpu-sandbox',

    // Disable unnecessary services
    '--disable-extensions',
    '--disable-plugins',
    '--disable-default-apps',
    '--disable-background-networking',
    '--disable-sync',
    '--disable-translate',
    '--disable-features=TranslateUI',

    // Network optimizations
    '--aggressive-cache-discard',
    '--disable-ipc-flooding-protection',

    // Display settings
    '--window-size=1366,768', // Smaller than default to save memory
    '--hide-scrollbars',
    '--mute-audio',

    '--single-process', // Better for containers
    '--no-zygote', // Alpine doesn't need zygote process
    '--disable-dev-tools',
    '--disable-logging',
    '--silent',

    // Security headers
    '--disable-web-security', // Only for scraping, not production browsing
    '--disable-blink-features=AutomationControlled',
    '--disable-features=VizDisplayCompositor',
  ],

  defaultViewport: {
    width: 1366,
    height: 768,
    deviceScaleFactor: 1,
  },

  ignoreDefaultArgs: ['--enable-automation'],
  slowMo: 0, // No artificial delays
};

export const STEALTH_ALPINE_CONFIG = {
  ...ALPINE_PUPPETEER_CONFIG,

  // Additional stealth arguments for Alpine
  args: [
    ...ALPINE_PUPPETEER_CONFIG.args,

    // Extra anti-detection for stealth mode
    '--disable-blink-features=AutomationControlled',
    '--exclude-switches=enable-automation',
    '--disable-extensions-http-throttling',
    '--no-first-run',
    '--disable-default-apps',
    '--disable-component-extensions-with-background-pages',

    // Memory management for stealth
    '--js-flags=--max-old-space-size=256',
    '--renderer-process-limit=1',
    '--max-gum-fps=15', // Reduce frame rate
  ],

  // Stealth-specific viewport (more common resolution)
  defaultViewport: {
    width: 1280,
    height: 720,
    deviceScaleFactor: 1,
  },
};

export const ALPINE_USER_AGENTS = [
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
];

// Get random user agent
export const getRandomUserAgent = (): string => {
  return ALPINE_USER_AGENTS[Math.floor(Math.random() * ALPINE_USER_AGENTS.length)];
};

// Utility function to check if running in Alpine
export const isAlpineEnvironment = (): boolean => {
  try {
    const fs = require('fs');
    return fs.existsSync('/etc/alpine-release');
  } catch {
    return false;
  }
};

// Get optimal config based on environment
export const getPuppeteerConfig = (isStealthMode = false) => {
  const baseConfig = isStealthMode ? STEALTH_ALPINE_CONFIG : ALPINE_PUPPETEER_CONFIG;

  // Add environment-specific optimizations
  if (isAlpineEnvironment()) {
    return {
      ...baseConfig,
      args: [
        ...baseConfig.args,
        '--disable-lcd-text', // Better for Alpine displays
        '--force-color-profile=srgb',
      ],
    };
  }

  return baseConfig;
};
