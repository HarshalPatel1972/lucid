use super::{AiProvider, Message, MessageContent};
use anyhow::Result;

pub struct GroqProvider {
    api_key: String,
}

impl GroqProvider {
    pub fn new(api_key: String) -> Self {
        Self { api_key }
    }
}

#[async_trait::async_trait]
impl AiProvider for GroqProvider {
    fn name(&self) -> &str {
        "groq"
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
                MessageContent::Vision { text, .. } => format!("{} (Image not supported by this model)", text),
            };
            api_messages.push(serde_json::json!({
                "role": m.role,
                "content": content
            }));
        }

        let payload = serde_json::json!({
            "model": "llama-3.3-70b-versatile",
            "messages": api_messages
        });

        let res = client
            .post("https://api.groq.com/openai/v1/chat/completions")
            .bearer_auth(&self.api_key)
            .json(&payload)
            .send()
            .await?;

        if !res.status().is_success() {
            return Err(anyhow::anyhow!("Groq Error: {}", res.text().await?));
        }

        let val: serde_json::Value = res.json().await?;
        let content = val["choices"][0]["message"]["content"]
            .as_str()
            .unwrap_or("")
            .to_string();

        Ok(content)
    }

    async fn transcribe(&self, _audio_base64: &str) -> Result<String> {
        Ok("Groq transcription stub".to_string())
    }
}
