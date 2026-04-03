use super::{AiProvider, Message, MessageContent};
use anyhow::Result;

/// DeepSeek provider — uses the OpenAI-compatible API.
/// Free tier: deepseek-chat (DeepSeek-V3) is free on their API.
pub struct DeepSeekProvider {
    api_key: String,
}

impl DeepSeekProvider {
    pub fn new(api_key: String) -> Self {
        Self { api_key }
    }
}

#[async_trait::async_trait]
impl AiProvider for DeepSeekProvider {
    fn name(&self) -> &str {
        "deepseek"
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
            let content = match &m.content {
                MessageContent::Text(t) => t.clone(),
                MessageContent::Vision { text, .. } => {
                    format!("{} [Note: image attached — deepseek-chat doesn't support vision]", text)
                }
            };
            api_messages.push(serde_json::json!({
                "role": m.role,
                "content": content
            }));
        }

        let payload = serde_json::json!({
            "model": "deepseek-chat",
            "messages": api_messages,
            "max_tokens": 4096
        });

        let res = client
            .post("https://api.deepseek.com/chat/completions")
            .bearer_auth(&self.api_key)
            .json(&payload)
            .send()
            .await?;

        if !res.status().is_success() {
            return Err(anyhow::anyhow!("DeepSeek error: {}", res.text().await?));
        }

        let val: serde_json::Value = res.json().await?;
        Ok(val["choices"][0]["message"]["content"]
            .as_str()
            .unwrap_or("")
            .to_string())
    }

    async fn transcribe(&self, _audio_base64: &str) -> Result<String> {
        Err(anyhow::anyhow!("DeepSeek does not support transcription"))
    }
}
