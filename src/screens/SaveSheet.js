import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { Image } from 'expo-image';
import { PillButton } from '../components';
import { byId, imageFor } from '../library';
import BottomSheet from '../sheet';
import { COLORS, FONTS, s, T } from '../theme';

// photoId is null when the sheet is only creating an empty collection from Archive.
export default function SaveSheet({ photoId, collections, onToggle, onCreate, onClose }) {
  const [creating, setCreating] = useState(photoId === null);
  const [name, setName] = useState('');

  const submit = () => {
    const clean = name.trim();
    if (!clean) return;
    onCreate(clean);
    setName('');
    setCreating(false);
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.overlay} pointerEvents="box-none">
      <BottomSheet onClose={onClose} style={styles.sheet}>
        {({ close, scrollProps }) => (<>
        <View style={styles.header}>
          <T style={styles.title}>{photoId === null ? 'New folder' : 'Save to Folder'}</T>
          <Pressable onPress={close} accessibilityRole="button"><T style={styles.cancel}>Cancel</T></Pressable>
        </View>
        {photoId !== null && (
          <ScrollView style={styles.rows} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} {...scrollProps}>
            {collections.map((c, i) => {
              const saved = c.photos.includes(photoId);
              const thumb = byId.get(c.photos[0]);
              return (
                <View key={c.name} style={styles.row}>
                  {thumb ? <Image source={imageFor(thumb)} style={styles.thumb} contentFit="cover" /> : <View style={styles.thumb} />}
                  <View style={styles.rowText}>
                    <T style={styles.rowName} numberOfLines={1}>{c.name}</T>
                    <T style={styles.rowCount}>{c.photos.length} image{c.photos.length === 1 ? '' : 's'}</T>
                  </View>
                  <PillButton label={saved ? 'Saved' : 'Save'} on={saved} onPress={() => onToggle(i)} accessibilityLabel={`${saved ? 'Remove from' : 'Save to'} ${c.name}`} />
                </View>
              );
            })}
          </ScrollView>
        )}
        {creating ? (
          <View style={styles.newRow}>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              onSubmitEditing={submit}
              placeholder="Folder name"
              placeholderTextColor={COLORS.muted}
              maxLength={40}
              autoFocus
              returnKeyType="done"
              allowFontScaling={false}
            />
            <PillButton label="Add" on onPress={submit} />
          </View>
        ) : (
          <PillButton label="+ New folder" onPress={() => setCreating(true)} style={styles.wide} />
        )}
        </>)}
      </BottomSheet>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  overlay: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#0b0b0b', maxHeight: '80%' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: s(16) },
  title: { fontFamily: FONTS.serifBold, fontSize: s(22) },
  cancel: { fontSize: s(14), color: COLORS.muted },
  rows: { flexGrow: 0 },
  row: { flexDirection: 'row', alignItems: 'center', gap: s(12), marginBottom: s(9) },
  thumb: { width: s(56), height: s(56), borderRadius: s(8), backgroundColor: '#1f1f1f' },
  rowText: { flex: 1, minWidth: 0 },
  rowName: { fontSize: s(18) },
  rowCount: { fontSize: s(13), color: COLORS.muted },
  wide: { width: '100%', marginTop: s(4) },
  newRow: { flexDirection: 'row', gap: s(8), marginTop: s(4) },
  input: { flex: 1, minWidth: 0, height: s(38), borderWidth: 1, borderColor: COLORS.paper, borderRadius: s(19), paddingHorizontal: s(14), fontFamily: FONTS.serif, fontSize: s(16), color: COLORS.paper },
});
