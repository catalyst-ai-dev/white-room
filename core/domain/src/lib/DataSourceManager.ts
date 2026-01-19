import type { PostgresConnectionOptions } from 'typeorm/driver/postgres/PostgresConnectionOptions';
import type { SqliteConnectionOptions } from 'typeorm/driver/sqlite/SqliteConnectionOptions';
import type { NamingStrategyInterface, Table } from 'typeorm';

import 'reflect-metadata';
import { DataSource, DefaultNamingStrategy } from 'typeorm';
import * as pg from 'pg';
import * as path from 'path';
import { createLogger } from '@namespace/logger';

const logger = createLogger('DataSourceManager');

/**
 * Creates a database if it doesn't exist.
 * Connects to the default 'postgres' database to run the CREATE DATABASE command.
 */
async function ensureDatabaseExists(config: PostgresDatabaseConfig): Promise<void> {
  const client = new pg.Client({
    host: config.host,
    port: config.port,
    user: config.username,
    password: config.password,
    database: 'postgres',
  });

  try {
    await client.connect();
    const result = await client.query(
      'SELECT 1 FROM pg_database WHERE datname = $1',
      [config.database]
    );

    if (result.rowCount === 0) {
      await client.query(`CREATE DATABASE "${config.database}"`);
      if (process.env.NODE_ENV !== 'test') {
        logger.info(`Created database: ${config.database}`);
      }
    }
  } finally {
    await client.end();
  }
}

const {
  CORE_DB_HOST = '127.0.0.1',
  CORE_DB_PORT = '5432',
  CORE_DB_USER = 'postgres',
  CORE_DB_NAME = 'namespace_dev',
  CORE_DB_PASSWORD = 'postgres',
  CORE_DB_SYNCHRONIZE = 'false',
  DB_DISABLE_SSL = 'false',
  ORM_LOGGING = 'false',
} = process.env;

export const domainEntitiesPath = path.resolve(__dirname, '../**/*.model.{js,ts}');

export type BaseDatabaseConfig = {
  type: string;
  logging?: boolean;
  synchronize?: boolean;
  singleton?: boolean;
  migrations?: string[];
  migrationsDir?: string;
};

export type PostgresDatabaseConfig = BaseDatabaseConfig & {
  type: 'postgres';
  database: string;
  host: string;
  port: number;
  username: string;
  password: string;
};

export type SqliteDatabaseConfig = BaseDatabaseConfig & {
  type: 'sqlite';
  database?: ':memory:';
};

export type DatabaseConfig = PostgresDatabaseConfig | SqliteDatabaseConfig;

export class TypeormNamingStrategy
  extends DefaultNamingStrategy
  implements NamingStrategyInterface
{
  primaryKeyName(tableOrName: string | Table, columnNames: string[]): string {
    const tableName = typeof tableOrName === 'string' ? tableOrName : tableOrName.name;
    let primaryKeyName = `pk_${tableName}`;
    if (columnNames.length > 0) {
      primaryKeyName += `_${columnNames.join('_')}`;
    }
    return primaryKeyName;
  }

  indexName(tableOrName: string | Table, columnNames: string[]): string {
    const MAX_LENGTH = 63;
    const tableName = typeof tableOrName === 'string' ? tableOrName : tableOrName.name;

    // Try with full name first
    let indexName = `idx_${tableName}`;
    if (columnNames.length > 0) {
      indexName += `_${columnNames.join('_')}`;
    }
    if (indexName.length <= MAX_LENGTH) return indexName;

    // If too long, try without table name
    indexName = 'idx';
    if (columnNames.length > 0) {
      indexName += `_${columnNames.join('_')}`;
    }
    if (indexName.length <= MAX_LENGTH) return indexName;

    // If still too long, use default TypeORM naming
    return super.indexName(tableOrName, columnNames);
  }

  foreignKeyName(
    tableOrName: string | Table,
    columnNames: string[],
    referencedTablePath?: string,
    referencedColumnNames?: string[],
  ): string {
    const MAX_LENGTH = 63;
    const tableName = typeof tableOrName === 'string' ? tableOrName : tableOrName.name;

    // Try with full name first
    let fkName = this.buildFullForeignKeyName(
      tableName,
      '_to',
      columnNames,
      referencedTablePath,
      referencedColumnNames,
    );
    if (fkName.length <= MAX_LENGTH) return fkName;

    // Try without source table name
    fkName = this.buildFullForeignKeyName(
      '',
      '_to',
      columnNames,
      referencedTablePath,
      referencedColumnNames,
    );
    if (fkName.length <= MAX_LENGTH) return fkName;

    // Try without "_to_" part
    fkName = this.buildFullForeignKeyName(
      '',
      '',
      columnNames,
      referencedTablePath,
      referencedColumnNames,
    );
    if (fkName.length <= MAX_LENGTH) return fkName;

    // Try replacing vocals except in "id"
    fkName = this.replaceVowelsPreservingId(fkName);
    if (fkName.length <= MAX_LENGTH) return fkName;

    // Instead of UUID, use the default TypeORM naming strategy
    return super.foreignKeyName(
      tableOrName,
      columnNames,
      referencedTablePath,
      referencedColumnNames,
    );
  }

  private buildFullForeignKeyName(
    tableName: string,
    joinLabel: string,
    columnNames: string[],
    referencedTablePath?: string,
    referencedColumnNames?: string[],
  ): string {
    let fkName = tableName ? `fk_${tableName}` : 'fk';

    if (columnNames.length > 0) {
      fkName += `_${columnNames.join('_')}`;
    }

    if (referencedTablePath && referencedColumnNames) {
      const referencedTable = referencedTablePath.replace(/\./g, '_');
      fkName += `${joinLabel}_${referencedTable}`;
      if (Array.isArray(referencedColumnNames) && referencedColumnNames.length > 0) {
        fkName += `_${referencedColumnNames.join('_')}`;
      }
    }

    return fkName;
  }

  private replaceVowelsPreservingId(str: string): string {
    const parts = str.split(/([iI][dD])/g);
    return parts
      .map((part, index) => {
        // If this part is "id" or "ID", preserve it
        if (index % 2 === 1) return part;
        // Otherwise, replace vowels
        return part.replace(/[aeiou]/gi, '');
      })
      .join('');
  }
}

export function createDataSource(dataSourceConfig: DatabaseConfig): DataSource {
  let dataSource: DataSource;

  const baseConfig = {
    type: dataSourceConfig.type,
    entities: [domainEntitiesPath],
    synchronize: dataSourceConfig.synchronize ?? false,
    logging: dataSourceConfig.logging ?? true,
    database: dataSourceConfig.database,
    ssl: DB_DISABLE_SSL === 'true' ? false : { rejectUnauthorized: false },
    migrations: dataSourceConfig.migrations,
    migrationsDir: dataSourceConfig.migrationsDir,
    namingStrategy: new TypeormNamingStrategy(),
  };

  if (dataSourceConfig.type === 'postgres') {
    const postgresConfig: PostgresConnectionOptions = {
      ...baseConfig,
      type: 'postgres',
      host: dataSourceConfig.host,
      port: dataSourceConfig.port,
      username: dataSourceConfig.username,
      password: dataSourceConfig.password,
      database: dataSourceConfig.database,
    };
    dataSource = new DataSource(postgresConfig);

    // Wrap initialize to create database if it doesn't exist
    const originalInitialize = dataSource.initialize.bind(dataSource);
    dataSource.initialize = async () => {
      await ensureDatabaseExists(dataSourceConfig);
      return originalInitialize();
    };

    // Configure postgres to parse numeric values as floats
    pg.types.setTypeParser(pg.types.builtins.NUMERIC, (val: string) => {
      return val === null ? null : parseFloat(val);
    });
  } else if (dataSourceConfig.type === 'sqlite') {
    const sqliteConfig: SqliteConnectionOptions = {
      ...baseConfig,
      type: 'sqlite',
      database: ':memory:',
    };
    dataSource = new DataSource(sqliteConfig);
  } else {
    throw new Error(`Unsupported database type: ${baseConfig.type}`);
  }

  return dataSource;
}

export class DataSourceManager {
  private static instances: Map<string, DataSourceManager> = new Map();
  private dataSource: DataSource | null = null;
  private initializationPromise: Promise<DataSource> | null = null;

  public static getInstance(config: DatabaseConfig): DataSourceManager {
    if (config.singleton) {
      const key = `${config.type}-${config.database}`;
      if (!DataSourceManager.instances.has(key)) {
        DataSourceManager.instances.set(key, new DataSourceManager(config));
      }
      return DataSourceManager.instances.get(key) as DataSourceManager;
    } else {
      return new DataSourceManager(config);
    }
  }

  private constructor(private config: DatabaseConfig) {
    this.dataSource = createDataSource(this.config);
  }

  private logMessage(message: string): void {
    if (process.env.NODE_ENV !== 'test') {
      logger.info(message);
    }
  }

  public initialize(): Promise<DataSource> {
    if (!this.initializationPromise) {
      this.initializationPromise = this.initializeInternal();
    }
    return this.initializationPromise;
  }

  private async initializeInternal(): Promise<DataSource> {
    if (!this.dataSource) {
      throw new Error('DataSource not instanciated');
    }
    if (this.dataSource.isInitialized) {
      return this.dataSource;
    }

    await this.dataSource.initialize();

    this.logMessage(
      `Database connected - Type: ${this.config.type}, Database: ${this.config.database}`,
    );

    return this.dataSource;
  }

  public async destroyDataSource(): Promise<void> {
    if (this.dataSource) {
      if (this.dataSource.isInitialized) {
        await this.dataSource.destroy();
      }
      this.dataSource = null;
      this.initializationPromise = null;
      this.logMessage('Database connection destroyed');
      if (this.config.singleton) {
        const key = `${this.config.type}-${this.config.database}`;
        DataSourceManager.instances.delete(key);
      }
    }
  }

  public getDataSource(): DataSource {
    if (!this.dataSource) {
      throw new Error('DataSource not initialized');
    }
    return this.dataSource;
  }

  public isInitialized(): boolean {
    return !!(this.dataSource && this.dataSource.isInitialized);
  }
}

export const createSqliteDataSourceManager = () => {
  return DataSourceManager.getInstance({ type: 'sqlite', singleton: false });
};

export const createPostgresDataSourceManager = (dbConfig: Partial<PostgresDatabaseConfig> = {}) => {
  const envPostgresConfig: PostgresDatabaseConfig = {
    type: 'postgres',
    host: CORE_DB_HOST,
    port: parseInt(CORE_DB_PORT, 10) || 5432,
    username: CORE_DB_USER,
    password: CORE_DB_PASSWORD,
    database: CORE_DB_NAME,
    logging: ORM_LOGGING === 'true',
    synchronize: CORE_DB_SYNCHRONIZE === 'true',
    singleton: true,
    ...dbConfig,
  };
  return DataSourceManager.getInstance(envPostgresConfig);
};
