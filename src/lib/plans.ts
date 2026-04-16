import { db } from '@/db';
import { plans as plansTable } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { cache } from 'react';

export type Plan = {
  id: string;
  name: string;
  price: number;
  days: number;
  creditsOffered: number;
  description: string | null;
  features: string[];
  maxWorkspaces: number;
  maxInvites: number;
};

// Cache the plans fetch for the duration of the request
export const getPlans = cache(async (): Promise<Plan[]> => {
  try {
    const allPlans = await db.select().from(plansTable);
    return allPlans.map(p => ({
      ...p,
      features: (p.features as string[]) || [],
    }));
  } catch (error) {
    console.error('Error fetching plans:', error);
    return [];
  }
});

export const getPlan = cache(async (planId: string): Promise<Plan | null> => {
  try {
    const plan = await db.query.plans.findFirst({
      where: eq(plansTable.id, planId),
    });
    if (!plan) return null;
    return {
      ...plan,
      features: (plan.features as string[]) || [],
    };
  } catch (error) {
    console.error('Error fetching plan:', error);
    return null;
  }
});

// For backward compatibility during refactoring if needed, but we should update callers
export const PLANS_PLACEHOLDER = {
  free: { id: 'free', name: 'Free', price: 0, days: 0, creditsOffered: 10, description: 'Dùng thử miễn phí', features: [], maxWorkspaces: 1, maxInvites: 0 },
};
