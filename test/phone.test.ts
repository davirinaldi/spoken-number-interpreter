import { describe, expect, it } from 'vitest';
import { greekPhoneRule, isValidPhone, type PhoneRule } from '../src/phone.js';

describe('greek phone rule', () => {
  it.each([
    ['302558', false],
    ['2106930664', true],
    ['21069306604', false],
    ['00306974092252', true],
    ['210693664', false],
    ['2106093664', true],
    ['21060930664', false],
    ['00306972413502', true],
    ['00306097241352', false],
  ])('%s is valid: %s (PDF examples)', (digits, expected) => {
    expect(isValidPhone(digits, greekPhoneRule)).toBe(expected);
  });

  it('accepts 10 digits starting with 2 or 69 only', () => {
    expect(isValidPhone('6912345678')).toBe(true);
    expect(isValidPhone('6812345678')).toBe(false);
    expect(isValidPhone('1234567890')).toBe(false);
    expect(isValidPhone('212345678')).toBe(false);
    expect(isValidPhone('21234567890')).toBe(false);
  });

  it('accepts 14 digits starting with 00302 or 003069 only', () => {
    expect(isValidPhone('00302123456789')).toBe(true);
    expect(isValidPhone('00306912345678')).toBe(true);
    expect(isValidPhone('00306812345678')).toBe(false);
    expect(isValidPhone('0030212345678')).toBe(false);
    expect(isValidPhone('003021234567890')).toBe(false);
  });

  it('accepts another rule without code changes', () => {
    const rule: PhoneRule = { name: 'Example', shapes: [{ length: 4, prefixes: ['9'] }] };
    expect(isValidPhone('9123', rule)).toBe(true);
    expect(isValidPhone('8123', rule)).toBe(false);
    expect(isValidPhone('91234', rule)).toBe(false);
  });
});
