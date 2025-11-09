// test-setup.js - Jest setup file for global test configuration
import { jest, beforeEach, afterAll, expect } from '@jest/globals';

// Add custom matchers
expect.extend({
  toStartWith(received, expected) {
    const pass = typeof received === 'string' && received.startsWith(expected);
    if (pass) {
      return {
        message: () => `expected ${received} not to start with ${expected}`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to start with ${expected}`,
        pass: false,
      };
    }
  }
});

// Mock fetch globally for all tests
global.fetch = jest.fn();

// Mock File constructor for Node.js environment
if (typeof File === 'undefined') {
  global.File = class File {
    constructor(chunks, filename, options = {}) {
      this.chunks = chunks;
      this.name = filename;
      this.type = options.type || 'text/plain';
      this.size = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
    }
  };
}

// Mock FormData for Node.js environment
if (typeof FormData === 'undefined') {
  global.FormData = class FormData {
    constructor() {
      this.data = new Map();
    }
    
    append(key, value) {
      this.data.set(key, value);
    }
    
    entries() {
      return this.data.entries();
    }
  };
}

// Mock Blob for Node.js environment
if (typeof Blob === 'undefined') {
  global.Blob = class Blob {
    constructor(chunks, options = {}) {
      this.chunks = chunks;
      this.type = options.type || 'text/plain';
      this.size = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
    }
  };
}

// Setup global console spies
global.console = {
  ...console,
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn()
};

// Reset all mocks before each test
beforeEach(() => {
  jest.clearAllMocks();
  
  if (fetch.mockClear) {
    fetch.mockClear();
  }
  
  if (console.log.mockClear) {
    console.log.mockClear();
    console.error.mockClear();
    console.warn.mockClear();
    console.info.mockClear();
  }
});

// Clean up after all tests
afterAll(() => {
  jest.restoreAllMocks();
});