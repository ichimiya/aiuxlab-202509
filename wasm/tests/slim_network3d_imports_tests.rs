use std::fs;

// Red: network3d用に未使用のブラウザイベント型などを外す
#[test]
fn lib_rs_has_no_keyboard_event_import() {
    let lib = fs::read_to_string("src/lib.rs").expect("read src/lib.rs");
    assert!(
        !lib.contains("KeyboardEvent"),
        "src/lib.rs should not import KeyboardEvent for network3d-only"
    );
}

