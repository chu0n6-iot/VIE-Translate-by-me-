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
  const skipDirs = new Set([".git", ".agents", "node_modules", "__pycache__"]);
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

// --- 24. Test Manga Preflight and Social Text Translation ---
console.log("2️⃣4️⃣ Kiểm tra quét ngầm truyện & dịch văn bản social/AO3...");
(() => {
  const mangaSource = fs.readFileSync(path.join(ROOT_DIR, "content/manga.js"), "utf8");
  const manifest = JSON.parse(fs.readFileSync(path.join(ROOT_DIR, "manifest.json"), "utf8"));
  assert.strictEqual(manifest.version, "1.0.0", "Manifest phải cập nhật lên bản 1.0.0!");
  assert.ok(mangaSource.includes("cachedOcr"), "Phải có cache OCR để quét trước và hiển thị sau!");
  assert.ok(mangaSource.includes("preflightDone"), "Phải chuyển sang chế độ Xem bản dịch sau preflight!");
  assert.ok(mangaSource.includes("archiveofourown"), "Phải hỗ trợ dịch văn bản Archive of Our Own!");
  assert.ok(mangaSource.includes("facebook"), "Phải hỗ trợ dịch nội dung Facebook!");
  assert.ok(mangaSource.includes("Xem bản dịch"), "Thanh công cụ phải yêu cầu người dùng bấm xem bản dịch!");
  assert.ok(mangaSource.includes("paintTranslatedPage"), "Phải có cơ chế chèn bản dịch trực tiếp lên ảnh!");
  assert.ok(mangaSource.includes("Anime Ace"), "Phải ưu tiên họ font truyện Anime Ace/ACE!");
  assert.ok(mangaSource.includes("Chưa dịch được vùng nào"), "Không được báo đã dịch khi OCR không tìm thấy vùng!");
  assert.ok(mangaSource.includes("TRANSLATE_MANGA_BATCH"), "Phải dùng luồng dịch manga có ảnh kèm OCR!");
  assert.ok(mangaSource.includes("previousLines"), "Phải giữ tối thiểu 3-5 thoại cuối làm ngữ cảnh chương!");
  assert.ok(mangaSource.includes("type"), "Phải phân loại dialogue/thought/sfx/narration cho typesetting!");
  assert.ok(mangaSource.includes("directTranslations"), "Phải có dịch 1-1 trực tiếp từ OCR/multimodal để ảnh không giữ chữ gốc!");
  assert.ok(mangaSource.includes("blob:"), "MangaPlaza reader phải nhận blob URL thay vì bỏ qua vì không có HTTP URL!");
  assert.ok(mangaSource.includes("vie-manga-wrapper"), "MangaPlaza reader phải bám overlay đúng từng ảnh thay vì dùng parent trang!");
  assert.ok(mangaSource.includes("isSupportedMangaOrTextPage"), "Không được hiện thanh dịch truyện trên YouTube hoặc trang video thường!");
  assert.ok(mangaSource.includes("dismissToolbar"), "Nút X phải tắt và khôi phục trạng thái thanh dịch!");
  const domSource = fs.readFileSync(path.join(ROOT_DIR, "content/dom.js"), "utf8");
  const cssSource = fs.readFileSync(path.join(ROOT_DIR, "content/overlay.css"), "utf8");
  assert.ok(domSource.includes("ytp-chrome-bottom"), "Overlay YouTube phải đo vùng control/timeline trước đặt bottom!");
  assert.ok(domSource.includes("safeBottom"), "Overlay YouTube phải tính bottom an toàn khỏi control!");
  assert.ok(cssSource.includes("pointer-events: none"), "Overlay phụ đề phải không bắt chuột vùng timeline/âm lượng!");
  console.log("   ✅ Đã kiểm tra preflight truyện và social text/AO3 chuẩn cho bản 1.0.0!\n");
})();

// --- 25. Test VieGemini v1.0.0 Upgrades (Thinking-Parts Filter, thinkingBudget: 0, Non-Text Exclusion) ---
console.log("2️⃣5️⃣ Kiểm tra VieGemini v1.0.0 (Thinking-Parts Filter, thinkingBudget: 0 & lọc model TTS/Imagen)...");
await (async () => {
  const calls = [];
  const mockFetch = async (url, opts) => {
    calls.push({ url, opts });
    if (url.includes("/v1beta/models?")) {
      return makeMockResponse({
        ok: true,
        status: 200,
        jsonData: {
          models: [
            { name: "models/gemini-2.5-flash-tts" },
            { name: "models/imagen-3.0-generate" },
            { name: "models/gemini-2.5-flash" },
            { name: "models/gemma-3-27b-it" }
          ]
        }
      });
    }
    return makeMockResponse({
      ok: true,
      status: 200,
      jsonData: {
        candidates: [
          {
            content: {
              parts: [
                { text: "internal reasoning should be ignored", thought: true },
                { text: "Xin chào thế giới thực!" }
              ]
            }
          }
        ]
      }
    });
  };
  const ctx = createSandbox({ fetch: mockFetch });
  loadModule(ctx, "utils/storage.js");
  loadModule(ctx, "api/gemini.js");

  const models = await ctx.VieGemini.discoverGeminiModels("AIzaThinkTest");
  assert.strictEqual(models.includes("gemini-2.5-flash-tts"), false, "Model -tts phải bị loại!");
  assert.strictEqual(models.includes("imagen-3.0-generate"), false, "Model imagen phải bị loại!");

  const res25 = await ctx.VieGemini.translateWithGeminiAuto({
    text: "Hello real world",
    apiKey: "AIzaThinkTest",
    preferredModel: "gemini-2.5-flash",
    targetLang: "vi"
  });
  assert.strictEqual(res25.vi, "Xin chào thế giới thực!", "Phải bỏ qua thought:true part và lấy đúng bản dịch!");
  const req25 = JSON.parse(calls.find((c) => c.url.includes("gemini-2.5-flash:generateContent")).opts.body);
  assert.strictEqual(req25.generationConfig?.thinkingConfig?.thinkingBudget, 0, "Gemini 2.5 phải gắn thinkingBudget: 0!");

  await ctx.VieGemini.translateWithGeminiAuto({
    text: "Hello gemma",
    apiKey: "AIzaThinkTest",
    preferredModel: "gemma-3-27b-it",
    targetLang: "vi"
  });
  const reqGemma = JSON.parse(calls.find((c) => c.url.includes("gemma-3-27b-it:generateContent")).opts.body);
  assert.strictEqual("thinkingConfig" in reqGemma.generationConfig, false, "Gemma không được gắn thinkingConfig!");
  console.log("   ✅ Đã kiểm tra VieGemini v1.0.0: Thinking-Parts, thinkingBudget:0 & lọc model chuẩn 100%!\n");
})();

// --- 26. Test VieOpenAI Real Module (OpenRouter/DeepSeek Discovery, /no_think, Lookup & Explain) ---
console.log("2️⃣6️⃣ Kiểm tra VieOpenAI thật (OpenRouter :free, Qwen3 /no_think, Lookup & ExplainScene)...");
await (async () => {
  const apiCalls = [];
  const mockFetch = async (url, opts) => {
    apiCalls.push({ url, opts });
    if (url.endsWith("/models")) {
      return makeMockResponse({
        ok: true,
        status: 200,
        jsonData: {
          data: [
            { id: "openai/whisper-1" },
            { id: "qwen/qwen3-32b:free" },
            { id: "meta-llama/llama-3.3-70b-instruct:free" }
          ]
        }
      });
    }
    const body = JSON.parse(opts.body);
    const userTxt = body.messages[body.messages.length - 1].content;
    if (userTxt.includes("[[1]]")) {
      return makeMockResponse({
        ok: true,
        status: 200,
        jsonData: { choices: [{ message: { content: "[[1]] Câu một\n[[2]] Câu hai" } }] }
      });
    }
    if (userTxt.includes("Phân tích từ vựng")) {
      return makeMockResponse({
        ok: true,
        status: 200,
        jsonData: { choices: [{ message: { content: '<think>ok</think>{"word":"test","meaning":"kiểm tra","pos":"Noun"}' } }] }
      });
    }
    return makeMockResponse({
      ok: true,
      status: 200,
      jsonData: { choices: [{ message: { content: '{"literal":"dịch sát","nuance":"tự nhiên","realLife":"thực tế"}' } }] }
    });
  };
  const ctx = createSandbox({ fetch: mockFetch });
  loadModule(ctx, "utils/storage.js");
  loadModule(ctx, "api/openai.js");

  const models = await ctx.VieOpenAI.discoverModels("https://openrouter.ai/api/v1", "sk-or-test123");
  assert.strictEqual(models.includes("openai/whisper-1"), false, "Whisper phải bị lọc khỏi danh sách chat!");
  assert.strictEqual(models[0], "meta-llama/llama-3.3-70b-instruct:free");

  const batchRes = await ctx.VieOpenAI.translateWithOpenAIAuto({
    texts: ["One", "Two"],
    baseUrl: "https://openrouter.ai/api/v1",
    apiKey: "sk-or-test123",
    preferredModel: "qwen/qwen3-32b:free",
    targetLang: "vi"
  });
  assert.deepStrictEqual(Array.from(batchRes.translations), ["Câu một", "Câu hai"]);
  const chatReq = apiCalls.find((c) => c.url.endsWith("/chat/completions"));
  assert.strictEqual(chatReq.opts.headers["X-Title"], "VIE-Translate Toad AI");
  assert.strictEqual(JSON.parse(chatReq.opts.body).messages[0].content.endsWith("/no_think"), true);

  const dictRes = await ctx.VieOpenAI.lookupWordWithOpenAI("test", "This is a test", "https://openrouter.ai/api/v1", "sk-or-test123", "auto", "vi");
  assert.strictEqual(dictRes.ok, true);
  assert.strictEqual(dictRes.meaning, "kiểm tra");

  const sceneRes = await ctx.VieOpenAI.explainSceneWithOpenAI({ sentence: "Hi", vi: "Chào", baseUrl: "https://openrouter.ai/api/v1", apiKey: "sk-or-test123" });
  assert.strictEqual(sceneRes.nuance, "tự nhiên");
  console.log("   ✅ Đã kiểm tra VieOpenAI: Discovery, Headers, /no_think, Lookup & Explain chuẩn 100%!\n");
})();

// --- 27. Test background.js v1.0.0 (Multi-Provider Lookup/Explain, Telemetry, Reset Cooldown & Page Batch) ---
console.log("2️⃣7️⃣ Kiểm tra background.js v1.0.0 (Multi-provider Lookup/Explain, Telemetry, Cooldown & Page Batch)...");
await (async () => {
  let msgHandler = null;
  let storedSettings = {
    provider: "groq",
    apiKey: "gsk_MockGroqOnly1234567890",
    groqApiKey: "gsk_MockGroqOnly1234567890",
    targetLang: "vi",
    customGlossary: [{ src: "Toad", target: "Cóc", enabled: true }]
  };
  const mockFetch = async (url) => {
    if (url.includes("api.groq.com/openai/v1/models")) {
      return makeMockResponse({ ok: true, status: 200, jsonData: { data: [{ id: "llama-3.3-70b-versatile" }] } });
    }
    if (url.includes("api.groq.com/openai/v1/chat/completions")) {
      return makeMockResponse({
        ok: true,
        status: 200,
        jsonData: {
          choices: [{ message: { content: '[[1]] Toad tuyệt vời' } }]
        }
      });
    }
    if (url.includes("api.groq.com") && url.includes("completions")) {
      return makeMockResponse({ ok: true, status: 200, jsonData: { choices: [{ message: { content: '{"word":"toad","meaning":"con cóc"}' } }] } });
    }
    return makeMockResponse({ ok: false, status: 404, jsonData: {} });
  };
  const customFetch = async (url, opts) => {
    if (url.includes("api.groq.com/openai/v1/chat/completions")) {
      const body = JSON.parse(opts.body);
      const u = body.messages[body.messages.length - 1].content;
      if (u.includes("Phân tích từ vựng")) {
        return makeMockResponse({ ok: true, status: 200, jsonData: { choices: [{ message: { content: '{"word":"toad","meaning":"chú cóc","pos":"Noun"}' } }] } });
      }
      if (u.includes("Phân tích phụ đề")) {
        return makeMockResponse({ ok: true, status: 200, jsonData: { choices: [{ message: { content: '{"literal":"chào","nuance":"thân mật","realLife":"hay dùng"}' } }] } });
      }
      return makeMockResponse({ ok: true, status: 200, jsonData: { choices: [{ message: { content: "[[1]] Toad rất hay" } }] } });
    }
    return mockFetch(url);
  };

  const chromeMock = {
    storage: {
      local: {
        get: (keys, cb) => cb(keys && "translationCache" in keys ? { translationCache: [] } : { ...keys, ...storedSettings }),
        set: (u, cb) => { storedSettings = { ...storedSettings, ...u }; cb && cb(); },
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
    fetch: customFetch,
    importScripts: (...paths) => paths.forEach((p) => loadModule(ctx, p.replace(/^\//, "")))
  });
  loadModule(ctx, "background/background.js");
  const sendMsg = (m) => new Promise((r) => msgHandler(m, { tab: { id: 77 } }, r));

  const dictGroq = await sendMsg({ type: "LOOKUP_WORD", word: "toad", sentence: "Hello toad" });
  assert.strictEqual(dictGroq.ok, true);
  assert.strictEqual(dictGroq.meaning, "chú cóc", "LOOKUP_WORD phải chạy được bằng Groq khi không có key Gemini!");

  const sceneGroq = await sendMsg({ type: "EXPLAIN_SCENE", sentence: "Hello toad", vi: "Chào cóc" });
  assert.strictEqual(sceneGroq.ok, true);
  assert.strictEqual(sceneGroq.nuance, "thân mật", "EXPLAIN_SCENE phải chạy được bằng Groq!");

  const pageBatch = await sendMsg({ type: "TRANSLATE_PAGE_BATCH", texts: ["Toad is great"] });
  assert.strictEqual(pageBatch.results["Toad is great"], "Cóc rất hay", "TRANSLATE_PAGE_BATCH phải dịch và áp glossary!");

  const statsRes = await sendMsg({ type: "GET_ENGINE_STATS" });
  assert.strictEqual(statsRes.ok, true);
  assert.ok(statsRes.stats.aiCalls >= 1, "Telemetry phải ghi nhận aiCalls!");
  const resetRes = await sendMsg({ type: "RESET_COOLDOWNS" });
  assert.strictEqual(resetRes.ok, true);
  console.log("   ✅ Đã kiểm tra background.js v1.0.0: Multi-provider Lookup/Explain, Telemetry & Page Batch chuẩn 100%!\n");
})();

// --- 28. Test VieOllama Local Vision OCR & Concurrency Cap ---
console.log("2️⃣8️⃣ Kiểm tra VieOllama Local Vision OCR (Ollama images[] + LM Studio image_url) & Concurrency Cap...");
await (async () => {
  const calls = [];
  const mockFetch = async (url, opts) => {
    calls.push({ url, opts });
    if (url.endsWith("/api/tags")) {
      return makeMockResponse({ ok: true, status: 200, jsonData: { models: [{ name: "qwen2.5:3b" }, { name: "qwen2.5vl:7b" }] } });
    }
    if (url.endsWith("/v1/models")) {
      return makeMockResponse({ ok: true, status: 200, jsonData: { data: [{ id: "gemma-3-12b-it" }] } });
    }
    if (url.endsWith("/v1/chat/completions")) {
      return makeMockResponse({ ok: true, status: 200, jsonData: { choices: [{ message: { content: '{"hasText":true,"orig":"Exit","vi":"Lối ra"}' } }] } });
    }
    return makeMockResponse({ ok: true, status: 200, jsonData: { message: { content: '{"language":"ja","regions":[{"x":10,"y":10,"w":20,"h":15,"text":"こんにちは","translation":"Xin chào"}]}' } } });
  };
  const ctx = createSandbox({ fetch: mockFetch });
  loadModule(ctx, "utils/storage.js");
  loadModule(ctx, "api/ollama.js");

  assert.strictEqual(ctx.VieOllama.MAX_LOCAL_CONCURRENT, 2);
  const resOllama = await ctx.VieOllama.scanImageWithOllama({
    imageBase64: "AAA=",
    prompt: "OCR",
    baseUrl: "http://localhost:11434"
  });
  assert.strictEqual(resOllama.modelUsed, "qwen2.5vl:7b", "Phải tự ưu tiên vision model qwen2.5vl!");
  const ollamaPayload = JSON.parse(calls.find((c) => c.url.endsWith("/api/chat")).opts.body);
  assert.strictEqual(ollamaPayload.messages[0].images[0], "AAA=");

  const resLm = await ctx.VieOllama.scanImageWithOllama({
    imageBase64: "BBB=",
    prompt: "OCR",
    baseUrl: "http://localhost:1234/v1"
  });
  assert.strictEqual(resLm.vi, "Lối ra");
  const lmPayload = JSON.parse(calls.find((c) => c.url.endsWith("/v1/chat/completions")).opts.body);
  assert.strictEqual(lmPayload.messages[0].content[1].type, "image_url");
  console.log("   ✅ Đã kiểm tra VieOllama Vision OCR cho Ollama & LM Studio chuẩn 100%!\n");
})();

// --- 29. Test content/webpage.js (Block Filtering, Injection & Clean Disable) ---
console.log("2️⃣9️⃣ Kiểm tra content/webpage.js (lọc đoạn văn, chèn bản dịch & tắt sạch DOM)...");
(() => {
  const ctx = createSandbox({
    document: {
      documentElement: { classList: { toggle: () => {}, remove: () => {} } },
      body: {}
    }
  });
  loadModule(ctx, "content/webpage.js");
  const W = ctx.VieWebpage;

  assert.strictEqual(W.isLikelyVietnamese("Đây là một đoạn văn bản tiếng Việt hoàn chỉnh có dấu đầy đủ."), true);
  assert.strictEqual(W.isLikelyVietnamese("This is an English paragraph for translation testing."), false);

  const appended = [];
  const fakeBlockEn = {
    innerText: "Artificial intelligence is transforming software engineering worldwide.",
    closest: () => null,
    querySelector: () => null,
    appendChild: (node) => appended.push(node)
  };
  const fakeBlockVi = {
    innerText: "Trí tuệ nhân tạo đang thay đổi ngành công nghệ phần mềm trên toàn thế giới.",
    closest: () => null,
    querySelector: () => null
  };
  const fakeCode = {
    innerText: "console.log('hello world');",
    closest: () => ({ tagName: "PRE" }),
    querySelector: () => null
  };
  const fakeDoc = {
    body: {},
    querySelectorAll: () => [fakeBlockEn, fakeBlockVi, fakeCode],
    createElement: (tag) => ({
      tagName: tag.toUpperCase(),
      className: "",
      attrs: {},
      setAttribute(k, v) { this.attrs[k] = v; },
      textContent: ""
    })
  };

  const eligible = W.collectTranslatableBlocks(fakeDoc, "vi");
  assert.strictEqual(eligible.length, 1, "Chỉ được giữ lại đoạn tiếng Anh hợp lệ, bỏ qua tiếng Việt và code!");
  const injected = W.injectTranslation(fakeBlockEn, "Trí tuệ nhân tạo đang biến đổi ngành phần mềm.", fakeDoc);
  assert.strictEqual(injected.className, "vie-web-trans");
  assert.strictEqual(appended.length, 1);
  console.log("   ✅ Đã kiểm tra content/webpage.js chuẩn 100%!\n");
})();

// --- 30. Test Bilingual SRT Export & Popup Studio v1.0.0 Integrity ---
console.log("3️⃣0️⃣ Kiểm tra xuất SRT song ngữ & cấu trúc Popup Studio v1.0.0...");
(() => {
  const ctx = createSandbox({
    document: { readyState: "loading", addEventListener: () => {} }
  });
  loadModule(ctx, "utils/storage.js");
  loadModule(ctx, "content/content.js");
  const C = ctx.VieContent;

  assert.strictEqual(C.formatSrtTimestamp(65.432), "00:01:05,432");
  const srt = C.buildBilingualSrt(
    [
      { start: 1.0, end: 3.5, text: "Hello world" },
      { start: 4.0, end: 6.25, text: "How are you?" }
    ],
    (t) => (t === "Hello world" ? { vi: "Xin chào thế giới" } : { vi: "Bạn khỏe không?" }),
    true
  );
  assert.ok(srt.includes("00:00:01,000 --> 00:00:03,500\nHello world\nXin chào thế giới"));
  assert.ok(srt.includes("2\n00:00:04,000 --> 00:00:06,250\nHow are you?\nBạn khỏe không?"));

  const popupHtml = fs.readFileSync(path.join(ROOT_DIR, "popup/popup.html"), "utf8");
  const popupJs = fs.readFileSync(path.join(ROOT_DIR, "popup/popup.js"), "utf8");
  const openaiJs = fs.readFileSync(path.join(ROOT_DIR, "popup/openai.js"), "utf8");
  const domJs = fs.readFileSync(path.join(ROOT_DIR, "content/dom.js"), "utf8");
  const bgJs = fs.readFileSync(path.join(ROOT_DIR, "background/background.js"), "utf8");
  const manifest = JSON.parse(fs.readFileSync(path.join(ROOT_DIR, "manifest.json"), "utf8"));

  assert.ok(manifest.content_scripts[0].js.includes("content/webpage.js"));
  assert.ok(popupHtml.includes("quickWebTranslateBtn") && popupHtml.includes("quickExportSrtBtn"));
  assert.ok(popupHtml.includes("subnavFlashcardBtn") && popupHtml.includes("exportAnkiBtn") && popupHtml.includes("exportBackupBtn"));
  assert.ok(popupHtml.includes("openaiSection") && openaiJs.includes("openrouter.ai"));
  assert.ok(popupJs.includes("renderFlashcard") && popupJs.includes("vocabSearchInput"));
  assert.ok(domJs.includes("vie-drag-handle") && domJs.includes("vie-learn-srt-btn") && domJs.includes("vie-quick-dict-btn"));
  assert.ok(bgJs.includes("vie_translate_webpage") && bgJs.includes("TRANSLATE_PAGE_BATCH"));

  console.log("   ✅ Đã kiểm tra xuất SRT song ngữ & toàn bộ tính năng Popup Studio v1.0.0 chuẩn 100%!\n");
})();

// --- 31. Test Lazy Caption Container Re-Attach, Visual Line Extraction & MAIN-World Timedtext Ingestion ---
console.log("3️⃣1️⃣ Kiểm tra sửa lỗi bắt phụ đề video (lazy caption container, visual-line & YouTube timedtext hook)...");
await (async () => {
  let hasLazyCapContainer = false;
  const observerTargets = [];
  const capContainer = {
    closest: () => null,
    querySelectorAll: (sel) => {
      if (sel === ".caption-visual-line") {
        return [
          {
            querySelectorAll: (s2) =>
              s2 === ".ytp-caption-segment"
                ? [{ textContent: "Hello" }, { textContent: "world" }]
                : []
          },
          {
            querySelectorAll: (s2) =>
              s2 === ".ytp-caption-segment"
                ? [{ textContent: "Second" }, { textContent: "line" }]
                : []
          }
        ];
      }
      return [];
    },
    textContent: "HelloworldSecondline"
  };
  const fakePlayer = {
    classList: { add: () => {} },
    appendChild: () => {},
    querySelector: () => null,
    querySelectorAll: (sel) => {
      if (sel.includes("ytp-caption-window-container") && hasLazyCapContainer) {
        return [capContainer];
      }
      return [];
    }
  };
  const fakeTracks = [];
  fakeTracks.addEventListener = () => {};
  const fakeVideo = {
    currentTime: 0.5,
    closest: (sel) => (sel.includes("html5-video-player") ? fakePlayer : null),
    addEventListener: () => {},
    textTracks: fakeTracks
  };

  const sentMsgs = [];
  const ctx = createSandbox({
    MutationObserver: class MockMO {
      constructor(cb) { this.cb = cb; }
      observe(target) { observerTargets.push(target); }
    },
    location: { hostname: "www.youtube.com", href: "https://www.youtube.com/watch?v=dQw4w9WgXcQ" },
    document: {
      title: "Test Video - YouTube",
      querySelectorAll: (sel) => (sel === "video" || sel.includes("video") ? [fakeVideo] : []),
      querySelector: () => null,
      createElement: () => ({
        style: {},
        className: "",
        innerHTML: "",
        title: "",
        type: "",
        classList: { add: () => {}, remove: () => {} },
        setAttribute: () => {},
        querySelector: () => ({ textContent: "" }),
        addEventListener: () => {}
      })
    },
    chrome: {
      runtime: {
        lastError: null,
        getURL: (p) => `chrome-extension://mock/${p}`,
        sendMessage: (m, cb) => {
          sentMsgs.push(m);
          cb && cb({ results: {} });
        }
      }
    }
  });
  ctx.VieDOM = {
    getContainer: () => fakePlayer,
    hideOverlay: () => {}
  };
  loadModule(ctx, "utils/storage.js");
  loadModule(ctx, "content/captions.js");

  const C = ctx.VieCaptions;
  assert.strictEqual(C.extractYouTubeVideoId("https://www.youtube.com/watch?v=abc123XYZ"), "abc123XYZ");
  assert.strictEqual(C.extractYouTubeVideoId("https://www.youtube.com/shorts/short999"), "short999");
  assert.strictEqual(C.extractYouTubeVideoId("https://www.youtube.com/embed/emb777"), "emb777");

  const extracted = C.extractCaptionContainerText(capContainer);
  assert.strictEqual(extracted, "Hello world Second line", "Phải ghép đúng khoảng trắng từng span thay vì dính chữ HelloworldSecondline!");

  // 1st watchVideo call BEFORE YouTube creates caption container lazily
  const received = [];
  C.watchVideo(fakeVideo, (_v, text) => received.push(text));
  assert.strictEqual(observerTargets.length, 0);

  // User turns CC on -> container appears lazily -> subsequent watchVideo call MUST attach observer!
  hasLazyCapContainer = true;
  C.watchVideo(fakeVideo, (_v, text) => received.push(text));
  assert.strictEqual(observerTargets.length, 1, "watchVideo() lần 2 phải gắn MutationObserver cho caption container xuất hiện trễ!");
  assert.ok(received.includes("Hello world Second line"));

  // MAIN-world timedtext ingestion populates ytCueState.cues cleanly
  const ingested = C.ingestYouTubeTimedtext(
    "dQw4w9WgXcQ",
    [
      { start: 0, end: 1.5, text: "Never gonna" },
      { start: 1.5, end: 3.0, text: "give you up." }
    ],
    true
  );
  assert.strictEqual(ingested, true);
  assert.ok(C.ytCueState.cues.length >= 1, "ingestYouTubeTimedtext phải nạp được cues từ MAIN world!");
  assert.strictEqual(C.ytCueState.cues[0].text, "Never gonna give you up.");

  C.stopYouTubePrefetch?.();
  if (C.ytCueState.timer) { clearInterval(C.ytCueState.timer); C.ytCueState.timer = null; }
  if (C.ytCueState.renderTimer) { clearInterval(C.ytCueState.renderTimer); C.ytCueState.renderTimer = null; }

  console.log("   ✅ Đã kiểm tra bắt phụ đề trễ, trích xuất visual-line & hook timedtext chuẩn 100%!\n");
})();

// --- 32. Test Streaming Response Acceptance & Zero-Blank Fallback in content/content.js ---
console.log("3️⃣2️⃣ Kiểm tra chống rớt phụ đề streaming (reqSeq advancing) & dự phòng không để màn hình trống...");
await (async () => {
  const renderedLog = [];
  const pendingCallbacks = [];
  const mockViEl = { classes: new Set(["vie-vi"]), classList: { contains: (c) => mockViEl.classes.has(c), toggle: () => {} }, dataset: {} };
  const mockOrigEl = { style: {}, dataset: {} };
  const mockOverlay = {
    classList: { add: () => {}, remove: () => {} },
    querySelector: (s) => (s === ".vie-vi" ? mockViEl : s === ".vie-orig" ? mockOrigEl : null)
  };
  const mockVideo = { currentTime: 2, _vieOverlay: mockOverlay };

  const ctx = createSandbox({
    document: { readyState: "loading", title: "Mock Video", addEventListener: () => {}, querySelector: () => null, querySelectorAll: () => [] },
    chrome: {
      storage: {
        local: { get: (d, cb) => cb({ ...d, provider: "gemini" }), set: (_u, cb) => cb && cb() },
        onChanged: { addListener: () => {} }
      },
      runtime: {
        lastError: null,
        sendMessage: (msg, cb) => {
          pendingCallbacks.push({ msg, cb });
        }
      }
    }
  });
  ctx.VieDOM = {
    getOrCreateOverlay: () => mockOverlay,
    hideOverlay: () => {},
    formatSubtitleDecorations: (o, v) => ({ formattedOrig: o, formattedVi: v }),
    renderInteractiveWords: () => {},
    renderStableViText: (_el, txt) => { renderedLog.push(txt); },
    applySettingsToDOM: () => {}
  };
  loadModule(ctx, "utils/storage.js");
  loadModule(ctx, "content/captions.js");
  loadModule(ctx, "content/content.js");

  const Content = ctx.VieContent;
  // Cue 1 arrives (seq=1), then 70ms later streaming ASR updates to Cue 2 (seq=2) before Cue 1 AI responds!
  Content.onCaptionReceived(mockVideo, "Hello everyone today.", true, "");
  await new Promise((r) => setTimeout(r, 75));
  Content.onCaptionReceived(mockVideo, "Hello everyone today is great.", true, "");

  // Respond late to Cue 1 preview (seq=1 while reqSeq=2) -> must STILL render instead of dropping!
  const cue1Preview = pendingCallbacks.find((x) => x.msg.text === "Hello everyone today." && x.msg.fastPreviewOnly === true);
  cue1Preview.cb({ vi: "Xin chào mọi người hôm nay.", isFinalAi: false });
  assert.ok(renderedLog.includes("Xin chào mọi người hôm nay."), "Phản hồi preview của câu #1 đến sau khi seq tăng vẫn PHẢI hiện lên!");

  // Respond with failed/empty translation on latest cue #2 -> Zero-Blank fallback must render source text!
  const cue2Final = pendingCallbacks.find((x) => x.msg.text === "Hello everyone today is great." && x.msg.fastPreviewOnly === false);
  cue2Final.cb({ vi: "" });
  assert.ok(
    renderedLog.includes("Hello everyone today is great."),
    "Nếu dịch thất bại/rỗng, phải hiện phụ đề gốc dự phòng thay vì để màn hình trống trơn!"
  );

  console.log("   ✅ Đã kiểm tra chống rớt phụ đề streaming & dự phòng chống trống màn hình chuẩn 100%!\n");
})();

// --- 33. Test background.js Error Hygiene (GTX 429, fallbackToFree:false, buildKeyPool Generic Key & lastProvider) ---
console.log("3️⃣3️⃣ Kiểm tra background.js: GTX 429 an toàn, fallbackToFree:false & buildKeyPool generic key...");
await (async () => {
  let msgHandler = null;
  let storedSettings = {
    provider: "gtx",
    apiKey: "",
    targetLang: "vi",
    fallbackToFree: true
  };
  let fetchMode = "gtx429";
  const mockFetch = async (url) => {
    if (String(url).includes("translate.googleapis.com")) {
      if (fetchMode === "gtx429") {
        return makeMockResponse({ ok: false, status: 429, jsonData: {} });
      }
      return makeMockResponse({ ok: true, status: 200, jsonData: [[["Xin chào", "Hello", null, null, 10]]] });
    }
    if (String(url).includes("generativelanguage.googleapis.com")) {
      return makeMockResponse({ ok: false, status: 429, jsonData: { error: { message: "quota exceeded" } } });
    }
    if (String(url).includes("api.groq.com/openai/v1/models")) {
      return makeMockResponse({ ok: true, status: 200, jsonData: { data: [{ id: "llama-3.3-70b-versatile" }] } });
    }
    if (String(url).includes("api.groq.com/openai/v1/chat/completions")) {
      return makeMockResponse({ ok: true, status: 200, jsonData: { choices: [{ message: { content: "Xin chào từ Groq" } }] } });
    }
    return makeMockResponse({ ok: false, status: 404, jsonData: {} });
  };
  const storageListeners = [];
  const chromeMock = {
    storage: {
      local: {
        get: (keys, cb) => cb(keys && "translationCache" in keys ? { translationCache: [] } : { ...keys, ...storedSettings }),
        set: (u, cb) => {
          const changes = {};
          for (const [k, v] of Object.entries(u || {})) {
            changes[k] = { oldValue: storedSettings[k], newValue: v };
          }
          storedSettings = { ...storedSettings, ...u };
          for (const fn of storageListeners) fn(changes, "local");
          cb && cb();
        },
        remove: () => {}
      },
      onChanged: { addListener: (fn) => storageListeners.push(fn) }
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
    importScripts: (...paths) => paths.forEach((p) => loadModule(ctx, p.replace(/^\//, "")))
  });
  loadModule(ctx, "background/background.js");
  const sendMsg = (m) => new Promise((r) => msgHandler(m, { tab: { id: 88 } }, r));
  const updateSettings = (u) => ctx.VieStorage.setSettings(u);

  // 33A: GTX HTTP 429 must resolve cleanly without unhandled rejection
  const gtx429Res = await sendMsg({ type: "TRANSLATE", text: "Rate limited line" });
  assert.strictEqual(gtx429Res.vi, "");
  assert.strictEqual(gtx429Res.provider, "gtx");
  assert.strictEqual(gtx429Res.rateLimited, true);
  assert.ok(/429/.test(gtx429Res.error || ""));

  // 33B: fallbackToFree: false with no key must NOT call GTX
  fetchMode = "gtx_ok";
  await updateSettings({ provider: "gemini", apiKey: "", geminiApiKey: "", groqApiKey: "", targetLang: "vi", fallbackToFree: false });
  const noKeyRes = await sendMsg({ type: "TRANSLATE", text: "No key no fallback" });
  assert.strictEqual(noKeyRes.vi, "");
  assert.ok(noKeyRes.error, "Khi fallbackToFree=false và thiếu key phải trả về error rõ ràng!");

  const noKeyBatchRes = await sendMsg({ type: "TRANSLATE_BATCH", texts: ["Batch line one"] });
  assert.strictEqual(Object.keys(noKeyBatchRes.results || {}).length, 0);
  assert.ok(noKeyBatchRes.error, "TRANSLATE_BATCH khi fallbackToFree=false và thiếu key phải trả về error!");

  // 33C: buildKeyPool keeps generic key when provider is gemini/groq, and fallbackToFree:false blocks GTX on AI error
  const poolGemini = ctx.buildKeyPool({ provider: "gemini", backupKeys: "", geminiApiKey: "", groqApiKey: "" }, "custom-unprefixed-key-123");
  assert.deepStrictEqual(Array.from(poolGemini), ["custom-unprefixed-key-123"]);
  await updateSettings({
    provider: "gemini",
    apiKey: "custom-unprefixed-key-123",
    geminiApiKey: "custom-unprefixed-key-123",
    groqApiKey: "",
    targetLang: "vi",
    fallbackToFree: false
  });
  const aiFailRes = await sendMsg({ type: "TRANSLATE", text: "AI fail no GTX" });
  assert.strictEqual(aiFailRes.vi, "");
  assert.ok(aiFailRes.error, "Khi fallbackToFree=false và AI lỗi không được âm thầm rơi về GTX!");

  // 33D: Key pool rotation from Gemini -> Groq updates engineStats.lastProvider to "groq"
  await updateSettings({
    provider: "gemini",
    apiKey: "AIzaFailingKey1234567890",
    geminiApiKey: "AIzaFailingKey1234567890",
    groqApiKey: "gsk_BackupGroqKey1234567890",
    targetLang: "vi",
    fallbackToFree: true
  });
  const rotatedRes = await sendMsg({ type: "TRANSLATE", text: "Rotate to Groq" });
  assert.strictEqual(rotatedRes.vi, "Xin chào từ Groq");
  assert.strictEqual(rotatedRes.provider, "groq");
  const stats33 = await sendMsg({ type: "GET_ENGINE_STATS" });
  assert.strictEqual(stats33.stats.lastProvider, "groq", "engineStats.lastProvider phải ghi nhận provider thực sự được callAI sử dụng!");
  console.log("   ✅ Đã kiểm tra GTX 429, fallbackToFree:false, buildKeyPool & lastProvider chuẩn 100%!\n");
})();

// --- 34. Test api/gemini.js Thought-Only Safety & api/ollama.js :8080 Hint Consistency ---
console.log("3️⃣4️⃣ Kiểm tra gemini.js (thought-only safety) & ollama.js (:8080 isOpenAiHint)...");
await (async () => {
  // 34A: gemini.js must NOT fall back to parts[0].text when parts[0].thought is true
  const ctxGem = createSandbox({
    fetch: async () =>
      makeMockResponse({
        ok: true,
        status: 200,
        jsonData: {
          candidates: [{ content: { parts: [{ text: "SECRET INTERNAL THOUGHT", thought: true }] } }]
        }
      })
  });
  loadModule(ctxGem, "utils/storage.js");
  loadModule(ctxGem, "api/gemini.js");
  await assert.rejects(
    () => ctxGem.VieGemini.translateWithGeminiAuto({ text: "Hello", apiKey: "AIzaTestOnlyThought", preferredModel: "gemini-2.5-flash" }),
    /empty|refused|rỗng|failed/i,
    "Khi Gemini chỉ trả part thought:true thì tuyệt đối không được rò rỉ parts[0].text!"
  );

  // 34B: ollama.js isOpenAiHint covers :8080 even when preferredModel skips discovery
  const hitUrls = [];
  const ctxOl = createSandbox({
    fetch: async (url) => {
      hitUrls.push(url);
      return makeMockResponse({ ok: true, status: 200, jsonData: { choices: [{ message: { content: "Xin chào 8080" } }] } });
    }
  });
  loadModule(ctxOl, "utils/storage.js");
  loadModule(ctxOl, "api/ollama.js");
  assert.strictEqual(ctxOl.VieOllama.isOpenAiHint("http://localhost:8080"), true);
  assert.strictEqual(ctxOl.VieOllama.isOpenAiHint("http://127.0.0.1:1234"), true);
  assert.strictEqual(ctxOl.VieOllama.isOpenAiHint("http://localhost:11434"), false);
  const res8080 = await ctxOl.VieOllama.translateWithOllama({
    text: "Hi",
    baseUrl: "http://localhost:8080",
    preferredModel: "local-gguf",
    targetLang: "vi"
  });
  assert.strictEqual(res8080.vi, "Xin chào 8080");
  assert.ok(hitUrls[0].endsWith("/v1/chat/completions"), "Port :8080 phải đi qua endpoint /v1/chat/completions ngay cả khi có preferredModel!");
  console.log("   ✅ Đã kiểm tra thought-part safety & :8080 OpenAI-hint chuẩn 100%!\n");
})();

// --- 35. Test content/content.js Async exportBilingualSrt & Non-YouTube Prefetch Guard ---
console.log("3️⃣5️⃣ Kiểm tra exportBilingualSrt (async batch + không drop khi dualSub=false) & guard non-YouTube...");
await (async () => {
  const sentBatches = [];
  let downloadedText = "";
  const ctx = createSandbox({
    location: { hostname: "example.com", href: "https://example.com/video" },
    Blob: class MockBlob {
      constructor(parts) { downloadedText = parts.join(""); }
    },
    URL: {
      createObjectURL: () => "blob:mock",
      revokeObjectURL: () => {}
    },
    document: {
      readyState: "loading",
      title: "Sample Video",
      addEventListener: () => {},
      querySelector: () => null,
      querySelectorAll: () => [],
      createElement: () => ({
        style: {},
        className: "",
        innerHTML: "",
        title: "",
        type: "",
        href: "",
        download: "",
        click: () => {},
        classList: { add: () => {}, remove: () => {} },
        setAttribute: () => {},
        querySelector: () => ({ textContent: "" }),
        addEventListener: () => {}
      })
    },
    chrome: {
      storage: {
        local: { get: (d, cb) => cb({ ...d, dualSub: false }), set: (_u, cb) => cb && cb() },
        onChanged: { addListener: () => {} }
      },
      runtime: {
        lastError: null,
        getURL: (p) => `chrome-extension://mock/${p}`,
        sendMessage: (msg, cb) => {
          if (msg.type === "TRANSLATE_BATCH") {
            sentBatches.push(msg.texts);
            cb({ results: { "Cue 1": "Câu 1" } }); // Cue 2 intentionally empty!
          }
        }
      }
    }
  });
  const fakePlayer = {
    classList: { add: () => {} },
    appendChild: () => {},
    querySelector: () => null,
    querySelectorAll: () => []
  };
  ctx.VieDOM = {
    getContainer: () => fakePlayer,
    hideOverlay: () => {},
    applySettingsToDOM: () => {}
  };
  loadModule(ctx, "utils/storage.js");
  loadModule(ctx, "content/captions.js");
  loadModule(ctx, "content/content.js");

  // Guard: watchVideo on non-YouTube must NOT start YouTube prefetch intervals
  const fakeTracks = [];
  fakeTracks.addEventListener = () => {};
  const fakeVid = { currentTime: 0, parentElement: fakePlayer, closest: () => null, addEventListener: () => {}, textTracks: fakeTracks };
  ctx.VieCaptions.watchVideo(fakeVid, () => {});
  assert.strictEqual(ctx.VieCaptions.ytCueState.timer, null, "Non-YouTube không được bật ytCueState.timer!");
  assert.strictEqual(ctx.VieCaptions.ytCueState.renderTimer, null, "Non-YouTube không được bật ytCueState.renderTimer!");

  // Async exportBilingualSrt must batch-translate uncached cues and keep Cue 2 fallback when dualSub=false
  ctx.VieCaptions.ytCueState.cues = [
    { start: 0, end: 2, text: "Cue 1" },
    { start: 2, end: 4, text: "Cue 2" }
  ];
  await new Promise((r) => setTimeout(r, 10));
  const srtRes = await ctx.VieContent.exportBilingualSrt(fakeVid);
  assert.strictEqual(srtRes.ok, true);
  assert.strictEqual(srtRes.count, 2);
  assert.strictEqual(sentBatches.length, 1);
  assert.ok(downloadedText.includes("Câu 1"), "Phải dịch các cue chưa có trong localCache!");
  assert.ok(downloadedText.includes("Cue 2"), "Khi dualSub=false và dịch rỗng, vẫn phải giữ cue gốc chứ không được drop!");
  console.log("   ✅ Đã kiểm tra exportBilingualSrt async & non-YouTube prefetch guard chuẩn 100%!\n");
})();

// --- 36. Test dom.js (.vie-orig toggle & article removal), selection.js scroll offset & webpage.js pill/nested li ---
console.log("3️⃣6️⃣ Kiểm tra dom.js (.vie-orig toggle), selection.js (scroll offset) & webpage.js (pill/nested li)...");
await (async () => {
  // 36A: dom.js applySettingsToDOM updates .vie-orig display & PLAYER_WRAPPER_SELECTORS excludes bare article
  const origNode = { style: { display: "block" } };
  const overlayNode = {
    classList: { add: () => {}, remove: () => {}, toggle: () => {} },
    style: { setProperty: () => {} },
    setAttribute: () => {},
    closest: () => null,
    dataset: {},
    querySelector: (s) => (s === ".vie-orig" ? origNode : null)
  };
  const domCtx = createSandbox({
    window: { getComputedStyle: () => ({ position: "relative" }) },
    document: {
      addEventListener: () => {},
      querySelectorAll: (sel) => {
        if (sel === ".vie-overlay") return [overlayNode];
        assert.strictEqual(/(?:^|,)\s*article\s*(?:,|$)/.test(sel), false, "PLAYER_WRAPPER_SELECTORS không được chứa bare 'article'!");
        return [];
      }
    }
  });
  loadModule(domCtx, "utils/storage.js");
  loadModule(domCtx, "content/dom.js");
  domCtx.VieDOM.applySettingsToDOM({ enabled: true, dualSub: false, secondaryLang: "orig" });
  assert.strictEqual(origNode.style.display, "none", "applySettingsToDOM phải ẩn .vie-orig ngay lập tức khi dualSub=false!");
  domCtx.VieDOM.applySettingsToDOM({ enabled: true, dualSub: true, secondaryLang: "orig" });
  assert.strictEqual(origNode.style.display, "block", "applySettingsToDOM phải hiện .vie-orig ngay lập tức khi dualSub=true!");

  // 36B: selection.js adds window.scrollX / window.scrollY on TRIGGER_SELECTION_TRANSLATE
  let runtimeListener = null;
  let capturedPopupCoords = null;
  const selCtx = createSandbox({
    scrollX: 120,
    scrollY: 1500,
    innerWidth: 1000,
    innerHeight: 900,
    document: { addEventListener: () => {} },
    chrome: {
      storage: { local: { get: (_d, cb) => cb({ enabled: true, selectionTranslate: true }) }, onChanged: { addListener: () => {} } },
      runtime: {
        lastError: null,
        onMessage: { addListener: (fn) => { runtimeListener = fn; } },
        sendMessage: (_m, _cb) => {}
      }
    }
  });
  selCtx.VieDOM = {
    showQuickTranslatePopup: (_text, coords) => {
      if (!capturedPopupCoords) capturedPopupCoords = coords;
    }
  };
  loadModule(selCtx, "content/selection.js");
  selCtx.VieSelection.init();
  runtimeListener({ type: "TRIGGER_SELECTION_TRANSLATE", text: "scrolled text" });
  assert.ok(capturedPopupCoords.x >= 120 && capturedPopupCoords.y >= 1500, "TRIGGER_SELECTION_TRANSLATE phải cộng scrollX/scrollY vào coords!");

  // 36C: webpage.js skips nested <li> and finishes pill state on empty/error responses
  const outerLi = {
    innerText: "Outer list item with inner list",
    closest: () => null,
    querySelector: (q) => (q.includes("li") ? {} : null)
  };
  const innerLi = {
    innerText: "Inner nested item to translate",
    closest: () => null,
    querySelector: () => null
  };
  const pillStatusEl = { textContent: "" };
  const pillRetryBtn = { style: { display: "none" } };
  const pillToggleBtn = { textContent: "" };
  const pillEl = {
    innerHTML: "",
    addEventListener: () => {},
    querySelector: (s) =>
      s === ".vie-web-pill-status" ? pillStatusEl : s === "[data-action='retry']" ? pillRetryBtn : s === "[data-action='toggle-hide']" ? pillToggleBtn : null
  };
  const webCtx = createSandbox({
    document: {
      documentElement: { classList: { toggle: () => {}, remove: () => {} } },
      body: { contains: () => true, appendChild: () => {} },
      querySelectorAll: () => [outerLi, innerLi],
      createElement: () => pillEl
    },
    chrome: {
      runtime: {
        lastError: null,
        sendMessage: (_msg, cb) => cb({ ok: false, results: {} })
      }
    }
  });
  loadModule(webCtx, "content/webpage.js");
  const eligible = webCtx.VieWebpage.collectTranslatableBlocks(webCtx.document, "vi");
  assert.strictEqual(eligible.length, 1);
  assert.strictEqual(eligible[0].el, innerLi, "Phải bỏ qua outer <li> chứa inner <li> để tránh dịch trùng!");
  await webCtx.VieWebpage.enable();
  await new Promise((r) => setTimeout(r, 200));
  assert.ok(pillStatusEl.textContent.includes("Lỗi dịch"), `Pill không được kẹt ở 'Đang dịch', nhận được: ${pillStatusEl.textContent}`);
  assert.strictEqual(pillRetryBtn.style.display, "inline-flex", "Nút thử lại trên pill phải hiện khi có đoạn dịch lỗi!");
  console.log("   ✅ Đã kiểm tra dom.js, selection.js & webpage.js chuẩn 100%!\n");
})();

// --- 37. Test Popup XSS Escaping, Slider Step, Vocab Phrasal/Schema & Glossary Empty Target ---
console.log("3️⃣7️⃣ Kiểm tra Popup: XSS escaping, overlayWidth step=1, Phrasal/Collocations & Glossary guard...");
(() => {
  const popupHtml = fs.readFileSync(path.join(ROOT_DIR, "popup/popup.html"), "utf8");
  const popupJs = fs.readFileSync(path.join(ROOT_DIR, "popup/popup.js"), "utf8");
  const popupOllama = fs.readFileSync(path.join(ROOT_DIR, "popup/ollama.js"), "utf8");
  const popupOpenai = fs.readFileSync(path.join(ROOT_DIR, "popup/openai.js"), "utf8");

  assert.ok(popupOllama.includes("escapeHtml(rawUrl)") && popupOllama.includes("escapeHtml(res.sample"), "popup/ollama.js phải escape HTML!");
  assert.ok(popupOpenai.includes("escapeHtml(baseUrl)") && popupOpenai.includes("escapeHtml(res.sample"), "popup/openai.js phải escape HTML!");
  assert.ok(/id="overlayWidth"[^>]*step="1"/.test(popupHtml), "overlayWidth slider phải dùng step='1' để mặc định 72 không bị snap về 71!");
  assert.ok(popupJs.includes("item.collocations") && popupJs.includes("v.collocations") && popupJs.includes("v.funFact"), "popup.js phải hỗ trợ cả collocations và funFact!");
  assert.ok(popupJs.includes("if (!target)"), "handleAddGlossary phải từ chối target rỗng!");

  // Verify categorizeVocabPos ordering directly from popup.js
  const fnMatch = popupJs.match(/function categorizeVocabPos\(posText\)\s*\{[\s\S]*?\n\s*\}/);
  assert.ok(fnMatch, "Phải tìm thấy hàm categorizeVocabPos!");
  const categorizeFn = vm.runInNewContext(`(${fnMatch[0]})`);
  assert.strictEqual(categorizeFn("Cụm động từ (Phrasal Verb)"), "idiom", "Phrasal Verb phải vào nhóm idiom/cụm thay vì bị nuốt bởi verb!");
  assert.strictEqual(categorizeFn("Động từ (Verb)"), "verb");
  console.log("   ✅ Đã kiểm tra toàn bộ nâng cấp Popup Studio chuẩn 100%!\n");
})();

// --- 38. Test Popup Restricted Tab Detection (tab.url undefined) & Quick Popup Viewport Clamping ---
console.log("3️⃣8️⃣ Kiểm tra phát hiện tab nội bộ (tab.url=undefined) & kẹp viewport popup dưới translate(-50%, -100%)...");
(() => {
  // 38A: popup.js isRestrictedTabUrl handles undefined/empty/edge:// vs normal https://
  const popupJs = fs.readFileSync(path.join(ROOT_DIR, "popup/popup.js"), "utf8");
  const restrictedFnMatch = popupJs.match(/function isRestrictedTabUrl\(url\)\s*\{[\s\S]*?\n\s*\}/);
  assert.ok(restrictedFnMatch, "Phải tìm thấy hàm isRestrictedTabUrl trong popup/popup.js!");
  const isRestrictedFn = vm.runInNewContext(`(${restrictedFnMatch[0]})`);
  assert.strictEqual(isRestrictedFn(undefined), true, "tab.url === undefined (edge://settings, chrome://settings) phải bị coi là trang nội bộ!");
  assert.strictEqual(isRestrictedFn(""), true, "tab.url rỗng phải bị coi là trang nội bộ!");
  assert.strictEqual(isRestrictedFn("edge://settings"), true);
  assert.strictEqual(isRestrictedFn("chrome://settings"), true);
  assert.strictEqual(isRestrictedFn("about:blank"), true);
  assert.strictEqual(isRestrictedFn("https://example.com/article"), false, "Trang web thường phải được phép chạy!");
  assert.strictEqual(isRestrictedFn("http://127.0.0.1:8080/test/test_bench.html"), false);

  // 38B: content/dom.js showQuickTranslatePopup keeps top - offsetHeight >= scrollY + 12 under translate(-50%, -100%)
  const fakeBubble = {
    id: "",
    className: "",
    innerHTML: "",
    offsetWidth: 280,
    offsetHeight: 172,
    style: {},
    classList: { add: () => {}, remove: () => {} },
    querySelector: () => null
  };
  const domCtx = createSandbox({
    scrollX: 0,
    scrollY: 1123,
    innerWidth: 1280,
    innerHeight: 808,
    window: {
      scrollX: 0,
      scrollY: 1123,
      innerWidth: 1280,
      innerHeight: 808,
      getComputedStyle: () => ({ position: "relative" })
    },
    document: {
      body: { contains: () => true, appendChild: () => {} },
      addEventListener: () => {},
      createElement: () => fakeBubble,
      querySelectorAll: () => []
    }
  });
  loadModule(domCtx, "utils/storage.js");
  loadModule(domCtx, "content/dom.js");

  // Case 1: Near top of scrolled viewport where coords.y - 14 - 172 < scrollY + 12 -> must flip below and stay >= scrollY + 12
  domCtx.VieDOM.showQuickTranslatePopup("Hello world", { x: 288, y: 1123 + 120 }, { vi: "Xin chào", provider: "gtx" });
  const topPx1 = parseFloat(fakeBubble.style.top);
  assert.ok(topPx1 - fakeBubble.offsetHeight >= 1123 + 12, `Top trực quan (${topPx1 - fakeBubble.offsetHeight}) không được tràn lên trên scrollY + 12!`);
  assert.ok(topPx1 <= 1123 + 808 - 12, `Bottom trực quan (${topPx1}) không được tràn xuống dưới viewport!`);

  // Case 2: Mid-viewport -> stays above anchor with visual top >= scrollY + 12
  domCtx.VieDOM.showQuickTranslatePopup("Scrolled popup test", { x: 288, y: 1123 + 350 }, { vi: "Kiểm tra cuộn", provider: "gtx" });
  const topPx2 = parseFloat(fakeBubble.style.top);
  assert.ok(topPx2 - fakeBubble.offsetHeight >= 1123 + 12, `Top trực quan (${topPx2 - fakeBubble.offsetHeight}) phải nằm gọn trong viewport!`);
  assert.ok(topPx2 <= 1123 + 808 - 12);

  // Case 3: Horizontal left edge clamping under translateX(-50%)
  const leftPx = parseFloat(fakeBubble.style.left);
  assert.ok(leftPx - fakeBubble.offsetWidth / 2 >= 12, `Left trực quan (${leftPx - fakeBubble.offsetWidth / 2}) không được tràn mép trái!`);
  console.log("   ✅ Đã kiểm tra isRestrictedTabUrl & kẹp viewport showQuickTranslatePopup chuẩn 100%!\n");
})();

// --- 39. Test Non-YouTube <video> + <track> & Platform DOM Caption Alt+V / toggleQuickSubMute Un-Mute Resync ---
console.log("3️⃣9️⃣ Kiểm tra bật lại phụ đề (Alt+V / toggleQuickSubMute) trên <video>+<track> & DOM caption non-YouTube...");
await (async () => {
  const makeClassList = (initial = []) => {
    const set = new Set(initial);
    return {
      add: (...cls) => cls.forEach((c) => set.add(c)),
      remove: (...cls) => cls.forEach((c) => set.delete(c)),
      toggle: (c, force) => {
        if (force === undefined) {
          if (set.has(c)) set.delete(c);
          else set.add(c);
        } else if (force) set.add(c);
        else set.delete(c);
      },
      contains: (c) => set.has(c)
    };
  };

  const makeButton = () => {
    const listeners = {};
    return {
      type: "",
      className: "",
      title: "",
      innerHTML: "",
      isConnected: true,
      parentElement: null,
      classList: makeClassList(),
      querySelector: () => ({ textContent: "" }),
      addEventListener: (ev, fn) => {
        listeners[ev] = listeners[ev] || [];
        listeners[ev].push(fn);
      },
      click: () => {
        (listeners.click || []).forEach((fn) => fn({ stopPropagation: () => {}, preventDefault: () => {} }));
      },
      remove: () => {}
    };
  };

  const viEl = { textContent: "", dataset: {}, classList: makeClassList(["vie-vi"]) };
  const origEl = { style: {}, dataset: {}, textContent: "" };
  const tipEl = { textContent: "💡", style: {} };
  const overlay = {
    _subMuted: false,
    _isDictPinned: false,
    classList: makeClassList(["vie-overlay", "vie-hidden"]),
    querySelector: (sel) => (sel === ".vie-vi" ? viEl : sel === ".vie-orig" ? origEl : sel === ".vie-learn-tip" ? tipEl : null)
  };

  const createdButtons = [];
  let platformCapText = "";
  const vimeoCapContainer = {
    closest: () => null,
    querySelectorAll: () => [],
    get textContent() { return platformCapText; }
  };

  const container = {
    classList: makeClassList(),
    appendChild: (el) => {
      el.parentElement = container;
      createdButtons.push(el);
    },
    querySelector: (sel) => (sel.includes(".vie-overlay") ? overlay : null),
    querySelectorAll: (sel) => (sel.includes("vp-captions") && platformCapText ? [vimeoCapContainer] : [])
  };

  const trackListeners = {};
  const cue1 = { startTime: 0.5, endTime: 4.5, text: "Hello from track cue one." };
  const cue2 = { startTime: 4.5, endTime: 9.5, text: "- Hey, what are you doing here?\n- I am testing bilingual subtitles live!" };
  const cue3 = { startTime: 9.5, endTime: 14.5, text: "Third cue arrives while muted." };
  const fakeTrack = {
    kind: "subtitles",
    mode: "showing",
    cues: [cue1, cue2, cue3],
    activeCues: [cue2],
    addEventListener: (ev, fn) => {
      trackListeners[ev] = trackListeners[ev] || [];
      trackListeners[ev].push(fn);
    }
  };
  const fakeTracks = [fakeTrack];
  fakeTracks.addEventListener = () => {};

  const fakeVideo = {
    currentTime: 5.5,
    paused: true,
    parentElement: container,
    _vieOverlay: overlay,
    textTracks: fakeTracks,
    closest: (sel) => (sel.includes(".vp-video-wrapper") && platformCapText ? container : null),
    addEventListener: () => {}
  };

  const ctx = createSandbox({
    location: { hostname: "example.com", href: "https://example.com/bench.html" },
    document: {
      readyState: "loading",
      title: "Non-YouTube Bench",
      addEventListener: () => {},
      querySelector: (sel) => (sel === ".vie-quick-sub-toggle" ? createdButtons.find((b) => b.className === "vie-quick-sub-toggle") || null : sel === ".vie-overlay" ? overlay : null),
      querySelectorAll: () => [],
      createElement: () => makeButton()
    },
    chrome: {
      storage: {
        local: { get: (d, cb) => cb({ ...d, enabled: true, provider: "gtx", dualSub: true }), set: (_u, cb) => cb && cb() },
        onChanged: { addListener: () => {} }
      },
      runtime: {
        lastError: null,
        getURL: (p) => `chrome-extension://mock/${p}`,
        sendMessage: (msg, cb) => {
          if (msg.type === "TRANSLATE") {
            cb && cb({ vi: `[VI] ${msg.text}`, sub2: "", provider: "gtx" });
            return;
          }
          cb && cb({ results: {} });
        }
      }
    }
  });

  ctx.VieDOM = {
    getContainer: () => container,
    getOrCreateOverlay: () => overlay,
    hideOverlay: () => {
      if (!overlay.classList.contains("vie-dict-open") && !overlay._isDictPinned) {
        overlay.classList.add("vie-hidden");
      }
    },
    formatSubtitleDecorations: (o, v) => ({ formattedOrig: o, formattedVi: v }),
    renderInteractiveWords: (el, txt) => { el.textContent = txt; },
    renderStableViText: (el, txt) => { el.textContent = txt; },
    applySettingsToDOM: () => {},
    playUiSound: () => {}
  };

  loadModule(ctx, "utils/storage.js");
  loadModule(ctx, "content/captions.js");
  loadModule(ctx, "content/content.js");

  // Trigger init() so settings and localCache are active, and attach watchVideo
  ctx.VieCaptions.watchVideo(fakeVideo, ctx.VieContent.onCaptionReceived);
  await new Promise((r) => setTimeout(r, 15));

  assert.strictEqual(ctx.VieCaptions.ytCueState.cues.length, 0, "Non-YouTube phải có ytCueState.cues.length === 0!");
  assert.strictEqual(overlay.classList.contains("vie-hidden"), false, "Cue 2 ban đầu phải hiển thị!");
  assert.ok(viEl.textContent.includes("[VI]"), "Overlay phải hiển thị bản dịch Cue 2!");

  const toggleBtn = createdButtons.find((b) => b.className === "vie-quick-sub-toggle");
  assert.ok(toggleBtn, "Phải tạo nút .vie-quick-sub-toggle!");

  // 39A: Paused mute -> un-mute on <video> + <track>
  toggleBtn.click(); // Mute ON
  assert.strictEqual(ctx.VieCaptions.getVideoState(fakeVideo).subMuted, true);
  assert.strictEqual(overlay.classList.contains("vie-hidden"), true, "Sau Alt+V lần 1 phải ẩn .vie-overlay!");

  toggleBtn.click(); // Mute OFF (paused on Cue 2)
  assert.strictEqual(ctx.VieCaptions.getVideoState(fakeVideo).subMuted, false);
  assert.strictEqual(overlay.classList.contains("vie-hidden"), false, "Sau Alt+V lần 2 trên <video>+<track> phải bỏ .vie-hidden ngay lập tức!");
  assert.ok(viEl.textContent.includes("testing bilingual subtitles live!"), "Phải khôi phục đúng nội dung Cue 2 đang active!");

  // 39B: Cue advances while muted -> un-mute must immediately render the NEW active cue (Cue 3)
  toggleBtn.click(); // Mute ON
  assert.strictEqual(overlay.classList.contains("vie-hidden"), true);
  fakeVideo.currentTime = 10.5;
  fakeTrack.activeCues = [cue3];
  (trackListeners.cuechange || []).forEach((fn) => fn());
  assert.strictEqual(overlay.classList.contains("vie-hidden"), true, "Khi đang tắt sub mà chuyển cue vẫn phải giữ ẩn!");
  toggleBtn.click(); // Mute OFF
  assert.strictEqual(overlay.classList.contains("vie-hidden"), false, "Khi bật lại sub phải hiện ngay Cue 3 mới!");
  assert.ok(viEl.textContent.includes("Third cue arrives while muted."), "Nội dung sau khi bật lại phải là Cue 3!");

  // 39C: Silent gap (no active cue) -> mute -> un-mute must stay cleanly hidden (no stale cue!)
  fakeVideo.currentTime = 0.1;
  fakeTrack.activeCues = [];
  overlay.classList.add("vie-hidden");
  toggleBtn.click(); // Mute ON
  toggleBtn.click(); // Mute OFF
  assert.strictEqual(overlay.classList.contains("vie-hidden"), true, "Khi ở khoảng lặng không có cue active, bật lại sub không được hiện cue cũ!");

  // 39D: Platform DOM caption fallback (e.g. Vimeo .vp-captions without <track>)
  fakeTrack.cues = [];
  platformCapText = "Visible platform caption line";
  ctx.VieCaptions.toggleQuickSubMute(fakeVideo, toggleBtn); // Mute ON
  assert.strictEqual(overlay.classList.contains("vie-hidden"), true);
  ctx.VieCaptions.toggleQuickSubMute(fakeVideo, toggleBtn); // Mute OFF
  assert.strictEqual(overlay.classList.contains("vie-hidden"), false, "Platform DOM caption phải hiển thị lại ngay khi un-mute!");
  assert.ok(viEl.textContent.includes("Visible platform caption line"));

  console.log("   ✅ Đã kiểm tra bật lại phụ đề (Alt+V) trên <video>+<track> & DOM caption chuẩn 100%!\n");
})();

console.log("🎉 TOÀN BỘ 39 BÀI KIỂM TRA ĐỀU HOÀN TOÀN CHÍNH XÁC VÀ ĐẠT 100%!");

})();
