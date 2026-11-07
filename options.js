document.addEventListener("DOMContentLoaded", async () => {
  const input = document.getElementById("apiKey");
  const saveBtn = document.getElementById("saveBtn");
  const status = document.getElementById("status");

  // Đọc lại key đã lưu
  const { apiKey } = await chrome.storage.local.get("apiKey");
  if (apiKey) input.value = apiKey;

  // Lưu key
  saveBtn.addEventListener("click", async () => {
    const trimmedKey = input.value.trim();
    await chrome.storage.local.set({ apiKey: trimmedKey });
    status.textContent = "Đã lưu API key thành công!";
    setTimeout(() => { status.textContent = ""; }, 2500);
  });
});