const fs = require('fs');
let text = fs.readFileSync('src-tauri/src/hotkeys/mod.rs', 'utf8');
const searchStr = \            } else {
                let s_str = shortcut.to_string();
                match s_str.as_str() {
                    \\\
Ctrl+Shift+Up\\\ => {
                        if let Some(window) = app.get_webview_window(\\\
main\\\) {  
                            if let Ok(pos) = window.outer_position() {
                                let _ = window.set_position(tauri::PhysicalPosition::new(pos.x, pos.y - 20));
                            }
                        }
                    }
                    \\\
Ctrl+Shift+Down\\\ => {
                        if let Some(window) = app.get_webview_window(\\\
main\\\) {  
                            if let Ok(pos) = window.outer_position() {
                                let _ = window.set_position(tauri::PhysicalPosition::new(pos.x, pos.y + 20));
                            }
                        }
                    }
                    \\\
Ctrl+Shift+Left\\\ => {
                        if let Some(window) = app.get_webview_window(\\\
main\\\) {  
                            if let Ok(pos) = window.outer_position() {
                                let _ = window.set_position(tauri::PhysicalPosition::new(pos.x - 20, pos.y));
                            }
                        }
                    }
                    \\\
Ctrl+Shift+Right\\\ => {
                        if let Some(window) = app.get_webview_window(\\\
main\\\) {  
                            if let Ok(pos) = window.outer_position() {
                                let _ = window.set_position(tauri::PhysicalPosition::new(pos.x + 20, pos.y));
                            }
                        }
                    }
                    _ => {}
                }
            }\;
const replaceStr = \            } else if matches_shortcut(\\\
Ctrl+Shift+Up\\\) {
                if let Some(window) = app.get_webview_window(\\\
main\\\) {
                    if let Ok(pos) = window.outer_position() {
                        let _ = window.set_position(tauri::PhysicalPosition::new(pos.x, pos.y - 20));
                    }
                }
            } else if matches_shortcut(\\\
Ctrl+Shift+Down\\\) {
                if let Some(window) = app.get_webview_window(\\\
main\\\) {
                    if let Ok(pos) = window.outer_position() {
                        let _ = window.set_position(tauri::PhysicalPosition::new(pos.x, pos.y + 20));
                    }
                }
            } else if matches_shortcut(\\\
Ctrl+Shift+Left\\\) {
                if let Some(window) = app.get_webview_window(\\\
main\\\) {
                    if let Ok(pos) = window.outer_position() {
                        let _ = window.set_position(tauri::PhysicalPosition::new(pos.x - 20, pos.y));
                    }
                }
            } else if matches_shortcut(\\\
Ctrl+Shift+Right\\\) {
                if let Some(window) = app.get_webview_window(\\\
main\\\) {
                    if let Ok(pos) = window.outer_position() {
                        let _ = window.set_position(tauri::PhysicalPosition::new(pos.x + 20, pos.y));
                    }
                }
            }\;
text = text.replace(searchStr.replace(/\\r\\n/g, '\\n'), replaceStr.replace(/\\r\\n/g, '\\n'));
text = text.replace(searchStr, replaceStr);
fs.writeFileSync('src-tauri/src/hotkeys/mod.rs', text);
