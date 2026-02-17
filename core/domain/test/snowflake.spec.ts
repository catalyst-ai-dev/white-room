import { describe, expect, test } from '@jest/globals';
import { generateSnowflakeId, isValidSnowflakeId } from '@domain/lib/snowflake';

describe('Snowflake Utilities', () => {
  describe('isValidSnowflakeId', () => {
    test('returns true for valid snowflake ID with 15 digits', () => {
      expect(isValidSnowflakeId('123456789012345')).toBe(true);
    });

    test('returns true for valid snowflake ID with 22 digits', () => {
      expect(isValidSnowflakeId('1234567890123456789012')).toBe(true);
    });

    test('returns true for valid snowflake ID with 18 digits', () => {
      expect(isValidSnowflakeId('123456789012345678')).toBe(true);
    });

    test('returns false for empty string', () => {
      expect(isValidSnowflakeId('')).toBe(false);
    });

    test('returns false for ID with less than 15 digits', () => {
      expect(isValidSnowflakeId('12345678901234')).toBe(false);
    });

    test('returns false for ID with more than 22 digits', () => {
      expect(isValidSnowflakeId('12345678901234567890123')).toBe(false);
    });

    test('returns false for ID with non-digit characters', () => {
      expect(isValidSnowflakeId('123456789012345a')).toBe(false);
    });

    test('returns false for ID with special characters', () => {
      expect(isValidSnowflakeId('123456789012345!')).toBe(false);
    });

    test('returns false for ID with spaces', () => {
      expect(isValidSnowflakeId('12345678901234 5')).toBe(false);
    });

    test('returns false for null-like values passed as string', () => {
      expect(isValidSnowflakeId('null')).toBe(false);
    });

    test('returns true for generated snowflake ID', () => {
      const generatedId = generateSnowflakeId();
      expect(isValidSnowflakeId(generatedId)).toBe(true);
    });
  });
});
