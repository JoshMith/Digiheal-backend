// ormconfig.ts

import { DataSource } from 'typeorm';
import { dataSourceOptions } from './config/database.config';

// Export default DataSource for TypeORM CLI
export default new DataSource(dataSourceOptions);