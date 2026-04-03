use anyhow::Result;
use serde::{Deserialize, Serialize};
use std::sync::Arc;

pub mod claude;
pub mod deepseek;
pub mod gemini;
pub mod groq;
pub mod ollama;
pub mod openrouter;

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
    /// Index of the last successfully used provider — enables circular failover
    last_success: Arc<std::sync::atomic::AtomicUsize>,
}

impl AiRouter {
    pub fn new(providers: Vec<Arc<dyn AiProvider>>) -> Self {
        Self {
            providers,
            last_success: Arc::new(std::sync::atomic::AtomicUsize::new(0)),
        }
    }

    /// Circular fallback: starts from the last successful provider,
    /// tries each in order, wrapping around. Full circle = all tried.
    pub async fn complete(&self, messages: &[Message], system: Option<&str>) -> Result<String> {
        let n = self.providers.len();
        if n == 0 {
            return Err(anyhow::anyhow!("No AI providers configured."));
        }

        let start = self.last_success.load(std::sync::atomic::Ordering::Relaxed) % n;
        let mut last_error = String::new();

        for offset in 0..n {
            let idx = (start + offset) % n;
            let provider = &self.providers[idx];

            if !provider.is_available() {
                log::debug!("{} not available, skipping", provider.name());
                continue;
            }

            match provider.complete(messages, system).await {
                Ok(response) => {
                    // Remember this provider for next round
                    self.last_success.store(idx, std::sync::atomic::Ordering::Relaxed);
                    log::info!("Response from: {}", provider.name());
                    return Ok(response);
                }
                Err(e) => {
                    last_error = format!("{}: {}", provider.name(), e);
                    log::warn!("{} failed — trying next. Error: {}", provider.name(), e);
                    // Move to next for subsequent calls even after failure
                    self.last_success.store((idx + 1) % n, std::sync::atomic::Ordering::Relaxed);
                }
            }
        }

        Err(anyhow::anyhow!(
            "All AI providers failed. Last error: {}. Check your API keys in Settings.",
            last_error
        ))
    }
}
