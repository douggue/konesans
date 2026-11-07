/**
 * "Sove pwogrè w ak yon kont Google" — optional, behind the parent gate. Needs the native module
 * @react-native-google-signin/google-signin (a new APK) and SERVER.googleWebClientId (docs/GOOGLE-SIGNIN.md); with an
 * empty id every Google button and the home offer stay hidden.
 *  - connect: the Google account is linked to the kid's current (device) account, so nothing changes for the kid;
 *  - new phone: "Konekte ak Google" logs into that account, links this phone's new device id to it and restores the save.
 * The ID token's audience (the web client id) is checked by the server (server/nakama/src/account.ts hooks).
 * The cloud save / recovery code (cloud.ts) never imports this file.
 */
import { Platform } from 'react-native';
import { savePreview, type CloudSave, type SavePreview } from '@konesans/core';
import { SERVER } from './server-config';
import { serverConfigured } from './remote';
import { linkGoogle, googleSession, rpcWithToken, linkDeviceWithToken, newDeviceId, switchDevice, onlineFailure } from './online';
import { adoptSave, fetchAccountInfo, useCloud } from './cloud';

export const googleEnabled = () => !!SERVER.googleWebClientId && serverConfigured();

export type GoogleError = 'cancelled' | 'unavailable' | 'in_use' | 'not_found' | 'offline' | 'server';
export class GoogleFailure extends Error { constructor(public kind: GoogleError) { super(kind); } }

/** Ask Google (account picker) for an ID token. Throws GoogleFailure ('cancelled' when the parent closed it). */
async function idToken(): Promise<string> {
  // this build ships without the native Google module (comes with the next APK)
  let G: any; G = null; if (!G) throw new GoogleFailure('unavailable'); // older APK without the module, or web
  if (Platform.OS === 'web') throw new GoogleFailure('unavailable');
  try {
    G.GoogleSignin.configure({ webClientId: SERVER.googleWebClientId, offlineAccess: false });
    await G.GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    const r = await G.GoogleSignin.signIn();
    if (!G.isSuccessResponse(r) || !r.data.idToken) throw new GoogleFailure('cancelled');
    const tok = r.data.idToken;
    G.GoogleSignin.signOut().catch(() => {}); // nothing stays signed in on a shared family phone
    return tok;
  } catch (e: any) {
    if (e instanceof GoogleFailure) throw e;
    if (G.isErrorWithCode(e) && (e.code === G.statusCodes.SIGN_IN_CANCELLED || e.code === G.statusCodes.IN_PROGRESS)) throw new GoogleFailure('cancelled');
    if (G.isErrorWithCode(e) && e.code === G.statusCodes.PLAY_SERVICES_NOT_AVAILABLE) throw new GoogleFailure('unavailable');
    throw new GoogleFailure('server');
  }
}

function serverError(e: unknown, notFound: GoogleError = 'server'): GoogleFailure {
  if (e instanceof GoogleFailure) return e;
  const f = onlineFailure(e);
  if (!f) return new GoogleFailure('offline');
  if (f.status === 409 || /already in use/i.test(f.message)) return new GoogleFailure('in_use');
  if (f.status === 404) return new GoogleFailure(notFound);
  return new GoogleFailure('server');
}

/** Link a Google account to the kid's current account (after the parent gate). */
export async function connectGoogle(): Promise<void> {
  const tok = await idToken();
  try { await linkGoogle(tok); } catch (e) { throw serverError(e); }
  useCloud.setState({ google: true });
  fetchAccountInfo().catch(() => {});
}

export interface GoogleFound { token: string; save: CloudSave | null; code: string | null; preview: SavePreview | null }
/** New phone: find the account a Google account is linked to (nothing changes yet). */
export async function findGoogleAccount(): Promise<GoogleFound> {
  const tok = await idToken();
  let session: string;
  try { session = await googleSession(tok); } catch (e) { throw serverError(e, 'not_found'); }
  try {
    const g = await rpcWithToken<{ save: CloudSave | null; code: string }>(session, 'save_get', {});
    return { token: session, save: g.save, code: g.code, preview: savePreview(g.save) };
  } catch (e) { throw serverError(e); }
}
/** Make this phone that account (links a new device id to it) and take its save. */
export async function restoreFromGoogle(found: GoogleFound): Promise<SavePreview | null> {
  const dev = newDeviceId();
  try { await linkDeviceWithToken(found.token, dev); } catch (e) { throw serverError(e); }
  await switchDevice(dev);
  useCloud.setState({ google: true });
  return adoptSave(found.save, found.code);
}
