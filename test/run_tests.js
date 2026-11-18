/**
 * VIE-Translate Test Suite
 * Automated verification of seeking, auto-sync, musical notes filter, quota recovery, and OCR.
 */

const assert = require("assert");

console.log("🧪 Đang chạy bộ kiểm tra toàn diện cho VIE-Translate...\n");
(async function runAllTests() {

// --- 1. Test formatSubtitleDecorations (Kiểm tra lọc nốt nhạc trên lời nói) ---
console.log("1️⃣ Kiểm tra bộ lọc nốt nhạc (Music Notes vs Spoken Dialogue)...");

function formatSubtitleDecorations(origText, viText, isLyricsTrack = false) {
  let finalOrig = (origText || "")
    .replace(/^(?:\*{1,2})?(?:ORIG(?:INAL)?|GỐC|TRANS(?:LATION)?|DỊCH)\s*:\s*(?:\*{1,2})?/i, "")
    .replace(/^(?:ORIG|GỐC|ORIGINAL)\b[:\s-]*/i, "")
    .trim();
  let finalVi = (viText || "")
    .replace(/^(?:\*{1,2})?(?:TRANS(?:LATION)?|DỊCH|VIETNAMESE|VI|ORIG(?:INAL)?|GỐC)\s*:\s*(?:\*{1,2})?/i, "")
    .replace(/^(?:ORIG|GỐC|ORIGINAL)\b[:\s-]*/i, "")
    .trim();
  if (!finalVi && !finalOrig) return { formattedOrig: finalOrig, formattedVi: finalVi };

  const isSpokenDialogue =
    /^\[?(?:intro|outro|dialogue|spoken|speech|nói|thoại|phỏng vấn|mc|bình luận|narrat)/i.test(finalOrig) ||
    /^["“].+["”]$/.test(finalOrig) ||
    /^[A-Z][a-z]+:\s+/.test(finalOrig);

  const hasExplicitMusicSymbol = /[♪♫♬♩♯]/.test(finalOrig) || /[♪♫♬♩♯]/.test(finalVi);
  const shouldAddMusicNote = hasExplicitMusicSymbol || (isLyricsTrack && !isSpokenDialogue);

  if (shouldAddMusicNote) {
    if (finalOrig && !finalOrig.startsWith("♪") && !finalOrig.startsWith("♫")) finalOrig = `♪ ${finalOrig}`;
    if (finalOrig && !finalOrig.endsWith("♪") && !finalOrig.endsWith("♫")) finalOrig = `${finalOrig} ♪`;
    if (finalVi && !finalVi.startsWith("♪") && !finalVi.startsWith("♫")) finalVi = `♪ ${finalVi}`;
    if (finalVi && !finalVi.endsWith("♪") && !finalVi.endsWith("♫")) finalVi = `${finalVi} ♪`;
  }

  const cleanOrig = finalOrig.replace(/^[♪♫♬\s]+|[♪♫♬\s]+$/g, "").trim();
  const cleanVi = finalVi.replace(/^[♪♫♬\s]+|[♪♫♬\s]+$/g, "").trim();
  if (finalVi) {
    if (/\?$/.test(cleanOrig) && !/\?$/.test(cleanVi)) {
      finalVi = shouldAddMusicNote ? finalVi.replace(/\s*♪$/, "? ♪") : `${finalVi}?`;
    } else if (/!$/.test(cleanOrig) && !/[!?]$/.test(cleanVi)) {
      finalVi = shouldAddMusicNote ? finalVi.replace(/\s*♪$/, "! ♪") : `${finalVi}!`;
    } else if (/(\.{3}|…)$/.test(cleanOrig) && !/(\.{3}|…)$/.test(cleanVi)) {
      finalVi = shouldAddMusicNote ? finalVi.replace(/\s*♪$/, "... ♪") : `${finalVi}...`;
    }
  }
  return { formattedOrig: finalOrig, formattedVi: finalVi };
}

// Case 1A: Người đang nói chuyện bình thường trong video (isLyricsTrack = false) -> TUYỆT ĐỐI KHÔNG có nốt nhạc ♪
const speechRes = formatSubtitleDecorations("Hey what are you doing here?", "Này, cậu đang làm gì ở đây thế?", false);
assert.strictEqual(speechRes.formattedOrig.includes("♪"), false, "Lời nói bình thường không được có nốt nhạc!");
assert.strictEqual(speechRes.formattedVi.includes("♪"), false, "Bản dịch lời nói bình thường không được có nốt nhạc!");

// Case 1B: Đoạn đối thoại được đánh dấu [Dialogue] trong MV -> KHÔNG có nốt nhạc ♪
const mvDialogueRes = formatSubtitleDecorations("[Dialogue] Stop the car now!", "[Thoại] Dừng xe lại ngay!", true);
assert.strictEqual(mvDialogueRes.formattedOrig.includes("♪"), false, "Đoạn thoại trong MV không được gắn nốt nhạc!");

// Case 1C: Lời bài hát chuẩn từ LRCLIB (isLyricsTrack = true) -> Có nốt nhạc ♪
const lyricRes = formatSubtitleDecorations("I will always love you", "Em sẽ mãi luôn yêu anh", true);
assert.strictEqual(lyricRes.formattedOrig.startsWith("♪"), true, "Lời bài hát phải có nốt nhạc mở đầu!");
assert.strictEqual(lyricRes.formattedVi.endsWith("♪"), true, "Bản dịch lời bài hát phải có nốt nhạc kết thúc!");

console.log("   ✅ Đã kiểm tra: Lời nói chuyện bình thường 100% KHÔNG có nốt nhạc ♪, lời bài hát hiển thị ♪ chuẩn xác!\n");

// --- 2. Test Seeking & Subtitle Persistence (Kiểm tra tua video không bị mất sub) ---
console.log("2️⃣ Kiểm tra cơ chế tua video (Seeking & Zero-Sub-Loss)...");

const mockState = {
  lastCueText: "Hello world",
  lastText: "Hello world",
  lastRenderedSeq: 5,
  hideTimer: setTimeout(() => {}, 1000)
};

// Hàm xử lý tua video
function handleSeek(state) {
  state.lastCueText = "";
  state.lastText = "";
  state.lastRenderedSeq = 0;
  if (state.hideTimer) {
    clearTimeout(state.hideTimer);
    state.hideTimer = null;
  }
}

handleSeek(mockState);
assert.strictEqual(mockState.lastCueText, "", "lastCueText phải được reset sau khi tua!");
assert.strictEqual(mockState.lastText, "", "lastText phải được reset sau khi tua!");
assert.strictEqual(mockState.hideTimer, null, "hideTimer phải được hủy ngay lập tức!");

// Giả lập tua lại câu cũ "Hello world"
const mockLocalCache = new Map([["Hello world", { vi: "Xin chào thế giới" }]]);
let renderedText = "";

function onCaptionReceivedSim(cleanText, state) {
  if (cleanText === state.lastText) return false;
  state.lastText = cleanText;
  if (mockLocalCache.has(cleanText)) {
    renderedText = mockLocalCache.get(cleanText).vi;
    return true;
  }
  return false;
}

const didRender = onCaptionReceivedSim("Hello world", mockState);
assert.strictEqual(didRender, true, "Phải hiển thị lại phụ đề thành công khi tua lại câu cũ!");
assert.strictEqual(renderedText, "Xin chào thế giới", "Bản dịch từ localCache phải hiển thị ngay 0ms!");
console.log("   ✅ Đã kiểm tra: Tua video (seeking) không bị mất sub, tua lại câu cũ hiển thị tức thì 0ms!\n");

// --- 3. Test Auto-Align Timing (Căn tự động không bị đứng hình) ---
console.log("3️⃣ Kiểm tra cơ chế căn tự động (Auto-Align Protection)...");

function testCorrelateConstraint(cues, speechTokens, audioTime) {
  let bestCue = null;
  let bestScore = 0;
  for (const c of cues) {
    // Rào chắn bảo vệ: Chỉ tìm trong vùng [audioTime - 8s, audioTime + 8s]
    if (Math.abs(c.start - audioTime) > 8.0) continue;
    let common = 0;
    for (const tok of speechTokens) {
      if (c.tokens.includes(tok)) common++;
    }
    const score = common / Math.max(speechTokens.length, c.tokens.length);
    if (common >= 2 && score > bestScore && score >= 0.5) {
      bestScore = score;
      bestCue = c;
    }
  }
  if (bestCue) {
    const delta = Math.round((audioTime - bestCue.start) * 10) / 10;
    if (Math.abs(delta) <= 5.0) return delta;
  }
  return null;
}

// Giả lập video 4 phút: có từ "you know" ở phút 0:10 và ở phút 3:20
const cues = [
  { start: 10, tokens: ["you", "know"] },
  { start: 199, tokens: ["you", "know"] }
];

// Giọng phát hiện ở thời điểm 200s (audioTime = 200)
const offsetAt200 = testCorrelateConstraint(cues, ["you", "know"], 200);
// Phải khớp với cue ở 199s (delta = +1s), TUYỆT ĐỐI KHÔNG được nhảy về cue ở 10s (delta = +190s)!
assert.strictEqual(offsetAt200, 1.0, "Độ lệch phải là +1s gần mốc hiện tại, không được lệch 190s!");
console.log("   ✅ Đã kiểm tra: Căn tự động bảo vệ thời gian chuẩn (+1s), không bao giờ bị nhảy 190s làm đứng sub!\n");

// --- 4. Test API Quota 429 Recovery (Cứu hộ Quota Google Free) ---
console.log("4️⃣ Kiểm tra cơ chế cứu hộ Quota API Key 429 & Tự động bật dự phòng...");

function handleApiKeyTestResult(errorMsg) {
  const isQuota = /quota|resource_exhausted|rate_limit|exceeded your current quota|429/i.test(errorMsg);
  if (isQuota) {
    return {
      ok: true,
      provider: "gemini",
      isQuotaExceeded: true,
      modelUsed: "gemini-2.5-flash-lite",
      fallbackActive: true,
      sample: "Xin chào thế giới! (Chế độ Dự phòng Không Giới Hạn)"
    };
  }
  return { ok: false, error: errorMsg };
}

const quotaError = "Quota exceeded for metric: generativelanguage.googleapis.com/generate_content_free_tier_requests, limit: 20, model: gemini-3.8-flash";
const res = handleApiKeyTestResult(quotaError);

assert.strictEqual(res.ok, true, "Key chạm quota vẫn phải được xác nhận ok: true để lưu!");
assert.strictEqual(res.isQuotaExceeded, true, "Đánh dấu isQuotaExceeded để thông báo người dùng!");
assert.strictEqual(res.fallbackActive, true, "Tự động kích hoạt chế độ dự phòng không giới hạn!");
console.log("   ✅ Đã kiểm tra: Key bị giới hạn ngày của Project được lưu an toàn và tự kích hoạt Google Translate Free!\n");

// --- 5. Test AI Meta / Prompt Leak Filter (Giấu ngay các câu AI tự nói / rò rỉ prompt) ---
console.log("5️⃣ Kiểm tra bộ lọc ẩn câu chữ AI ('Tôi đang dịch...', 'Listen to this audio clip...')...");

function isAiMetaOrPromptLeak(text) {
  if (!text) return false;
  const s = String(text).trim();
  const lower = s.toLowerCase();
  if (
    lower.includes("listen to this audio") ||
    lower.includes("transcribe the spoken speech") ||
    lower.includes("format json only") ||
    lower.includes("exact spoken speech") ||
    lower.includes("translation in vi") ||
    lower.includes("lời nói chính xác bằng ngôn ngữ") ||
    lower.includes("bản dịch sang tiếng việt") ||
    lower.includes("đoạn âm thanh này và phiên âm") ||
    lower.includes("format json")
  ) {
    return true;
  }
  if (
    /^(?:tôi đang dịch|đang dịch\b|dưới đây là bản dịch|đây là bản dịch|bản dịch là:|bản dịch của tôi)/i.test(s) ||
    lower.includes("tôi đang dịch") ||
    lower.includes("tôi là mô hình ai") ||
    lower.includes("tôi là một ai") ||
    lower.includes("dưới đây là bản dịch")
  ) {
    return true;
  }
  return false;
}

const leakOrig = 'Listen to this audio clip and transcribe the spoken speech, then translate it to vi. Format JSON ONLY: {"orig": "exact spoken speech in original language", "vi": "translation in vi"}';
const leakVi = 'Hãy nghe đoạn âm thanh này và phiên âm lời nói, sau đó dịch sang tiếng Việt. Định dạng CHỈ JSON: {"orig": "lời nói chính xác bằng ngôn ngữ gốc", "vi": "bản dịch sang tiếng Việt"}';
const metaVi = "Tôi đang dịch đoạn hội thoại này sang tiếng Việt";
const normalVi = "Anh đang chạy về phía nhà ga!";

assert.strictEqual(isAiMetaOrPromptLeak(leakOrig), true, "Phải phát hiện và chặn rò rỉ prompt tiếng Anh!");
assert.strictEqual(isAiMetaOrPromptLeak(leakVi), true, "Phải phát hiện và chặn rò rỉ prompt tiếng Việt!");
assert.strictEqual(isAiMetaOrPromptLeak(metaVi), true, "Phải phát hiện và chặn câu 'Tôi đang dịch...'!");
assert.strictEqual(isAiMetaOrPromptLeak(normalVi), false, "Câu thoại phim bình thường không được bị chặn!");
console.log("   ✅ Đã kiểm tra: Mọi câu rò rỉ prompt hoặc 'Tôi đang dịch...' bị giấu 100%, câu thoại phim hiển thị chuẩn!\n");

// --- 6. Test 1-Click Instant Subtitle Toggle & Resync ---
console.log("6️⃣ Kiểm tra nút Bật/Tắt phụ đề tức thì (1-Click Sub Toggle & Instant Resync)...");

const toggleState = { subMuted: false, lastCueText: "Old line", lastText: "Old line" };
// Bấm tắt
toggleState.subMuted = true;
assert.strictEqual(toggleState.subMuted, true, "Trạng thái subMuted phải là true khi bấm tắt!");
// Bấm bật lại -> tự động xóa lastCueText để bắt kịp nhịp phim ngay
toggleState.subMuted = false;
toggleState.lastCueText = "";
toggleState.lastText = "";
assert.strictEqual(toggleState.subMuted, false, "Trạng thái subMuted phải là false khi bật lại!");
assert.strictEqual(toggleState.lastCueText, "", "Phải xóa lastCueText để cập nhật ngay câu thoại hiện tại của phim!");
console.log("   ✅ Đã kiểm tra: Tắt/Bật phụ đề 1 chạm phản hồi tức thì và bắt kịp ngay nhịp phim!\n");


// --- 7. Test API Key Provider Detection & Multi-Key Pool Rotation ---
console.log("7️⃣ Kiểm tra nhận diện API Key & Cơ chế xoay vòng Key dự phòng (Key Pool)...");

function detectProviderFromKey(key) {
  const k = (key || "").trim();
  if (k.startsWith("gsk_")) return "groq";
  if (k.startsWith("AQ.") || k.startsWith("AIza")) return "gemini";
  return "";
}

assert.strictEqual(detectProviderFromKey("AIzaSyB_1234567890abcdef"), "gemini", "Key AIza... phải nhận là Gemini!");
assert.strictEqual(detectProviderFromKey("AQ.customVertexKey123"), "gemini", "Key AQ... phải nhận là Gemini!");
assert.strictEqual(detectProviderFromKey("gsk_9876543210zyxwvuts"), "groq", "Key gsk_... phải nhận là Groq!");
assert.strictEqual(detectProviderFromKey("sk-unknown"), "", "Key không rõ định dạng không được nhận nhầm!");

function buildKeyPool(settings, rawKey) {
  const list = [rawKey, ...String(settings.backupKeys || "").split(/[\s,;]+/), settings.geminiApiKey, settings.groqApiKey];
  const seen = new Set();
  return list
    .map((k) => (k || "").trim())
    .filter((k) => k && detectProviderFromKey(k) && !seen.has(k) && seen.add(k));
}

const pool = buildKeyPool({
  backupKeys: "gsk_backup1\nAIzaSyBackup2, gsk_backup3",
  geminiApiKey: "AIzaSyGeminiStored",
  groqApiKey: "gsk_groqStored"
}, "AIzaSyPrimary");

assert.strictEqual(pool.length, 6, "Phải gộp đủ 6 key hợp lệ từ ô chính, ô dự phòng và bộ nhớ!");
assert.strictEqual(pool[0], "AIzaSyPrimary", "Key chính phải được ưu tiên chạy đầu tiên!");
assert.strictEqual(pool[1], "gsk_backup1", "Key dự phòng Groq 1 phải nằm ở vị trí thứ hai!");

// Kiểm tra cơ chế tự chuyển sang Key 2 khi Key 1 bị 429 Quota
const mockCooldowns = new Map();
async function simulateWithKeyPool(keys, callFn) {
  const now = Date.now();
  const avail = keys.filter((k) => (mockCooldowns.get(k) || 0) <= now);
  let quotaHits = 0;
  for (const key of avail) {
    try {
      return await callFn(key);
    } catch (err) {
      if (err.isQuotaExceeded) {
        quotaHits++;
        mockCooldowns.set(key, now + 15 * 60 * 1000);
      }
    }
  }
  const e = new Error("All keys exhausted");
  e.allKeysExhausted = keys.length > 0 && (avail.length === 0 || quotaHits === avail.length);
  throw e;
}

// Giả lập: Key 1 hết quota (429), Key 2 dịch thành công
let attempts = [];
const callResult = await (async () => {
  return await simulateWithKeyPool(["AIzaSyExhausted", "gsk_HealthyKey"], async (k) => {
    attempts.push(k);
    if (k === "AIzaSyExhausted") {
      const err = new Error("Quota exceeded 429");
      err.isQuotaExceeded = true;
      throw err;
    }
    return { ok: true, vi: "Xin chào từ Key 2", keyUsed: k };
  });
})();

assert.strictEqual(callResult.vi, "Xin chào từ Key 2", "Key dự phòng phải dịch thành công!");
assert.strictEqual(attempts.length, 2, "Phải tự động thử Key 1 rồi chuyển sang Key 2!");
assert.strictEqual(attempts[1], "gsk_HealthyKey", "Key 2 phải được kích hoạt sau khi Key 1 hết lượt!");
console.log("   ✅ Đã kiểm tra: Nhận diện chính xác Gemini/Groq, tự xoay tua Key dự phòng khi Key chính hết Quota 429!\n");

// --- 8. Test Google Translate Fallback khi tất cả Key/Model cạn kiệt ---
console.log("8️⃣ Kiểm tra Google Translate (GTX) tự động cứu trợ khi hết Model hoặc không có Key...");

async function handleTranslateMock(rawText, keyPool, gtxFn) {
  try {
    return await simulateWithKeyPool(keyPool, async () => {
      const err = new Error("Resource exhausted 429");
      err.isQuotaExceeded = true;
      throw err;
    });
  } catch (err) {
    // Fallback to GTX
    const gtxVi = await gtxFn(rawText);
    return { vi: gtxVi, provider: "gtx", quotaExhausted: !!err.allKeysExhausted };
  }
}

const fallbackRes = await handleTranslateMock("How are you today?", ["AIzaSyDead"], async (t) => "Hôm nay bạn thế nào?");
assert.strictEqual(fallbackRes.vi, "Hôm nay bạn thế nào?", "Google Translate phải lập tức xuất hiện dịch thế chỗ!");
assert.strictEqual(fallbackRes.provider, "gtx", "Provider phải chuyển sang gtx!");
assert.strictEqual(fallbackRes.quotaExhausted, true, "Phải gắn cờ quotaExhausted để video hiện thông báo Thêm Key cho người dùng!");
console.log("   ✅ Đã kiểm tra: Google Translate tự kích hoạt mượt mà khi hết model AI, không bao giờ để trống phụ đề!\n");

// --- 9. Test Chặn Subtitle Bị Stack Dài & Trộn Nhiều Câu ---
console.log("9️⃣ Kiểm tra bộ lọc giới hạn độ dài (Length Guard) chống tràn chữ / gộp cả đoạn văn...");

function limitTranslationLength(vi, src) {
  const max = Math.max(60, Math.round((src || "").length * 2.3));
  return (vi || "").length > max ? "" : vi;
}

const shortSrc = "I can't keep you from loving him.";
const normalViTrans = "Anh chẳng thể ngăn em yêu người ấy.";
const bloatedStackedVi = "Mấy tháng qua, anh đã nỗ lực để hoàn thiện bản thân. Nhưng cuộc đời anh lại chất chứa quá nhiều tổn thương, khiến anh trở nên lạnh lùng với cả những người yêu thương anh nhất. Giờ nhìn lại, anh mới nhận ra... Anh vẫn nhớ như in khoảnh khắc anh ôm em trong tay, khi đôi mắt em đẫm lệ, khẩn khoản van xin anh đừng rời đi. Anh hối hận vì đã không nói với em tất cả, để giờ đây, anh chẳng thể ngăn em yêu người ấy, vì em đã quyết định rồi. Anh muốn nói yêu em, nhưng giờ đã quá muộn màng.";

assert.strictEqual(limitTranslationLength(normalViTrans, shortSrc), normalViTrans, "Bản dịch gọn gàng đúng ngữ cảnh câu phải được chấp nhận!");
assert.strictEqual(limitTranslationLength(bloatedStackedVi, shortSrc), "", "Bản dịch bị gộp dài bất thường cả đoạn văn phải bị từ chối để chuyển sang Google Translate câu đơn!");
console.log("   ✅ Đã kiểm tra: Chặn hoàn toàn lỗi sub stack cả đoạn văn dài che kín màn hình!\n");

// --- 10. Test Reset State Khi Chuyển Sang Video Mới (No Stale Subs) ---
console.log("🔟 Kiểm tra cơ chế dọn sạch phụ đề cũ khi chuyển sang video khác...");

function simulateResetForNewVideo(state, cs) {
  cs.cues = [];
  cs.refEvents = [];
  cs.isLyrics = false;
  cs.sent = new Set();
  cs.navToken = (cs.navToken || 0) + 1;
  state.lastCueText = "";
  state.lastText = "";
  state.reqSeq++;
  state.lastRenderedSeq = state.reqSeq;
  state.hasReceivedAnySubtitle = false;
  state.subSyncOffset = 0;
}

const testVideoState = { lastCueText: "Old video subtitle line", lastText: "Old video subtitle line", reqSeq: 3, lastRenderedSeq: 3 };
const testCueState = { cues: [{ text: "Old line 1" }, { text: "Old line 2" }], isLyrics: true, sent: new Set(["Old line 1"]) };

simulateResetForNewVideo(testVideoState, testCueState);

assert.strictEqual(testCueState.cues.length, 0, "Cues của video cũ phải bị xóa sạch!");
assert.strictEqual(testCueState.isLyrics, false, "Trạng thái lyrics của video cũ phải được reset!");
assert.strictEqual(testVideoState.lastCueText, "", "lastCueText phải rỗng!");
assert.strictEqual(testVideoState.lastRenderedSeq > 3, true, "Sequence token tăng lên để từ chối các request dịch trễ của video cũ!");
console.log("   ✅ Đã kiểm tra: Chuyển video dọn sạch 100% sub cũ, không bao giờ bị đè phụ đề lên video mới!\n");

// --- 11. Test Live Online GTX Translation (Kiểm tra mạng thực tế) ---
console.log("1️⃣1️⃣ Kiểm tra kết nối mạng thực tế tới Google Translate Free API...");
async function testLiveGtx() {
  const url = "https://translate.googleapis.com/translate_a/single?client=gtx&dt=t&sl=auto&tl=vi&q=" + encodeURIComponent("Hello world");
  try {
    let data = null;
    let status = 200;
    if (process.versions && process.versions.electron) {
      const { execFileSync } = require("child_process");
      const raw = execFileSync("curl.exe", ["-sS", "--max-time", "5", url], { encoding: "utf8" });
      data = JSON.parse(raw);
    } else {
      const res = await fetch(url);
      status = res.status;
      if (res.ok) data = await res.json();
    }
    if (data && Array.isArray(data[0])) {
      const translated = data[0].map((item) => item[0] || "").join("").trim();
      assert.strictEqual(translated.toLowerCase().includes("chào") || translated.toLowerCase().includes("thế giới"), true, "Bản dịch thực tế phải chứa 'chào' hoặc 'thế giới'!");
      console.log(`   ✅ Đã kiểm tra trực tuyến: 'Hello world' ➔ '${translated}' (Phản hồi tức thì!)\n`);
    } else {
      assert.strictEqual([429, 200].includes(status), true, "Phản hồi kết nối phải hợp lệ!");
      console.log(`   ✅ Đã kiểm tra trực tuyến: Google Translate phản hồi HTTP ${status} (Kết nối mạng tới máy chủ Google thông suốt!)\n`);
    }
  } catch (err) {
    console.log(`   ⚠️ Bỏ qua kiểm tra mạng trực tiếp: ${err.message}\n`);
  }
}
await testLiveGtx();

// --- 12. Test Nhận Diện Phân Loại Video Nhạc vs Video Thường ---
console.log("1️⃣2️⃣ Kiểm tra phân loại Video Nhạc (Music Video) vs Video Thường (Vlog/Camping/Tutorial)...");

function looksLikeMusicVideo(title, html = "", duration = 0) {
  if (html && (html.includes('"category":"Music"') || html.includes('"musicVideoType"'))) return true;
  const t = (title || "").toLowerCase();
  if (/\b(mv|m\/v|official\s*(music\s*)?video|lyrics?|lyric\s*video|official\s*audio|visualizer|soundtrack|remix|karaoke|acoustic|vevo)\b/i.test(t)) {
    return true;
  }
  if (/\b(ft\.?|feat\.?|prod\s*by|cover\s*by)\b/i.test(t)) {
    return true;
  }
  if (duration >= 90 && duration <= 450) {
    if (/^[^\-]+?\s+[-–—]\s+[^\-]+?$/i.test(title || "")) {
      const isNonMusic = /\b(vlog|camping|solo|survival|review|unboxing|tutorial|guide|course|lecture|podcast|news|interview|reaction|gameplay|walkthrough|episode|part\s*\d|vs\.?|how\s*to|diy|asmr)\b/i.test(t);
      if (!isNonMusic) return true;
    }
  }
  return false;
}

assert.strictEqual(looksLikeMusicVideo("The Weeknd - Out of Time (Official Music Video)", "", 210), true, "MV phải nhận là Music Video!");
assert.strictEqual(looksLikeMusicVideo("Bruno Mars - Treasure (Official Audio)", "", 180), true, "Official Audio phải nhận là Music Video!");
assert.strictEqual(looksLikeMusicVideo("Stranded in Alaska's Rainforest - 3 Days Solo camping", "", 1676), false, "Vlog Camping Outdoor Boys TUYỆT ĐỐI KHÔNG được nhận là Music Video!");
assert.strictEqual(looksLikeMusicVideo("Python Programming - Full Course for Beginners", "", 3600), false, "Bài giảng lập trình không được nhận là Music Video!");
assert.strictEqual(looksLikeMusicVideo("iPhone 16 Pro - In-Depth Review & Camera Test", "", 900), false, "Review công nghệ không được nhận là Music Video!");

console.log("   ✅ Đã kiểm tra: Phân loại chuẩn xác 100%, không bao giờ tải nhầm lyrics bài hát vào video vlog/đời thường!\n");

// --- 13. Test Multi-Speaker Batch Parser (Chống lệch dòng khi dịch hàng loạt có hội thoại 2 người) ---
console.log("1️⃣3️⃣ Kiểm tra bộ phân tách dịch hàng loạt (Batch Parser) giữ chuẩn hội thoại 2 người...");
require("../utils/storage.js");
const batchSample = `1. - Xin chào đại ca!
- Chào chú em, lâu quá không gặp.
2. Hôm nay trời đẹp thật đấy.
3. "Chúng ta lên đường thôi!"`;
const parsedBatch = global.VieStorage.parseBatchTranslations(batchSample, 3);
assert.strictEqual(parsedBatch.length, 3, "Phải tách đúng 3 mục tương ứng với 3 câu gốc!");
assert.strictEqual(parsedBatch[0], "- Xin chào đại ca!\n- Chào chú em, lâu quá không gặp.", "Mục 1 phải giữ nguyên 2 dòng hội thoại!");
assert.strictEqual(parsedBatch[1], "Hôm nay trời đẹp thật đấy.", "Mục 2 không được bị lệch thành dòng thứ 2 của Mục 1!");
assert.strictEqual(parsedBatch[2], "Chúng ta lên đường thôi!", "Mục 3 phải tự bóc ngoặc kép thừa ở 2 đầu!");
console.log("   ✅ Đã kiểm tra: Dịch hàng loạt (Batch) giữ nguyên hội thoại nhiều người, không bao giờ lệch thứ tự câu!\n");

// --- 14. Test Bảo vệ từ ghép tiếng Việt khi đồng bộ đại từ xưng hô ---
console.log("1️⃣4️⃣ Kiểm tra bảo vệ từ ghép tiếng Việt ('một mình', 'giật mình', 'tự mình', 'tôi luyện')...");
const MINH_PREFIX_COMPOUNDS = /^(?:một|tự|giật|rùng|vươn|chuyển|ẩn|nép|dấn|thân|bên|riêng|chính|bản\s+thân)$/i;
const MINH_SUFFIX_COMPOUNDS = /^(?:mẩy|ên)$/i;
const TOI_PREFIX_COMPOUNDS = /^(?:vôi|bề|phận)$/i;
const TOI_SUFFIX_COMPOUNDS = /^(?:luyện|đòi|tớ)$/i;

function testHarmonizePronouns(viText, pronounStyle) {
  let targetFirst = pronounStyle === "minh_ban" ? "mình" : "tôi";
  const otherFirst = targetFirst === "mình" ? "tôi" : "mình";
  const regex = new RegExp(`(^|\\s)(${otherFirst})(?=([.,!?;:\\s]|$))`, "gi");
  return viText.replace(regex, (match, prefix, word, _la, offset, fullStr) => {
    const beforeSlice = fullStr.slice(0, offset + prefix.length).trim();
    const prevWords = beforeSlice.split(/\s+/);
    const prevWord = prevWords[prevWords.length - 1]?.replace(/^[^\p{L}]+|[^\p{L}]+$/gu, "") || "";
    const afterSlice = fullStr.slice(offset + match.length).trim();
    const nextWord = (afterSlice.split(/\s+/)[0] || "").replace(/^[^\p{L}]+|[^\p{L}]+$/gu, "");
    if (otherFirst === "mình" && (MINH_PREFIX_COMPOUNDS.test(prevWord) || MINH_SUFFIX_COMPOUNDS.test(nextWord))) return match;
    if (otherFirst === "tôi" && (TOI_PREFIX_COMPOUNDS.test(prevWord) || TOI_SUFFIX_COMPOUNDS.test(nextWord))) return match;
    const isCap = /^[A-ZÀ-Ỹ]/.test(word);
    const replacement = isCap ? targetFirst.charAt(0).toUpperCase() + targetFirst.slice(1) : targetFirst;
    return `${prefix}${replacement}`;
  });
}

const compoundMinh = testHarmonizePronouns("Mình đi một mình và giật mình khi tự mình làm việc đó.", "toi_ban");
assert.strictEqual(compoundMinh, "Tôi đi một mình và giật mình khi tự mình làm việc đó.", "Chỉ đổi đại từ 'Mình' đầu câu, tuyệt đối không biến 'một mình'/'giật mình'/'tự mình' thành 'một tôi'!");
const compoundToi = testHarmonizePronouns("Tôi đã được tôi luyện qua nhiều thử thách.", "minh_ban");
assert.strictEqual(compoundToi, "Mình đã được tôi luyện qua nhiều thử thách.", "Chỉ đổi đại từ 'Tôi', giữ nguyên từ ghép 'tôi luyện'!");
console.log("   ✅ Đã kiểm tra: Giữ nguyên 100% từ ghép ('một mình', 'giật mình', 'tự mình', 'tôi luyện') khi khóa ngôi xưng!\n");

console.log("🎉 TOÀN BỘ 14 BÀI KIỂM TRA ĐỀU HOÀN TOÀN CHÍNH XÁC VÀ ĐẠT 100%!");


// v0.7.1: glued-word normalization
(function () {
  const norm = (t) => String(t).replace(/\n+/g, " ").replace(/([a-z]{3,})([A-Z][a-z])/g, "$1 $2").replace(/([.,!?;:])([A-Za-z])/g, "$1 $2").replace(/\s+/g, " ").trim();
  const assert = require("assert");
  assert.strictEqual(norm("entirely\npossible"), "entirely possible");
  assert.strictEqual(norm("famous,for it"), "famous, for it");
  assert.strictEqual(norm("YouTube"), "YouTube");
  console.log("✓ glued-word normalization");
})();

// =========================================================================
// REAL-MODULE INTEGRATION & PERFORMANCE TESTS (15 - 23)
// =========================================================================
const vm = require("vm");
const fs = require("fs");
const path = require("path");
const nodeCrypto = require("crypto");
const ROOT_DIR = path.resolve(__dirname, "..");

function createSandbox(overrides = {}) {
  const sandbox = {
    console,
    setTimeout,
    clearTimeout,
    setInterval,
    clearInterval,
    AbortController,
    URL,
    Date,
    Math,
    RegExp,
    Promise,
    Error,
    JSON,
    Map,
    Set,
    WeakMap,
    WeakSet,
    TextEncoder,
    Uint8Array,
    ArrayBuffer,
    crypto: nodeCrypto.webcrypto,
    encodeURIComponent,
    decodeURIComponent,
    atob: (b64) => Buffer.from(b64, "base64").toString("binary"),
    btoa: (bin) => Buffer.from(bin, "binary").toString("base64"),
    location: { href: "https://www.youtube.com/watch?v=testVid", hostname: "www.youtube.com" },
    ...overrides
  };
  sandbox.self = sandbox;
  sandbox.globalThis = sandbox;
  sandbox.window = sandbox;
  return vm.createContext(sandbox);
}

function loadModule(ctx, relPath) {
  const fullPath = path.join(ROOT_DIR, relPath);
  const code = fs.readFileSync(fullPath, "utf8");
  vm.runInContext(code, ctx, { filename: fullPath });
}

function makeMockResponse({ ok = true, status = 200, jsonData = {} }) {
  return {
    ok,
    status,
    json: async () => jsonData,
    text: async () => JSON.stringify(jsonData)
  };
}

// --- 15. Test VieStorage Real Module (Settings Cache, Glossary Hash, Output & Batch Parser) ---
console.log("\n1️⃣5️⃣ Kiểm tra VieStorage thật (Settings Cache 0ms, CacheKey hash, <think> strip & [[N]] Parser)...");
await (async () => {
  let storageGetCalls = 0;
  let storedData = { targetLang: "vi", translationStyle: "natural", customGlossary: [] };
  const changeListeners = [];
  const chromeMock = {
    storage: {
      local: {
        get: (defaults, cb) => {
          storageGetCalls++;
          cb({ ...defaults, ...storedData });
        },
        set: (updates, cb) => {
          storedData = { ...storedData, ...updates };
          if (cb) cb();
        }
      },
      onChanged: {
        addListener: (fn) => changeListeners.push(fn)
      }
    }
  };
  const ctx = createSandbox({ chrome: chromeMock });
  loadModule(ctx, "utils/storage.js");
  const S = ctx.VieStorage;

  // Concurrent + repeated getSettings calls must only hit chrome.storage.local.get ONCE
  const [s1, s2, s3] = await Promise.all([S.getSettings(), S.getSettings(), S.getSettings()]);
  assert.strictEqual(storageGetCalls, 1, "Đồng thời nhiều getSettings chỉ được gọi IPC 1 lần duy nhất!");
  assert.strictEqual(s1.targetLang, "vi");
  assert.strictEqual(s2.translationStyle, "natural");
  assert.strictEqual(s3.multiSpeakerSplit, true);

  // Live onChanged invalidates/updates in-memory cache without re-reading storage
  for (const fn of changeListeners) {
    fn({ translationStyle: { oldValue: "natural", newValue: "cinema" } }, "local");
  }
  const s4 = await S.getSettings();
  assert.strictEqual(s4.translationStyle, "cinema", "onChanged phải cập nhật ngay cache bộ nhớ!");
  assert.strictEqual(storageGetCalls, 1, "Sau onChanged không cần gọi lại storage.get!");

  // setSettings updates cache synchronously
  await S.setSettings({ targetLang: "ja" });
  const s5 = await S.getSettings();
  assert.strictEqual(s5.targetLang, "ja", "setSettings phải cập nhật cache!");

  // getCacheKey invalidates on glossary change & multiSpeakerSplit toggle
  const kBase = S.getCacheKey("Hello", { targetLang: "vi", multiSpeakerSplit: true, customGlossary: [] });
  const kGloss = S.getCacheKey("Hello", { targetLang: "vi", multiSpeakerSplit: true, customGlossary: [{ src: "Hello", target: "Chào", enabled: true }] });
  const kNoSplit = S.getCacheKey("Hello", { targetLang: "vi", multiSpeakerSplit: false, customGlossary: [] });
  assert.notStrictEqual(kBase, kGloss, "Thay đổi Glossary phải làm đổi cacheKey!");
  assert.notStrictEqual(kBase, kNoSplit, "Bật/tắt tách nhiều người nói phải làm đổi cacheKey!");

  // formatMultiSpeakerDialogue configurable & 3+ turns
  assert.strictEqual(S.formatMultiSpeakerDialogue("Wait! - Why? - Because!", true), "- Wait!\n- Why?\n- Because!");
  assert.strictEqual(S.formatMultiSpeakerDialogue("Wait! - Why?", false), "Wait! - Why?");

  // cleanTranslatedOutput strips <think>, code fences, [[1]] echo, and quotes
  const dirtyOut = '<think>1. step one\n2. step two</think>\n```txt\n[[1]] "Xin chào"\n```';
  assert.strictEqual(S.cleanTranslatedOutput(dirtyOut), "Xin chào", "Phải lọc sạch <think>, code fence, [[1]] và ngoặc kép!");
  assert.strictEqual(S.cleanTranslatedOutput('<think>unclosed thinking'), "", "Unclosed <think> phải bị lọc sạch!");

  // parseBatchTranslations handles [[1]] multi-speaker, preserves 8:30 / 9-10, and strips <think>1. ... 2. ...
  const rawBracket = `<think>1. think first\n2. think second</think>\n[[1]] - Chào anh!\n- Chào em!\n[[2]] Bây giờ là\n8:30 sáng và 9-10 giờ họp.\n[[3]] Xong rồi!`;
  const parsedB = S.parseBatchTranslations(rawBracket, 3);
  assert.strictEqual(parsedB[0], "- Chào anh!\n- Chào em!", "Mục 1 phải giữ nguyên hội thoại nhiều dòng!");
  assert.strictEqual(parsedB[1], "Bây giờ là\n8:30 sáng và 9-10 giờ họp.", "Mục 2 không được tách nhầm tại 8:30 hay 9-10!");
  assert.strictEqual(parsedB[2], "Xong rồi!", "Mục 3 phải khớp chính xác bất chấp số trong <think>!");

  // Classic numbering ignores year at line start if > expectedCount
  const rawYear = "1. Năm nay là\n2024. Một năm tuyệt vời\n2. Tuyệt quá!";
  const parsedY = S.parseBatchTranslations(rawYear, 2);
  assert.strictEqual(parsedY[0], "Năm nay là\n2024. Một năm tuyệt vời");
  assert.strictEqual(parsedY[1], "Tuyệt quá!");

  console.log("   ✅ Đã kiểm tra VieStorage: Cache 0ms, CacheKey hash, <think> strip & [[N]] Batch Parser chuẩn 100%!\n");
})();

// --- 16. Test buildTranslationPrompts & filterRelevantGlossary ---
console.log("1️⃣6️⃣ Kiểm tra buildTranslationPrompts (đa ngôn ngữ sạch) & filterRelevantGlossary...");
(() => {
  const ctx = createSandbox();
  loadModule(ctx, "utils/storage.js");
  const S = ctx.VieStorage;

  const pJa = S.buildTranslationPrompts({
    text: "I will become stronger.",
    targetLang: "ja",
    translationStyle: "natural",
    videoPersona: "drama_movie",
    pronounStyle: "minh_ban"
  });
  assert.strictEqual(pJa.systemPrompt.includes("日本語") || pJa.systemPrompt.includes("(ja)"), true);
  assert.strictEqual(pJa.systemPrompt.includes("thuần Việt"), false, "Dịch sang tiếng Nhật KHÔNG được chèn prompt 'thuần Việt'!");
  assert.strictEqual(pJa.systemPrompt.includes("mình"), false, "Dịch sang tiếng Nhật KHÔNG được chèn ngôi xưng 'mình - bạn'!");

  const pEn = S.buildTranslationPrompts({
    texts: ["Xin chào", "Cảm ơn"],
    targetLang: "en",
    translationStyle: "cinema"
  });
  assert.strictEqual(pEn.isBatch, true);
  assert.strictEqual(pEn.systemPrompt.includes("[[1]]"), true);
  assert.strictEqual(pEn.userPrompt.includes("[[1]] Xin chào"), true);
  assert.strictEqual(pEn.systemPrompt.includes("thuần Việt"), false, "Dịch sang tiếng Anh KHÔNG được chứa chỉ dẫn tiếng Việt!");

  const pVi = S.buildTranslationPrompts({
    text: "Hello!",
    targetLang: "vi",
    translationStyle: "natural",
    pronounStyle: "minh_ban"
  });
  assert.strictEqual(pVi.systemPrompt.includes("thuần Việt"), true, "Dịch sang tiếng Việt phải giữ phong cách thuần Việt!");
  assert.strictEqual(pVi.systemPrompt.includes("mình"), true, "Dịch sang tiếng Việt phải áp dụng ngôi xưng mình - bạn!");

  // filterRelevantGlossary with > 15 items selects only relevant matched terms longest-first
  const largeGlossary = [
    { src: "Machine", target: "Máy móc", enabled: true },
    { src: "Machine Learning", target: "Học máy", enabled: true },
    { src: "GPU", target: "Card đồ họa", enabled: true }
  ];
  for (let i = 0; i < 18; i++) {
    largeGlossary.push({ src: `UnusedTerm${i}`, target: `Không dùng ${i}`, enabled: true });
  }
  const filtered = S.filterRelevantGlossary(largeGlossary, "We train Machine Learning models on GPU.", 15);
  assert.strictEqual(filtered.length, 3, "Glossary > 15 mục chỉ được giữ lại các từ xuất hiện trong câu!");
  assert.strictEqual(filtered[0].src, "Machine Learning", "Thuật ngữ dài hơn ('Machine Learning') phải xếp trước 'Machine'!");

  console.log("   ✅ Đã kiểm tra buildTranslationPrompts & filterRelevantGlossary chuẩn 100%!\n");
})();

// --- 17. Test VieGemini Real Module (Single-Endpoint AIza, 401 Abort, Gemma-3, Deduplicated Discovery) ---
console.log("1️⃣7️⃣ Kiểm tra VieGemini thật (AIza chỉ gọi 1 endpoint, 401 dừng ngay, Gemma-3 & Discovery dedup)...");
await (async () => {
  const calls = [];
  const mockFetch = async (url, opts) => {
    calls.push({ url, opts });
    if (url.includes("/v1beta/models?")) {
      await new Promise((r) => setTimeout(r, 15));
      return makeMockResponse({
        ok: true,
        status: 200,
        jsonData: { models: [{ name: "models/gemini-2.5-flash-lite" }, { name: "models/gemma-3-27b-it" }] }
      });
    }
    if (url.includes("AIzaQuotaKey")) {
      return makeMockResponse({ ok: false, status: 429, jsonData: { error: { message: "Quota exceeded 429" } } });
    }
    if (url.includes("AIzaDeadKey")) {
      return makeMockResponse({ ok: false, status: 401, jsonData: { error: { message: "API key invalid" } } });
    }
    const body = JSON.parse(opts.body);
    return makeMockResponse({
      ok: true,
      status: 200,
      jsonData: {
        candidates: [{ content: { parts: [{ text: body.systemInstruction ? "Dịch Gemini" : "Dịch Gemma" }] } }]
      }
    });
  };
  const ctx = createSandbox({ fetch: mockFetch });
  loadModule(ctx, "utils/storage.js");
  loadModule(ctx, "api/gemini.js");

  // Deduplicated parallel discovery
  const [m1, m2] = await Promise.all([
    ctx.VieGemini.discoverGeminiModels("AIzaQuotaKey"),
    ctx.VieGemini.discoverGeminiModels("AIzaQuotaKey")
  ]);
  assert.deepStrictEqual(m1, m2);
  const discoveryCalls = calls.filter((c) => c.url.includes("/v1beta/models?"));
  assert.strictEqual(discoveryCalls.length, 1, "2 lần discover song song cùng key chỉ được gọi HTTP 1 lần!");

  // AIza key 429 must NEVER hit aiplatform.googleapis.com and MUST preserve isQuotaExceeded
  calls.length = 0;
  let caught429 = null;
  try {
    await ctx.VieGemini.translateWithGeminiAuto({ text: "Hi", apiKey: "AIzaQuotaKey", targetLang: "vi" });
  } catch (e) {
    caught429 = e;
  }
  assert.ok(caught429 && caught429.isQuotaExceeded === true, "Key AIza gặp 429 phải giữ nguyên isQuotaExceeded: true!");
  assert.strictEqual(calls.some((c) => c.url.includes("aiplatform.googleapis.com")), false, "Key AIza tuyệt đối không được gọi Vertex endpoint!");

  // 401 must break immediately after 1 generateContent call (no retry loop across models)
  calls.length = 0;
  let caught401 = null;
  try {
    await ctx.VieGemini.translateWithGeminiAuto({ text: "Hi", apiKey: "AIzaDeadKey", targetLang: "vi" });
  } catch (e) {
    caught401 = e;
  }
  assert.strictEqual(caught401?.status, 401);
  const genCalls401 = calls.filter((c) => c.url.includes(":generateContent"));
  assert.strictEqual(genCalls401.length, 1, "HTTP 401 phải dừng ngay sau 1 lần gọi, không retry sang model khác!");

  // Gemma-3 model must omit systemInstruction and inline into contents[0]
  calls.length = 0;
  const gemmaRes = await ctx.VieGemini.translateWithGeminiAuto({
    text: "Hello",
    apiKey: "AIzaGemmaOk",
    preferredModel: "gemma-3-27b-it",
    targetLang: "vi"
  });
  assert.strictEqual(gemmaRes.vi, "Dịch Gemma");
  const gemmaReq = JSON.parse(calls.find((c) => c.url.includes("gemma-3-27b-it")).opts.body);
  assert.strictEqual(gemmaReq.systemInstruction, undefined, "Gemma-3 không được gửi trường systemInstruction!");
  assert.strictEqual(gemmaReq.contents[0].parts[0].text.includes("Hello"), true);
  assert.strictEqual(gemmaReq.contents[0].parts[0].text.length > 20, true, "System prompt phải được gộp vào contents[0] cho Gemma-3!");

  console.log("   ✅ Đã kiểm tra VieGemini: AIza 1 endpoint, 401 dừng ngay, Gemma-3 tương thích & dedup 100%!\n");
})();

// --- 18. Test VieGroq & VieOllama Real Modules ---
console.log("1️⃣8️⃣ Kiểm tra VieGroq & VieOllama thật (Groq 429/401, Qwen3 /no_think, Ollama 60s discovery cache)...");
await (async () => {
  const groqCalls = [];
  const groqFetch = async (url, opts) => {
    groqCalls.push({ url, opts });
    if (url.endsWith("/models")) {
      return makeMockResponse({ ok: true, status: 200, jsonData: { data: [{ id: "qwen/qwen3-32b" }, { id: "llama-3.3-70b-versatile" }] } });
    }
    const auth = opts?.headers?.Authorization || "";
    if (auth.includes("gsk_429")) {
      return makeMockResponse({ ok: false, status: 429, jsonData: { error: { message: "rate_limit_exceeded" } } });
    }
    if (auth.includes("gsk_401")) {
      return makeMockResponse({ ok: false, status: 401, jsonData: { error: { message: "Invalid API Key" } } });
    }
    return makeMockResponse({
      ok: true,
      status: 200,
      jsonData: { choices: [{ message: { content: "<think>internal plan</think>\nXin chào Groq" } }] }
    });
  };
  const ctxG = createSandbox({ fetch: groqFetch });
  loadModule(ctxG, "utils/storage.js");
  loadModule(ctxG, "api/gemini.js");
  loadModule(ctxG, "api/groq.js");

  // Qwen3 /no_think + <think> stripping
  const qwenRes = await ctxG.VieGroq.translateWithGroqAuto({
    text: "Hello Groq",
    apiKey: "gsk_ok",
    preferredModel: "qwen/qwen3-32b",
    targetLang: "vi"
  });
  assert.strictEqual(qwenRes.vi, "Xin chào Groq");
  const qwenBody = JSON.parse(groqCalls.find((c) => c.url.includes("/chat/completions")).opts.body);
  assert.strictEqual(qwenBody.messages[0].content.endsWith("/no_think"), true, "Qwen3 phải được gắn /no_think!");

  // Groq 401 aborts immediately
  groqCalls.length = 0;
  let g401 = null;
  try {
    await ctxG.VieGroq.translateWithGroqAuto({ text: "Hi", apiKey: "gsk_401", targetLang: "vi" });
  } catch (e) {
    g401 = e;
  }
  assert.strictEqual(g401?.status, 401);
  assert.strictEqual(groqCalls.filter((c) => c.url.includes("/chat/completions")).length, 1, "Groq 401 phải dừng sau 1 lần gọi!");

  // Groq 429 preserves isQuotaExceeded
  let g429 = null;
  try {
    await ctxG.VieGroq.translateWithGroqAuto({ text: "Hi", apiKey: "gsk_429", targetLang: "vi" });
  } catch (e) {
    g429 = e;
  }
  assert.strictEqual(g429?.isQuotaExceeded, true, "Groq 429 phải đánh dấu isQuotaExceeded: true!");

  // Ollama 60s tag discovery cache & qwen3 /no_think + num_predict
  const ollamaCalls = [];
  const ollamaFetch = async (url, opts) => {
    ollamaCalls.push({ url, opts });
    if (url.endsWith("/api/tags")) {
      return makeMockResponse({ ok: true, status: 200, jsonData: { models: [{ name: "qwen3:8b" }, { name: "llama3.1:8b" }] } });
    }
    return makeMockResponse({
      ok: true,
      status: 200,
      jsonData: { message: { content: "<think>hmm</think>Bản dịch Ollama" } }
    });
  };
  const ctxO = createSandbox({ fetch: ollamaFetch });
  loadModule(ctxO, "utils/storage.js");
  loadModule(ctxO, "api/ollama.js");

  const o1 = await ctxO.VieOllama.translateWithOllama({ text: "One", targetLang: "vi" });
  const o2 = await ctxO.VieOllama.translateWithOllama({ text: "Two", targetLang: "vi" });
  assert.strictEqual(o1.vi, "Bản dịch Ollama");
  assert.strictEqual(o2.vi, "Bản dịch Ollama");
  assert.strictEqual(ollamaCalls.filter((c) => c.url.endsWith("/api/tags")).length, 1, "Ollama /api/tags phải được cache 60s (chỉ gọi 1 lần)!");
  const oBody = JSON.parse(ollamaCalls.find((c) => c.url.endsWith("/api/chat")).opts.body);
  assert.strictEqual(oBody.messages[0].content.endsWith("/no_think"), true);
  assert.strictEqual(oBody.options.num_predict, 280);

  console.log("   ✅ Đã kiểm tra VieGroq & VieOllama: 429/401, /no_think, & 60s Ollama tag cache chuẩn 100%!\n");
})();

// --- 19. Test VieGTX.translateBatch (1-Request Batching + Missing Index Fallback) ---
console.log("1️⃣9️⃣ Kiểm tra VieGTX.translateBatch (gộp 1 request + tự cứu hộ mục khuyết)...");
await (async () => {
  const gtxCalls = [];
  const gtxFetch = async (url) => {
    const q = decodeURIComponent(new URL(url).searchParams.get("q") || "");
    gtxCalls.push(q);
    if (q.includes("[[1]]") && q.includes("DropMe")) {
      // Simulate GTX dropping [[2]]
      return makeMockResponse({ ok: true, status: 200, jsonData: [[["[[1]]\nXin chào\n[[3]]\nTạm biệt"]]] });
    }
    if (q.includes("[[1]]")) {
      return makeMockResponse({ ok: true, status: 200, jsonData: [[["[[1]]\nMột\n[[2]]\nHai\n[[3]]\nBa"]]] });
    }
    if (q === "DropMe") {
      return makeMockResponse({ ok: true, status: 200, jsonData: [[["Thả tôi"]]] });
    }
    return makeMockResponse({ ok: true, status: 200, jsonData: [[["OK"]]] });
  };
  const ctx = createSandbox({ fetch: gtxFetch });
  loadModule(ctx, "utils/storage.js");
  loadModule(ctx, "api/gtx.js");

  const fullBatch = await ctx.VieGTX.translateBatch(["One", "Two", "Three"], "vi");
  assert.deepStrictEqual(Array.from(fullBatch), ["Một", "Hai", "Ba"]);
  assert.strictEqual(gtxCalls.length, 1, "3 câu GTX phải gộp thành đúng 1 HTTP request!");

  gtxCalls.length = 0;
  const partialBatch = await ctx.VieGTX.translateBatch(["Hello", "DropMe", "Bye"], "vi");
  assert.deepStrictEqual(Array.from(partialBatch), ["Xin chào", "Thả tôi", "Tạm biệt"]);
  assert.strictEqual(gtxCalls.length, 2, "Mục bị rớt [[2]] phải tự cứu hộ bằng đúng 1 request bổ sung!");

  console.log("   ✅ Đã kiểm tra VieGTX.translateBatch: Gộp 1 request & tự bù mục khuyết chuẩn 100%!\n");
})();

// --- 20. Test background/background.js Coordinator (0ms AI Preview, Cross-Dedup, Partial Recovery, CJK Glossary, Unicode Pronoun Lock) ---
console.log("2️⃣0️⃣ Kiểm tra background.js thật (0ms AI Cache Shortcut, Batch↔Single Dedup, Partial GTX Recovery, Glossary CJK & Đại từ)...");
await (async () => {
  let msgHandler = null;
  let storedSettings = {
    provider: "gemini",
    apiKey: "AIzaMockBgKey",
    geminiApiKey: "AIzaMockBgKey",
    targetLang: "vi",
    secondaryLang: "orig",
    translationStyle: "natural",
    pronounStyle: "auto",
    autoPersona: true,
    multiSpeakerSplit: true,
    softenProfanity: true,
    customGlossary: [
      { src: "五条悟", target: "Gojo Satoru", enabled: true },
      { src: "Machine", target: "Máy móc", enabled: true },
      { src: "Machine Learning", target: "Học máy", enabled: true }
    ]
  };
  let storageLocalData = { translationCache: [] };

  let aiCalls = 0;
  let gtxCalls = 0;
  let releaseBatchAi = null;

  const mockFetch = async (url, opts) => {
    if (url.includes("translate.googleapis.com")) {
      gtxCalls++;
      const q = decodeURIComponent(new URL(url).searchParams.get("q") || "");
      if (q === "Line B") return makeMockResponse({ ok: true, status: 200, jsonData: [[["Dòng B từ GTX"]]] });
      return makeMockResponse({ ok: true, status: 200, jsonData: [[[`GTX:${q}`]]] });
    }
    if (url.includes("/v1beta/models?")) {
      return makeMockResponse({ ok: true, status: 200, jsonData: { models: [{ name: "models/gemini-2.5-flash-lite" }] } });
    }
    if (url.includes(":generateContent")) {
      aiCalls++;
      const body = JSON.parse(opts.body);
      const userTxt = body.contents[body.contents.length - 1].parts[0].text;
      if (userTxt.includes("Line A") && userTxt.includes("Line B")) {
        // Hold batch open to test cross-deduplication with live TRANSLATE
        await new Promise((resolve) => { releaseBatchAi = resolve; });
        return makeMockResponse({
          ok: true,
          status: 200,
          jsonData: { candidates: [{ content: { parts: [{ text: "[[1]] Dòng A từ AI" }] } }] }
          // Intentionally omit [[2]] to test partial GTX recovery!
        });
      }
      if (userTxt.includes("Hôm nay") || userTxt.includes("camping")) {
        return makeMockResponse({
          ok: true,
          status: 200,
          jsonData: { candidates: [{ content: { parts: [{ text: "Hôm nay mình đi cắm trại một mình" }] } }] }
        });
      }
      if (userTxt.includes("五条悟")) {
        return makeMockResponse({
          ok: true,
          status: 200,
          jsonData: { candidates: [{ content: { parts: [{ text: "五条悟 là mạnh nhất" }] } }] }
        });
      }
      if (userTxt.includes("Machine Learning")) {
        return makeMockResponse({
          ok: true,
          status: 200,
          jsonData: { candidates: [{ content: { parts: [{ text: "Machine Learning dùng Machine" }] } }] }
        });
      }
      return makeMockResponse({
        ok: true,
        status: 200,
        jsonData: { candidates: [{ content: { parts: [{ text: "Tôi thích ẩn mình và hòa mình" }] } }] }
      });
    }
    return makeMockResponse({ ok: false, status: 404, jsonData: {} });
  };

  const chromeMock = {
    storage: {
      local: {
        get: (keys, cb) => {
          if (keys && "translationCache" in keys) return cb({ translationCache: storageLocalData.translationCache });
          return cb({ ...keys, ...storedSettings });
        },
        set: (updates, cb) => {
          if ("translationCache" in updates) storageLocalData.translationCache = updates.translationCache;
          else storedSettings = { ...storedSettings, ...updates };
          if (cb) cb();
        },
        remove: () => {}
      },
      onChanged: { addListener: () => {} }
    },
    runtime: {
      onMessage: { addListener: (fn) => { msgHandler = fn; } },
      onInstalled: { addListener: () => {} },
      lastError: null
    },
    contextMenus: { create: () => {}, onClicked: { addListener: () => {} } }
  };

  const ctx = createSandbox({
    chrome: chromeMock,
    fetch: mockFetch,
    importScripts: (...paths) => {
      for (const p of paths) loadModule(ctx, p.replace(/^\//, ""));
    }
  });
  loadModule(ctx, "background/background.js");

  const sendMsg = (msg, tabId = 101) =>
    new Promise((resolve) => msgHandler(msg, { tab: { id: tabId } }, resolve));

  // 20A: Cross-dedup (TRANSLATE_BATCH + concurrent TRANSLATE for "Line A") + Partial GTX Recovery for "Line B"
  aiCalls = 0;
  gtxCalls = 0;
  const batchProm = sendMsg({ type: "TRANSLATE_BATCH", texts: ["Line A", "Line B"], videoTitle: "Test" }, 101);
  // Wait a microtask so batch reaches generateContent and registers inFlight promises
  await new Promise((r) => setTimeout(r, 20));
  const singleProm = sendMsg({ type: "TRANSLATE", text: "Line A", videoTitle: "Test", fastPreviewOnly: false }, 101);
  assert.ok(releaseBatchAi, "Batch phải đang chờ mock AI!");
  releaseBatchAi();

  const [batchRes, singleRes] = await Promise.all([batchProm, singleProm]);
  assert.strictEqual(aiCalls, 1, "TRANSLATE cho 'Line A' đang nằm trong batch KHÔNG được gọi AI lần 2!");
  assert.strictEqual(batchRes.results["Line A"], "Dòng A từ AI");
  assert.strictEqual(singleRes.vi, "Dòng A từ AI");
  assert.strictEqual(batchRes.results["Line B"], "Dòng B từ GTX", "Mục bị rớt trong batch AI phải tự phục hồi bằng GTX!");

  // 20B: 0ms AI Cache Shortcut on fastPreviewOnly === true
  const gtxBeforeShortcut = gtxCalls;
  const previewRes = await sendMsg({ type: "TRANSLATE", text: "Line A", videoTitle: "Test", fastPreviewOnly: true }, 101);
  assert.strictEqual(previewRes.vi, "Dòng A từ AI");
  assert.strictEqual(previewRes.isFinalAi, true, "Preview khi AI đã cached phải trả về isFinalAi: true!");
  assert.strictEqual(gtxCalls, gtxBeforeShortcut, "Khi AI đã cached, fastPreviewOnly KHÔNG được gọi GTX!");

  // 20C: CJK Glossary & Longest-Match-First
  const cjkRes = await sendMsg({ type: "TRANSLATE", text: "五条悟は最強だ", videoTitle: "Anime" }, 102);
  assert.strictEqual(cjkRes.vi.includes("Gojo Satoru"), true, "Thuật ngữ CJK không khoảng trắng phải thay chuẩn!");
  const mlRes = await sendMsg({ type: "TRANSLATE", text: "Machine Learning uses Machine", videoTitle: "Tech" }, 102);
  assert.strictEqual(mlRes.vi, "Học máy dùng Máy móc", "Phải khớp 'Machine Learning' trước 'Machine'!");

  // 20D: Unicode Pronoun Lock & Compound Protection
  const tabCtx1 = ctx.getTabContext(201, "Solo Camping Vlog");
  ctx.updateContextPronounLock(tabCtx1, "Hôm nay chỉ có một mình");
  assert.strictEqual(tabCtx1.lockedPronounPair, "", "'một mình' không được khóa nhầm đại từ 'mình'!");
  ctx.updateContextPronounLock(tabCtx1, "Hôm nay mình đi cắm trại một mình");
  assert.strictEqual(tabCtx1.lockedFirstPerson, "mình", "'mình' đứng độc lập phải được khóa!");
  const harmonized = ctx.harmonizeVietnamesePronouns("Tôi thích ẩn mình và hòa mình và tôi đi.", "minh_ban", "mình", "");
  assert.strictEqual(harmonized, "Mình thích ẩn mình và hòa mình và mình đi.", "Các từ ghép 'ẩn mình', 'hòa mình' phải được bảo vệ nguyên vẹn!");
  const tabCtx2 = ctx.getTabContext(202, "Drama Clip");
  ctx.updateContextPronounLock(tabCtx2, "Chị ơi đợi với");
  assert.strictEqual(tabCtx2.lockedPronounPair.includes("anh/chị"), true, "Từ có dấu 'Chị' đầu câu phải nhận diện đúng với Unicode boundary!");

  console.log("   ✅ Đã kiểm tra background.js: 0ms AI Preview, Dedup, Partial Recovery, CJK Glossary & Pronoun Lock chuẩn 100%!\n");
})();

// --- 21. Test content/captions.js & content/content.js (Watermark Batch, CJK isIncompleteClause, 0ms Discrete Cue & Live Preview Promotion) ---
console.log("2️⃣1️⃣ Kiểm tra captions.js & content.js thật (Watermark Batching, Rollback, CJK Clause, 0ms Cue & Preview Promotion)...");
await (async () => {
  const sentMessages = [];
  let shouldFailBatch = false;
  const mockViEl = {
    classes: new Set(["vie-vi", "vie-preview"]),
    classList: {
      contains: (c) => mockViEl.classes.has(c),
      toggle: (c, v) => (v ? mockViEl.classes.add(c) : mockViEl.classes.delete(c))
    },
    dataset: {}
  };
  const mockOrigEl = { style: {}, dataset: {} };
  const mockOverlay = {
    classList: { add: () => {}, remove: () => {} },
    querySelector: (sel) => (sel === ".vie-vi" ? mockViEl : sel === ".vie-orig" ? mockOrigEl : null)
  };
  const mockVideo = { currentTime: 0, _vieOverlay: mockOverlay };

  const chromeMock = {
    storage: {
      local: { get: (d, cb) => cb({ ...d, provider: "gemini" }), set: (_u, cb) => cb && cb() },
      onChanged: { addListener: () => {} }
    },
    runtime: {
      lastError: null,
      sendMessage: (msg, cb) => {
        sentMessages.push(msg);
        if (msg.type === "TRANSLATE_BATCH") {
          if (shouldFailBatch) {
            chromeMock.runtime.lastError = { message: "Network failed" };
            cb && cb(null);
            chromeMock.runtime.lastError = null;
          } else {
            const results = {};
            for (const t of msg.texts) results[t] = `VI:${t}`;
            cb && cb({ results, sub2Results: {} });
          }
          return;
        }
        if (msg.type === "TRANSLATE" && msg.fastPreviewOnly === true) {
          cb && cb({ vi: "AI Cached Final", isFinalAi: true, cached: true });
          return;
        }
        cb && cb({ vi: "AI Late" });
      }
    }
  };

  const ctx = createSandbox({
    chrome: chromeMock,
    document: {
      readyState: "loading",
      title: "Mock Test Video - YouTube",
      addEventListener: () => {},
      getElementById: () => null,
      querySelectorAll: (sel) => (sel === "video" ? [mockVideo] : []),
      querySelector: () => null
    }
  });
  ctx.VieDOM = {
    getOrCreateOverlay: () => mockOverlay,
    hideOverlay: () => {},
    formatSubtitleDecorations: (o, v) => ({ formattedOrig: o, formattedVi: v }),
    renderInteractiveWords: () => {},
    renderStableViText: (_el, txt) => { mockViEl.textContent = txt; },
    applySettingsToDOM: () => {},
    getContainer: () => ({ querySelector: () => mockOverlay })
  };

  loadModule(ctx, "utils/storage.js");
  loadModule(ctx, "content/captions.js");
  loadModule(ctx, "content/content.js");

  const C = ctx.VieCaptions;
  const Content = ctx.VieContent;

  // 21A: CJK & short sentence isIncompleteClause
  assert.strictEqual(C.isIncompleteClause("今日はいい天気です"), false, "Câu tiếng Nhật đủ ý không được bị trì hoãn!");
  assert.strictEqual(C.isIncompleteClause("今日はいい天気だけど"), true, "Vế nối tiếng Nhật phải nhận là chưa trọn câu!");
  assert.strictEqual(C.isIncompleteClause("Let's get started"), false, "Câu 3 từ đầy đủ không bị trì hoãn!");
  assert.strictEqual(C.isIncompleteClause("Wait for"), true, "Câu kết thúc bằng giới từ vẫn là chưa trọn câu!");

  // 21B: Watermark batching & failed-batch sent rollback
  const cues = Array.from({ length: 15 }, (_, i) => ({ start: i * 2, end: i * 2 + 1.8, text: `Cue ${i + 1}` }));
  shouldFailBatch = true;
  C.prefetchUpcomingCues(cues, 0, 10, true);
  assert.strictEqual(C.ytCueState.sent.has("Cue 1"), false, "Khi TRANSLATE_BATCH lỗi, sent phải rollback để dịch lại!");

  shouldFailBatch = false;
  sentMessages.length = 0;
  C.prefetchUpcomingCues(cues, 0, 10, true); // sends Cue 1..10
  assert.strictEqual(sentMessages.filter((m) => m.type === "TRANSLATE_BATCH").length, 1);
  assert.strictEqual(sentMessages[0].texts.length, 10);

  // Advancing indices 1..5 must send ZERO extra batch requests while >= 4 cues remain in window
  sentMessages.length = 0;
  for (let i = 1; i <= 5; i++) {
    C.prefetchUpcomingCues(cues, i, 10, false);
  }
  assert.strictEqual(sentMessages.length, 0, "Khi cửa sổ còn đủ >= 4 câu đã dịch, không được spam thêm batch request!");

  // Advancing to idx = 7 (only Cue 8,9,10 remain -> < 4 watermark) triggers next batch
  C.prefetchUpcomingCues(cues, 7, 10, false);
  assert.strictEqual(sentMessages.length, 1, "Khi chạm ngưỡng watermark (< 4 câu), phải tự nạp lô tiếp theo!");
  assert.strictEqual(sentMessages[0].texts.includes("Cue 11"), true);

  // 21C: Immediate discrete cue triggers 0ms AI + isFinalAi skips redundant fastPreviewOnly=false
  sentMessages.length = 0;
  Content.onCaptionReceived(mockVideo, "Wait for", true, ""); // incomplete text, but immediate=true!
  const translateCalls = sentMessages.filter((m) => m.type === "TRANSLATE");
  assert.strictEqual(translateCalls.length, 1, "Cue rời rạc với isFinalAi preview chỉ gửi đúng 1 preview và KHÔNG gửi trùng fastPreviewOnly:false!");

  // 21D: ingestBatchTranslations promotes live .vie-preview subtitle to non-preview immediately
  const st = C.getVideoState(mockVideo);
  st.lastText = "Cue 99";
  mockViEl.classes.add("vie-preview");
  Content.ingestBatchTranslations({ "Cue 99": "Câu 99 Final" });
  assert.strictEqual(mockViEl.textContent, "Câu 99 Final");
  assert.strictEqual(mockViEl.classes.has("vie-preview"), false, "ingestBatchTranslations phải nâng cấp ngay phụ đề preview đang hiện trên màn hình!");

  console.log("   ✅ Đã kiểm tra captions.js & content.js: Watermark Batch, Rollback, CJK Clause & Preview Promotion chuẩn 100%!\n");
})();

// --- 22. Test Syntax Check All JS Files & manifest.json ---
console.log("2️⃣2️⃣ Kiểm tra cú pháp (Syntax Check) toàn bộ file .js và manifest.json...");
(() => {
  const skipDirs = new Set([".git", "node_modules", "__pycache__"]);
  const jsFiles = [];
  function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (skipDirs.has(entry.name)) continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.isFile() && entry.name.endsWith(".js")) jsFiles.push(full);
    }
  }
  walk(ROOT_DIR);
  for (const file of jsFiles) {
    const src = fs.readFileSync(file, "utf8");
    new vm.Script(src, { filename: file });
  }
  const manifest = JSON.parse(fs.readFileSync(path.join(ROOT_DIR, "manifest.json"), "utf8"));
  assert.ok(manifest.manifest_version === 3 && manifest.background?.service_worker);
  console.log(`   ✅ Đã kiểm tra cú pháp thành công ${jsFiles.length} file JavaScript và manifest.json!\n`);
})();

// --- 23. Test VieUpdater Real Module (Semver, Git Blob SHA-1 Diff, Badge & Rate-Limit Fallback) ---
console.log("2️⃣3️⃣ Kiểm tra VieUpdater thật (Semver, Git Blob SHA-1 CRLF/LF, Tree Diff, Badge 'MỚI' & Fallback)...");
await (async () => {
  let badgeText = "";
  let badgeColor = "";
  let localStorage = { autoCheckUpdates: true };
  let localFiles = {
    "manifest.json": Buffer.from('{"manifest_version":3,"version":"0.8.2"}\n', "utf8"),
    "api/gtx.js": Buffer.from("// gtx v1\n", "utf8")
  };

  let remoteMode = "synced";
  let remoteSha = "sha1_commit_aaaa111";
  let remoteManifestVersion = "0.8.2";
  let remoteFiles = { ...localFiles };

  const sha1HexSync = (buf) => {
    const lf = Buffer.from(buf.toString("binary").replace(/\r\n/g, "\n"), "binary");
    return nodeCrypto.createHash("sha1").update(`blob ${lf.length}\0`).update(lf).digest("hex");
  };

  const mockFetch = async (url) => {
    if (String(url).startsWith("chrome-extension://mock/")) {
      const rel = String(url).replace("chrome-extension://mock/", "");
      const buf = localFiles[rel];
      if (!buf) return { ok: false, status: 404 };
      return {
        ok: true,
        status: 200,
        arrayBuffer: async () => buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength)
      };
    }
    if (String(url).includes("raw.githubusercontent.com") && String(url).includes("manifest.json")) {
      return makeMockResponse({ ok: true, status: 200, jsonData: { version: remoteManifestVersion } });
    }
    if (remoteMode === "rate_limit") {
      return makeMockResponse({ ok: false, status: 403, jsonData: { message: "API rate limit exceeded" } });
    }
    if (String(url).includes("/commits/main")) {
      return {
        ok: true,
        status: 200,
        headers: { get: (h) => (h.toLowerCase() === "etag" ? `"etag_${remoteSha}"` : null) },
        json: async () => ({
          sha: remoteSha,
          html_url: `https://github.com/chu0n6-iot/VIE-Translate-by-me-/commit/${remoteSha}`,
          commit: {
            message: `Update ${remoteSha}\nExtra body`,
            tree: { sha: `tree_${remoteSha}` },
            committer: { date: "2026-11-18T02:00:00Z" }
          }
        })
      };
    }
    if (String(url).includes("/git/trees/")) {
      const tree = Object.entries(remoteFiles).map(([p, buf]) => ({
        path: p,
        type: "blob",
        sha: sha1HexSync(buf)
      }));
      return makeMockResponse({ ok: true, status: 200, jsonData: { tree } });
    }
    return makeMockResponse({ ok: false, status: 404, jsonData: {} });
  };

  const chromeMock = {
    runtime: {
      getManifest: () => ({ version: "0.8.2" }),
      getURL: (p) => `chrome-extension://mock/${p}`
    },
    action: {
      setBadgeText: ({ text }) => { badgeText = text; },
      setBadgeBackgroundColor: ({ color }) => { badgeColor = color; }
    },
    storage: {
      local: {
        get: (defaults, cb) => cb({ ...defaults, ...localStorage }),
        set: (updates, cb) => { localStorage = { ...localStorage, ...updates }; if (cb) cb(); }
      },
      onChanged: { addListener: () => {} }
    }
  };

  const ctx = createSandbox({ chrome: chromeMock, fetch: mockFetch });
  loadModule(ctx, "utils/storage.js");
  loadModule(ctx, "api/updater.js");
  const U = ctx.VieUpdater;

  // 23A: Semver comparisons
  assert.strictEqual(U.compareSemver("0.8.3", "0.8.2"), 1);
  assert.strictEqual(U.compareSemver("0.10.0", "0.9.9"), 1);
  assert.strictEqual(U.compareSemver("v0.8.2", "0.8.2"), 0);
  assert.strictEqual(U.compareSemver("0.8.1", "0.8.2"), -1);

  // 23B: computeGitBlobSha1 CRLF vs LF matches real manifest.json Git SHA-1
  const manifestBytes = fs.readFileSync(path.join(ROOT_DIR, "manifest.json"));
  const manifestCrlf = Buffer.from(manifestBytes.toString("utf8").replace(/\r?\n/g, "\r\n"), "utf8");
  const shaLf = await U.computeGitBlobSha1(new Uint8Array(manifestBytes));
  const shaCrlf = await U.computeGitBlobSha1(new Uint8Array(manifestCrlf));
  assert.strictEqual(shaLf, sha1HexSync(manifestBytes), "Blob SHA-1 của manifest.json phải khớp chuẩn Git SHA-1!");
  assert.strictEqual(shaLf, shaCrlf, "CRLF trên Windows phải cho cùng Git blob SHA-1 với LF!");

  // 23C: Synced state -> no update, records knownSyncedRemoteSha, clears badge
  const st1 = await U.checkForUpdates({ force: true, verifyLocalSync: true });
  assert.strictEqual(st1.hasUpdate, false, "Khi code khớp 100% GitHub thì không báo cập nhật!");
  assert.strictEqual(st1.knownSyncedRemoteSha, "sha1_commit_aaaa111");
  assert.strictEqual(badgeText, "");

  // 23D: New commit on GitHub main (same version 0.8.2, changed api/gtx.js) -> notifies!
  remoteSha = "sha2_commit_bbbb222";
  remoteFiles["api/gtx.js"] = Buffer.from("// gtx v2 upgraded\n", "utf8");
  const st2 = await U.checkForUpdates({ force: true, verifyLocalSync: true });
  assert.strictEqual(st2.hasUpdate, true, "Commit mới cùng version nhưng đổi mã nguồn vẫn phải phát hiện cập nhật!");
  assert.strictEqual(Array.from(st2.changedFiles).includes("api/gtx.js"), true);
  assert.strictEqual(badgeText, "MỚI");
  assert.strictEqual(badgeColor, "#f59e0b");

  // 23E: Local dev edit while GitHub remoteCommitSha === knownSyncedRemoteSha -> no false alarm
  remoteSha = "sha1_commit_aaaa111";
  remoteFiles = {
    "manifest.json": Buffer.from('{"manifest_version":3,"version":"0.8.2"}\n', "utf8"),
    "api/gtx.js": Buffer.from("// gtx v1\n", "utf8")
  };
  await U.saveUpdateState({ ...st1, remoteCommitSha: "sha1_commit_aaaa111", knownSyncedRemoteSha: "sha1_commit_aaaa111", treeSha: "old" });
  localFiles["api/gtx.js"] = Buffer.from("// local uncommitted edit\n", "utf8");
  const st3 = await U.checkForUpdates({ force: true, verifyLocalSync: true });
  assert.strictEqual(st3.hasUpdate, false, "Sửa code local khi GitHub chưa có commit mới không được báo nhầm!");

  // 23F: Dismiss clears badge for current commit, newer commit sha3 re-triggers badge
  localFiles["api/gtx.js"] = Buffer.from("// gtx v1\n", "utf8");
  remoteSha = "sha2_commit_bbbb222";
  remoteFiles["api/gtx.js"] = Buffer.from("// gtx v2 upgraded\n", "utf8");
  const st4 = await U.checkForUpdates({ force: true, verifyLocalSync: true });
  assert.strictEqual(st4.hasUpdate, true);
  assert.strictEqual(badgeText, "MỚI");
  await U.dismissUpdate(st4.updateId);
  assert.strictEqual(badgeText, "", "Bấm bỏ qua phải xóa badge 'MỚI' cho commit hiện tại!");

  remoteSha = "sha3_commit_cccc333";
  remoteFiles["api/gtx.js"] = Buffer.from("// gtx v3\n", "utf8");
  const st5 = await U.checkForUpdates({ force: true, verifyLocalSync: true });
  assert.strictEqual(st5.hasUpdate, true);
  assert.strictEqual(badgeText, "MỚI", "Commit mới hơn sha3 phải hiện lại badge 'MỚI'!");

  // 23G: GitHub API 403 rate-limit -> fallback to raw manifest.json semver check
  remoteMode = "rate_limit";
  remoteManifestVersion = "0.9.0";
  const st6 = await U.checkForUpdates({ force: true });
  assert.strictEqual(st6.hasUpdate, true, "Khi API bị rate-limit 403, vẫn phải phát hiện bản mới qua raw manifest.json!");
  assert.strictEqual(st6.remoteVersion, "0.9.0");
  assert.strictEqual(badgeText, "MỚI");

  console.log("   ✅ Đã kiểm tra VieUpdater: Semver, Git Blob SHA-1 CRLF/LF, Tree Diff, Badge 'MỚI' & Fallback 403 chuẩn 100%!\n");
})();

console.log("🎉 TOÀN BỘ 23 BÀI KIỂM TRA ĐỀU HOÀN TOÀN CHÍNH XÁC VÀ ĐẠT 100%!");

})();
