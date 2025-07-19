import { getSession, signIn } from 'next-auth/react';

export async function getAccessToken(): Promise<string | null> {
  try {
    const session = await getSession();
    if (!session) {
      // Try to refresh the session
      await signIn('credentials', { redirect: false });
      const newSession = await getSession();
      return newSession?.user?.id || null;
    }
    return session?.user?.id || null;
  } catch (error) {
    console.error('Error getting access token:', error);
    return null;
  }
}
