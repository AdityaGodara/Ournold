const MESSAGES: Record<string, string> = {
  "auth/invalid-credential": "Incorrect email or password.",
  "auth/wrong-password": "Incorrect email or password.",
  "auth/user-not-found": "Incorrect email or password.",
  "auth/invalid-email": "That email address doesn't look right.",
  "auth/user-disabled": "This account has been disabled.",
  "auth/too-many-requests": "Too many attempts. Please wait a few minutes and try again.",
  "auth/email-already-in-use": "This email is already registered. Please log in instead.",
  "auth/weak-password": "Please choose a stronger password.",
  "auth/network-request-failed": "Network error. Check your connection and try again.",
};

export function authErrorMessage(err: unknown, fallback = "Something went wrong. Please try again."): string {
  const code = (err as { code?: string })?.code;
  return (code && MESSAGES[code]) || fallback;
}
