# Dayflow

Dayflow is an offline-first task planner for macOS and Linux, built with Vue 3, TypeScript, and Tauri 2. It includes day, week, and month views, recurring tasks, and automatic carry-forward for unfinished work. Task data stays in the app's local storage on this device.

## Run locally

Install Node.js and Rust, then install the Linux WebKit/GTK build prerequisites listed in the [Tauri prerequisites guide](https://tauri.app/start/prerequisites/).

```sh
npm install
npm run tauri dev
```

Build a native installer for the current operating system:

```sh
npm run tauri build
```

Run task logic tests with `npm test`.
