document.addEventListener("DOMContentLoaded", async () => {
  const input = document.getElementById("apiKey");
  const saveBtn = document.getElementById("saveBtn");
  const status = document.getElementById("status");

  // Hiển thị lại API key đã lưu (nếu có)
  const { apiKey } = await chrome.storage.local.get("apiKey");
  if (apiKey) {
    input.value = apiKey;
  }

  saveBtn.addEventListener("click", async () => {
    const trimmedKey = input.value.trim();
    await chrome.storage.local.set({ apiKey: trimmedKey });
    status.textContent = "Đã lưu API key thành công!";
    setTimeout(() => {
      status.textContent = "";
    }, 2500);
  });
});