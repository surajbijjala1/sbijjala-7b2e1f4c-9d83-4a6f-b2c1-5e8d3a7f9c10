const { NxAppWebpackPlugin } = require('@nx/webpack/app-plugin');
const { join } = require('path');

module.exports = {
  output: {
    path: join(__dirname, 'dist'),
    clean: true,
    ...(process.env.NODE_ENV !== 'production' && {
      devtoolModuleFilenameTemplate: '[absolute-resource-path]',
    }),
  },
  plugins: [
    new NxAppWebpackPlugin({
      target: 'node',
      compiler: 'tsc',
      main: './src/main.ts',
      tsConfig: './tsconfig.app.json',
      assets: ['./src/assets'],
      optimization: false,
      outputHashing: 'none',
      generatePackageJson: false,
      sourceMap: true,
      // Only externalize native add-ons and NestJS optional peer dependencies
      // that are not installed. Everything else (including @turbomonorepo/*
      // workspace libs and @nestjs/*) is bundled so they share the same
      // module context at runtime.
      externalDependencies: [
        // Native add-ons (cannot be bundled by webpack)
        'bcrypt',
        'sqlite3',
        // NestJS optional peer dependencies (not installed)
        'class-validator',
        'class-transformer',
        '@nestjs/websockets',
        '@nestjs/websockets/socket-module',
        '@nestjs/microservices',
        '@nestjs/microservices/microservices-module',
        // TypeORM optional drivers (not installed)
        'pg',
        'pg-native',
        'pg-query-stream',
        'mysql',
        'mysql2',
        'oracledb',
        'mssql',
        'mongodb',
        'redis',
        'ioredis',
        'better-sqlite3',
        'sql.js',
        'react-native-sqlite-storage',
        'typeorm-aurora-data-api-driver',
        '@google-cloud/spanner',
        '@sap/hana-client',
        '@sap/hana-client/extension/Stream',
      ],
    }),
  ],
};
