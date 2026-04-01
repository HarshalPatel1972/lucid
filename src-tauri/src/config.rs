use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Config {
    pub api_keys: ApiKeys,
    pub provider_priority: Vec<String>,
    pub ollama_model: String,
    pub session_prompt: Option<String>,
    pub hotkeys: HotkeyConfig,
    pub appearance: AppearanceConfig,
    pub ghost_mode: bool,
    pub stealth_on_launch: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ApiKeys {
    pub groq: Option<String>,
    pub gemini: Option<String>,
    pub claude: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppearanceConfig {
    pub theme: String,
    pub opacity: f64,
    pub font_size: u8,
    pub font_family: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HotkeyConfig {
    pub toggle_visibility: String,
    pub toggle_click_through: String,
    pub snip_region: String,
    pub capture_full: String,
    pub focus_chat: String,
    pub new_session: String,
}

impl Default for Config {
    fn default() -> Self {
        Self {
            api_keys: ApiKeys {
                groq: None,
                gemini: None,
                claude: None,
            },
            provider_priority: vec![
                "groq".to_string(),
                "gemini".to_string(),
                "claude".to_string(),
                "ollama".to_string(),
            ],
            ollama_model: "llama3".to_string(),
            session_prompt: None,
            hotkeys: HotkeyConfig {
                toggle_visibility: "Ctrl+Shift+Space".to_string(),
                toggle_click_through: "Ctrl+Shift+T".to_string(),
                snip_region: "Ctrl+Shift+S".to_string(),
                capture_full: "Ctrl+Shift+F".to_string(),
                focus_chat: "Ctrl+Shift+A".to_string(),
                new_session: "Ctrl+Shift+N".to_string(),
            },
            appearance: AppearanceConfig {
                theme: "system".to_string(),
                opacity: 1.0,
                font_size: 13,
                font_family: "segoe-ui".to_string(),
            },
            ghost_mode: false,
            stealth_on_launch: true,
        }
    }
}
