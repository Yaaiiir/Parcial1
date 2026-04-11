process.env.DOTENV_CONFIG_PATH = '.env.test'

module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/*.test.ts'],
  collectCoverageFrom: ['src/**/*.ts', '!src/index.ts'],
  coverageReporters: ['text', 'lcov'],
  setupFiles: ['dotenv/config'],
  testEnvironmentOptions: {
    env: { NODE_ENV: 'test' }
  }
}
