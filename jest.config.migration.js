/**
 * Jest Configuration for Migration Tests
 * 
 * Separate config for running migration tests
 */

module.exports = {
  preset: "jest-expo",
  testMatch: ["**/utils/migration/__tests__/**/*.test.ts"],
  setupFiles: ["<rootDir>/jest.setup.js"],
  moduleFileExtensions: ["ts", "tsx", "js", "jsx"],
  transformIgnorePatterns: [
    "node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg)",
  ],
  moduleNameMapper: {
    "^@react-native-async-storage/async-storage$": "<rootDir>/__mocks__/@react-native-async-storage/async-storage.js",
    "^expo-secure-store$": "<rootDir>/__mocks__/expo-secure-store.js",
  },
  collectCoverageFrom: [
    "utils/migration/**/*.ts",
    "!utils/migration/**/*.test.ts",
    "!utils/migration/__tests__/**",
    "!utils/migration/testHelper.ts",
  ],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },
  testEnvironment: "node",
};
