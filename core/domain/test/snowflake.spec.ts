import { describe, expect, test } from '@jest/globals';
import { generateSnowflakeId, isValidSnowflakeId } from '@domain/lib/snowflake';

describe('Snowflake utilities', () => {
  describe('isValidSnowflakeId', () => {
    test('should return true for valid snowflake IDs with 15 digits', () => {
      expect(isValidSnowflakeId('123456789012345')).toBe(true);
    });

    test('should return true for valid snowflake IDs with 22 digits', () => {
      expect(isValidSnowflakeId('1234567890123456789012')).toBe(true);
    });

    test('should return true for valid snowflake IDs with middle range digits', () => {
      expect(isValidSnowflakeId('123456789012345678')).toBe(true);
      expect(isValidSnowflakeId('12345678901234567890')).toBe(true);
    });

    test('should return false for snowflake ID with too few digits', () => {
      expect(isValidSnowflakeId('12345678901234')).toBe(false);
    });

    test('should return false for snowflake ID with too many digits', () => {
      expect(isValidSnowflakeId('12345678901234567890123')).toBe(false);
    });

    test('should return false for empty string', () => {
      expect(isValidSnowflakeId('')).toBe(false);
    });

    test('should return false for string with non-digit characters', () => {
      expect(isValidSnowflakeId('123456789012345a')).toBe(false);
      expect(isValidSnowflakeId('123456789012345 ')).toBe(false);
      expect(isValidSnowflakeId('123456789012-345')).toBe(false);
    });

    test('should return false for string with leading/trailing whitespace', () => {
      expect(isValidSnowflakeId(' 123456789012345')).toBe(false);
      expect(isValidSnowflakeId('123456789012345 ')).toBe(false);
    });

    test('should return true for generated snowflake ID', () => {
      const generatedId = generateSnowflakeId();
      expect(isValidSnowflakeId(generatedId)).toBe(true);
    });
  });
});
