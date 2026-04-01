use super::{AiProvider, Message, MessageContent};
use anyhow::Result;

pub struct ClaudeProvider {
    api_key: String,
}

impl ClaudeProvider {
    pub fn new(api_key: String) -> Self {
        Self { api_key }
    }
}

#[async_trait::async_trait]
impl AiProvider for ClaudeProvider {
    fn name(&self) -> &str {
        "claude"
    }

    fn is_available(&self) -> bool {
        !self.api_key.is_empty()
    }

    async fn complete(&self, messages: &[Message], system: Option<&str>) -> Result<String> {
        let client = reqwest::Client::new();
        let mut api_messages = Vec::new();

        for m in messages {
            if m.role == "system" { continue; } // Exclude standard system role from main loop
            
            let role = if m.role == "assistant" { "assistant" } else { "user" };
            let mut content_blocks = Vec::new();
            
            match &m.content {
                MessageContent::Text(t) => {
                    content_blocks.push(serde_json::json!({
                        "type": "text",
                        "text": t
                    }));
                }
                MessageContent::Vision { text, image_base64 } => {
                    content_blocks.push(serde_json::json!({
                        "type": "image",
                        "source": {
                            "type": "base64",
                            "media_type": "image/jpeg",
                            "data": image_base64
                        }
                    }));
                    if !text.is_empty() {
                        content_blocks.push(serde_json::json!({
                            "type": "text",
                            "text": text
                        }));
                    }
                }
            }
            
            api_messages.push(serde_json::json!({
                "role": role,
                "content": content_blocks
            }));
        }
        
        let mut payload = serde_json::json!({
            "model": "claude-3-5-sonnet-20241022",
            "max_tokens": 4096,
            "messages": api_messages
        });

        if let Some(sys) = system {
            payload["system"] = serde_json::json!(sys);
        }

        let res = client
            .post("https://api.anthropic.com/v1/messages")
            .header("x-api-key", &self.api_key)
            .header("anthropic-version", "2023-06-01")
            .json(&payload)
            .send()
            .await?;

        if !res.status().is_success() {
            return Err(anyhow::anyhow!("Claude Error: {}", res.text().await?));
        }

        let val: serde_json::Value = res.json().await?;
        let content = val["content"][0]["text"]
            .as_str()
            .unwrap_or("")
            .to_string();

        Ok(content)
    }

    async fn transcribe(&self, _audio_base64: &str) -> Result<String> {
        Err(anyhow::anyhow!("Claude does not support transcription"))
    }
}
