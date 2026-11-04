// A thin adapter: the SDK owns the session and token lifecycle.
export function createAuthGateway(client, { callbackURL } = {}) {
  if (!client?.auth) throw new TypeError('Neon Auth client required');
  async function currentUser() {
    const response = await client.auth.getSession();
    if (response.error) throw response.error;
    const user = response.data?.user || response.data?.session?.user || null;
    return user?.id ? { id: String(user.id), email: user.email || '' } : null;
  }
  async function signInGoogle() {
    if (!callbackURL || !callbackURL.startsWith('https://')) {
      throw new Error('An HTTPS callback URL must be supplied by the host application');
    }
    const result = await client.auth.signIn.social({ provider: 'google', callbackURL });
    if (result?.error) throw result.error;
    return result;
  }
  async function signOut() {
    const result = await client.auth.signOut();
    if (result?.error) throw result.error;
  }
  return Object.freeze({ currentUser, signInGoogle, signOut });
}
