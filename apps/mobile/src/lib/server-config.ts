/**
 * Where the app downloads published content from (your server, see docs/SERVER.md).
 * Replace CHANGE-ME with your server's address, e.g. 'https://api.164-92-10-23.sslip.io'.
 * The HTTP key is public on purpose: it only allows reading published content.
 */
export const SERVER = {
  apiUrl: 'https://api.107-170-50-239.sslip.io',
  httpKey: 'konesans-hk-se6HZd0260kH',
  /** Public key used to open a game session (duels). Not a secret: it is in every copy of the app. */
  serverKey: 'konesans-sk-nY9_5rth9pUY',
  /**
   * Google sign-in ("Sove pwogrè w ak yon kont Google"), see docs/GOOGLE-SIGNIN.md. The *Web* client ID from Google Cloud
   * (….apps.googleusercontent.com): the app asks Google for an ID token for it, and the server checks it. Not a secret.
   * Empty = all Google buttons and the home offer stay hidden.
   */
  googleWebClientId: '',
};
