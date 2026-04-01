use super::{AiProvider, Message};
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

    async fn complete(&self, _messages: &[Message], _system: Option<&str>) -> Result<String> {
        Ok("Ollama response".to_string())
    }

    async fn transcribe(&self, _audio_base64: &str) -> Result<String> {
        Err(anyhow::anyhow!("Ollama Whisper not configured here"))
    }
}
