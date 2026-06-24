const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

async function runSetup() {
  const configPath = path.join(__dirname, 'config.json');
  if (!fs.existsSync(configPath)) {
    console.error('ERROR: config.json not found! Please copy config.json.example to config.json and fill in your keys before running the setup script.');
    process.exit(1);
  }

  let config;
  try {
    config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  } catch (err) {
    console.error('ERROR: Failed to parse config.json:', err.message);
    process.exit(1);
  }

  const databaseUrl = config.databaseUrl;
  if (!databaseUrl || databaseUrl.includes('YOUR_POSTGRESQL_CONNECTION_STRING_URI')) {
    console.error('ERROR: databaseUrl is missing or unconfigured in config.json! Please provide your PostgreSQL connection string.');
    process.exit(1);
  }

  console.log('Connecting to PostgreSQL database...');
  const client = new Client({
    connectionString: databaseUrl,
    ssl: {
      rejectUnauthorized: false // Required for Supabase SSL connections
    }
  });

  try {
    await client.connect();
    console.log('Connected successfully. Creating tables and configuring security policies...');

    const sqlScript = `
      -- Enable UUID extension
      CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

      -- Table: custom_splits
      CREATE TABLE IF NOT EXISTS public.custom_splits (
          id TEXT PRIMARY KEY,
          user_email TEXT NOT NULL,
          name TEXT NOT NULL,
          subtitle TEXT NOT NULL,
          duration INTEGER NOT NULL,
          splits JSONB NOT NULL,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      -- Index for fast user queries
      CREATE INDEX IF NOT EXISTS idx_custom_splits_user ON public.custom_splits(user_email);

      -- Enable Row Level Security (RLS)
      ALTER TABLE public.custom_splits ENABLE ROW LEVEL SECURITY;

      -- Drop existing policies if any
      DROP POLICY IF EXISTS "Users can view their own splits" ON public.custom_splits;
      DROP POLICY IF EXISTS "Users can insert their own splits" ON public.custom_splits;
      DROP POLICY IF EXISTS "Users can update their own splits" ON public.custom_splits;
      DROP POLICY IF EXISTS "Users can delete their own splits" ON public.custom_splits;
      DROP POLICY IF EXISTS "Users can manage their own splits" ON public.custom_splits;

      -- Create secure policy for authenticated users using JWT email claim
      CREATE POLICY "Users can manage their own splits" 
      ON public.custom_splits 
      FOR ALL 
      TO authenticated
      USING (auth.jwt() ->> 'email' = user_email)
      WITH CHECK (auth.jwt() ->> 'email' = user_email);
    `;

    await client.query(sqlScript);
    console.log('\\n======================================================');
    console.log('SUCCESS: Supabase PostgreSQL database tables and RLS');
    console.log('security policies have been configured successfully!');
    console.log('======================================================\\n');
  } catch (err) {
    console.error('ERROR: Database setup failed:', err.message);
  } finally {
    await client.end();
  }
}

runSetup();
