/**
 * Shared password rules (web). Palitan lang ang dalawang constant
 * sa ibaba kung gusto mong baguhin ang limit.
 *
 * NOTE: sa SIGNUP at CHANGE PASSWORD lang ito ginagamit, HINDI sa
 * login form, para hindi ma-lock out ang mga lumang account na mas
 * mahaba ang password.
 */
export const PASSWORD_MIN = 8;
export const PASSWORD_MAX = 12;

export const getPasswordChecks = (password = '') => [
  {
    id: 'length',
    label: `${PASSWORD_MIN}–${PASSWORD_MAX} characters`,
    ok: password.length >= PASSWORD_MIN && password.length <= PASSWORD_MAX,
  },
];

/** Nagbabalik ng error message, o null kung valid. */
export const validatePassword = (password = '') => {
  if (password.length < PASSWORD_MIN) {
    return `Password must be at least ${PASSWORD_MIN} characters.`;
  }
  if (password.length > PASSWORD_MAX) {
    return `Password must be at most ${PASSWORD_MAX} characters.`;
  }
  return null;
};