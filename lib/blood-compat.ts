import { BloodGroup } from '@/types';

// Map of who a donor group can donate to (recipients)
const COMPATIBILITY_DONATE_MAP: Record<BloodGroup, BloodGroup[]> = {
  'O-': ['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+'],
  'O+': ['O+', 'A+', 'B+', 'AB+'],
  'A-': ['A-', 'A+', 'AB-', 'AB+'],
  'A+': ['A+', 'AB+'],
  'B-': ['B-', 'B+', 'AB-', 'AB+'],
  'B+': ['B+', 'AB+'],
  'AB-': ['AB-', 'AB+'],
  'AB+': ['AB+'],
};

// Map of who a recipient group can receive from (donors)
const COMPATIBILITY_RECEIVE_MAP: Record<BloodGroup, BloodGroup[]> = {
  'O-': ['O-'],
  'O+': ['O-', 'O+'],
  'A-': ['O-', 'A-'],
  'A+': ['O-', 'O+', 'A-', 'A+'],
  'B-': ['O-', 'B-'],
  'B+': ['O-', 'O+', 'B-', 'B+'],
  'AB-': ['O-', 'A-', 'B-', 'AB-'],
  'AB+': ['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+'],
};

/**
 * Returns the list of blood groups that a specific donor blood group can donate to.
 */
export function getCompatibleRecipientGroups(donorGroup: BloodGroup): BloodGroup[] {
  return COMPATIBILITY_DONATE_MAP[donorGroup] || [];
}

/**
 * Returns the list of blood groups that a specific recipient blood group can receive from.
 */
export function getCompatibleDonorGroups(recipientGroup: BloodGroup): BloodGroup[] {
  return COMPATIBILITY_RECEIVE_MAP[recipientGroup] || [];
}

/**
 * Checks if a donor blood group is compatible with a recipient blood group.
 */
export function areCompatible(donorGroup: BloodGroup, recipientGroup: BloodGroup): boolean {
  const recipients = COMPATIBILITY_DONATE_MAP[donorGroup];
  return recipients ? recipients.includes(recipientGroup) : false;
}
