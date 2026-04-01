use super::{AiProvider, Message};
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

    async fn complete(&self, _messages: &[Message], _system: Option<&str>) -> Result<String> {
        // Implementation stub for Groq completion
        Ok("Groq response".to_string())
    }

    async fn transcribe(&self, _audio_base64: &str) -> Result<String> {
        // Implementation stub for Groq Whisper
        Ok("Groq transcription".to_string())
    }
}
