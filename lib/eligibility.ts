import { differenceInDays, differenceInYears } from 'date-fns';

export interface EligibilityRules {
  age: boolean;
  weight: boolean;
  waitPeriod: boolean;
  healthDeclaration: boolean;
}

/**
 * Calculates whether a donor is eligible based on their profile data.
 * This client-side helper mirrors the database calculated column criteria.
 */
export function checkEligibility(profile: {
  date_of_birth?: string | Date | null;
  weight?: number | string | null;
  last_donation_date?: string | Date | null;
  health_declaration?: boolean;
}): { isEligible: boolean; rules: EligibilityRules } {
  const rules: EligibilityRules = {
    age: false,
    weight: false,
    waitPeriod: false,
    healthDeclaration: false,
  };

  // 1. Age (must be 21+)
  if (profile.date_of_birth) {
    const dob = typeof profile.date_of_birth === 'string' ? new Date(profile.date_of_birth) : profile.date_of_birth;
    if (!isNaN(dob.getTime())) {
      const age = differenceInYears(new Date(), dob);
      rules.age = age >= 21;
    }
  }

  // 2. Weight (must be 100kg+)
  if (profile.weight !== undefined && profile.weight !== null && profile.weight !== '') {
    rules.weight = Number(profile.weight) >= 100;
  }

  // 3. Donation wait period (must be 30 days since last donation or null)
  if (!profile.last_donation_date) {
    rules.waitPeriod = true;
  } else {
    const lastDonation = typeof profile.last_donation_date === 'string' ? new Date(profile.last_donation_date) : profile.last_donation_date;
    if (!isNaN(lastDonation.getTime())) {
      const daysSince = differenceInDays(new Date(), lastDonation);
      rules.waitPeriod = daysSince >= 30;
    }
  }

  // 4. Health declaration (must be true)
  rules.healthDeclaration = !!profile.health_declaration;

  const isEligible = rules.age && rules.weight && rules.waitPeriod && rules.healthDeclaration;

  return { isEligible, rules };
}
