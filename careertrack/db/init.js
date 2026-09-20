const fs = require('fs');
const path = require('path');
const db = require('./connection');

(async () => {
  try {
    const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
    const statements = schema
      .replace(/--.*$/gm, '')
      .split(';')
      .map((statement) => statement.trim())
      .filter(Boolean);

    for (const statement of statements) {
      if (/^CREATE\s+INDEX\s+/i.test(statement)) {
        const match = statement.match(/^CREATE\s+INDEX\s+([A-Za-z0-9_]+)\s+ON\s+([A-Za-z0-9_]+)\s*\(/i);
        if (!match) {
          throw new Error(`Unsupported CREATE INDEX statement: ${statement}`);
        }

        const [, indexName, tableName] = match;
        const [rows] = await db.query(
          'SELECT 1 FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = ? AND index_name = ?',
          [tableName, indexName]
        );

        if (rows.length === 0) {
          await db.query(statement.replace(/\bIF\s+NOT\s+EXISTS\b\s*/i, ''));
        }

        continue;
      }

      await db.query(statement);
    }

    console.log('Database schema initialised in MySQL');
  } catch (err) {
    console.error('MySQL schema init failed:', err.message);
    process.exit(1);
  }
})();

module.exports = db;
