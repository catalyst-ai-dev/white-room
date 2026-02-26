import Snowflakify from 'snowflakify';

const snowflakify = new Snowflakify();

export function generateSnowflakeId(): string {
  return snowflakify.nextId().toString();
}

/**
 * Validates if a string is a valid snowflake ID format.
 * @param id - The string to validate
 * @returns true if valid snowflake ID format
 */
export function isValidSnowflakeId(id: string): boolean {
  return /^\d{15,22}$/.test(id);
}
