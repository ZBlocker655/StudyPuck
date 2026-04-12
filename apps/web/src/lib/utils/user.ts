type UserIdentity = {
  name?: string | null;
  email?: string | null;
};

export function getUserInitials(user: UserIdentity | null | undefined, fallback = 'StudyPuck'): string {
  const source = user?.name ?? user?.email ?? fallback;

  return source
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}
