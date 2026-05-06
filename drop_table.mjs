import dotenv from 'dotenv';
import pg from 'pg';

dotenv.config({ path: '.env' });

const client = new pg.Client(process.env.DATABASE_URL);
client.connect()
  .then(() => client.query('DROP TABLE IF EXISTS ai_insights CASCADE;'))
  .then(() => {
    console.log('Table dropped');
    process.exit(0);
  })
  .catch(e => {
    console.error(e);
    process.exit(1);
  });
