import pg from 'pg';

const { Pool } = pg;

let pool;

export async function connectDB() {
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production'
      ? { rejectUnauthorized: false }
      : false,
    max: 50,
    min: 5,
    idleTimeoutMillis: 60000,
    connectionTimeoutMillis: 10000,
    statement_timeout: 30000,
    query_timeout: 30000,
    application_name: 'soundflow-api',
  });

  pool.on('error', (err) => console.error('PG pool error:', err));
  pool.on('connect', () => console.log('PG new client connected'));

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
