import { config } from 'dotenv';
config({ path: '.env.local' });
import postgres from 'postgres';

const sql = postgres(process.env.DATABASE_URL as string, { prepare: false });

async function check() {
  try {
    const triggers = await sql`
      SELECT event_object_schema, event_object_table, trigger_name, action_statement
      FROM information_schema.triggers
      WHERE event_object_schema = 'auth' AND event_object_table = 'users';
    `;
    console.log('Triggers:', triggers);

    const functions = await sql`
      SELECT routine_name, routine_definition 
      FROM information_schema.routines 
      WHERE routine_schema = 'public';
    `;
    const fn = functions.find(f => f.routine_name.includes('handle_new_user'));
    if (fn) {
       console.log('Function definition:\n', fn.routine_definition);
    } else {
       console.log('No handle_new_user function found.');
       // print all routines just in case
       console.log('All functions:', functions.map(f => f.routine_name).join(', '));
    }
  } catch(e) {
    console.error(e);
  } finally {
    process.exit(0);
  }
}

check();
