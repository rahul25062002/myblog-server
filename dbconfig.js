const { Pool } = require('pg');
require('dotenv').config();

const { DATABASE_URL } = process.env;

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

module.exports = pool;

// postgres://postgres:1234@127.0.0.1:5432/myblog-angshu
