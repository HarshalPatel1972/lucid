//! Window management — stealth, click-through, transparency, position.
//!
//! This module owns all Win32 window manipulation for Lucid.
//! Nothing outside this module should call Win32 window APIs directly.

use anyhow::Result;

// use tauri::Manager; // Unused at top level

#[cfg(target_os = "windows")]
use windows::Win32::{
    Foundation::{HWND, COLORREF},
    UI::WindowsAndMessaging::{
        GetWindowLongPtrW, SetLayeredWindowAttributes, SetWindowDisplayAffinity, SetWindowLongPtrW, GWL_EXSTYLE,
        LWA_ALPHA, WDA_EXCLUDEFROMCAPTURE, WDA_NONE, WS_EX_LAYERED, WS_EX_TRANSPARENT,
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

/// Enables or disables click-through mode.
/// When enabled, all mouse events pass through the window to whatever is underneath.
/// Toggle with hotkey — user switches off when they want to interact with Lucid.
#[cfg(target_os = "windows")]
pub fn set_click_through(hwnd: HWND, enabled: bool) -> Result<()> {
    unsafe {
        // SAFETY: hwnd is a valid handle owned by this process.
        let style = GetWindowLongPtrW(hwnd, GWL_EXSTYLE);
        let new_style = if enabled {
            style | WS_EX_LAYERED.0 as isize | WS_EX_TRANSPARENT.0 as isize
        } else {
            style & !(WS_EX_TRANSPARENT.0 as isize)
        };
        SetWindowLongPtrW(hwnd, GWL_EXSTYLE, new_style);
    }
    Ok(())
}

#[cfg(not(target_os = "windows"))]
pub fn set_click_through(_enabled: bool) -> Result<()> {
    Ok(())
}

/// Sets window background opacity (0.0 = fully transparent, 1.0 = fully opaque).
/// This controls the Tauri window alpha — separate from CSS opacity.
#[cfg(target_os = "windows")]
pub fn set_opacity(hwnd: HWND, opacity: f64) -> Result<()> {
    unsafe {
        let style = GetWindowLongPtrW(hwnd, GWL_EXSTYLE);
        SetWindowLongPtrW(hwnd, GWL_EXSTYLE, style | WS_EX_LAYERED.0 as isize);
        let alpha = (opacity * 255.0).max(0.0).min(255.0) as u8;
        SetLayeredWindowAttributes(hwnd, COLORREF(0), alpha, LWA_ALPHA).map_err(|e| anyhow::anyhow!("{e}"))?;
    }
    Ok(())
}

#[cfg(not(target_os = "windows"))]
pub fn set_opacity(_hwnd: (), _opacity: f64) -> Result<()> {
    Ok(())
}

/// Moves the window by delta pixels in x and y direction.
/// Used by hotkey-driven arrow key movement.
pub fn nudge_window(window: &tauri::Window, dx: i32, dy: i32) -> Result<()> {
    let pos = window.outer_position().map_err(|e| anyhow::anyhow!("{e}"))?;
    window
        .set_position(tauri::PhysicalPosition::new(pos.x + dx, pos.y + dy))
        .map_err(|e| anyhow::anyhow!("{e}"))?;
    Ok(())
}

/// Saves current window position to app config.
pub fn save_position(window: &tauri::Window, app: &tauri::AppHandle) -> Result<()> {
    use tauri::Manager;
    let pos = window.outer_position().map_err(|e| anyhow::anyhow!("{e}"))?;
    // Store in app data dir as position.json: { "x": i32, "y": i32 }
    let path = app.path().app_data_dir().map_err(|e| anyhow::anyhow!("{e}"))?.join("position.json");
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent)?;
    }
    let json = serde_json::json!({ "x": pos.x, "y": pos.y });
    std::fs::write(path, json.to_string())?;
    Ok(())
}

/// Restores window to last saved position, or centers it if no saved position.
pub fn restore_position(window: &tauri::Window, app: &tauri::AppHandle) -> Result<()> {
    use tauri::Manager;
    let path = app.path().app_data_dir().map_err(|e| anyhow::anyhow!("{e}"))?.join("position.json");
    if path.exists() {
        let content = std::fs::read_to_string(path)?;
        let pos: serde_json::Value = serde_json::from_str(&content)?;
        let x = pos["x"].as_i64().unwrap_or(100) as i32;
        let y = pos["y"].as_i64().unwrap_or(100) as i32;
        window.set_position(tauri::PhysicalPosition::new(x, y)).map_err(|e| anyhow::anyhow!("{e}"))?;
    }
    Ok(())
}
