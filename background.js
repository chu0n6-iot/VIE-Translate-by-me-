const cache = new Map();

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type !== "TRANSLATE") return;
  translate(msg.text).then(sendResponse);
  return true; // giữ kênh mở cho phản hồi bất đồng bộ
});

async function translate(text) {
  const cleanText = (text || "").trim();
  if (!cleanText) return { vi: "" };

  // Kiểm tra bộ nhớ đệm (cache) để không dịch lại câu đã dịch
  if (cache.has(cleanText)) {
    return { vi: cache.get(cleanText) };
  }

  const { apiKey } = await chrome.storage.local.get("apiKey");
  if (!apiKey) return { error: "Chưa nhập API key" };

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true"
      },
      body: JSON.stringify({
        model: "claude-haiku-5-5",
        max_tokens: 300,
        system: "Dịch phụ đề sang tiếng Việt tự nhiên, ngắn gọn. Chỉ trả về bản dịch.",
        messages: [{ role: "user", content: cleanText }]
      })
    });

    const data = await res.json();
    const vi = data.content?.[0]?.text ?? "";
    if (vi) {
      cache.set(cleanText, vi);
    }
    return { vi };
  } catch (err) {
    return { error: err.message || "Lỗi kết nối API" };
  }
}