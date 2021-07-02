import {escapeRegex, escapeHtml, isInteger, isNaturalNumber, isNonNegativeNumber, extensionOf, upperCaseFirst} from '../src/utils';

test('escapeRegex', () => {
    expect(escapeRegex('a')).toBe('a');
    expect(escapeRegex('/\\^/$*+?.()[]{}')).toBe('\\/\\\\\\^\\/\\$\\*\\+\\?\\.\\(\\)\\[\\]\\{\\}');
});

test('escapeHtml', () => {
    expect(escapeHtml('a')).toBe('a');
    expect(escapeHtml('&<>')).toBe('&amp;&lt;&gt;');
});

test('isInteger', () => {
    expect(isInteger('')).toBe(false);
    expect(isInteger('a')).toBe(false);
    expect(isInteger('1.0')).toBe(false);
    expect(isInteger('01')).toBe(false);
    expect(isInteger('+1')).toBe(false);
    expect(isInteger('-1')).toBe(true);
    expect(isInteger('0')).toBe(true);
    expect(isInteger('1')).toBe(true);
    expect(isInteger('10')).toBe(true);
});


test('isNaturalNumber', () => {
    expect(isNaturalNumber('')).toBe(false);
    expect(isNaturalNumber('-1')).toBe(false);
    expect(isNaturalNumber('1')).toBe(true);
    expect(isNaturalNumber('0')).toBe(false);
    expect(isNaturalNumber('01')).toBe(false);
    expect(isNaturalNumber('10')).toBe(true);
});

test('isNonNegativeNumber', () => {
    expect(isNonNegativeNumber('')).toBe(false);
    expect(isNonNegativeNumber('-1')).toBe(false);
    expect(isNonNegativeNumber('1')).toBe(true);
    expect(isNonNegativeNumber('0')).toBe(true);
    expect(isNonNegativeNumber('01')).toBe(false);
    expect(isNonNegativeNumber('10')).toBe(true);
});

test('extensionOf', () => {
    expect(extensionOf('name.a')).toBe('a');
    expect(extensionOf('name.b.a')).toBe('a');
    expect(extensionOf('name')).toBe('');
});

test('upperCaseFirst', () => {
    expect(upperCaseFirst('abc')).toBe('Abc');
    expect(upperCaseFirst('ABC')).toBe('ABC');
    expect(upperCaseFirst('a')).toBe('A');
    expect(upperCaseFirst('')).toBe('');
});
