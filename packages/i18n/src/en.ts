// English catalog. This object's SHAPE is the source of truth: `Messages` is
// derived from it (see index.ts), so every other locale must match key-for-key.

export const en = {
  nav: {
    home: "Home",
    library: "Library",
    search: "Search",
    downloads: "Downloads",
  },
  common: {
    playAll: "Play all",
    downloadAll: "Download all",
    play: "Play",
    pause: "Pause",
    done: "Done",
    seeAll: "See all",
    newestFirst: "Newest first",
    comingSoon: "Coming soon in this prototype",
  },
  home: {
    greetingTitle: "Althaqalayn Lectures",
    subtitle: "Sheikh Hamzah Muhammad Lawal · Archive",
    continueListening: "Continue listening",
    minutesLeft: "min left",
    explore: "Explore",
    featuredSeries: "Featured series",
    latestLectures: "Latest lectures",
    eventsPhotos: "Events & photos",
  },
  library: {
    title: "Library",
    recent: "Recent",
    occasions: "Occasions",
    topics: "Topics",
    series: "Series",
    parts: "parts",
  },
  mediaFilter: {
    all: "All",
    audio: "Audio",
    video: "Video",
    text: "Text",
  },
  search: {
    placeholder: "Search lectures, series, topics…",
    recentSearches: "Recent searches",
    browseTopics: "Browse topics",
    results: "results",
    noResults: "No results",
  },
  downloads: {
    title: "Downloads",
    storageUsed: "used",
    empty: "No downloads yet",
  },
  player: {
    nowPlaying: "Now playing",
    speed: "Speed",
    sleep: "Sleep",
    download: "Download",
    transcript: "Transcript",
    share: "Share",
  },
  reader: {
    reading: "Reading",
    fontSmaller: "Smaller text",
    fontLarger: "Larger text",
    bookmark: "Bookmark",
  },
  settings: {
    title: "Settings",
    preferences: "Preferences",
    appLanguage: "App language",
    contentLanguage: "Content language",
    contentLanguageValue: "Both",
    downloadWifiOnly: "Download over Wi-Fi only",
    playback: "Playback",
    defaultSpeed: "Default playback speed",
    manageDownloads: "Manage downloads",
    about: "About",
    shareApp: "Share the app",
    contact: "Contact",
    version: "Version",
  },
  languageSheet: {
    title: "App language",
    note: "Lectures play in their original language.",
    done: "Done",
  },
  gallery: {
    title: "Gallery",
    photos: "photos",
  },
};

// Shape of a full locale catalog. Derived from `en` (no `as const`, so values
// widen to `string`) — every other locale is typed against this.
export type Messages = typeof en;
