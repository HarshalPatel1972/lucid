<div align="center">
  <img src="https://raw.githubusercontent.com/tauri-apps/tauri/dev/app-icon.png" alt="Lucid Logo" width="120" />
  <h1>Lucid</h1>
  <p><strong>A lightning-fast, highly stealthy Desktop AI Assistant built for power users.</strong></p>
  <p>
    <a href="https://tauri.app/">
      <img src="https://img.shields.io/badge/tauri-%2324C8DB.svg?style=for-the-badge&logo=tauri&logoColor=white" alt="Tauri" />
    </a>
    <a href="https://reactjs.org/">
      <img src="https://img.shields.io/badge/react-%2320232a.svg?style=for-the-badge&logo=react&logoColor=%2361DAFB" alt="React" />
    </a>
    <a href="https://www.rust-lang.org/">
      <img src="https://img.shields.io/badge/rust-%23000000.svg?style=for-the-badge&logo=rust&logoColor=white" alt="Rust" />
    </a>
  </p>
</div>

<br />

Lucid is a next-generation desktop application that seamlessly merges best-in-class Large Language Models with deep OS-level window integrations. Built entirely on the **Tauri v2 API** backend with a highly-optimized **React/Vite** frontend, it delivers instant inference, transparent ghosting capabilities, and robust context saving.

## ✨ Core Features

- 🧠 **Omni-Model Circular Failover**
  - Natively supports Groq (Llama 3), Gemini 2.5 Flash, DeepSeek V3, OpenRouter, and local Ollama integrations.
  - Implements a true "Circular Fallback" queue: if rate-limited by your primary provider, Lucid instantly falls back to the next available provider automatically seamlessly during the stream.
- 👻 **Ghost & Stealth Operations**
  - **Click-Through Mode:** Utilizing Windows `WS_EX_TRANSPARENT`, the app becomes completely unclickable, letting you work *through* your AI assistant while keeping context on screen.
  - **Screen-Capture Stealth:** Advanced `SetWindowDisplayAffinity` integration makes the entire application invisible to OBS, Zoom, Teams, and Discord screen capturing.
- 📸 **Native Vision capabilities**
  - Hit a global hotkey to instantly draw a selection box over any UI element on your screen. The `SnipOverlay` securely funnels regions or full-screen captures directly to Vision-enabled models (Gemini/OpenRouter).
- 🎨 **Premium Aesthetic Sandboxing**
  - Custom fluid animations with 5 native palettes integrated at the CSS variable level: **Dark**, **Light**, **Dracula**, **Nord**, and **Gruvbox**. 
  - Dynamic opacity sliders bound to the native OS-level window layering.
- 🗄️ **The "Vault" Context Storage**
  - A local, persistent storage drive sitting side-by-side with your Chat interface. Seamlessly store complex algorithms, comprehensive resumes, or sensitive Prompts securely in indexed formats to access anytime you need context.

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/en/)
- [Rust Toolchain](https://rustup.rs/) (cargo, rustc)
- Windows 10/11 (Stealth/Ghost mode APIs require native Windows bindings)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/HarshalPatel1972/lucid.git
   cd lucid
   ```
2. **Install dependencies**
   ```bash
   npm install
   ```
3. **Run the Development Server**
   ```bash
   npm run tauri dev
   ```

### Building for Production
To compile your standalone, heavily optimized `.exe` binary:
```bash
npm run tauri build
```
*(Your final execution binary will be generated under `src-tauri/target/release/AudioSessionManager.exe`)*

## ⚙️ App Architecture

1. **Rust Backend (`src-tauri/src/`)**: Harnesses OS-level interactions bypassing restrictive frontend capabilities. Employs `win32` APIs for deep window anchoring, click-through, transparency, and background threaded API invocations.
2. **React Frontend (`src/`)**: Unmounted view routing prevents state-loss across your Chat, Vault, and Settings sessions. Employs custom unified renderers (handling fenced code blocks, language syntax, etc.).

---
<div align="center">
  <p>Designed and built for peak AI-Assisted workflow efficiency.</p>
</div>
