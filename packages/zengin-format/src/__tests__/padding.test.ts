import { describe, it, expect } from 'vitest';
import { padLeftZero, padRightSpace } from '../padding.js';

describe('padLeftZero', () => {
  it('pads a short numeric string on the left with zeros', () => {
    expect(padLeftZero('123', 7)).toBe('0000123');
  });

  it('leaves a string of exact length unchanged', () => {
    expect(padLeftZero('1234567', 7)).toBe('1234567');
  });

  it('truncates from the left if longer than len', () => {
    expect(padLeftZero('12345678', 7)).toBe('2345678');
  });

  it('removes non-digit characters before padding', () => {
    expect(padLeftZero('0310', 4)).toBe('0310');
    expect(padLeftZero('03-10', 4)).toBe('0310');
  });

  it('handles empty string', () => {
    expect(padLeftZero('', 5)).toBe('00000');
  });
});

describe('padRightSpace', () => {
  it('pads a short string on the right with spaces', () => {
    expect(padRightSpace('ｱｲｳ', 10)).toBe('ｱｲｳ       ');
    expect(padRightSpace('ｱｲｳ', 10).length).toBe(10);
  });

  it('leaves a string of exact length unchanged', () => {
    expect(padRightSpace('ｱｲｳｴｵ', 5)).toBe('ｱｲｳｴｵ');
  });

  it('truncates a string that is too long', () => {
    expect(padRightSpace('ｱｲｳｴｵｶｷｸｹｺ', 5)).toBe('ｱｲｳｴｵ');
  });

  it('handles empty string', () => {
    expect(padRightSpace('', 5)).toBe('     ');
  });
});
