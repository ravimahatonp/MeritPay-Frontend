import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
// @ts-expect-error Node strip-types requires explicit .ts extension
import { parseCSV, parseCSVLine, MAX_EMPLOYEES } from '../csv.ts';

describe('parseCSVLine', () => {
  it('parses simple unquoted fields', () => {
    const fields = parseCSVLine('Alice,100,160,20,15');
    assert.deepEqual(fields, ['Alice', '100', '160', '20', '15']);
  });

  it('parses quoted fields containing commas', () => {
    const fields = parseCSVLine('"Smith, John",100,160,20,15');
    assert.deepEqual(fields, ['Smith, John', '100', '160', '20', '15']);
  });

  it('parses quoted fields with escaped double quotes', () => {
    const fields = parseCSVLine('"John ""The Boss"" Doe",100,160,20,15');
    assert.deepEqual(fields, ['John "The Boss" Doe', '100', '160', '20', '15']);
  });

  it('handles empty fields correctly', () => {
    const fields = parseCSVLine('Alice,,160,,15');
    assert.deepEqual(fields, ['Alice', '', '160', '', '15']);
  });

  it('trims whitespace outside quotes while preserving whitespace inside quotes', () => {
    const fields = parseCSVLine('  " Smith, John "  ,  100  , 160 ');
    assert.deepEqual(fields, [' Smith, John ', '100', '160']);
  });
});

describe('parseCSV', () => {
  const validHeader = 'name,base_salary,hours_threshold,hours_bonus,sales_bonus';

  it('successfully parses valid CSV and assigns deterministic IDs 1..n', () => {
    const csv = [
      validHeader,
      'Alice,100,160,20,15',
      'Bob,120,160,25,18',
      '"Carol, CPA",110,160,22,12',
    ].join('\n');

    const result = parseCSV(csv);
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.rows.length, 3);
      assert.deepEqual(result.rows[0], {
        id: 1,
        name: 'Alice',
        baseSalary: 100,
        hoursThreshold: 160,
        hoursBonus: 20,
        salesBonus: 15,
      });
      assert.deepEqual(result.rows[1], {
        id: 2,
        name: 'Bob',
        baseSalary: 120,
        hoursThreshold: 160,
        hoursBonus: 25,
        salesBonus: 18,
      });
      assert.deepEqual(result.rows[2], {
        id: 3,
        name: 'Carol, CPA',
        baseSalary: 110,
        hoursThreshold: 160,
        hoursBonus: 22,
        salesBonus: 12,
      });
    }
  });

  it('accepts headers with case insensitivity and spaces', () => {
    const csv = [
      'Name, Base Salary, Hours Threshold, Hours Bonus, Sales Bonus',
      'Alice,100,160,20,15',
    ].join('\n');

    const result = parseCSV(csv);
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.rows.length, 1);
      assert.equal(result.rows[0].name, 'Alice');
    }
  });

  it('rejects files with fewer than 2 lines (empty or header-only)', () => {
    const resultEmpty = parseCSV('');
    assert.equal(resultEmpty.ok, false);
    if (!resultEmpty.ok) {
      assert.match(resultEmpty.summary ?? '', /must have a header row and at least one data row/i);
    }

    const resultHeaderOnly = parseCSV(validHeader);
    assert.equal(resultHeaderOnly.ok, false);
    if (!resultHeaderOnly.ok) {
      assert.match(resultHeaderOnly.summary ?? '', /must have a header row and at least one data row/i);
    }
  });

  it('rejects files with missing required headers', () => {
    const csv = ['name,base_salary,hours_threshold', 'Alice,100,160'].join('\n');
    const result = parseCSV(csv);
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.match(result.summary ?? '', /Missing required columns: hours_bonus, sales_bonus/);
    }
  });

  it('rejects files exceeding MAX_EMPLOYEES data rows with a clear error naming the limit', () => {
    const rows = [
      validHeader,
      'Alice,100,160,20,15',
      'Bob,100,160,20,15',
      'Carol,100,160,20,15',
      'Dave,100,160,20,15',
      'Eve,100,160,20,15',
      'Frank,100,160,20,15',
    ];
    const csv = rows.join('\n');
    const result = parseCSV(csv);
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(
        result.summary,
        `File has 6 rows; the circuit supports at most ${MAX_EMPLOYEES}.`,
      );
    }
  });

  it('rejects files with 8 rows naming both row count and limit', () => {
    const rows = [validHeader];
    for (let i = 1; i <= 8; i++) {
      rows.push(`Employee${i},100,160,20,15`);
    }
    const result = parseCSV(rows.join('\n'));
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(
        result.summary,
        `File has 8 rows; the circuit supports at most ${MAX_EMPLOYEES}.`,
      );
    }
  });

  it('reports row number and reason for invalid base_salary (0, blank, negative, non-numeric)', () => {
    const csv = [
      validHeader,
      'Alice,0,160,20,15',       // row 2: 0 salary
      'Bob,,160,20,15',          // row 3: blank salary
      'Carol,-50,160,20,15',     // row 4: negative salary
      'Dave,invalid,160,20,15',  // row 5: non-numeric salary
    ].join('\n');

    const result = parseCSV(csv);
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(result.errors.length, 4);
      assert.deepEqual(result.errors[0], {
        row: 2,
        field: 'base_salary',
        message: 'base_salary must be a positive number.',
      });
      assert.deepEqual(result.errors[1], {
        row: 3,
        field: 'base_salary',
        message: 'base_salary must be a positive number.',
      });
      assert.deepEqual(result.errors[2], {
        row: 4,
        field: 'base_salary',
        message: 'base_salary must be a positive number.',
      });
      assert.deepEqual(result.errors[3], {
        row: 5,
        field: 'base_salary',
        message: 'base_salary must be a positive number.',
      });
    }
  });

  it('does not silently import valid rows when some rows are malformed', () => {
    const csv = [
      validHeader,
      'Alice,100,160,20,15',  // valid
      'Bob,0,160,20,15',      // invalid base salary
      'Carol,110,160,22,12',  // valid
    ].join('\n');

    const result = parseCSV(csv);
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(result.errors.length, 1);
      assert.equal(result.errors[0].row, 3);
      assert.equal(result.errors[0].field, 'base_salary');
      assert.equal('rows' in result, false);
    }
  });

  it('validates name, hours_threshold, hours_bonus, and sales_bonus constraints', () => {
    const csv = [
      validHeader,
      ',100,160,20,15',         // row 2: empty name
      'Bob,100,0,20,15',        // row 3: hours_threshold < 1
      'Carol,100,160.5,20,15',  // row 4: hours_threshold not an integer
      'Dave,100,160,-5,15',     // row 5: negative hours_bonus
    ].join('\n');

    const result = parseCSV(csv);
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(result.errors.length, 4);
      assert.equal(result.errors[0].field, 'name');
      assert.equal(result.errors[0].row, 2);

      assert.equal(result.errors[1].field, 'hours_threshold');
      assert.equal(result.errors[1].row, 3);

      assert.equal(result.errors[2].field, 'hours_threshold');
      assert.equal(result.errors[2].row, 4);

      assert.equal(result.errors[3].field, 'hours_bonus');
      assert.equal(result.errors[3].row, 5);
    }
  });
});
