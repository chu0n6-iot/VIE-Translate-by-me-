/**
 * VIE-Translate — Translate Toad AI
 * utils/storage.js — Centralized chrome.storage and configuration manager
 */

(function (root) {
  "use strict";

  const FONT_FAMILY_MAP = {
    default: '"Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    serif: 'Georgia, "Times New Roman", Times, serif',
    mono: '"JetBrains Mono", Consolas, "Courier New", monospace',
    rounded: '"Trebuchet MS", "Segoe UI", Verdana, sans-serif',
    impact: '"Arial Black", Impact, "Segoe UI", sans-serif'
  };

  const LANGUAGE_NAMES = {
    vi: "Tiếng Việt",
    en: "Tiếng Anh (English)",
    fr: "Tiếng Pháp (Français)",
    ja: "Tiếng Nhật (日本語)",
    ko: "Tiếng Hàn (한국어)",
    "zh-CN": "Tiếng Trung Giản thể (简体中文)",
    "zh-TW": "Tiếng Trung Phồn thể (繁體中文)",
    de: "Tiếng Đức (Deutsch)",
    es: "Tiếng Tây Ban Nha (Español)",
    ru: "Tiếng Nga (Русский)",
    th: "Tiếng Thái (ไทย)"
  };

  const STYLE_INSTRUCTIONS = {
    natural: "Phong cách tự nhiên, đời thường, trôi chảy, đúng ngữ cảnh hội thoại. BẮT BUỘC liên kết mạch lạc câu trước với câu sau, dùng diễn đạt thuần Việt uyển chuyển, tuyệt đối không dịch ngang 1:1 từ-nối-từ máy móc.",
    cinema: "Phong cách phụ đề điện ảnh / Netflix chuyên nghiệp: câu từ cô đọng, súc tích, giàu cảm xúc và nhịp điệu, chuyển tải trọn vẹn mạch tư duy và thần thái nhân vật. Tuyệt đối không dịch thô ngữ pháp ngoại lai.",
    academic: "Phong cách học thuật & chuyên ngành: dịch chuẩn xác thuật ngữ khoa học, kỹ thuật, lập trình, y sinh, kinh tế; diễn đạt mạch lạc, liên kết lập luận chặt chẽ giữa các câu.",
    genz: "Phong cách trẻ trung, hài hước, năng động (GenZ / Vlog / Gaming): dùng từ ngữ tự nhiên, bắt trend hợp ngữ cảnh nhưng diễn đạt thuần Việt liền mạch, giữ chuẩn ý câu gốc.",
    literal: "Phong cách dịch đối chiếu song ngữ nhưng vẫn giữ câu cú tiếng Việt tự nhiên, không cụt lủn hay tối nghĩa.",
    unhinged: "PHONG CÁCH UNHINGED, LÁO XƯƠNG & CHÂM BIẾM FAMILY GUY (Brainrot Meme Edition 💀): Ngôn từ siêu láo xược, châm biếm đen tối (dark humor), bựa bẩn không kiêng nể, cà khịa cực gắt đúng phong cách Peter Griffin / Stewie trong Family Guy. Sử dụng triệt để từ lóng brainrot đỉnh nóc kịch trần (skibidi, rizz chúa, mewing, ohio, sigma, fanum tax, cook luôn, ảo tưởng, sủi luôn, gà mờ). Lồng ghép khéo léo các meme nổi tiếng (IShowSpeed sủa gâu gâu/quậy tanh bành, Khá Bảnh múa quạt/đạo lý giang hồ mạng, Charlie Kirk tranh luận/mặt giọt nước, Lapeace, Gigachad, Homelander). Phá vỡ bức tường thứ 4, châm chọc nhân vật chính, đối đáp đanh đá cay độc nhưng VẪN PHẢI bám sát tình tiết cốt truyện để người xem hiểu phim. Giữ độ láo xược và unhinged tối đa 100%!"
  };

  const PRONOUN_INSTRUCTIONS = {
    auto: "THỐNG NHẤT NHÂN XƯNG XUYÊN SUỐT: Chọn 1 cặp ngôi xưng phù hợp nhất với ngữ cảnh và GIỮ CỐ ĐỊNH XUYÊN SUỐT. Tuyệt đối KHÔNG nhảy ngôi xưng giữa các câu.",
    minh_ban: "NGÔI XƯNG CỐ ĐỊNH (Mình – Bạn / Các bạn): BẮT BUỘC dịch ngôi thứ nhất (I/me/my) là 'mình', số nhiều là 'chúng mình' / 'tụi mình', ngôi thứ hai (you) là 'bạn' / 'các bạn'.",
    toi_ban: "NGÔI XƯNG CỐ ĐỊNH (Tôi – Bạn / Các bạn): BẮT BUỘC dịch ngôi thứ nhất (I/me/my) là 'tôi', số nhiều là 'chúng tôi' / 'chúng ta', ngôi thứ hai (you) là 'bạn' / 'các bạn'.",
    anh_em: "NGÔI XƯNG CỐ ĐỊNH (Phim / Hội thoại Anh – Em / Cậu – Tớ): Dựa vào ngữ cảnh để xưng hô tự nhiên ('anh - em', 'chị - em', 'tớ - cậu') và KHÓA CỐ ĐỊNH cặp xưng hô đó."
  };

  const DEFAULT_SETTINGS = {
    enabled: true,
    dualSub: true,
    provider: "gemini",
    apiKey: "",
    geminiApiKey: "",
    groqApiKey: "",
    model: "auto",
    detectedModel: "",
    availableModels: [],
    verifiedKey: "",
    fallbackToFree: true,
    targetLang: "vi",
    secondaryLang: "orig",
    translationStyle: "natural",
    pronounStyle: "auto",
    subFont: "default",
    subSize: "100",
    subColor: "#fef08a",
    subSecondColor: "#e2e8f0",
    subBgStyle: "toad",
    subBottomPos: "12",
    overlayWidth: 72,
    overlayScale: 100,
    overlayBottom: 12,
    autoAudioNoCC: true,
    softenProfanity: true,
    hoverPauseDict: true,
    selectionTranslate: true,
    savedVocab: []
  };

  const VieStorage = {
    FONT_FAMILY_MAP,
    LANGUAGE_NAMES,
    STYLE_INSTRUCTIONS,
    PRONOUN_INSTRUCTIONS,
    DEFAULT_SETTINGS,

    getSettings() {
      return new Promise((resolve) => {
        chrome.storage.local.get(DEFAULT_SETTINGS, (res) => {
          resolve({ ...DEFAULT_SETTINGS, ...res });
        });
      });
    },

    setSettings(updates) {
      return new Promise((resolve) => {
        chrome.storage.local.set(updates, resolve);
      });
    },

    onChanged(callback) {
      chrome.storage.onChanged.addListener((changes, area) => {
        if (area === "local") callback(changes);
      });
    },

    getCacheKey(text, settings) {
      const s = settings || DEFAULT_SETTINGS;
      const mode = `${s.softenProfanity !== false ? "soft" : "raw"}:${s.pronounStyle || "auto"}`;
      return `${s.targetLang || "vi"}:${s.secondaryLang || "orig"}:${s.translationStyle || "natural"}:${mode}:${text}`;
    },

    maskKey(k) {
      const trimmed = (k || "").trim();
      if (trimmed.length <= 12) return trimmed;
      return `${trimmed.slice(0, 7)}•••${trimmed.slice(-4)}`;
    },

    detectProviderFromKey(key) {
      const k = (key || "").trim();
      if (k.startsWith("gsk_")) return "groq";
      if (k.startsWith("AQ.") || k.startsWith("AIza")) return "gemini";
      return "";
    },

    isAiMetaOrPromptLeak(text) {
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
  };

  root.VieStorage = VieStorage;
})(typeof self !== "undefined" ? self : this);
