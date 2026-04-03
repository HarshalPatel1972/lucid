use super::{AiProvider, Message, MessageContent};
use anyhow::Result;

/// OpenRouter provider — routes to many free models via a single API.
/// Free models used: meta-llama/llama-4-maverick (free), google/gemma-3-27b-it (free)
pub struct OpenRouterProvider {
    api_key: String,
    model: String,
}

impl OpenRouterProvider {
    pub fn new(api_key: String) -> Self {
        Self {
            api_key,
            // Best free model on OpenRouter — Llama 4 Maverick (free tier)
            model: "meta-llama/llama-4-maverick:free".to_string(),
        }
    }

    pub fn with_model(api_key: String, model: String) -> Self {
        Self { api_key, model }
    }
}

#[async_trait::async_trait]
impl AiProvider for OpenRouterProvider {
    fn name(&self) -> &str {
        "openrouter"
    }

    fn is_available(&self) -> bool {
        !self.api_key.is_empty()
    }

    async fn complete(&self, messages: &[Message], system: Option<&str>) -> Result<String> {
        let client = reqwest::Client::new();
        let mut api_messages = Vec::new();

        if let Some(sys) = system {
            api_messages.push(serde_json::json!({
                "role": "system",
                "content": sys
            }));
        }

        for m in messages {
            // OpenRouter supports vision via content array for vision-capable models
            let content = match &m.content {
                MessageContent::Text(t) => serde_json::json!(t),
                MessageContent::Vision { text, image_base64 } => {
                    serde_json::json!([
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": format!("data:image/png;base64,{}", image_base64)
                            }
                        },
                        {
                            "type": "text",
                            "text": text
                        }
                    ])
                }
            };

            api_messages.push(serde_json::json!({
                "role": m.role,
                "content": content
            }));
        }

        let payload = serde_json::json!({
            "model": self.model,
            "messages": api_messages,
        });

        let res = client
            .post("https://openrouter.ai/api/v1/chat/completions")
            .bearer_auth(&self.api_key)
            .header("HTTP-Referer", "https://lucid-ai.app")
            .header("X-Title", "Lucid")
            .json(&payload)
            .send()
            .await?;

        if !res.status().is_success() {
            return Err(anyhow::anyhow!("OpenRouter error: {}", res.text().await?));
        }

        let val: serde_json::Value = res.json().await?;

        // Check for API-level error in response body
        if let Some(err) = val.get("error") {
            return Err(anyhow::anyhow!("OpenRouter model error: {}", err));
        }

        Ok(val["choices"][0]["message"]["content"]
            .as_str()
            .unwrap_or("")
            .to_string())
    }

    async fn transcribe(&self, _audio_base64: &str) -> Result<String> {
        Err(anyhow::anyhow!("OpenRouter does not support transcription"))
    }
}
