use super::{AiProvider, Message, MessageContent};
use anyhow::Result;

pub struct OllamaProvider {
    model: String,
}

impl OllamaProvider {
    pub fn new(model: String) -> Self {
        Self { model }
    }
}

#[async_trait::async_trait]
impl AiProvider for OllamaProvider {
    fn name(&self) -> &str {
        "ollama"
    }

    fn is_available(&self) -> bool {
        // Should ping http://localhost:11434
        true
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
            let (content, images) = match &m.content {
                MessageContent::Text(t) => (t.clone(), vec![]),
                MessageContent::Vision { text, image_base64 } => (text.clone(), vec![image_base64.clone()]),
            };
            
            let mut msg = serde_json::json!({
                "role": m.role,
                "content": content
            });
            
            if !images.is_empty() {
                msg["images"] = serde_json::json!(images);
            }

            api_messages.push(msg);
        }

        let model_name = if self.model.is_empty() { "llama3.2" } else { &self.model };

        let payload = serde_json::json!({
            "model": model_name,
            "messages": api_messages,
            "stream": false
        });

        let res = client
            .post("http://localhost:11434/api/chat")
            .json(&payload)
            .send()
            .await?;

        if !res.status().is_success() {
            return Err(anyhow::anyhow!("Ollama Error: {}", res.text().await?));
        }

        let val: serde_json::Value = res.json().await?;
        let content = val["message"]["content"]
            .as_str()
            .unwrap_or("")
            .to_string();

        Ok(content)
    }

    async fn transcribe(&self, _audio_base64: &str) -> Result<String> {
        Err(anyhow::anyhow!("Ollama Whisper not configured here"))
    }
}
