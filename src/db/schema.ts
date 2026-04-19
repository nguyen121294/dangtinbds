import { pgTable as table, text, timestamp, boolean, doublePrecision, integer } from 'drizzle-orm/pg-core';

export const profiles = table('profiles', {
  id: text('id').primaryKey(), // Supabase user id
  email: text('email').notNull(),
  firstName: text('first_name'),
  lastName: text('last_name'),
  trialCredits: integer('trial_credits').default(0), // Set dynamically by auth callback from app_settings
  trialExpiresAt: timestamp('trial_expires_at'), 
  paidCredits: integer('paid_credits').default(0), // VIP paid credits
  subscriptionId: text('subscription_id'),
  subscriptionStatus: text('subscription_status').default('inactive'), // active, inactive, past_due
  subscriptionExpiresAt: timestamp('subscription_expires_at'), // This serves as Paid expires at
  status: text('status').default('active'), // active, locked
  defaultDriveFolderId: text('default_drive_folder_id'),
  defaultDriveFolderName: text('default_drive_folder_name'),
  signatures: text('signatures').array(), // List of signature names/texts
  createdAt: timestamp('created_at').defaultNow(),
});

export const payments = table('payments', {
  id: text('id').primaryKey(), // PayOS orderId
  userId: text('user_id').references(() => profiles.id),
  amount: doublePrecision('amount').notNull(),
  status: text('status').notNull(), // pending, paid, cancelled
  plan: text('plan').notNull().default('plus'), // free, plus, pro, premium
  createdAt: timestamp('created_at').defaultNow(),
});

export const plans = table('plans', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  category: text('category').notNull().default('personal'), // personal, business
  price: doublePrecision('price').notNull(),
  days: integer('days').notNull(),
  creditsOffered: integer('credits_offered').notNull().default(100), // How many credits this plan offers
  description: text('description'),
  features: text('features').array(), // Drizzle array type for postgres
  maxWorkspaces: integer('max_workspaces').notNull().default(1),
  maxInvites: integer('max_invites').notNull().default(5),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const workspaces = table('workspaces', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  ownerId: text('owner_id').references(() => profiles.id).notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const workspaceMembers = table('workspace_members', {
  id: text('id').primaryKey(),
  workspaceId: text('workspace_id').references(() => workspaces.id, { onDelete: 'cascade' }).notNull(),
  userId: text('user_id').references(() => profiles.id, { onDelete: 'cascade' }).notNull(),
  role: text('role').notNull().default('member'), // owner, admin, member
  creditLimit: integer('credit_limit').notNull().default(0), // Number of credits owner allows this member to use. 0 = cannot use.
  creditsUsed: integer('credits_used').notNull().default(0), // Number of credits this member has actively used
  joinedAt: timestamp('joined_at').defaultNow(),
});

export const appSettings = table('app_settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
  updatedAt: timestamp('updated_at').defaultNow(),
});
