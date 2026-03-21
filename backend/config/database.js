import pg from 'pg';

const { Pool } = pg;

let pool;

export async function connectDB() {
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production'
      ? { rejectUnauthorized: false }
      : false,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  });

  // Test connection
  const client = await pool.connect();
  console.log('✅ PostgreSQL connected');
  client.release();

  return pool;
}

export function getDB() {
  if (!pool) throw new Error('Database not initialized. Call connectDB() first.');
  return pool;
}

// Helper: run a query with error handling
export async function query(text, params) {
  const start = Date.now();
  const result = await getDB().query(text, params);
  const duration = Date.now() - start;

  if (process.env.NODE_ENV === 'development') {
    console.log('⚡ Query:', { text: text.slice(0, 60), duration: `${duration}ms`, rows: result.rowCount });
  }

  return result;
}

// Helper: get a client for transactions
export async function getClient() {
  return getDB().connect();
}
