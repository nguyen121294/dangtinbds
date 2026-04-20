import { config } from 'dotenv';
config({ path: '.env.local' });
import postgres from 'postgres';

const sql = postgres(process.env.DATABASE_URL as string, { prepare: false });

async function updateTrigger() {
  try {
    await sql`
      CREATE OR REPLACE FUNCTION public.handle_new_user()
      RETURNS TRIGGER AS $$
      BEGIN
        INSERT INTO public.profiles (id, email, "first_name", "last_name", "subscription_status", "trial_credits")
        VALUES (
          NEW.id,
          NEW.email,
          NEW.raw_user_meta_data->>'full_name',
          NEW.raw_user_meta_data->>'name',
          'inactive',
          10
        )
        ON CONFLICT (id) DO NOTHING;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
    `;
    console.log('Trigger function handle_new_user successfully updated!');
  } catch(e) {
    console.error('Error updating trigger:', e);
  } finally {
    process.exit(0);
  }
}

updateTrigger();
