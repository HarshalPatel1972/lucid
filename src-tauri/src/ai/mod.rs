use anyhow::Result;
use serde::{Deserialize, Serialize};
use std::sync::Arc;

pub mod claude;
pub mod gemini;
pub mod groq;
pub mod ollama;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Message {
    pub role: String, // "user" | "assistant" | "system"
    pub content: MessageContent,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(untagged)]
pub enum MessageContent {
    Text(String),
    Vision { text: String, image_base64: String },
}

#[async_trait::async_trait]
pub trait AiProvider: Send + Sync {
    fn name(&self) -> &str;
    fn is_available(&self) -> bool;
    async fn complete(&self, messages: &[Message], system: Option<&str>) -> Result<String>;
    async fn transcribe(&self, audio_base64: &str) -> Result<String>;
}

#[derive(Clone)]
pub struct AiRouter {
    providers: Vec<Arc<dyn AiProvider>>,
}

impl AiRouter {
    pub fn new(providers: Vec<Arc<dyn AiProvider>>) -> Self {
        Self { providers }
    }

    /// Complete using first available provider in priority order.
    pub async fn complete(&self, messages: &[Message], system: Option<&str>) -> Result<String> {
        for provider in &self.providers {
            if provider.is_available() {
                match provider.complete(messages, system).await {
                    Ok(response) => return Ok(response),
                    Err(e) => {
                        log::warn!("{} failed: {e}, trying next provider", provider.name());
                        continue;
                    }
                }
            }
        }
        Err(anyhow::anyhow!("No AI provider available. Add an API key in Settings."))
    }
}
