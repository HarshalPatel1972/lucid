use anyhow::Result;
use tauri::{App, Manager, Emitter};
use tauri_plugin_global_shortcut::{GlobalShortcutExt, Shortcut, ShortcutState};
use crate::AppState;
use std::str::FromStr;

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

pub fn register_dynamic(app_handle: &tauri::AppHandle, config: &crate::config::HotkeyConfig) -> Result<()> {
    let mut shortcuts_to_register = vec![
        config.toggle_visibility.clone(),
        config.toggle_click_through.clone(),
        config.snip_region.clone(),
        config.capture_full.clone(),
        config.focus_chat.clone(),
        config.new_session.clone(),
        "Ctrl+Shift+Up".to_string(),
        "Ctrl+Shift+Down".to_string(),
        "Ctrl+Shift+Left".to_string(),
        "Ctrl+Shift+Right".to_string(),
    ];
    
    let mut parsed_shortcuts: Vec<Shortcut> = shortcuts_to_register
        .into_iter()
        .filter(|s| !s.is_empty() && !is_reserved(s))
        .filter_map(|s| Shortcut::from_str(&s).ok())
        .collect();

    let _ = app_handle.global_shortcut().unregister_all();
    
    app_handle.global_shortcut().on_shortcuts(parsed_shortcuts, move |app, shortcut, event| {
        if event.state == ShortcutState::Pressed {
            let s_str = shortcut.to_string();
            let state = app.state::<AppState>();
            let cfg = state.config.lock().unwrap().hotkeys.clone();
            
            if s_str == cfg.toggle_visibility {
                if let Some(window) = app.get_webview_window("main") {
                    if window.is_visible().unwrap_or(false) {
                        let _ = window.hide();
                    } else {
                        let _ = window.show();
                        let _ = window.set_focus();
                    }
                }
            } else if s_str == cfg.toggle_click_through || s_str == cfg.snip_region || 
                      s_str == cfg.capture_full || s_str == cfg.focus_chat || 
                      s_str == cfg.new_session {
                let _ = app.emit("hotkey", &s_str);
            } else {
                match s_str.as_str() {
                    "Ctrl+Shift+Up" => {
                        if let Some(window) = app.get_webview_window("main") {
                            if let Ok(pos) = window.outer_position() {
                                let _ = window.set_position(tauri::PhysicalPosition::new(pos.x, pos.y - 20));
                            }
                        }
                    }
                    "Ctrl+Shift+Down" => {
                        if let Some(window) = app.get_webview_window("main") {
                            if let Ok(pos) = window.outer_position() {
                                let _ = window.set_position(tauri::PhysicalPosition::new(pos.x, pos.y + 20));
                            }
                        }
                    }
                    "Ctrl+Shift+Left" => {
                        if let Some(window) = app.get_webview_window("main") {
                            if let Ok(pos) = window.outer_position() {
                                let _ = window.set_position(tauri::PhysicalPosition::new(pos.x - 20, pos.y));
                            }
                        }
                    }
                    "Ctrl+Shift+Right" => {
                        if let Some(window) = app.get_webview_window("main") {
                            if let Ok(pos) = window.outer_position() {
                                let _ = window.set_position(tauri::PhysicalPosition::new(pos.x + 20, pos.y));
                            }
                        }
                    }
                    _ => {}
                }
            }
        }
    })?;
    Ok(())
}

pub fn register(app: &mut App) -> Result<()> {
    let app_handle = app.handle().clone();
    let config = {
        let state = app_handle.state::<AppState>();
        let cfg = state.config.lock().unwrap().hotkeys.clone();
        cfg
    };
    register_dynamic(&app_handle, &config)
}
