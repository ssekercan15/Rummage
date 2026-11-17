import AsyncStorage from '@react-native-async-storage/async-storage';

// The Archive's folders, kept on the device so they're still there next time the app opens.
// (AsyncStorage is the phone's app storage; on the web it's the browser's local storage.)
const KEY = 'rummage.folders.v1';

// Saved folders, or null the first time (the app then starts with its sample folders).
export async function loadFolders() {
  try {
    const saved = JSON.parse(await AsyncStorage.getItem(KEY));
    if (!Array.isArray(saved)) return null;
    // Keep only well-formed folders, so a damaged save can't break the Archive.
    return saved
      .filter((f) => f && typeof f.name === 'string' && Array.isArray(f.photos))
      .map((f) => ({ name: f.name, photos: f.photos.filter((id) => typeof id === 'string') }));
  } catch {
    return null;
  }
}

export function saveFolders(folders) {
  AsyncStorage.setItem(KEY, JSON.stringify(folders.map(({ name, photos }) => ({ name, photos })))).catch(() => {});
}
