export function getOrgIdFromEnv(): string {
  const orgId = process.env.DEFAULT_ORG_ID;

  if (!orgId) {
    throw new Error(
      'DEFAULT_ORG_ID environment variable is not set. ' +
      'Please add it to your .env file.'
    );
  }

  return orgId;
}
