module.exports = {
  collectCoverage: true,
  collectCoverageFrom: ['<rootDir>/src/**/*'],
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['<rootDir>/__tests__/**/*.test.ts?(x)']
}
