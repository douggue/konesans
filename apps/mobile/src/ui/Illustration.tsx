import React from 'react';
import { View } from 'react-native';
import { SvgXml } from 'react-native-svg';
import { ILLUSTRATIONS } from './illustrations';

/** A Konesans course picture (design/illustrations). Renders nothing for an unknown id. */
export function Illustration({ id, size = 96 }: { id?: string | null; size?: number }) {
  const xml = id ? ILLUSTRATIONS[id] : undefined;
  if (!xml) return null;
  return <View style={{ width: size, height: size }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants"><SvgXml xml={xml} width={size} height={size} /></View>;
}
export const hasIllustration = (id?: string | null) => !!id && id in ILLUSTRATIONS;
