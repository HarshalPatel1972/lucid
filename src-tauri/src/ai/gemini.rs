use super::{AiProvider, Message, MessageContent};
use anyhow::Result;

pub struct GeminiProvider {
    api_key: String,
}

impl GeminiProvider {
    pub fn new(api_key: String) -> Self {
        Self { api_key }
    }
}

#[async_trait::async_trait]
impl AiProvider for GeminiProvider {
    fn name(&self) -> &str {
        "gemini"
    }

    fn is_available(&self) -> bool {
        !self.api_key.is_empty()
    }

    async fn complete(&self, messages: &[Message], system: Option<&str>) -> Result<String> {
        let client = reqwest::Client::new();
        
        let mut contents = Vec::new();
        let mut system_instruction = None;
        
        if let Some(sys) = system {
            system_instruction = Some(serde_json::json!({
                "parts": [ { "text": sys } ]
            }));
        }
        
        for m in messages {
            // "system" roles handled above. We must map Gemini roles correctly.
            // Gemini doesn't use "system" within contents. It uses "user" and "model".
            // If there's some mismatch, default to user.
            if m.role == "system" { continue; } // Exclude standard system role from main loop just in case
            
            let role = if m.role == "assistant" { "model" } else { "user" };
            let mut parts = Vec::new();
            
            match &m.content {
                MessageContent::Text(t) => {
                    parts.push(serde_json::json!({"text": t}));
                }
                MessageContent::Vision { text, image_base64 } => {
                    parts.push(serde_json::json!({"text": text}));
                    parts.push(serde_json::json!({
                        "inlineData": {
                            "mime_type": "image/jpeg",
                            "data": image_base64
                        }
                    }));
                }
            }
            
            contents.push(serde_json::json!({
                "role": role,
                "parts": parts
            }));
        }
        
        let mut payload = serde_json::json!({
            "contents": contents,
        });

        if let Some(sys) = system_instruction {
            payload["systemInstruction"] = sys;
        }

        let url = format!(
            "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={}",
            self.api_key
        );

        let res = client
            .post(&url)
            .json(&payload)
            .send()
            .await?;

        if !res.status().is_success() {
            return Err(anyhow::anyhow!("Gemini Error: {}", res.text().await?));
        }

        let val: serde_json::Value = res.json().await?;
        let content = val["candidates"][0]["content"]["parts"][0]["text"]
            .as_str()
            .unwrap_or("")
            .to_string();

        Ok(content)
    }

    async fn transcribe(&self, _audio_base64: &str) -> Result<String> {
        Err(anyhow::anyhow!("Gemini does not support whisper transcription directly here"))
    }
}
