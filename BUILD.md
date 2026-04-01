# Lucid — Build Guide

## Prerequisites
| Tool | Version | Check |
|---|---|---|
| Rust | stable latest | `rustc --version` |
| Node.js | 18+ | `node --version` |
| npm | 9+ | `npm --version` |
| WebView2 | pre-installed on Win10/11 | — |

## Development
```bash
npm install
npm run tauri dev
```

## Production Build
```bash
npm run tauri build
# Output:
#   NSIS installer → src-tauri/target/release/bundle/nsis/
#   MSI installer  → src-tauri/target/release/bundle/msi/
#   Executable     → src-tauri/target/release/AudioSessionManager.exe
```

## Verify Stealth Works
1. Run `npm run tauri dev`
2. Open OBS → Add Display Capture source
3. Lucid window should NOT appear in the OBS preview
4. Your physical monitor should still show it
