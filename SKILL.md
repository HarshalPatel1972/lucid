# Lucid — Project Knowledge Base

## What This Project Does
Lucid is a stealth AI overlay for Windows. It is invisible to screen share software.
It provides a persistent AI sidebar, hotkey-driven screen capture, OCR, meeting
transcription, and a multi-provider AI router.

## Binary Name
Ships as `AudioSessionManager.exe`. Brand name inside UI is `Lucid`.

## Stack
- Rust + Tauri v2 (backend)
- React 18 + TypeScript + Tailwind CSS (frontend)
- windows-rs for Win32 APIs
- Vite for bundling

## Key Win32 APIs Used
- `SetWindowDisplayAffinity(WDA_EXCLUDEFROMCAPTURE)` — stealth
- `WS_EX_TRANSPARENT | WS_EX_LAYERED` — click-through
- `WS_EX_TOOLWINDOW` — ghost mode (no taskbar/tray/alt-tab)

## Module Map
| Module | Responsibility |
|---|---|
| `window/` | Stealth, click-through, transparency, position |
| `hotkeys/` | Global hotkey registration and dispatch |
| `capture/` | Screenshot, region snip, OCR |
| `audio/` | Mic + system audio capture, transcription |
| `ai/` | Provider router: Groq → Gemini → Claude → Ollama |
| `ghost/` | Taskbar, tray, alt-tab visibility control |
