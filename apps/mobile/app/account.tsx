/** "Kòd pou rekipere pwogrè m": the account's recovery code, big, to write down or share (src/lib/cloud.ts). */
import React, { useEffect, useState } from 'react';
import { View, Platform, Share, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { Screen, T, Card, TopBar, Button, Icon, Mascot, FadeIn, Pop } from '@/ui';
import { colors, fonts } from '@/lib/theme';
import { useStore } from '@/lib/store';
import { useT, formatDate } from '@/lib/i18n';
import { useCloud, fetchAccountInfo, startCloudSync, syncNow } from '@/lib/cloud';
import { serverConfigured } from '@/lib/remote';

export default function Account() {
  const t = useT();
  const lang = useStore((s) => s.profile.lang);
  const code = useCloud((s) => s.code);
  const lastSync = useCloud((s) => s.lastSync);
  const [state, setState] = useState<'loading' | 'ok' | 'offline'>(code ? 'ok' : 'loading');
  const [copied, setCopied] = useState(false);
  const load = () => {
    if (!serverConfigured()) { setState('offline'); return; }
    if (!useCloud.getState().code) setState('loading');
    startCloudSync();
    syncNow({ pull: true }).catch(() => {});
    fetchAccountInfo().then(() => setState('ok'), () => setState(useCloud.getState().code ? 'ok' : 'offline'));
  };
  useEffect(load, []);
  const share = async () => {
    if (!code) return;
    if (Platform.OS === 'web') {
      try { await (globalThis as any).navigator?.clipboard?.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { /* no clipboard */ }
      return;
    }
    try { await Share.share({ message: t('ac_share_msg', { x: code }) }); } catch { /* closed */ }
  };

  return (
    <Screen>
      <TopBar title={t('ac_row')} onBack={() => router.back()} />
      <FadeIn><Card style={{ gap: 14, alignItems: 'center', paddingVertical: 20 }}>
        <Mascot size={88} mood="happy" />
        <T v="body" center color={colors.muted}>{t('ac_intro')}</T>
        {code ? (
          <Pop>
            <View accessible accessibilityLabel={code} style={{ backgroundColor: colors.yellowSoft, borderRadius: 18, borderWidth: 3, borderStyle: 'dashed', borderColor: colors.yellowDark, paddingVertical: 16, paddingHorizontal: 22, alignItems: 'center' }}>
              <T selectable style={{ fontFamily: fonts.display, fontSize: 40, lineHeight: 48, letterSpacing: 2, color: colors.ink }} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6} testID="recovery-code">{code}</T>
            </View>
          </Pop>
        ) : state === 'loading' ? (
          <View style={{ alignItems: 'center', gap: 8, paddingVertical: 10 }}><ActivityIndicator color={colors.blue} /><T v="small" color={colors.muted}>{t('ac_loading')}</T></View>
        ) : (
          <View style={{ gap: 10, alignItems: 'center' }}>
            <T v="small" center color={colors.red}>{t('ac_offline')}</T>
            <Button small variant="secondary" title={t('ac_retry')} onPress={load} />
          </View>
        )}
        {code ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.blueSoft, borderRadius: 14, paddingVertical: 8, paddingHorizontal: 12 }}>
            <Icon name="paran" size={24} />
            <T v="bold" color={colors.blue} style={{ flexShrink: 1 }}>{t('ac_hint')}</T>
          </View>
        ) : null}
      </Card></FadeIn>
      {code ? <Button icon="pataje" title={copied ? t('ac_copied') : Platform.OS === 'web' ? t('ac_copy') : t('ac_share')} color={copied ? colors.green : colors.blue} onPress={share} /> : null}
      <T v="small" center color={colors.muted}>{lastSync ? t('ac_saved', { x: formatDate(new Date(lastSync).toISOString(), lang) }) : t('ac_saved_never')}</T>
      <Button variant="ghost" title={t('ac_other_code')} onPress={() => router.push('/recover' as never)} />
    </Screen>
  );
}
