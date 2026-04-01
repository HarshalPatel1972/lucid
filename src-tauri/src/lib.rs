pub mod ghost;
pub mod hotkeys;
pub mod window;

use tauri::Manager;


#[tauri::command]
fn set_stealth(window: tauri::Window, enabled: bool) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        use windows::Win32::Foundation::HWND;
        let hwnd = HWND(window.hwnd().map_err(|e| e.to_string())?.0 as *mut _);
        crate::window::set_stealth(hwnd, enabled).map_err(|e| e.to_string())?;
    }
    #[cfg(not(target_os = "windows"))]
    {
        crate::window::set_stealth(enabled).map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
fn set_click_through(window: tauri::Window, enabled: bool) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        use windows::Win32::Foundation::HWND;
        let hwnd = HWND(window.hwnd().map_err(|e| e.to_string())?.0 as *mut _);
        crate::window::set_click_through(hwnd, enabled).map_err(|e| e.to_string())?;
    }
    #[cfg(not(target_os = "windows"))]
    {
        crate::window::set_click_through(enabled).map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
fn set_opacity(window: tauri::Window, opacity: f64) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        use windows::Win32::Foundation::HWND;
        let hwnd = HWND(window.hwnd().map_err(|e| e.to_string())?.0 as *mut _);
        crate::window::set_opacity(hwnd, opacity).map_err(|e| e.to_string())?;
    }
    #[cfg(not(target_os = "windows"))]
    {
        crate::window::set_opacity((), opacity).map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
fn nudge_window(window: tauri::Window, dx: i32, dy: i32) -> Result<(), String> {
    crate::window::nudge_window(&window, dx, dy).map_err(|e| e.to_string())
}

#[tauri::command]
fn save_position(window: tauri::Window, app: tauri::AppHandle) -> Result<(), String> {
    crate::window::save_position(&window, &app).map_err(|e| e.to_string())
}

#[tauri::command]
fn restore_position(window: tauri::Window, app: tauri::AppHandle) -> Result<(), String> {
    crate::window::restore_position(&window, &app).map_err(|e| e.to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .setup(|app| {
            hotkeys::register(app).expect("failed to register hotkeys");
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            set_stealth,
            set_click_through,
            set_opacity,
            nudge_window,
            save_position,
            restore_position,
            crate::ghost::set_ghost_mode
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

