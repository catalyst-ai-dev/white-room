import { isValidSnowflakeId, generateSnowflakeId } from '../src/lib/snowflake';

describe('Snowflake utility', () => {
  describe('isValidSnowflakeId', () => {
    test('should return true for valid 15-digit snowflake ID', () => {
      expect(isValidSnowflakeId('123456789012345')).toBe(true);
    });

    test('should return true for valid 22-digit snowflake ID', () => {
      expect(isValidSnowflakeId('1234567890123456789012')).toBe(true);
    });

    test('should return true for snowflake ID in valid range', () => {
      expect(isValidSnowflakeId('1234567890123456')).toBe(true);
      expect(isValidSnowflakeId('12345678901234567')).toBe(true);
      expect(isValidSnowflakeId('123456789012345678')).toBe(true);
      expect(isValidSnowflakeId('1234567890123456789')).toBe(true);
      expect(isValidSnowflakeId('12345678901234567890')).toBe(true);
      expect(isValidSnowflakeId('123456789012345678901')).toBe(true);
    });

    test('should return false for empty string', () => {
      expect(isValidSnowflakeId('')).toBe(false);
    });

    test('should return false for string with less than 15 digits', () => {
      expect(isValidSnowflakeId('12345678901234')).toBe(false);
      expect(isValidSnowflakeId('1')).toBe(false);
    });

    test('should return false for string with more than 22 digits', () => {
      expect(isValidSnowflakeId('12345678901234567890123')).toBe(false);
      expect(isValidSnowflakeId('123456789012345678901234567890')).toBe(false);
    });

    test('should return false for string with non-digit characters', () => {
      expect(isValidSnowflakeId('123456789012345a')).toBe(false);
      expect(isValidSnowflakeId('12345678901234-5')).toBe(false);
      expect(isValidSnowflakeId('1234567890123456 ')).toBe(false);
    });

    test('should return false for string with spaces', () => {
      expect(isValidSnowflakeId(' 123456789012345')).toBe(false);
      expect(isValidSnowflakeId('123456789012345 ')).toBe(false);
    });

    test('should return false for non-numeric strings', () => {
      expect(isValidSnowflakeId('abcdefghijklmno')).toBe(false);
      expect(isValidSnowflakeId('!@#$%^&*()')).toBe(false);
    });

    test('should validate generated snowflake ID', () => {
      const generatedId = generateSnowflakeId();
      expect(isValidSnowflakeId(generatedId)).toBe(true);
    });
  });
});
