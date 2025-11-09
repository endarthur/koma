# Koma Terminal - Design Synthesis

## Core Concept
- Browser-resident automation workstation that emulates the feel of a single-user Unix terminal.
- Runs entirely client-side using a service worker "kernel"; no servers required after install.
- Targets quick, scriptable workflows: write JavaScript, run it as if on a local machine, keep everything offline-first.

## Architectural Pillars
- **Terminal-First UX:** xterm.js drives the primary interface; every capability is reachable via CLI commands.
- **Service Worker Kernel:** Acts as the OS layer, exposing filesystem, process, environment, cache, and package services over Comlink channels.
- **Virtual Filesystem:** IndexedDB-backed inode graph with POSIX-style directories (`/home`, `/tmp`, `/usr`, `/mnt`, `/proc`), plus mounts for real directories via File System Access API.
- **Process Orchestration:** One-shot jobs, cron schedules, and daemon-style long-running scripts managed within the worker; stdout/stderr streamed back to the terminal.
- **Standard Library:** Bundled helpers (`fs`, `http`, `notify`, `storage`, `events`, etc.) wrap browser APIs so scripts read like Unix utilities instead of Web APIs.
- **Package Fetching (Spinifex):** Uses import maps and ESM CDNs to stage npm modules into the VFS cache for offline reuse.
- **Secrets & Security:** Keyring module locks credentials with Web Crypto, and privileged operations require explicit user consent.

## Interaction Model
- CLI mirrors familiar Unix ergonomics: pipelines, environment variables, history, auto-complete, and text-first configuration.
- Monaco editor opens as a modal or tab for richer editing but remains subordinate to the terminal workflow.
- Tabs and panes mimic tmux, letting multiple sessions share the same kernel state.
- Broadcast channels coordinate multiple open tabs, allowing shared daemons while keeping UI sessions independent.

## Offline-First Execution
- PWA install ensures the full stack (UI, worker, packages, scripts) is available without network access.
- Service worker precaches UI assets and manages the package cache.
- All persistent data (filesystem, job metadata, keyring entries) lives in IndexedDB, enabling cold-boot restorations of the virtual machine.

## Aesthetic Direction
- **Industrial Minimalism:** Inspired by komatiite geology and SGI-era workstations; surfaces are flat, monochrome, and grid-aligned.
- **Monospace Everywhere:** IBM Plex Mono (or equivalent) at 13px keeps typography uniform and technical.
- **Signature Palette:** Deep charcoal backgrounds with neon lava orange (`#ff6b35`) and phosphor green (`#00ff88`) accents; alternative themes (Terminal Green, Solarized Dark) swap palettes but preserve contrast.
- **Subtle Motion:** Snappy 100ms transitions, optional CRT scanlines or grain for retro modes, no gratuitous animation.
- **Physical Metaphor:** Chrome borders, status bars, and module-like panels evoke lab instruments and modular synth gear.

## Guiding Principles
- Do the minimum necessary to feel like a believable single-user workstation.
- Keep configuration explicit, logs verbose, and failures debuggable from the shell.
- Prefer composable text protocols over bespoke UI flows; every feature should degrade gracefully to CLI usage.
- Maintain a small, approachable core so new automations feel like extending dotfiles rather than deploying infrastructure.
