const fs = require('fs');
const { parse } = require('csv-parse/sync');

const input = fs.readFileSync('users.csv', 'utf8');

const records = parse(input, {
  columns: true,
  skip_empty_lines: true,
});

const extracted = [];
const seenCodes = new Set();

for (const record of records) {
  const code = record.code ? record.code.trim() : '';
  let email = record.email ? record.email.trim() : '';
  let phone = record.phone ? record.phone.trim() : '';

  if (!code) continue;

  // Clean phone: some have leading spaces
  phone = phone.replace(/\s+/g, '');

  // Find if we already have an entry for this access code
  const existingIndex = extracted.findIndex((r) => r.accessCode === code);

  if (existingIndex > -1) {
    // If the existing entry is missing email or phone, and this record has it, merge it
    if (email && !extracted[existingIndex].email) {
      extracted[existingIndex].email = email;
    }
    if (phone && !extracted[existingIndex].phone) {
      extracted[existingIndex].phone = phone;
    }
  } else {
    // Add new entry
    extracted.push({
      accessCode: code,
      email: email || null,
      phone: phone || null,
    });
  }
}

fs.writeFileSync('users_data.json', JSON.stringify({ data: extracted }, null, 2));
console.log(`Extracted ${extracted.length} unique user access codes to users_data.json`);
