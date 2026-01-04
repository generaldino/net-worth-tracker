/**
 * Script to calculate net worth for December 2025 from CSV export
 * 
 * This script parses the CSV export and calculates net worth in GBP
 * based on the codebase's logic:
 * - Assets: add to net worth
 * - Liabilities (Credit Cards, Loans): subtract from net worth
 * - All currencies converted to GBP using December 2025 exchange rates
 */

import * as fs from 'fs';
import * as path from 'path';

// Exchange rates for December 2025 (approximate - would need to fetch from API)
// Rates are stored as: 1 GBP = X AED (base is GBP)
// For December 2025, approximate rate: 1 GBP ≈ 4.65 AED
const DEC_2025_EXCHANGE_RATES: Record<string, number> = {
  GBP: 1.0,
  AED: 4.65, // 1 GBP = 4.65 AED, so 1 AED = 1/4.65 GBP
};

interface CSVRow {
  accountName: string;
  type: string;
  category: string;
  currency: string;
  isISA: string;
  owner: string;
  status: string;
  currentValue: number;
  valueChange: number;
  valueChangePercent: number;
}

function parseCSV(filePath: string): CSVRow[] {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n').filter(line => line.trim());
  
  // Skip header
  const dataLines = lines.slice(1);
  
  return dataLines.map(line => {
    // Simple CSV parsing (handles quoted values)
    const matches = line.match(/(".*?"|[^,]+)(?=\s*,|\s*$)/g);
    if (!matches) return null;
    
    const values = matches.map(val => val.replace(/^"|"$/g, '').trim());
    
    return {
      accountName: values[0],
      type: values[1],
      category: values[2],
      currency: values[3],
      isISA: values[4],
      owner: values[5],
      status: values[6],
      currentValue: parseFloat(values[7]) || 0,
      valueChange: parseFloat(values[8]) || 0,
      valueChangePercent: parseFloat(values[9]) || 0,
    };
  }).filter((row): row is CSVRow => row !== null);
}

function convertToGBP(amount: number, currency: string): number {
  if (currency === 'GBP') {
    return amount;
  }
  
  const rate = DEC_2025_EXCHANGE_RATES[currency];
  if (!rate) {
    console.warn(`Unknown currency: ${currency}, using 1:1 conversion`);
    return amount;
  }
  
  // Rates are stored as 1 GBP = X Currency
  // So to convert: amount / rate
  return amount / rate;
}

function isLiability(type: string): boolean {
  return type === 'Credit Card' || type === 'Loan';
}

function calculateNetWorth(rows: CSVRow[]): {
  dec2025NetWorth: number;
  jan2026NetWorth: number;
  breakdown: Array<{ account: string; valueGBP: number; type: string }>;
} {
  const breakdown: Array<{ account: string; valueGBP: number; type: string }> = [];
  let dec2025Total = 0;
  let jan2026Total = 0;
  
  // Calculate Dec 2025 values: Current Value - Value Change
  // (assuming Current Value is Jan 2026, Value Change is Dec->Jan change)
  // OR Current Value is Dec 2025 (latest complete month)
  
  // Based on the filename "accounts-export-2026-01-04.csv", 
  // Current Value likely represents December 2025 (latest complete month)
  // So we'll use Current Value directly for Dec 2025
  
  for (const row of rows) {
    if (row.status !== 'Open') continue;
    
    const dec2025Value = row.currentValue - row.valueChange; // Back-calculate to Dec
    const jan2026Value = row.currentValue;
    
    const dec2025ValueGBP = convertToGBP(dec2025Value, row.currency);
    const jan2026ValueGBP = convertToGBP(jan2026Value, row.currency);
    
    if (isLiability(row.type)) {
      // Liabilities: subtract
      dec2025Total -= Math.abs(dec2025ValueGBP);
      jan2026Total -= Math.abs(jan2026ValueGBP);
      breakdown.push({
        account: row.accountName,
        valueGBP: -Math.abs(dec2025ValueGBP),
        type: `${row.type} (Liability)`,
      });
    } else {
      // Assets: add
      dec2025Total += dec2025ValueGBP;
      jan2026Total += jan2026ValueGBP;
      breakdown.push({
        account: row.accountName,
        valueGBP: dec2025ValueGBP,
        type: row.type,
      });
    }
  }
  
  return {
    dec2025NetWorth: dec2025Total,
    jan2026NetWorth: jan2026Total,
    breakdown: breakdown.sort((a, b) => Math.abs(b.valueGBP) - Math.abs(a.valueGBP)),
  };
}

// Main execution
const csvPath = path.join(process.cwd(), 'accounts-export-2026-01-04.csv');

if (!fs.existsSync(csvPath)) {
  console.error(`CSV file not found: ${csvPath}`);
  process.exit(1);
}

console.log('Parsing CSV...\n');
const rows = parseCSV(csvPath);
console.log(`Found ${rows.length} accounts\n`);

const result = calculateNetWorth(rows);

console.log('='.repeat(60));
console.log('NET WORTH CALCULATION (Based on CSV Data)');
console.log('='.repeat(60));
console.log(`\nDecember 2025 Net Worth: £${result.dec2025NetWorth.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
console.log(`January 2026 Net Worth:  £${result.jan2026NetWorth.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
console.log(`\nChange: £${(result.jan2026NetWorth - result.dec2025NetWorth).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);

console.log('\n' + '='.repeat(60));
console.log('BREAKDOWN BY ACCOUNT (December 2025)');
console.log('='.repeat(60));
console.log('\nTop 15 accounts by absolute value:\n');

result.breakdown.slice(0, 15).forEach((item, index) => {
  const sign = item.valueGBP >= 0 ? '+' : '';
  console.log(`${(index + 1).toString().padStart(2)}. ${item.account.padEnd(35)} ${sign}£${item.valueGBP.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).padStart(15)} (${item.type})`);
});

console.log('\n' + '='.repeat(60));
console.log('\nNote: This calculation assumes:');
console.log('1. "Current Value" represents January 2026 values');
console.log('2. "Value Change" represents Dec 2025 -> Jan 2026 change');
console.log('3. December 2025 value = Current Value - Value Change');
console.log('4. AED to GBP rate: 1 AED = 1/4.65 GBP (approximate)');
console.log('5. All open accounts are included');
console.log('6. Credit Cards and Loans are treated as liabilities (subtracted)');
console.log('\nIf "Current Value" already represents December 2025, then use that directly.');

