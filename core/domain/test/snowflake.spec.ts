import { describe, expect, test } from '@jest/globals';
import { isValidSnowflakeId } from '@domain/lib/snowflake';

describe('isValidSnowflakeId', () => {
  test('should return true for valid 15-digit snowflake ID', () => {
    expect(isValidSnowflakeId('123456789012345')).toBe(true);
  });

  test('should return true for valid 22-digit snowflake ID', () => {
    expect(isValidSnowflakeId('1234567890123456789012')).toBe(true);
  });

  test('should return true for valid snowflake IDs within the valid range', () => {
    expect(isValidSnowflakeId('999999999999999')).toBe(true);
    expect(isValidSnowflakeId('12345678901234567890')).toBe(true);
  });

  test('should return false for IDs with fewer than 15 digits', () => {
    expect(isValidSnowflakeId('12345678901234')).toBe(false);
    expect(isValidSnowflakeId('123')).toBe(false);
    expect(isValidSnowflakeId('')).toBe(false);
  });

  test('should return false for IDs with more than 22 digits', () => {
    expect(isValidSnowflakeId('12345678901234567890123')).toBe(false);
    expect(isValidSnowflakeId('123456789012345678901234567890')).toBe(false);
  });

  test('should return false for IDs containing non-digit characters', () => {
    expect(isValidSnowflakeId('1234567890123a5')).toBe(false);
    expect(isValidSnowflakeId('123456789012345-')).toBe(false);
    expect(isValidSnowflakeId('123456789012345 ')).toBe(false);
    expect(isValidSnowflakeId('123456789012345.')).toBe(false);
  });

  test('should return false for strings with special characters', () => {
    expect(isValidSnowflakeId('123456789012345!')).toBe(false);
    expect(isValidSnowflakeId('@12345678901234')).toBe(false);
    expect(isValidSnowflakeId('123456789012345#')).toBe(false);
  });

  test('should return false for strings with whitespace', () => {
    expect(isValidSnowflakeId(' 123456789012345')).toBe(false);
    expect(isValidSnowflakeId('123456789012345 ')).toBe(false);
    expect(isValidSnowflakeId(' 123456789012345 ')).toBe(false);
  });

  test('should return false for null or undefined', () => {
    expect(isValidSnowflakeId(null as any)).toBe(false);
    expect(isValidSnowflakeId(undefined as any)).toBe(false);
  });
});
