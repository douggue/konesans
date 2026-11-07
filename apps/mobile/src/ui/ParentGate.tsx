/** The parent question used in Paramèt (7 × 6 = 42), as a sheet: `onPass` runs only on the right answer. */
import React from 'react';
import { Sheet, T, Row, Button } from '@/ui';
import { colors } from '@/lib/theme';
import { useT } from '@/lib/i18n';

export function ParentGate({ open, title, note, onPass, onClose }: { open: boolean; title: string; note?: string; onPass: () => void; onClose: () => void }) {
  const t = useT();
  return (
    <Sheet open={open} title={title}>
      {note ? <T v="small" center color={colors.muted}>{note}</T> : null}
      <T v="body" center color={colors.muted}>{t('parent_gate')}</T>
      <Row>
        {[36, 42, 48].map((n) => <Button key={n} variant="secondary" title={String(n)} style={{ flex: 1 }} onPress={() => { onClose(); if (n === 42) setTimeout(onPass, 260); }} />)}
      </Row>
      <Button variant="ghost" title={t('stay')} onPress={onClose} />
    </Sheet>
  );
}
