import { generateSnowflakeId, isValidSnowflakeId } from '../src/lib/snowflake';

describe('Snowflake utilities', () => {
  describe('isValidSnowflakeId', () => {
    test('should return true for valid snowflake IDs (15-22 digits)', () => {
      expect(isValidSnowflakeId('123456789012345')).toBe(true);
      expect(isValidSnowflakeId('1234567890123456')).toBe(true);
      expect(isValidSnowflakeId('12345678901234567890')).toBe(true);
      expect(isValidSnowflakeId('1234567890123456789012')).toBe(true);
    });

    test('should return false for IDs shorter than 15 digits', () => {
      expect(isValidSnowflakeId('12345678901234')).toBe(false);
      expect(isValidSnowflakeId('123456789')).toBe(false);
      expect(isValidSnowflakeId('1')).toBe(false);
    });

    test('should return false for IDs longer than 22 digits', () => {
      expect(isValidSnowflakeId('12345678901234567890123')).toBe(false);
      expect(isValidSnowflakeId('123456789012345678901234567890')).toBe(false);
    });

    test('should return false for non-numeric strings', () => {
      expect(isValidSnowflakeId('abc123def456789')).toBe(false);
      expect(isValidSnowflakeId('123456789012a45')).toBe(false);
      expect(isValidSnowflakeId('not-a-number')).toBe(false);
    });

    test('should return false for empty strings', () => {
      expect(isValidSnowflakeId('')).toBe(false);
    });

    test('should return false for strings with spaces', () => {
      expect(isValidSnowflakeId(' 123456789012345')).toBe(false);
      expect(isValidSnowflakeId('123456789012345 ')).toBe(false);
      expect(isValidSnowflakeId('12345 6789012345')).toBe(false);
    });

    test('should validate generated snowflake IDs', () => {
      const generatedId = generateSnowflakeId();
      expect(isValidSnowflakeId(generatedId)).toBe(true);
    });
  });
});
