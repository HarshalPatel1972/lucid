mod window;

use tauri::Manager;

#[tauri::command]
fn set_stealth(window: tauri::Window, enabled: bool) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        use windows::Win32::Foundation::HWND;
        let hwnd = HWND(window.hwnd().map_err(|e| e.to_string())?.0 as *mut _);
        crate::window::set_stealth(hwnd, enabled).map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![set_stealth])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
