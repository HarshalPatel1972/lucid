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
        "Ctrl+Shift+Space".to_string(), 
        "Control+Shift+Space".to_string(), 
        "Ctrl+Shift+C".to_string(), 
        "Control+Shift+C".to_string(), 
        "Alt+G".to_string(), 
        "Ctrl+Shift+Up".to_string(),
        "Ctrl+Shift+Down".to_string(),
        "Ctrl+Shift+Left".to_string(),
        "Ctrl+Shift+Right".to_string(),
    ];
    
    let mut unique_shortcuts = std::collections::HashSet::new();
    let parsed_shortcuts: Vec<Shortcut> = shortcuts_to_register
        .into_iter()
        .filter(|s| !s.is_empty())
        .filter_map(|s| Shortcut::from_str(&s).ok())
        .filter(|s| unique_shortcuts.insert(s.clone()))
        .collect();

    println!("Registering global hotkeys: {:?}", parsed_shortcuts);

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

            if matches_shortcut(&cfg.toggle_visibility) || shortcut_str == "Ctrl+Shift+Space" || shortcut_str == "Control+Shift+Space" {
                if let Some(window) = app.get_webview_window("main") {
                    let is_visible = window.is_visible().unwrap_or(false);
                    if is_visible && window.is_focused().unwrap_or(false) {
                        let _ = window.hide();
                    } else {
                        // If window is "Ghosted" (0 opacity), restore opacity first
                        let mut config = state.config.lock().unwrap();
                        if config.ghost_mode {
                            config.ghost_mode = false;
                            let target_opacity = config.appearance.opacity;

                            #[cfg(target_os = "windows")]
                            if let Ok(hwnd_raw) = window.hwnd() {
                                use windows::Win32::Foundation::HWND;
                                let hwnd = HWND(hwnd_raw.0 as *mut _);
                                let _ = crate::window::set_opacity(hwnd, target_opacity);
                                let _ = crate::window::set_click_through(hwnd, false);
                            }
                        }
                        
                        let _ = window.show();
                        let _ = window.set_focus();
                    }
                }
            } else if matches_shortcut(&cfg.toggle_click_through) {
                let _ = app.emit("hotkey", &cfg.toggle_click_through);
            } else if matches_shortcut(&cfg.snip_region) {
                let _ = app.emit("hotkey", &cfg.snip_region);
            } else if matches_shortcut(&cfg.capture_full) {
                let _ = app.emit("hotkey", &cfg.capture_full);
            } else if matches_shortcut(&cfg.focus_chat) {
                let _ = app.emit("hotkey", &cfg.focus_chat);
            } else if matches_shortcut(&cfg.new_session) {
                let _ = app.emit("hotkey", &cfg.new_session);
            } else {
                match shortcut_str.as_str() {
                    "Ctrl+Shift+C" | "Control+Shift+C" | "Alt+G" => {
                        if let Some(window) = app.get_webview_window("main") {
                            let state = app.state::<AppState>();
                            let mut config = state.config.lock().unwrap();
                            let new_ghost = !config.ghost_mode;
                            
                            #[cfg(target_os = "windows")]
                            {
                                use windows::Win32::Foundation::HWND;
                                if let Ok(hwnd_raw) = window.hwnd() {
                                    let hwnd = HWND(hwnd_raw.0 as *mut _);
                                    let _ = crate::window::set_click_through(hwnd, new_ghost);
                                    let target_opacity = if new_ghost { 0.0 } else { config.appearance.opacity };
                                    let _ = crate::window::set_opacity(hwnd, target_opacity);
                                }
                            }
                            
                            config.ghost_mode = new_ghost;
                            let updated_cfg = config.clone();
                            let _ = app.emit("hotkey", "Ctrl+Shift+C");
                            
                            if let Ok(dir) = app.path().app_data_dir() {
                                let path = dir.join("config.json");
                                if let Ok(json) = serde_json::to_string(&updated_cfg) {
                                    let _ = std::fs::write(path, json);
                                }
                            }
                        }
                    }
                    s if s.contains("Up") => {
                        if let Some(window) = app.get_webview_window("main") {
                            if let Ok(pos) = window.outer_position() {
                                let _ = window.set_position(tauri::PhysicalPosition::new(pos.x, pos.y - 40));
                            }
                        }
                    }
                    s if s.contains("Down") => {
                        if let Some(window) = app.get_webview_window("main") {
                            if let Ok(pos) = window.outer_position() {
                                let _ = window.set_position(tauri::PhysicalPosition::new(pos.x, pos.y + 40));
                            }
                        }
                    }
                    s if s.contains("Left") => {
                        if let Some(window) = app.get_webview_window("main") {
                            if let Ok(pos) = window.outer_position() {
                                let _ = window.set_position(tauri::PhysicalPosition::new(pos.x - 40, pos.y));
                            }
                        }
                    }
                    s if s.contains("Right") => {
                        if let Some(window) = app.get_webview_window("main") {
                            if let Ok(pos) = window.outer_position() {
                                let _ = window.set_position(tauri::PhysicalPosition::new(pos.x + 40, pos.y));
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
