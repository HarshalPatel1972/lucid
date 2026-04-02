pub mod ai;
pub mod capture;
pub mod config;
pub mod ghost;
pub mod hotkeys;
pub mod window;
pub mod tray;

use std::sync::Arc;

/// Build an ordered provider list matching config.provider_priority.
fn build_router(config: &config::Config) -> ai::AiRouter {
    let mut providers: Vec<Arc<dyn ai::AiProvider>> = Vec::new();
    for name in &config.provider_priority {
        let p: Arc<dyn ai::AiProvider> = match name.as_str() {
            "groq" => Arc::new(ai::groq::GroqProvider::new(
                config.api_keys.groq.clone().unwrap_or_default(),
            )),
            "gemini" => Arc::new(ai::gemini::GeminiProvider::new(
                config.api_keys.gemini.clone().unwrap_or_default(),
            )),
            "claude" => Arc::new(ai::claude::ClaudeProvider::new(
                config.api_keys.claude.clone().unwrap_or_default(),
            )),
            "deepseek" => Arc::new(ai::deepseek::DeepSeekProvider::new(
                config.api_keys.deepseek.clone().unwrap_or_default(),
            )),
            "openrouter" => Arc::new(ai::openrouter::OpenRouterProvider::new(
                config.api_keys.openrouter.clone().unwrap_or_default(),
            )),
            "ollama" => Arc::new(ai::ollama::OllamaProvider::new(
                config.ollama_model.clone(),
            )),
            _ => continue,
        };
        providers.push(p);
    }
    ai::AiRouter::new(providers)
}

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
    *state.router.lock().unwrap() = build_router(&config);

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
fn set_no_activate(window: tauri::Window, enabled: bool) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        use windows::Win32::Foundation::HWND;
        let hwnd = HWND(window.hwnd().map_err(|e| e.to_string())?.0 as *mut _);
        crate::window::set_no_activate(hwnd, enabled).map_err(|e| e.to_string())?;
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
fn set_resizable(window: tauri::Window, enabled: bool) -> Result<(), String> {
    window.set_resizable(enabled).map_err(|e| e.to_string())
}

#[tauri::command]
fn start_drag(window: tauri::Window) -> Result<(), String> {
    window.start_dragging().map_err(|e| e.to_string())
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

#[tauri::command]
fn minimize_window(window: tauri::Window) {
    let _ = window.minimize();
}

#[tauri::command]
fn close_window(window: tauri::Window) {
    let _ = window.close();
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .setup(|app| {
            let app_data_dir = app.path().app_data_dir().unwrap_or_default();
            let config_path = app_data_dir.join("config.json");
            let mut config = if config_path.exists() {
                serde_json::from_str(&std::fs::read_to_string(&config_path).unwrap_or_default())
                    .unwrap_or_default()
            } else {
                config::config::Config::default()
            };

            // Applying initial window states from configuration.
            use tauri::Manager;
            if let Some(main_window) = app.get_webview_window("main") {
                // Apply Mica/Acrylic vibrancy for a glassy, premium look.
                #[cfg(target_os = "windows")]
                {
                    use window_vibrancy::apply_mica;
                    let _ = apply_mica(&main_window, None);
                }

                if let Ok(hwnd) = main_window.hwnd() {
                   use windows::Win32::Foundation::HWND;
                   let hwnd_val = HWND(hwnd.0 as _);
                   
                   // Inhibit Snap Layouts (Windows 11)
                   let _ = crate::window::inhibit_snap_layouts(hwnd_val);
                   
                   if config.stealth_on_launch {
                      let _ = crate::window::set_stealth(hwnd_val, true);
                   }
                   if config.ghost_mode {
                      let _ = crate::window::set_click_through(hwnd_val, true);
                   }
                   if config.no_activate {
                      let _ = crate::window::set_no_activate(hwnd_val, true);
                   }
                   if config.specs_mode {
                      let _ = main_window.set_resizable(false);
                   }
                }
            }

            // Backfill defaults for users who already had a config file
            let def = config::config::Config::default();
            if config.api_keys.groq.is_none() || config.api_keys.groq.as_deref() == Some("") { config.api_keys.groq = def.api_keys.groq; }
            if config.api_keys.gemini.is_none() || config.api_keys.gemini.as_deref() == Some("") { config.api_keys.gemini = def.api_keys.gemini; }
            if config.api_keys.deepseek.is_none() || config.api_keys.deepseek.as_deref() == Some("") { config.api_keys.deepseek = def.api_keys.deepseek; }
            if config.api_keys.openrouter.is_none() || config.api_keys.openrouter.as_deref() == Some("") { config.api_keys.openrouter = def.api_keys.openrouter; }
            
            // Remove ollama from fallback
            config.provider_priority.retain(|p| p != "ollama");

            // Ensure all new defaults are present in priority
            for p in ["groq", "gemini", "deepseek", "openrouter"] {
                if !config.provider_priority.contains(&p.to_string()) {
                    config.provider_priority.push(p.to_string());
                }
            }

            let router = build_router(&config);
            app.manage(AppState {
                config: Mutex::new(config),
                router: Mutex::new(router),
            });

            hotkeys::register(app).expect("failed to register hotkeys");
            let _ = tray::setup(app);

            // Resize and Center Window to 85% of screen
            let app_handle = app.handle();
            if let Some(window) = app_handle.get_webview_window("main") {
                if let Some(monitor) = window.current_monitor().ok().flatten() {
                    let size = monitor.size();
                    let w = (size.width as f64 * 0.85) as u32;
                    let h = (size.height as f64 * 0.85) as u32;
                    let _ = window.set_size(tauri::Size::Physical(tauri::PhysicalSize { width: w, height: h }));
                    let _ = window.center();
                }
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            start_drag,
            set_stealth,
            set_click_through,
            set_no_activate,
            set_resizable,
            set_opacity,
            nudge_window,
            save_position,
            restore_position,
            minimize_window,
            close_window,
            save_config,
            get_config,
            crate::ghost::set_ghost_mode,
            crate::capture::capture_full,
            crate::capture::capture_region,
            crate::capture::ocr_region,
            ai_complete,
            ai_transcribe
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
