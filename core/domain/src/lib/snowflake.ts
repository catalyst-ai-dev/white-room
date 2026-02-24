import Snowflakify from 'snowflakify';

const snowflakify = new Snowflakify();

export function generateSnowflakeId(): string {
  return snowflakify.nextId().toString();
}

export function isValidSnowflakeId(id: string): boolean {
  return /^\d{15,22}$/.test(id);
}
