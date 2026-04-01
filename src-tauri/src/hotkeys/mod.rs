use anyhow::Result;
use tauri::{App, Manager, Emitter};
use tauri_plugin_global_shortcut::{GlobalShortcutExt, ShortcutState};

const BLOCKED_SHORTCUTS: &[&str] = &[
    "Ctrl+Alt+Delete",
    "Ctrl+Shift+Escape",
    "Alt+F4",
    "Alt+Tab",
];

/// Checks if a shortcut is reserved by Windows.
pub fn is_reserved(shortcut_str: &str) -> bool {
    // Basic prefix checks for Windows combinations
    if shortcut_str.contains("Super") || shortcut_str.contains("Win") {
        return true;
    }
    BLOCKED_SHORTCUTS.contains(&shortcut_str)
}

pub fn register(app: &mut App) -> Result<()> {
    let defaults = [
        "Ctrl+Shift+Space",
        "Ctrl+Shift+T",
        "Ctrl+Shift+S",
        "Ctrl+Shift+F",
        "Ctrl+Shift+A",
        "Ctrl+Shift+N",
        "Ctrl+Shift+Up",
        "Ctrl+Shift+Down",
        "Ctrl+Shift+Left",
        "Ctrl+Shift+Right",
    ];

    app.global_shortcut().on_shortcuts(defaults, move |app_handle, shortcut, event| {
        if event.state == ShortcutState::Pressed {
            let s_str = shortcut.to_string();
            match s_str.as_str() {
                "Ctrl+Shift+Space" => {
                    if let Some(window) = app_handle.get_webview_window("main") {
                        if window.is_visible().unwrap_or(false) {
                            let _ = window.hide();
                        } else {
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                }
                "Ctrl+Shift+T" | "Ctrl+Shift+S" | "Ctrl+Shift+F" | "Ctrl+Shift+A" | "Ctrl+Shift+N" => {
                    let _ = app_handle.emit("hotkey", s_str);
                }
                "Ctrl+Shift+Up" => {
                    if let Some(window) = app_handle.get_webview_window("main") {
                        if let Ok(pos) = window.outer_position() {
                            let _ = window.set_position(tauri::PhysicalPosition::new(pos.x, pos.y - 20));
                        }
                    }
                }
                "Ctrl+Shift+Down" => {
                    if let Some(window) = app_handle.get_webview_window("main") {
                        if let Ok(pos) = window.outer_position() {
                            let _ = window.set_position(tauri::PhysicalPosition::new(pos.x, pos.y + 20));
                        }
                    }
                }
                "Ctrl+Shift+Left" => {
                    if let Some(window) = app_handle.get_webview_window("main") {
                        if let Ok(pos) = window.outer_position() {
                            let _ = window.set_position(tauri::PhysicalPosition::new(pos.x - 20, pos.y));
                        }
                    }
                }
                "Ctrl+Shift+Right" => {
                    if let Some(window) = app_handle.get_webview_window("main") {
                        if let Ok(pos) = window.outer_position() {
                            let _ = window.set_position(tauri::PhysicalPosition::new(pos.x + 20, pos.y));
                        }
                    }
                }
                _ => {}
            }
        }
    })?;

    Ok(())
}
