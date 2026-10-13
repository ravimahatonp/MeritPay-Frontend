/**
 * Robust CSV parser with quoted-field support and per-row validation.
 *
 * Extracted from app/employer/page.tsx so it can be independently tested
 * and reused across the application.
 */

/** Shape of a parsed employee row. */
export interface EmployeeRow {
  id: number;
  name: string;
  baseSalary: number;
  hoursThreshold: number;
  hoursBonus: number;
  salesBonus: number;
}

/** A single validation error tied to a specific row and field. */
export interface RowError {
  /** 1-based row index in the original file (header = row 1). */
  row: number;
  field: string;
  message: string;
}

/** Successful parse result. */
export interface CSVSuccess {
  ok: true;
  rows: EmployeeRow[];
}

/** Failed parse result with structured errors. */
export interface CSVFailure {
  ok: false;
  errors: RowError[];
  /** Optional top-level message (e.g. missing headers, row cap exceeded). */
  summary?: string;
}

export type CSVResult = CSVSuccess | CSVFailure;

/** Maximum number of employees the payroll circuit supports. */
export const MAX_EMPLOYEES = 5;

const REQUIRED_HEADERS = [
  'name',
  'base_salary',
  'hours_threshold',
  'hours_bonus',
  'sales_bonus',
] as const;

// ---------------------------------------------------------------------------
// RFC 4180-compliant quoted-field CSV line parser
// ---------------------------------------------------------------------------

/**
 * Split a single CSV line into fields, respecting double-quoted values.
 *
 * Rules (RFC 4180):
 * - Fields may be wrapped in `"`.
 * - A literal `"` inside a quoted field is escaped as `""`.
 * - Commas inside quoted fields are treated as data, not delimiters.
 * - Leading/trailing whitespace outside quotes is trimmed.
 */
export function parseCSVLine(line: string): string[] {
  const fields: string[] = [];
  let i = 0;

  while (i <= line.length) {
    // Skip leading whitespace
    while (i < line.length && (line[i] === ' ' || line[i] === '\t')) i++;

    if (i >= line.length) {
      fields.push('');
      break;
    }

    if (line[i] === '"') {
      // Quoted field
      i++; // skip opening quote
      let value = '';
      while (i < line.length) {
        if (line[i] === '"') {
          if (i + 1 < line.length && line[i + 1] === '"') {
            // Escaped quote
            value += '"';
            i += 2;
          } else {
            // Closing quote
            i++;
            break;
          }
        } else {
          value += line[i];
          i++;
        }
      }
      fields.push(value);
      // Skip to next comma or end
      while (i < line.length && line[i] !== ',') i++;
      i++; // skip comma
    } else {
      // Unquoted field
      const start = i;
      while (i < line.length && line[i] !== ',') i++;
      fields.push(line.substring(start, i).trim());
      i++; // skip comma
    }
  }

  return fields;
}

// ---------------------------------------------------------------------------
// Main parser
// ---------------------------------------------------------------------------

/**
 * Parse a CSV string into validated EmployeeRow objects.
 *
 * - Supports quoted fields (commas inside names, escaped quotes).
 * - Rejects files exceeding MAX_EMPLOYEES data rows instead of silently truncating.
 * - Validates every field per row and collects all errors before returning.
 * - Assigns deterministic ids 1..n so downstream id-keyed lookups are predictable.
 */
export function parseCSV(text: string): CSVResult {
  const lines = text
    .trim()
    .split(/\r?\n/)
    .filter(line => line.trim().length > 0);

  if (lines.length < 2) {
    return {
      ok: false,
      errors: [],
      summary: 'CSV must have a header row and at least one data row.',
    };
  }

  // --- Header validation ---------------------------------------------------
  const headerFields = parseCSVLine(lines[0]).map(h =>
    h.trim().toLowerCase().replace(/\s+/g, '_'),
  );
  const missing = REQUIRED_HEADERS.filter(r => !headerFields.includes(r));
  if (missing.length) {
    return {
      ok: false,
      errors: [],
      summary: `Missing required columns: ${missing.join(', ')}`,
    };
  }

  // --- Row cap check --------------------------------------------------------
  const dataRowCount = lines.length - 1;
  if (dataRowCount > MAX_EMPLOYEES) {
    return {
      ok: false,
      errors: [],
      summary: `File has ${dataRowCount} rows; the circuit supports at most ${MAX_EMPLOYEES}.`,
    };
  }

  // --- Per-row parsing & validation -----------------------------------------
  const rows: EmployeeRow[] = [];
  const errors: RowError[] = [];

  for (let i = 1; i < lines.length; i++) {
    const fileRow = i + 1; // 1-based row number in the file
    const values = parseCSVLine(lines[i]);
    const col = (key: string): string =>
      values[headerFields.indexOf(key)]?.trim() ?? '';

    // Name
    const rawName = col('name').slice(0, 100);
    if (!rawName) {
      errors.push({
        row: fileRow,
        field: 'name',
        message: 'name cannot be empty.',
      });
    }

    // Base salary
    const rawBaseSalary = col('base_salary');
    const baseSalary = Number(rawBaseSalary);
    if (rawBaseSalary === '' || !Number.isFinite(baseSalary) || baseSalary <= 0) {
      errors.push({
        row: fileRow,
        field: 'base_salary',
        message: 'base_salary must be a positive number.',
      });
    } else if (baseSalary > 1_000_000) {
      errors.push({
        row: fileRow,
        field: 'base_salary',
        message: 'base_salary exceeds maximum allowed (1,000,000).',
      });
    }

    // Hours threshold
    const rawHours = col('hours_threshold');
    const hoursThreshold = Number(rawHours);
    if (rawHours === '' || !Number.isFinite(hoursThreshold) || !Number.isInteger(hoursThreshold) || hoursThreshold < 1) {
      errors.push({
        row: fileRow,
        field: 'hours_threshold',
        message: 'hours_threshold must be an integer >= 1.',
      });
    } else if (hoursThreshold > 10_000) {
      errors.push({
        row: fileRow,
        field: 'hours_threshold',
        message: 'hours_threshold exceeds maximum allowed (10,000).',
      });
    }

    // Hours bonus
    const rawHoursBonus = col('hours_bonus');
    const hoursBonus = Number(rawHoursBonus);
    if (rawHoursBonus === '' || !Number.isFinite(hoursBonus) || hoursBonus < 0) {
      errors.push({
        row: fileRow,
        field: 'hours_bonus',
        message: 'hours_bonus must be a finite number >= 0.',
      });
    } else if (hoursBonus > 100_000) {
      errors.push({
        row: fileRow,
        field: 'hours_bonus',
        message: 'hours_bonus exceeds maximum allowed (100,000).',
      });
    }

    // Sales bonus
    const rawSalesBonus = col('sales_bonus');
    const salesBonus = Number(rawSalesBonus);
    if (rawSalesBonus === '' || !Number.isFinite(salesBonus) || salesBonus < 0) {
      errors.push({
        row: fileRow,
        field: 'sales_bonus',
        message: 'sales_bonus must be a finite number >= 0.',
      });
    } else if (salesBonus > 100_000) {
      errors.push({
        row: fileRow,
        field: 'sales_bonus',
        message: 'sales_bonus exceeds maximum allowed (100,000).',
      });
    }

    // Only populate rows if we haven't encountered errors so far
    rows.push({
      id: i, // deterministic 1-based index 1..n
      name: rawName,
      baseSalary,
      hoursThreshold,
      hoursBonus,
      salesBonus,
    });
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  return { ok: true, rows };
}
