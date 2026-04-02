use anyhow::Result;
use base64::{engine::general_purpose, Engine as _};
use screenshots::Screen;

#[cfg(target_os = "windows")]
use windows::{
    Media::Ocr::OcrEngine,
    Storage::Streams::{DataWriter, InMemoryRandomAccessStream},
};

/// Captures the entire primary screen and returns base64-encoded PNG.
pub fn capture_full_screen() -> Result<String> {
    let screens = Screen::all()?;
    let screen = screens
        .into_iter()
        .next()
        .ok_or_else(|| anyhow::anyhow!("No screen found"))?;
    let image = screen.capture()?;
    let mut bytes = Vec::new();
    image.write_to(&mut std::io::Cursor::new(&mut bytes), screenshots::image::ImageFormat::Png)?;
    Ok(general_purpose::STANDARD.encode(&bytes))
}

/// Captures a specific region of the screen.
pub fn do_capture_region(x: i32, y: i32, width: u32, height: u32) -> Result<String> {
    let screens = Screen::all()?;
    let screen = screens
        .into_iter()
        .next()
        .ok_or_else(|| anyhow::anyhow!("No screen found"))?;
    let image = screen.capture_area(x, y, width, height)?;
    let mut bytes = Vec::new();
    image.write_to(&mut std::io::Cursor::new(&mut bytes), screenshots::image::ImageFormat::Png)?;
    Ok(general_purpose::STANDARD.encode(&bytes))
}

/// Extracts text from a base64-encoded PNG image using Windows OCR API.
pub async fn ocr_from_base64(base64_image: &str) -> Result<String> {
    #[cfg(target_os = "windows")]
    {
        // Decode base64 into bytes
        let bytes = general_purpose::STANDARD.decode(base64_image)?;

        // Create an InMemoryRandomAccessStream to load the image
        let stream = InMemoryRandomAccessStream::new()?;
        let writer = DataWriter::CreateDataWriter(&stream)?;
        writer.WriteBytes(&bytes)?;
        writer.StoreAsync()?.get()?;
        writer.FlushAsync()?.get()?;
        stream.Seek(0)?;

        // Decode the image stream into a SoftwareBitmap
        let decoder = windows::Graphics::Imaging::BitmapDecoder::CreateAsync(&stream)?.get()?;
        let software_bitmap = decoder.GetSoftwareBitmapAsync()?.get()?;

        let engine = OcrEngine::TryCreateFromUserProfileLanguages()?;
        
        let ocr_result = engine.RecognizeAsync(&software_bitmap)?.get()?;
        
        // Extract text
        let text = ocr_result.Text()?.to_string();
        Ok(text)
    }

    #[cfg(not(target_os = "windows"))]
    {
        Err(anyhow::anyhow!("OCR is only supported on Windows"))
    }
}

/// Attempts to read from clipboard first.
/// If empty or access denied, falls back to OCR of given region.
pub async fn smart_copy(x: i32, y: i32, width: u32, height: u32) -> Result<String> {
    // Attempt clipboard read, but for now we fallback directly to capture + OCR
    let base64_image = do_capture_region(x, y, width, height)?;
    let text = ocr_from_base64(&base64_image).await.unwrap_or_default();
    Ok(text)
}

// Tauri commands

#[tauri::command]
pub async fn capture_full() -> Result<String, String> {
    capture_full_screen().map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn capture_region(x: i32, y: i32, width: u32, height: u32) -> Result<String, String> {
    do_capture_region(x, y, width, height).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn ocr_region(x: i32, y: i32, width: u32, height: u32) -> Result<String, String> {
    let b64 = do_capture_region(x, y, width, height).map_err(|e| e.to_string())?;
    ocr_from_base64(&b64).await.map_err(|e| e.to_string())
}
