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
    let shortcuts_to_register = vec![
        config.toggle_visibility.clone(),
        config.toggle_click_through.clone(),
        config.snip_region.clone(),
        config.capture_full.clone(),
        config.focus_chat.clone(),
        config.new_session.clone(),
        "Ctrl+Shift+C".to_string(), // Force-add the new Ghost Mode key
        "Ctrl+Shift+Up".to_string(),
        "Ctrl+Shift+Down".to_string(),
        "Ctrl+Shift+Left".to_string(),
        "Ctrl+Shift+Right".to_string(),
        "Ctrl+Alt+Up".to_string(),
        "Ctrl+Alt+Down".to_string(),
        "Ctrl+Alt+Left".to_string(),
        "Ctrl+Alt+Right".to_string(),
        "Ctrl+Alt+Shift+Up".to_string(),
        "Ctrl+Alt+Shift+Down".to_string(),
        "Ctrl+Alt+Shift+Left".to_string(),
        "Ctrl+Alt+Shift+Right".to_string(),
    ];
    
    let parsed_shortcuts: Vec<Shortcut> = shortcuts_to_register
        .into_iter()
        .filter(|s| !s.is_empty())
        .filter_map(|s| Shortcut::from_str(&s).ok())
        .collect();

    // Use a clean slate for shortcuts
    let _ = app_handle.global_shortcut().unregister_all();
    
    // Register the shortcuts and use a single callback
    app_handle.global_shortcut().on_shortcuts(parsed_shortcuts, move |app, shortcut, event| {
        if event.state == ShortcutState::Pressed {
            let state = app.state::<AppState>();
            let cfg = state.config.lock().unwrap().hotkeys.clone();
            
            // Normalize for comparison
            let shortcut_str = shortcut.to_string();
            let matches_shortcut = |cfg_str: &str| -> bool {
                if let Ok(other) = Shortcut::from_str(cfg_str) {
                    return other == *shortcut;
                }
                false
            };

            if matches_shortcut(&cfg.toggle_visibility) {
                if let Some(window) = app.get_webview_window("main") {
                    if window.is_visible().unwrap_or(false) {
                        let _ = window.hide();
                    } else {
                        let _ = window.show();
                        let _ = window.set_focus();
                    }
                }
            } else if matches_shortcut(&cfg.toggle_click_through) || shortcut_str == "ctrl+shift+c" {
                let _ = app.emit("hotkey", "toggle_click_through");
            } else if matches_shortcut(&cfg.snip_region) {
                let _ = app.emit("hotkey", "snip_region");
            } else if matches_shortcut(&cfg.capture_full) {
                let _ = app.emit("hotkey", "capture_full");
            } else if matches_shortcut(&cfg.new_session) {
                let _ = app.emit("hotkey", "new_session");
            } else {
                // Check for movement and resize hotkeys
                if let Some(window) = app.get_webview_window("main") {
                    if matches_shortcut("Ctrl+Shift+Up") {
                        if let Ok(pos) = window.outer_position() {
                            let _ = window.set_position(tauri::PhysicalPosition::new(pos.x, pos.y - 40));
                        }
                    } else if matches_shortcut("Ctrl+Shift+Down") {
                        if let Ok(pos) = window.outer_position() {
                            let _ = window.set_position(tauri::PhysicalPosition::new(pos.x, pos.y + 40));
                        }
                    } else if matches_shortcut("Ctrl+Shift+Left") {
                        if let Ok(pos) = window.outer_position() {
                            let _ = window.set_position(tauri::PhysicalPosition::new(pos.x - 40, pos.y));
                        }
                    } else if matches_shortcut("Ctrl+Shift+Right") {
                        if let Ok(pos) = window.outer_position() {
                            let _ = window.set_position(tauri::PhysicalPosition::new(pos.x + 40, pos.y));
                        }
                    } else if matches_shortcut("Ctrl+Alt+Up") {
                        if let (Ok(_), Ok(state)) = (window.outer_size(), app.state::<AppState>().config.lock()) {
                            let inc = state.appearance.resize_increment as i32;
                            let _ = crate::window::resize_window(&window.as_ref().window(), 0, -inc, 0, inc);
                        }
                    } else if matches_shortcut("Ctrl+Alt+Down") {
                        if let (Ok(_), Ok(state)) = (window.outer_size(), app.state::<AppState>().config.lock()) {
                            let inc = state.appearance.resize_increment as i32;
                            let _ = crate::window::resize_window(&window.as_ref().window(), 0, 0, 0, inc);
                        }
                    } else if matches_shortcut("Ctrl+Alt+Left") {
                        if let (Ok(_), Ok(state)) = (window.outer_size(), app.state::<AppState>().config.lock()) {
                            let inc = state.appearance.resize_increment as i32;
                            let _ = crate::window::resize_window(&window.as_ref().window(), -inc, 0, inc, 0);
                        }
                    } else if matches_shortcut("Ctrl+Alt+Right") {
                        if let (Ok(_), Ok(state)) = (window.outer_size(), app.state::<AppState>().config.lock()) {
                            let inc = state.appearance.resize_increment as i32;
                            let _ = crate::window::resize_window(&window.as_ref().window(), 0, 0, inc, 0);
                        }
                    } else if matches_shortcut("Ctrl+Alt+Shift+Up") {
                        if let (Ok(_), Ok(state)) = (window.outer_size(), app.state::<AppState>().config.lock()) {
                            let inc = state.appearance.resize_increment as i32;
                            let _ = crate::window::resize_window(&window.as_ref().window(), 0, inc, 0, -inc);
                        }
                    } else if matches_shortcut("Ctrl+Alt+Shift+Down") {
                        if let (Ok(_), Ok(state)) = (window.outer_size(), app.state::<AppState>().config.lock()) {
                            let inc = state.appearance.resize_increment as i32;
                            let _ = crate::window::resize_window(&window.as_ref().window(), 0, 0, 0, -inc);
                        }
                    } else if matches_shortcut("Ctrl+Alt+Shift+Left") {
                        if let (Ok(_), Ok(state)) = (window.outer_size(), app.state::<AppState>().config.lock()) {
                            let inc = state.appearance.resize_increment as i32;
                            let _ = crate::window::resize_window(&window.as_ref().window(), inc, 0, -inc, 0);
                        }
                    } else if matches_shortcut("Ctrl+Alt+Shift+Right") {
                        if let (Ok(_), Ok(state)) = (window.outer_size(), app.state::<AppState>().config.lock()) {
                            let inc = state.appearance.resize_increment as i32;
                            let _ = crate::window::resize_window(&window.as_ref().window(), 0, 0, -inc, 0);
                        }
                    }
                }
            }
        }
    }).map_err(|e| anyhow::anyhow!(e.to_string()))?;
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
