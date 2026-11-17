import { useEffect, useMemo, useRef, useState } from 'react';
import { BackHandler, Platform, StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Image } from 'expo-image';
import { useFonts } from 'expo-font';
import { InriaSans_400Regular } from '@expo-google-fonts/inria-sans';
import {
  InriaSerif_400Regular,
  InriaSerif_400Regular_Italic,
  InriaSerif_700Bold,
  InriaSerif_700Bold_Italic,
} from '@expo-google-fonts/inria-serif';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { BottomNav } from './src/components';
import { byId, newFilters, seedCollections } from './src/library';
import { buildForYou, clearProfile, emptyProfile, loadProfile, recordCategory, recordOpen, recordReason, recordSave, saveProfile } from './src/profile';
import { Collection, Collections } from './src/screens/Archive';
import Explore from './src/screens/Explore';
import Onboarding from './src/screens/Onboarding';
import Photo from './src/screens/Photo';
import ProfileSheet from './src/screens/ProfileSheet';
import SaveSheet from './src/screens/SaveSheet';
import SwipeBack from './src/swipeBack';
import { WEB_MAX_WIDTH } from './src/theme';

// Keep at most ~200 MB of viewed photos on the phone; the least recently seen go first.
if (Platform.OS === 'ios') Image.configureCache({ maxDiskSize: 200 * 1024 * 1024 });

function Rummage({ savedProfile }) {
  // Each entry is a screen: { name: 'explore' | 'archive' | 'photo' | 'collection', id?, index? }.
  const [stack, setStack] = useState([{ name: 'onboarding' }]);
  const [collections, setCollections] = useState(seedCollections);
  const [profile, setProfile] = useState(savedProfile);
  // Worked out once per launch, so the grid doesn't reshuffle while someone is browsing.
  const launchFeed = useMemo(() => buildForYou(savedProfile), [savedProfile]);
  const [feed, setFeed] = useState(launchFeed);
  const [filters, setFilters] = useState(() => newFilters(savedProfile.reason, launchFeed));
  const [profileOpen, setProfileOpen] = useState(false);
  const [promptsOn, setPromptsOn] = useState(true);
  const [sheet, setSheet] = useState(null); // { photoId: string | null }

  const screen = stack[stack.length - 1];
  const push = (next) => setStack((st) => [...st, next]);
  const back = () => setStack((st) => (st.length > 1 ? st.slice(0, -1) : st));
  // Back arrows sweep the top screen away (same motion as swiping), then pop it.
  const sweepBack = useRef(null);
  const goBack = () => (sweepBack.current ? sweepBack.current() : back());
  const updateProfile = (change) => {
    setProfile((current) => {
      const next = change(current);
      saveProfile(next);
      return next;
    });
  };
  const openPhoto = (id) => {
    updateProfile((p) => recordOpen(p, byId.get(id)));
    push({ name: 'photo', id });
  };
  const startOver = () => {
    clearProfile();
    setProfile(emptyProfile());
    setFeed(null);
    setFilters(newFilters());
    setPromptsOn(true);
    setProfileOpen(false);
    setStack([{ name: 'onboarding' }]);
  };

  // Back to the home mix: no search or filters, the recommended order.
  const goHome = () => {
    setFilters(newFilters(filters.reason, feed));
    setPromptsOn(true);
    setStack([{ name: 'explore' }]);
  };
  const goExplore = () => {
    if (screen.name === 'explore') { goHome(); return; } // tapping Explore again returns to the home mix
    setStack([{ name: 'explore' }]);
  };

  // A subject tag on a photo opens Explore searching for that subject.
  const searchFor = (q) => {
    setFilters({ ...newFilters(filters.reason), q });
    setPromptsOn(false);
    setStack([{ name: 'explore' }]);
  };

  const toggleSaved = (index, photoId) => {
    if (!collections[index].photos.includes(photoId)) updateProfile((p) => recordSave(p, byId.get(photoId)));
    setCollections((all) => all.map((c, i) => {
      if (i !== index) return c;
      const saved = c.photos.includes(photoId);
      return { ...c, photos: saved ? c.photos.filter((id) => id !== photoId) : [photoId, ...c.photos] };
    }));
  };

  const createCollection = (name, photoId) => {
    setCollections((all) => (all.some((c) => c.name === name) ? all : [{ name, photos: photoId ? [photoId] : [] }, ...all]));
    if (!photoId) setSheet(null);
  };

  // Android's hardware back button
  const backState = useRef({});
  backState.current = { sheet, profileOpen, depth: stack.length };
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (backState.current.sheet) { setSheet(null); return true; }
      if (backState.current.profileOpen) { setProfileOpen(false); return true; }
      if (backState.current.depth > 1) { back(); return true; }
      return false;
    });
    return () => sub.remove();
  }, []);

  if (screen.name === 'onboarding') {
    return (
      <Onboarding
        returning={profile.onboarded}
        onDone={(reason) => {
          if (!profile.onboarded) {
            updateProfile((p) => recordReason(p, reason));
            setFilters(newFilters(reason));
          }
          setStack([{ name: 'explore' }]);
        }}
      />
    );
  }

  const inArchive = stack[0].name === 'archive';
  return (
    <View style={styles.app}>
      {/* Screens stay mounted under the top one, so going back keeps your scroll position. */}
      <View style={StyleSheet.absoluteFill} pointerEvents={screen.name === 'explore' ? 'auto' : 'none'}>
        <Explore filters={filters} setFilters={setFilters} promptsOn={promptsOn} setPromptsOn={setPromptsOn} onOpenPhoto={openPhoto} onPickCategory={(label) => updateProfile((p) => recordCategory(p, label))} onOpenProfile={() => setProfileOpen(true)} onHome={goHome} />
      </View>
      {stack.map((entry, depth) => entry.name !== 'explore' && (
        // Any screen opened on top of another can be swiped right to go back.
        <SwipeBack key={`${depth}-${entry.name}`} enabled={depth > 0 && depth === stack.length - 1 && !sheet} sweepIn={depth > 0} onBack={back} backRef={depth === stack.length - 1 ? sweepBack : undefined} pointerEvents={depth === stack.length - 1 ? 'auto' : 'none'}>
          {entry.name === 'archive' && (
            <Collections collections={collections} onOpen={(index) => push({ name: 'collection', index })} onNew={() => setSheet({ photoId: null })} />
          )}
          {entry.name === 'collection' && (
            <Collection collection={collections[entry.index]} onBack={goBack} onOpenPhoto={openPhoto} onAdd={(id) => toggleSaved(entry.index, id)} />
          )}
          {entry.name === 'photo' && (
            <Photo photo={byId.get(entry.id)} saved={collections.some((c) => c.photos.includes(entry.id))} onBack={goBack} onSave={() => setSheet({ photoId: entry.id })} onOpenPhoto={openPhoto} onSearch={searchFor} />
          )}
        </SwipeBack>
      ))}
      <BottomNav active={inArchive ? 'archive' : 'explore'} onExplore={goExplore} onArchive={() => setStack([{ name: 'archive' }])} />
      {sheet && (
        <SaveSheet
          photoId={sheet.photoId}
          collections={collections}
          onToggle={(index) => toggleSaved(index, sheet.photoId)}
          onCreate={(name) => createCollection(name, sheet.photoId)}
          onClose={() => setSheet(null)}
        />
      )}
      {profileOpen && <ProfileSheet profile={profile} onStartOver={startOver} onClose={() => setProfileOpen(false)} />}
    </View>
  );
}

export default function App() {
  const [savedProfile, setSavedProfile] = useState(null);
  useEffect(() => { loadProfile().then(setSavedProfile); }, []);
  const [fontsLoaded] = useFonts({
    InriaSans_400Regular,
    InriaSerif_400Regular,
    InriaSerif_400Regular_Italic,
    InriaSerif_700Bold,
    InriaSerif_700Bold_Italic,
  });

  return (
    <SafeAreaProvider>
      {/* In a desktop browser the app keeps phone width, centered on black (see theme.js). */}
      <View style={styles.backdrop}>
        <View style={[styles.app, Platform.OS === 'web' && styles.webColumn]}>
          <StatusBar style="light" />
          {fontsLoaded && savedProfile && <Rummage savedProfile={savedProfile} />}
        </View>
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  app: { flex: 1, backgroundColor: '#000', overflow: 'hidden' },
  backdrop: { flex: 1, backgroundColor: '#000' },
  webColumn: { width: '100%', maxWidth: WEB_MAX_WIDTH, alignSelf: 'center' },
});
