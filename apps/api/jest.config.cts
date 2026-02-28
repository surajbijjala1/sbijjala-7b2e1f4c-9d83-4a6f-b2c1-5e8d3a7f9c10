/* eslint-disable */
import { readFileSync } from 'fs';

const swcJestConfig = JSON.parse(
  readFileSync(`${__dirname}/.spec.swcrc`, 'utf-8'),
);
swcJestConfig.swcrc = false;

export default {
  displayName: 'api',
  testEnvironment: 'node',
  transform: {
    '^.+\\.[tj]s$': ['@swc/jest', swcJestConfig],
  },
  moduleFileExtensions: ['ts', 'js', 'html'],
  coverageDirectory: '../../coverage/apps/api',
  moduleNameMapper: {
    '^@turbomonorepo/shared-data$': '<rootDir>/../../libs/shared/data/src/index.ts',
    '^@turbomonorepo/shared-auth$': '<rootDir>/../../libs/shared/auth/src/index.ts',
    // Strip .js extensions from relative imports for Jest (nodenext compat)
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  testMatch: ['**/*.spec.ts'],
};
