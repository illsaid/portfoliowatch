export function getAdminSecret(): string {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('pw_admin_secret');
    if (stored) return stored;
  }
  return '';
}

export function setAdminSecret(secret: string) {
  if (typeof window !== 'undefined') {
    localStorage.setItem('pw_admin_secret', secret);
  }
}

export function clearAdminSecret() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('pw_admin_secret');
  }
}

export function adminHeaders(): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    'x-admin-secret': getAdminSecret(),
  };
}
