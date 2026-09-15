/** Jest 配置：仅运行 test/ 下的 *.spec.ts，使用 ts-jest 即时编译。 */
module.exports = {
  testEnvironment: 'node',
  rootDir: '.',
  roots: ['<rootDir>/test'],
  testMatch: ['**/*.spec.ts'],
  setupFilesAfterEnv: ['<rootDir>/test/setup.ts'],
  transform: {
    '^.+\\.ts$': [
      'ts-jest',
      {
        tsconfig: '<rootDir>/tsconfig.test.json',
        isolatedModules: false
      }
    ]
  },
  clearMocks: true,
  // 内存 SQLite 足够快，单线程也能保证结果稳定、便于排错
  maxWorkers: 1
};
