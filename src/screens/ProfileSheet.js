import { Pressable, StyleSheet, View } from 'react-native';
import BottomSheet from '../sheet';
import { PillButton } from '../components';
import { topTopics } from '../profile';
import { COLORS, FONTS, s, T } from '../theme';

export default function ProfileSheet({ profile, onStartOver, onClose }) {
  const topics = topTopics(profile);
  return (
    <BottomSheet onClose={onClose}>
      {({ close }) => (<>
        <View style={styles.header}>
          <T style={styles.title}>Your topics</T>
          <Pressable onPress={close} accessibilityRole="button"><T style={styles.close}>Close</T></Pressable>
        </View>
        {topics.length ? (
          <View style={styles.topics}>
            {topics.map((t) => <View key={t.label} style={styles.topic}><T style={styles.topicText}>{t.label}</T></View>)}
          </View>
        ) : (
          <T style={styles.empty}>Open and save a few photos, and your topics will show up here.</T>
        )}
        <T style={styles.note}>Based on what you open and save. Your home screen follows these each time you come back, with a few surprises mixed in.</T>
        <PillButton label="Start over" onPress={onStartOver} style={styles.wide} accessibilityLabel="Clear my topics and start over" />
      </>)}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: s(16) },
  title: { fontFamily: FONTS.serifBold, fontSize: s(22) },
  close: { fontSize: s(14), color: COLORS.muted },
  topics: { flexDirection: 'row', flexWrap: 'wrap', gap: s(7) },
  topic: { height: s(39), paddingHorizontal: s(18), borderWidth: 0.5, borderColor: COLORS.paper, borderRadius: s(31), alignItems: 'center', justifyContent: 'center' },
  topicText: { fontSize: s(17), color: COLORS.soft },
  empty: { fontSize: s(17), lineHeight: s(22) },
  note: { marginTop: s(16), marginBottom: s(16), fontSize: s(14), lineHeight: s(18), color: COLORS.muted },
  wide: { width: '100%' },
});
