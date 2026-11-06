// TEMPORARY capture page for design/mascot renders — not committed.
import React from 'react';
import { View, Text } from 'react-native';
import { Mascot, MASCOT_MOODS } from '@/ui';
export default function Lab() {
  return (
    <View style={{ flex: 1, backgroundColor: '#FFFFFF', flexDirection: 'row', flexWrap: 'wrap', padding: 8, gap: 4 }}>
      {MASCOT_MOODS.map((m, i) => (
        <View key={m} testID={`m-${m}`} style={{ width: 140, height: 160, alignItems: 'center', justifyContent: 'center', backgroundColor: i % 2 ? '#1F47B5' : '#F6F7FB', borderRadius: 14 }}>
          <Mascot size={120} mood={m} />
          <Text style={{ fontSize: 11, color: i % 2 ? '#fff' : '#14213D' }}>{m}</Text>
        </View>
      ))}
    </View>
  );
}
