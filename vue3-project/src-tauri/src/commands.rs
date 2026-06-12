use tauri::{State, Emitter};
use super::DeepLinkState;

/// 获取存储的深链接回调 URL
#[tauri::command]
pub fn get_deep_link_url(state: State<DeepLinkState>) -> Result<Option<String>, String> {
    Ok(state.0.lock().unwrap().clone())
}

/// 清除已消费的深链接回调 URL
#[tauri::command]
pub fn clear_deep_link_url(state: State<DeepLinkState>) -> Result<(), String> {
    *state.0.lock().unwrap() = None;
    Ok(())
}

/// 手动设置深链接 URL（用于测试或外部触发）
#[tauri::command]
pub fn set_deep_link_url(url: String, state: State<DeepLinkState>, app: tauri::AppHandle) -> Result<(), String> {
    *state.0.lock().unwrap() = Some(url.clone());
    app.emit("deep-link-received", url).map_err(|e| e.to_string())?;
    Ok(())
}
