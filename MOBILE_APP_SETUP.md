# 📱 Mobile App Setup (Capacitor Android)

DCC CSE can be packaged as a native Android application using Capacitor.

## Prerequisites

- [Android Studio](https://developer.android.com/studio) (latest stable)
- Java Development Kit (JDK) 17+
- Android SDK (API 24+)
- A deployed Vercel URL for the app

## Setup

### 1. Install Capacitor Dependencies

```bash
bun add @capacitor/core @capacitor/app @capacitor/status-bar
bun add -d @capacitor/cli
```

### 2. Configure Server URL

Edit `capacitor.config.ts` and set your Vercel deployment URL:

```ts
server: {
  url: 'https://your-app.vercel.app',
  cleartext: false,
},
```

### 3. Initialize Android Project

```bash
npx cap add android
npx cap sync
```

### 4. Open in Android Studio

```bash
npx cap open android
```

## Building

### Debug APK (for testing)

1. Open the project in Android Studio
2. Go to **Build → Build Bundle(s) / APK(s) → Build APK(s)**
3. The APK will be at `android/app/build/outputs/apk/debug/app-debug.apk`

### Signed AAB (for Play Store)

1. Go to **Build → Generate Signed Bundle / APK**
2. Select **Android App Bundle**
3. Create or select a keystore
4. Build the release bundle

## Testing

### Direct APK Install
1. Transfer the debug APK to your Android device
2. Enable "Install from unknown sources" if prompted
3. Install and open the app

### Android Emulator
1. In Android Studio, create an AVD (Android Virtual Device)
2. Run the app on the emulator via **Run → Run 'app'**

## Configuration

### App Identity
- **Package ID**: `com.dcccse.app`
- **App Name**: `DCC CSE`

### Updating After Code Changes
After making changes to the web app:
```bash
npx cap sync
npx cap open android
```

## Android-Specific Features

### Back Button
The app handles the Android back button to:
- Close open modals/dialogs
- Navigate back in history
- Exit the app when at the root screen

### Status Bar
The status bar is styled to match the app's dark theme (`#090d16`).

## Play Store Publication

1. Create a [Google Play Developer account](https://play.google.com/console)
2. Generate a signed AAB (see above)
3. Create a new app listing in Play Console
4. Upload the AAB
5. Fill in store listing details (screenshots, description, etc.)
6. Submit for review

## Troubleshooting

| Issue | Solution |
|---|---|
| White screen on launch | Check that the server URL in `capacitor.config.ts` is correct and accessible |
| API calls failing | Ensure your Vercel deployment is live and CORS is configured |
| Build errors | Run `npx cap sync` to ensure native projects are up to date |
| Slow loading | The first load requires internet; subsequent loads use cached assets |
