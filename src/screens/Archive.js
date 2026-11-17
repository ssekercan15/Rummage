import { Pressable, ScrollView, Share, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { BackIcon, Masonry, PillButton } from '../components';
import { byId, imageFor } from '../library';
import { COLORS, FONTS, s, T, useFit } from '../theme';

const plural = (n) => `${n} image${n === 1 ? '' : 's'}`;
const photosOf = (collection) => collection.photos.map((id) => byId.get(id)).filter(Boolean);

function Card({ collection, onPress }) {
  const covers = photosOf(collection).slice(0, 3);
  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={styles.card}>
      <View style={styles.cover}>
        {covers[0] && <Image source={imageFor(covers[0])} style={styles.coverMain} contentFit="cover" />}
        <View style={styles.coverSide}>
          {covers.slice(1).map((p) => <Image key={p.id} source={imageFor(p)} style={styles.coverSmall} contentFit="cover" />)}
        </View>
      </View>
      <T style={styles.cardName}>{collection.name}</T>
      <T style={styles.count}>{plural(collection.photos.length)}</T>
    </Pressable>
  );
}

export function Collections({ collections, onOpen, onNew }) {
  const { homeShift } = useFit();
  const total = collections.reduce((n, c) => n + c.photos.length, 0);
  return (
    <View style={[styles.root, { top: 0 - s(homeShift) }]}>
      <View style={styles.pageHead}>
        <T style={styles.pageTitle}>Archive</T>
        <PillButton label="+ New" onPress={onNew} accessibilityLabel="New collection" />
      </View>
      <T style={styles.summary}>{collections.length} collections · {total} images</T>
      <ScrollView style={styles.cardScroll} contentContainerStyle={styles.cards} showsVerticalScrollIndicator={false}>
        {collections.map((c, i) => <Card key={c.name} collection={c} onPress={() => onOpen(i)} />)}
      </ScrollView>
    </View>
  );
}

export function Collection({ collection, onBack, onOpenPhoto }) {
  const { barShift } = useFit();
  const photos = photosOf(collection);
  const years = photos.map((p) => p.year).filter(Boolean);
  const range = years.length ? ` · ${Math.min(...years)}–${Math.max(...years)}` : '';

  const share = () => {
    const links = photos.map((p) => p.link).filter(Boolean);
    Share.share({ message: [collection.name, ...links].join('\n') }).catch(() => {});
  };

  return (
    <View style={[styles.root, { top: 0 - s(barShift) }]}>
      <ScrollView style={styles.detailScroll} showsVerticalScrollIndicator={false}>
        <T style={styles.colTitle}>{collection.name}</T>
        <T style={styles.colMeta}>{plural(photos.length)}{range}</T>
        <Masonry photos={photos} onPress={onOpenPhoto} />
      </ScrollView>
      <View style={styles.bar}>
        <Pressable onPress={onBack} accessibilityRole="button" accessibilityLabel="Back" style={styles.back}><BackIcon /></Pressable>
        <PillButton label="Share" onPress={share} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: COLORS.ink },
  pageHead: { position: 'absolute', left: s(21), right: s(21), top: s(69), flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  pageTitle: { fontFamily: FONTS.serifBold, fontSize: s(30) },
  summary: { position: 'absolute', left: s(21), top: s(111), fontSize: s(14), color: COLORS.muted },
  cardScroll: { position: 'absolute', left: 0, right: 0, top: s(145), bottom: 0 },
  cards: { flexDirection: 'row', flexWrap: 'wrap', columnGap: s(17), rowGap: s(20), paddingLeft: s(21), paddingBottom: s(120), alignItems: 'flex-start' },
  card: { width: s(168) },
  cover: { flexDirection: 'row', gap: s(2), height: s(168), borderRadius: s(8), overflow: 'hidden', backgroundColor: COLORS.tile },
  coverMain: { width: s(111), height: s(168) },
  coverSide: { width: s(55), gap: s(2) },
  coverSmall: { width: s(55), height: s(83) },
  cardName: { marginTop: s(8), fontSize: s(18), lineHeight: s(22) },
  count: { fontSize: s(13), color: COLORS.muted },
  bar: { position: 'absolute', left: s(21), right: s(21), top: s(59), height: s(38), flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  back: { width: s(38), height: s(38), marginLeft: -s(7), alignItems: 'center', justifyContent: 'center' },
  detailScroll: { position: 'absolute', left: 0, right: 0, top: s(113), bottom: 0 },
  colTitle: { fontFamily: FONTS.serifBold, fontSize: s(26), lineHeight: s(30), paddingHorizontal: s(21) },
  colMeta: { paddingTop: s(5), paddingBottom: s(16), paddingHorizontal: s(21), fontSize: s(14), color: COLORS.muted },
});
