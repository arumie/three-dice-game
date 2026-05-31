export const USERNAME_REGEX = /^[a-zA-Z0-9_-]+( [a-zA-Z0-9_-]+)*$/;
export const USERNAME_MAX_LENGTH = 30;

export type PlayerVerifyStatus =
  | "idle"
  | "verifying"
  | "verified"
  | "available"
  | "admin_verified"
  | "wrong_password"
  | "invalid_username";
