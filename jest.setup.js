// Jest setup file
global.__DEV__ = true;

// Mock console to reduce noise
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Mock expo import meta registry
global.__ExpoImportMetaRegistry = {};

// Mock structuredClone if not available
if (typeof global.structuredClone === 'undefined') {
  global.structuredClone = (obj) => JSON.parse(JSON.stringify(obj));
}

// Suppress expo warnings
jest.mock("expo", () => ({}), { virtual: true });
