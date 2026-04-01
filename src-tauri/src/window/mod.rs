//! Window management — stealth, click-through, transparency, position.
//!
//! This module owns all Win32 window manipulation for Lucid.
//! Nothing outside this module should call Win32 window APIs directly.

use anyhow::Result;

#[cfg(target_os = "windows")]
use windows::Win32::{
    Foundation::HWND,
    UI::WindowsAndMessaging::{
        SetWindowDisplayAffinity, WDA_EXCLUDEFROMCAPTURE, WDA_NONE,
    },
};

/// Makes the window invisible to all screen capture software.
///
/// Uses `SetWindowDisplayAffinity(WDA_EXCLUDEFROMCAPTURE)`.
/// Works against: Zoom, Teams, Google Meet, OBS, Windows Game Bar.
/// Does NOT protect against kernel-level endpoint monitoring software.
///
/// # Safety
/// `hwnd` must be a valid window handle owned by this process.
#[cfg(target_os = "windows")]
pub fn set_stealth(hwnd: HWND, enabled: bool) -> Result<()> {
    let affinity = if enabled { WDA_EXCLUDEFROMCAPTURE } else { WDA_NONE };
    unsafe {
        // SAFETY: hwnd is obtained from Tauri's window handle,
        // which is always valid for the lifetime of the window.
        SetWindowDisplayAffinity(hwnd, affinity)
            .map_err(|e| anyhow::anyhow!("SetWindowDisplayAffinity failed: {e}"))?;
    }
    Ok(())
}

#[cfg(not(target_os = "windows"))]
pub fn set_stealth(_enabled: bool) -> Result<()> {
    // No-op on non-Windows platforms (future cross-platform support)
    Ok(())
}
