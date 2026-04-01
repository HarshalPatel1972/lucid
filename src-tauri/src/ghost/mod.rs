use tauri::Window;
use windows::Win32::Foundation::HWND;
use windows::Win32::UI::WindowsAndMessaging::{
    GetWindowLongPtrW, SetWindowLongPtrW, GWL_EXSTYLE, WS_EX_APPWINDOW, WS_EX_TOOLWINDOW,
};

#[tauri::command]
pub fn set_ghost_mode(window: Window, enable: bool) {
    if let Ok(hwnd) = window.hwnd() {
        let hwnd = HWND(hwnd.0 as _);
        unsafe {
            let ex_style = GetWindowLongPtrW(hwnd, GWL_EXSTYLE);
            let mut new_style = ex_style as usize;

            if enable {
                // Remove WS_EX_APPWINDOW and add WS_EX_TOOLWINDOW
                new_style &= !WS_EX_APPWINDOW.0 as usize;
                new_style |= WS_EX_TOOLWINDOW.0 as usize;
            } else {
                // Add WS_EX_APPWINDOW and remove WS_EX_TOOLWINDOW
                new_style &= !WS_EX_TOOLWINDOW.0 as usize;
                new_style |= WS_EX_APPWINDOW.0 as usize;
            }

            SetWindowLongPtrW(hwnd, GWL_EXSTYLE, new_style as isize);
        }
    }
}
