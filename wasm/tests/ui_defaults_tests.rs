use std::fs;

// HTMLのスライダ初期値を検証する簡易テスト
// id="rs" -> value="0.04"
// id="fgi" -> value="0.8"

fn extract_value_attr(html: &str, id: &str) -> Option<String> {
    // 非厳密: id="<id>" を含む <input ...> の直近のタグ片から value="..." を抜く
    let needle = format!("id=\"{}\"", id);
    let idx = html.find(&needle)?;
    // id以後、同一タグ内（'>'まで）を切り出す
    let rest = &html[idx..];
    let end = rest.find('>')?;
    let tag = &rest[..end];
    // value="..." を探す
    let vkey = "value=\"";
    let vpos = tag.find(vkey)? + vkey.len();
    let after = &tag[vpos..];
    let v_end = after.find('"')?;
    Some(after[..v_end].to_string())
}

#[test]
fn html_slider_default_values() {
    let html = fs::read_to_string("web/network3d.html").expect("read web/network3d.html");
    let rs = extract_value_attr(&html, "rs").expect("rs slider");
    let fgi = extract_value_attr(&html, "fgi").expect("fgi slider");
    assert_eq!(rs, "0.04");
    assert_eq!(fgi, "0.8");
}

