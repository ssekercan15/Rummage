# Rummage (Expo)

Rummage is an app for rummaging through public-domain archive images: photographs, medieval art, type specimens and graphic design. It runs on phones through Expo and in the browser. It is built from the Figma V2 screens.

The library holds about 1,800 images. Each one is public domain or has no known restrictions, and loads from the museum or archive that holds it, so no photos are stored in this repo.

## Run it on your phone

1. Install Node.js (LTS) from https://nodejs.org
2. Install Expo Go on your phone.
3. In Terminal, from this folder:

       npm install
       npx expo start

4. Scan the QR code: with the Camera app on iPhone, or inside Expo Go on Android.

Your phone and computer need to be on the same Wi-Fi. If the app won't connect, press Ctrl+C, then run `npx expo start --tunnel`.

## Run it in a browser

    npx expo start --web

## Deploy to Vercel

`vercel.json` tells Vercel to build the web version with `npx expo export --platform web` and serve the `dist` folder. To deploy, import this GitHub repository at vercel.com/new and keep the settings it picks up. Every push to `main` then redeploys.

## Where things are

- `App.js`: moves between screens and holds collections and filters
- `src/screens/`: Onboarding, Explore, Photo, Archive, SaveSheet
- `src/library.js`: year, B&W, color and category filters
- `src/search.js`: forgiving search (plurals, typos, related words)
- `src/motion.js`, `src/sheet.js`, `src/swipeBack.js`: the sweeping motion, bottom sheets and swipe-to-go-back
- `src/data/`: photo records, image list, icons and color picker samples
- `assets/archive/`: the onboarding tour photos and color picker image
