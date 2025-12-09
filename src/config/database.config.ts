// src/config/database.config.ts

import { DataSource, DataSourceOptions } from 'typeorm';
import { config } from 'dotenv';
import path from 'path';

// Load environment variables
config();

// TypeORM configuration
export const dataSourceOptions: DataSourceOptions = {
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USERNAME || 'dkut_user',
  password: process.env.DB_PASSWORD || 'dkut_password',
  database: process.env.DB_DATABASE || 'dkut_medical',
  
  // Entity locations
  entities: [path.join(__dirname, '../entities/**/*.entity{.ts,.js}')],
  
  // Migration settings
  migrations: [path.join(__dirname, '../migrations/**/*{.ts,.js}')],
  migrationsTableName: 'migrations',
  
  // Synchronization (NEVER use in production!)
  synchronize: process.env.NODE_ENV === 'development' && process.env.TYPEORM_SYNCHRONIZE === 'true',
  
  // Logging
  logging: process.env.TYPEORM_LOGGING === 'true' ? ['query', 'error', 'schema'] : false,
  logger: 'advanced-console',
  
  // Connection pool settings
  extra: {
    max: 20,
    min: 5,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  },
  
  // SSL settings (for production)
  ssl: process.env.NODE_ENV === 'production' ? {
    rejectUnauthorized: false
  } : false,
  
  // Cache settings
  cache: {
    type: 'database',
    duration: 60000, // 1 minute
    tableName: 'query_result_cache'
  }
};

// Create and export the data source
export const AppDataSource = new DataSource(dataSourceOptions);

// Initialize database connection
export const initializeDatabase = async (): Promise<DataSource> => {
  try {
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
      console.log('✅ Database connection established successfully');
      
      // Run pending migrations in production
      if (process.env.NODE_ENV === 'production') {
        await AppDataSource.runMigrations();
        console.log('✅ Migrations executed successfully');
      }
    }
    return AppDataSource;
  } catch (error) {
    console.error('❌ Error initializing database connection:', error);
    throw error;
  }
};

// Close database connection
export const closeDatabase = async (): Promise<void> => {
  try {
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
      console.log('✅ Database connection closed');
    }
  } catch (error) {
    console.error('❌ Error closing database connection:', error);
    throw error;
  }
};

// Export for use in migrations
export default AppDataSource;