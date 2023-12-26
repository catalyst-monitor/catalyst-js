/** @type {import('jest').Config} */
const config = {
  workerThreads: true,
  projects: [
    {
      transform: {
        '^.+\\.ts$': [
          'ts-jest',
          {
            tsconfig: 'packages/core/tsconfig-cjs.json',
            useESM: true,
          },
        ],
      },
      roots: [
        '<rootDir>/packages/core/src',
        '<rootDir>/packages/core/src/gen',
      ],
      displayName: 'core',
      testMatch: ['<rootDir>/packages/core/src/(*.)+test\\.ts'],
      
    }
  ]
};

module.exports = config;