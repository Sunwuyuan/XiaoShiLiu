use std::sync::Mutex;
use tauri::{Manager, Emitter};

mod commands;

/// 存储深链接回调参数（OAuth 回调 URL）
pub struct DeepLinkState(Mutex<Option<String>>);

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        // 单实例插件：防止协议回调时打开第二个窗口
        // 当 dynamic:// 回调触发新实例启动时，参数会转发到已运行的实例
        .plugin(tauri_plugin_single_instance::init(|app, args, _cwd| {
            println!("[Tauri] 单实例收到外部启动参数: {:?}", args);
            for arg in &args {
                if arg.starts_with("dynamic://") || arg.starts_with("com.zhaishis.dynamic://") {
                    println!("[Tauri] 收到深链接回调: {}", arg);
                    if let Some(state) = app.try_state::<DeepLinkState>() {
                        *state.0.lock().unwrap() = Some(arg.clone());
                        // 通知前端
                        app.emit("deep-link-received", arg).ok();
                    }
                }
            }
        }))
        .manage(DeepLinkState(Mutex::new(None)))
        .setup(|app| {
            // 首次启动时检查命令行参数中的深链接
            let args: Vec<String> = std::env::args().collect();
            for arg in &args {
                if arg.starts_with("dynamic://") || arg.starts_with("com.zhaishis.dynamic://") {
                    println!("[Tauri] 启动参数中发现深链接: {}", arg);
                    if let Some(state) = app.try_state::<DeepLinkState>() {
                        *state.0.lock().unwrap() = Some(arg.clone());
                        app.emit("deep-link-received", arg).ok();
                    }
                }
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::get_deep_link_url,
            commands::clear_deep_link_url,
            commands::set_deep_link_url,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
