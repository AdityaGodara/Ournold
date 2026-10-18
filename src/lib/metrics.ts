/** Health metrics. Mirrors backend/app/services/metrics.py so both sides agree. */

export const ACTIVITY_MULTIPLIERS: Record<string, number> = {
  no: 1.2,
  light: 1.375,
  medium: 1.55,
  regular: 1.725,
  student: 1.9, // legacy value kept so old profiles still compute
};

export function ageFromDob(dob: string | undefined | null, today: Date = new Date()): number | null {
  if (!dob) return null;
  const born = new Date(`${dob.slice(0, 10)}T00:00:00`);
  if (Number.isNaN(born.getTime())) return null;
  let age = today.getFullYear() - born.getFullYear();
  const beforeBirthday =
    today.getMonth() < born.getMonth() || (today.getMonth() === born.getMonth() && today.getDate() < born.getDate());
  if (beforeBirthday) age -= 1;
  return age;
}

export const bmi = (kg: number, cm: number): number | null =>
  kg > 0 && cm > 0 ? Math.round((kg / (cm / 100) ** 2) * 10) / 10 : null;

/** Mifflin-St Jeor, gender-aware (the old version always used the male constant). */
export const bmr = (kg: number, cm: number, age: number, gender: string): number | null =>
  kg > 0 && cm > 0 && age > 0
    ? Math.round((10 * kg + 6.25 * cm - 5 * age + (gender.toLowerCase().startsWith("m") ? 5 : -161)) * 10) / 10
    : null;

export const maintenanceCalories = (bmrValue: number | null, activity: string): number | null =>
  bmrValue ? Math.round(bmrValue * (ACTIVITY_MULTIPLIERS[activity] ?? 1.2)) : null;
