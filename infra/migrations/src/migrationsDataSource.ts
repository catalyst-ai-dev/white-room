import { join, resolve, extname } from 'path';
import { createPostgresDataSourceManager } from '@domain/lib/DataSourceManager';

export const dataSourcePath = join(__dirname, `migrationsDataSource${extname(__filename)}`);
export const migrationsDir = resolve(__dirname, '..', 'list');

// Allow CORE_DB_NAME to override the default migrations database
// This is used in CI to run migrations against test databases
const database = process.env.CORE_DB_NAME || 'namespace_migrations';

const dataSourceManager = createPostgresDataSourceManager({
  database,
  migrations: [`${migrationsDir}/*.{ts,js}`],
  synchronize: false,
  migrationsDir,
});

export default dataSourceManager.getDataSource();
