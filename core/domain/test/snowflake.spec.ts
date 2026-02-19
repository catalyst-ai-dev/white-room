import { generateSnowflakeId, isValidSnowflakeId } from '../src/lib/snowflake';

describe('Snowflake utilities', () => {
  describe('isValidSnowflakeId', () => {
    test('should return true for valid snowflake IDs (15 digits)', () => {
      expect(isValidSnowflakeId('123456789012345')).toBe(true);
    });

    test('should return true for valid snowflake IDs (22 digits)', () => {
      expect(isValidSnowflakeId('1234567890123456789012')).toBe(true);
    });

    test('should return true for valid snowflake IDs (18 digits)', () => {
      expect(isValidSnowflakeId('123456789012345678')).toBe(true);
    });

    test('should return false for IDs with fewer than 15 digits', () => {
      expect(isValidSnowflakeId('12345678901234')).toBe(false);
    });

    test('should return false for IDs with more than 22 digits', () => {
      expect(isValidSnowflakeId('12345678901234567890123')).toBe(false);
    });

    test('should return false for empty string', () => {
      expect(isValidSnowflakeId('')).toBe(false);
    });

    test('should return false for non-numeric characters', () => {
      expect(isValidSnowflakeId('12345678901234a')).toBe(false);
    });

    test('should return false for strings with spaces', () => {
      expect(isValidSnowflakeId('123456789012345 ')).toBe(false);
    });

    test('should return false for strings with special characters', () => {
      expect(isValidSnowflakeId('123456789012345!')).toBe(false);
    });

    test('should return false for negative numbers', () => {
      expect(isValidSnowflakeId('-12345678901234')).toBe(false);
    });
  });

  describe('generateSnowflakeId', () => {
    test('should generate valid snowflake IDs', () => {
      const id = generateSnowflakeId();
      expect(isValidSnowflakeId(id)).toBe(true);
    });

    test('should generate unique snowflake IDs', () => {
      const id1 = generateSnowflakeId();
      const id2 = generateSnowflakeId();
      expect(id1).not.toBe(id2);
    });
  });
});
