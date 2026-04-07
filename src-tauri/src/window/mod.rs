//! Window management — stealth, click-through, transparency, position.
//!
//! This module owns all Win32 window manipulation for Lucid.
//! Nothing outside this module should call Win32 window APIs directly.

use anyhow::Result;

use windows::Win32::{
    Foundation::{HWND, COLORREF, RECT},
    UI::WindowsAndMessaging::{
        GetWindowLongPtrW, SetLayeredWindowAttributes, SetWindowDisplayAffinity, SetWindowLongPtrW,
        GetWindowRect, SetWindowPos,
        GWL_EXSTYLE, GWL_STYLE, LWA_ALPHA, WDA_EXCLUDEFROMCAPTURE, WDA_NONE, WS_EX_LAYERED,
        WS_EX_TRANSPARENT, WS_MAXIMIZEBOX, WS_MINIMIZEBOX, WS_SYSMENU,
        HWND_TOP, SWP_NOZORDER, SWP_NOACTIVATE,
    },
};


/// Makes the window invisible to all screen capture software.
#[cfg(target_os = "windows")]
pub fn set_stealth(hwnd: HWND, enabled: bool) -> Result<()> {
    let affinity = if enabled { WDA_EXCLUDEFROMCAPTURE } else { WDA_NONE };
    unsafe {
        SetWindowDisplayAffinity(hwnd, affinity)
            .map_err(|e| anyhow::anyhow!("SetWindowDisplayAffinity failed: {e}"))?;
    }
    Ok(())
}

#[cfg(not(target_os = "windows"))]
pub fn set_stealth(_enabled: bool) -> Result<()> {
    Ok(())
}

/// Enables or disables click-through mode.
#[cfg(target_os = "windows")]
pub fn set_click_through(hwnd: HWND, enabled: bool) -> Result<()> {
    unsafe {
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

/// Sets window background opacity.
#[cfg(target_os = "windows")]
pub fn set_opacity(hwnd: HWND, opacity: f64) -> Result<()> {
    unsafe {
        let style = GetWindowLongPtrW(hwnd, GWL_EXSTYLE);
        SetWindowLongPtrW(hwnd, GWL_EXSTYLE, style | WS_EX_LAYERED.0 as isize);
        let alpha = (opacity * 255.0).max(0.0).min(255.0) as u8;
        let _ = SetLayeredWindowAttributes(hwnd, COLORREF(0), alpha, LWA_ALPHA);
    }
    Ok(())
}

#[cfg(not(target_os = "windows"))]
pub fn set_opacity(_hwnd: (), _opacity: f64) -> Result<()> {
    Ok(())
}

/// Atomically resizes and moves the window.
/// Used for side-specific resizing to avoid flickering.
#[cfg(target_os = "windows")]
pub fn resize_window(window: &tauri::Window, dx: i32, dy: i32, dw: i32, dh: i32) -> Result<()> {
    let hwnd = window.hwnd().map_err(|e| anyhow::anyhow!("{e}"))?;
    unsafe {
        let mut rect = RECT::default();
        let _ = GetWindowRect(hwnd, &mut rect);
        
        let x = rect.left + dx;
        let y = rect.top + dy;
        let w = (rect.right - rect.left) + dw;
        let h = (rect.bottom - rect.top) + dh;

        SetWindowPos(
            hwnd,
            Some(HWND_TOP),
            x, y, w, h,
            SWP_NOZORDER | SWP_NOACTIVATE
        ).map_err(|e| anyhow::anyhow!("SetWindowPos failed: {e}"))?;
    }
    Ok(())
}

#[cfg(not(target_os = "windows"))]
pub fn resize_window(_window: &tauri::Window, _dx: i32, _dy: i32, _dw: i32, _dh: i32) -> Result<()> {
    Ok(())
}

/// Moves the window by delta pixels in x and y direction.
pub fn nudge_window(window: &tauri::Window, dx: i32, dy: i32) -> Result<()> {
    resize_window(window, dx, dy, 0, 0)
}

/// Saves current window position to app config.
pub fn save_position(window: &tauri::Window, app: &tauri::AppHandle) -> Result<()> {
    use tauri::Manager;
    let pos = window.outer_position().map_err(|e| anyhow::anyhow!("{e}"))?;
    let path = app.path().app_data_dir().map_err(|e| anyhow::anyhow!("{e}"))?.join("position.json");
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent)?;
    }
    let json = serde_json::json!({ "x": pos.x, "y": pos.y });
    std::fs::write(path, json.to_string())?;
    Ok(())
}

/// Restores window to last saved position.
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

#[cfg(target_os = "windows")]
pub fn inhibit_snap_layouts(hwnd: HWND) -> Result<()> {
    unsafe {
        let style = GetWindowLongPtrW(hwnd, GWL_STYLE);
        let new_style = style & !(WS_MAXIMIZEBOX.0 as isize | WS_MINIMIZEBOX.0 as isize | WS_SYSMENU.0 as isize);
        SetWindowLongPtrW(hwnd, GWL_STYLE, new_style);
    }
    Ok(())
}

#[cfg(target_os = "windows")]
pub fn set_no_activate(hwnd: HWND, enabled: bool) -> Result<()> {
    unsafe {
        let style = GetWindowLongPtrW(hwnd, GWL_EXSTYLE);
        let no_activate = 0x08000000isize;
        let new_style = if enabled { style | no_activate } else { style & !no_activate };
        SetWindowLongPtrW(hwnd, GWL_EXSTYLE, new_style);
    }
    Ok(())
}
