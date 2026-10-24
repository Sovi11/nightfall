# NIGHTFALL

A buildless concert-practice experience and browser-local DJ studio.

Live site: https://sovi11.github.io/nightfall/

DJ studio: https://sovi11.github.io/nightfall/mixer.html

Open either link in a desktop or phone browser; no sign-in is required. Practice progress is specific to each browser/device. On a phone, use landscape mode for more space in the DJ studio. Use the browser's Add to Home Screen option for quick access. This is an online website, not an offline app.

Serve this repository's root over HTTP for local development. GitHub Pages publishes the root of `main` automatically. Concert playback uses the YouTube IFrame API, official lyric videos for selected tracks, lyric-video search for others, and optional local audio with user-imported LRC/TXT lyrics. YouTube playback depends on regional and embed availability. Full song lyrics and commercial audio are not hosted in this repository.

The DJ studio uses Web Audio: two decoded audio buffers, manual BPM/tap tempo, tempo matching (not beat detection), ±25% playback speed, waveform seeking, cue and hot cues, beat loops, 3-band EQ, bass kill, dual-direction filter, echo, channel gain and volume, equal-power crossfading, a master compressor, and MediaRecorder export. Tempo changes pitch. No headphone routing, stems, key lock, or automatic beat-grid analysis. Files and recordings stay in the browser. Audio is decoded into memory, so prefer ordinary song-length files.

Original synthesized demo grooves are generated locally. Recording exports the format supported by the browser, usually WebM/Opus, with MP4 fallback.

Concert date defaults to 6 November 2026, Malaysia time. Practice progress is saved in localStorage on the current browser/origin. The rotation is a learning selection, not a verified setlist.

Concert / Karaoke / Learn modes: a glittering canvas stage, slow animated spotlights, audience silhouettes and phone lights, three colour themes, fullscreen where supported, reduced-motion controls, and large current/previous/next lyric lines. Automatic lyrics are requested at runtime from [LRCLIB](https://lrclib.net/docs); no song lyrics are bundled in the repository. Availability and accuracy depend on that service. Custom imported/pasted lyrics take priority and remain browser-local. Timed LRC supports multiple timestamps and file offsets; plain text uses manual line navigation. A ±120-second adjustment handles different intros. Imported audio drives the glitter intensity; YouTube uses an ambient light show because its audio cannot be analysed by this page.

Premium membership is managed by YouTube, not this site. Embedded-player ads can appear when the browser's YouTube session is signed out or cookies are blocked; see [YouTube Help](https://support.google.com/youtube/answer/7437519). No ad blocking or membership bypass is implemented.

Run lyric timing tests with `node --test tests/lyrics.test.cjs`. Syntax checks: `node --check app.js`, `node --check lyric-core.js`, and `node --check tracks.js`.

Validation: JavaScript syntax checks, HTTP 200 checks, browser verification of search and learned state, two-deck demo playback, visible audio metering, tempo sync, cue/loop controls, and recording download creation. YouTube embedding was unavailable in the preview browser; direct links and local playback are provided.
