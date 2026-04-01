pub mod ai;
pub mod capture;
pub mod config;
pub mod ghost;
pub mod hotkeys;
pub mod window;
pub mod tray;

use std::sync::Mutex;
use tauri::Manager;

pub struct AppState {
    pub config: Mutex<config::Config>,
    pub router: Mutex<ai::AiRouter>,
}

#[tauri::command]
async fn ai_complete(
    messages: Vec<ai::Message>,
    system: Option<String>,
    state: tauri::State<'_, AppState>,
) -> Result<String, String> {
    let router = state.router.lock().unwrap().clone();
    router.complete(&messages, system.as_deref()).await.map_err(|e| e.to_string())
}

#[tauri::command]
async fn ai_transcribe(
    _audio_base64: String,
    _state: tauri::State<'_, AppState>,
) -> Result<String, String> {
    Ok("Mock".to_string())
}

#[tauri::command]
fn get_config(state: tauri::State<'_, AppState>) -> Result<config::Config, String> {
    let config = state.config.lock().unwrap();
    Ok(config.clone())
}

#[tauri::command]
fn save_config(config: config::Config, state: tauri::State<'_, AppState>, app: tauri::AppHandle) -> Result<(), String> {
    *state.config.lock().unwrap() = config.clone();
    let _ = hotkeys::register_dynamic(&app, &config.hotkeys);
    
    if let Ok(dir) = app.path().app_data_dir() {
        let _ = std::fs::create_dir_all(&dir);
        let path = dir.join("config.json");
        if let Ok(json) = serde_json::to_string(&config) {
            let _ = std::fs::write(path, json);
        }
    }
    Ok(())
}

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
            let app_data_dir = app.path().app_data_dir().unwrap_or_default();
            let config_path = app_data_dir.join("config.json");
            let config = if config_path.exists() {
                serde_json::from_str(&std::fs::read_to_string(&config_path).unwrap_or_default())
                    .unwrap_or_default()
            } else {
                config::Config::default()
            };

            use std::sync::Arc;
            let providers: Vec<Arc<dyn ai::AiProvider>> = vec![
                Arc::new(ai::groq::GroqProvider::new(config.api_keys.groq.clone().unwrap_or_default())),
                Arc::new(ai::gemini::GeminiProvider::new(config.api_keys.gemini.clone().unwrap_or_default())),
                Arc::new(ai::claude::ClaudeProvider::new(config.api_keys.claude.clone().unwrap_or_default())),
                Arc::new(ai::ollama::OllamaProvider::new(config.ollama_model.clone())),
            ];

            app.manage(AppState {
                config: Mutex::new(config),
                router: Mutex::new(ai::AiRouter::new(providers)),
            });

            hotkeys::register(app).expect("failed to register hotkeys");
            let _ = tray::setup(app);
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            set_stealth,
            set_click_through,
            set_opacity,
            nudge_window,
            save_position,
            restore_position,
            crate::ghost::set_ghost_mode,
            crate::capture::capture_full,
            crate::capture::capture_region,
            crate::capture::ocr_region,
            ai_complete,
            ai_transcribe,
            get_config,
            save_config
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

