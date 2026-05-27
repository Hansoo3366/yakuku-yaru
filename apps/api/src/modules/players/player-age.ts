export function calculatePlayerAge(
  birthDate: Date | string | null | undefined,
  referenceDate: Date = new Date(),
): number | null {
  if (!birthDate) {
    return null;
  }

  const born =
    birthDate instanceof Date ? birthDate : new Date(String(birthDate).slice(0, 10));

  if (Number.isNaN(born.getTime())) {
    return null;
  }

  const reference = new Date(referenceDate);
  let age = reference.getFullYear() - born.getFullYear();
  const birthdayPassed =
    reference.getMonth() > born.getMonth() ||
    (reference.getMonth() === born.getMonth() &&
      reference.getDate() >= born.getDate());

  if (!birthdayPassed) {
    age -= 1;
  }

  return age >= 0 && age <= 80 ? age : null;
}
