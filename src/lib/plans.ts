import { db } from '@/db';
import { plans as plansTable } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { cache } from 'react';

export type Plan = {
  id: string;
  name: string;
  category: string;
  price: number;
  days: number;
  creditsOffered: number;
  description: string | null;
  features: string[];
  maxWorkspaces: number;
  maxInvites: number;
};

// Cache the plans fetch for the duration of the request
export const getPlans = cache(async (categoryFilter: string = 'personal'): Promise<Plan[]> => {
  try {
    const allPlans = await db.select()
      .from(plansTable)
      .where(eq(plansTable.category, categoryFilter));
      
    // Sort logic to make consistent matrices
    return allPlans
      .sort((a, b) => a.creditsOffered === b.creditsOffered ? a.days - b.days : a.creditsOffered - b.creditsOffered)
      .map(p => ({
      ...p,
      features: (p.features as string[]) || [],
    }));
  } catch (error) {
    console.error('Error fetching plans:', error);
    return [];
  }
});

export const getAllPlans = cache(async (): Promise<Plan[]> => {
  try {
    const allPlans = await db.select().from(plansTable);
    return allPlans
      .sort((a, b) => a.creditsOffered === b.creditsOffered ? a.days - b.days : a.creditsOffered - b.creditsOffered)
      .map(p => ({
        ...p,
        features: (p.features as string[]) || [],
      }));
  } catch (error) {
    console.error('Error fetching all plans:', error);
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

