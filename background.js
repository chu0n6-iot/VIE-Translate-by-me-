const cache = new Map();

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type !== "TRANSLATE") return;
  translate(msg.text).then(sendResponse);
  return true; // giữ kênh mở cho phản hồi bất đồng bộ
});

async function translate(text) {
  const cleanText = (text || "").trim();
  if (!cleanText) return { vi: "" };

  if (cache.has(cleanText)) {
    return { vi: cache.get(cleanText) };
  }

  const { apiKey } = await chrome.storage.local.get("apiKey");
  if (!apiKey) return { error: "Chưa nhập API key" };

  try {
    // Gọi model gemini-2.5-flash với Auth Key truyền qua header
    const url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent";
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey
      },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: "Bạn là dịch giả phụ đề phim chuyên nghiệp. Hãy dịch câu sau sang tiếng Việt ngắn gọn, tự nhiên. Chỉ trả về duy nhất bản dịch tiếng Việt, không kèm giải thích hay ghi chú gì thêm." }]
        },
        contents: [
          { role: "user", parts: [{ text: cleanText }] }
        ],
        generationConfig: {
          maxOutputTokens: 200,
          temperature: 0.3
        }
      })
    });

    const data = await res.json();
    if (data.error) {
      console.error("Lỗi từ Gemini:", data.error);
      return { error: data.error.message };
    }

    const vi = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? "";
    if (vi) {
      cache.set(cleanText, vi);
    }
    return { vi };
  } catch (err) {
    console.error("Lỗi mạng:", err);
    return { error: err.message || "Lỗi gọi API" };
  }
}