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

  const PERSONA_INSTRUCTIONS = {
    gaming_vlog: "VIBE: Gaming / Streamer / Vlog vui nhộn. Dịch tếu táo, dí dỏm, dùng tiếng lóng tự nhiên của giới trẻ Việt (ví dụ: 'ông bạn', 'toang', 'gank', 'out trình', 'bá đạo'), xưng hô thân mật, gần gũi, tràn đầy năng lượng.",
    science_tech: "VIBE: Khoa học / Công nghệ / Giáo dục (như TED, Veritasium, Kurzgesagt). Dịch chuẩn xác, gãy gọn, học thuật, dùng đúng thuật ngữ chuyên ngành (kỹ thuật, vật lý, toán, y sinh, AI), lập luận logic và câu văn mạch lạc.",
    drama_movie: "VIBE: Điện ảnh / Phim ảnh kịch tính. Dịch giàu cảm xúc, chuyển tải trọn vẹn thần thái và tâm lý nhân vật, lời đối đáp tự nhiên, cuốn hút như phụ đề rạp chiếu phim.",
    music_lyrics: "VIBE: Âm nhạc / Lời bài hát. Dịch giàu vần điệu, hình ảnh thơ ca, bay bổng, gieo vần hài hòa và giữ trọn hồn bài hát.",
    podcast_interview: "VIBE: Podcast / Phỏng vấn / Đàm thoại sâu. Dịch tự nhiên, ấm áp, nhã nhặn, đối đáp trôi chảy và xưng hô tôn trọng, chân thành."
  };

  const DEFAULT_SETTINGS = {
    enabled: true,
    dualSub: true,
    provider: "gemini",
    ollamaBaseUrl: "http://localhost:11434",
    ollamaModel: "",
    whisperEnabled: false,
    whisperMode: "auto",
    whisperGpuUrl: "http://localhost:8000",
    whisperCpuUrl: "http://localhost:8001",
    whisperModel: "",
    whisperLang: "",
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
    autoPersona: true,
    smartMergeCaptions: true,
    multiSpeakerSplit: true,
    customGlossary: [],
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

  function formatMultiSpeakerDialogue(rawText) {
    if (!rawText) return "";
    let text = String(rawText)
      .replace(/<[^>]+>/g, " ")
      .replace(/\{[^}]+\}/g, " ")
      .trim();

    // 1. YouTube / Broadcast CC chevrons: ">>" or ">>>"
    if (/>>+/.test(text)) {
      const parts = text
        .split(/>>+/)
        .map((p) => p.replace(/\s+/g, " ").trim())
        .filter(Boolean);
      if (parts.length >= 2) {
        return parts.map((p) => (p.startsWith("-") ? p : `- ${p}`)).join("\n");
      }
    }

    // 2. Already has linebreaks:
    if (text.includes("\n")) {
      const lines = text
        .split("\n")
        .map((l) => l.replace(/[^\S\r\n]+/g, " ").trim())
        .filter(Boolean);
      if (lines.length >= 2) {
        const hasDash = lines.some((l) => l.startsWith("-") || l.startsWith("–") || l.startsWith("—"));
        // Chỉ coi là 2 người nói khi có gạch đầu dòng; CC YouTube thường tự ngắt 1 câu thành 2 dòng
        if (hasDash) {
          return lines
            .map((l) => {
              const cleanL = l.replace(/^[-–—]\s*/, "").trim();
              return `- ${cleanL}`;
            })
            .join("\n");
        }
      }
    }

    // 3. Dual dialogue on single line separated by " - " or " – " or " — "
    const dashDialogueMatch = text.match(/^([-–—]\s*)?(.+?[.?!…”"'])\s+[-–—]\s+(.+)$/);
    if (dashDialogueMatch) {
      const part1 = dashDialogueMatch[2].replace(/^[-–—]\s*/, "").trim();
      const part2 = dashDialogueMatch[3].replace(/^[-–—]\s*/, "").trim();
      if (part1 && part2) {
        return `- ${part1}\n- ${part2}`;
      }
    }

    // 4. Bracketed speakers like "[John] Hello! [Mary] Hi!" or "John: Hello! Mary: Hi!"
    const speakerTagMatch = text.match(
      /^(?:\[([^\]]+)\]|([A-Z][a-zA-Z0-9_\s]{1,12}):)\s*([^\[]+?)\s+(?:\[([^\]]+)\]|([A-Z][a-zA-Z0-9_\s]{1,12}):)\s*(.+)$/
    );
    if (speakerTagMatch) {
      const spk1 = speakerTagMatch[1] || speakerTagMatch[2] || "";
      const txt1 = (speakerTagMatch[3] || "").trim();
      const spk2 = speakerTagMatch[4] || speakerTagMatch[5] || "";
      const txt2 = (speakerTagMatch[6] || "").trim();
      if (txt1 && txt2) {
        return `- ${spk1 ? `${spk1}: ` : ""}${txt1}\n- ${spk2 ? `${spk2}: ` : ""}${txt2}`;
      }
    }

    return text.replace(/\n+/g, " ").replace(/\s+/g, " ").trim();
  }

  function isMultiSpeakerDialogue(text) {
    if (!text || typeof text !== "string") return false;
    const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
    return lines.length >= 2 && lines.some((l) => l.startsWith("-") || l.startsWith("–") || l.startsWith("—"));
  }

  function cleanTranslatedOutput(rawText) {
    if (!rawText) return "";
    let s = String(rawText)
      .replace(/<\/?(?:translate_now|context_next|current_line)>/gi, "")
      .replace(/\[(?:Upcoming next line|Next line for context|Context Only[^\]]*|Multi-speaker dialogue[^\]]*|Dòng tiếp theo[^\]]*)\]\s*/gi, "")
      .replace(/^(?:Current line|Translated line|Bản dịch|Dịch)\s*:\s*/i, "")
      .trim();

    // Bóc dấu ngoặc kép thừa ở 2 đầu nếu câu không phải lời trích dẫn nhiều dòng
    if (!s.includes("\n") && ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("“") && s.endsWith("”")))) {
      s = s.slice(1, -1).trim();
    }
    return s;
  }

  function parseBatchTranslations(rawOutput, expectedCount = 0) {
    const clean = String(rawOutput || "").trim();
    if (!clean) return [];

    // Ưu tiên bóc theo đánh số đầu dòng (1. / 1) / [1] / #1:) để giữ nguyên hội thoại nhiều dòng (- A \n - B) bên trong mỗi câu
    const itemRegex = /(?:^|\n)\s*(?:\[?#?(\d+)\]?[\.\)\]:-])\s*/g;
    const matches = [...clean.matchAll(itemRegex)];

    if (matches.length >= 1) {
      const indexed = new Array(expectedCount || matches.length).fill("");
      for (let i = 0; i < matches.length; i++) {
        const num = parseInt(matches[i][1], 10);
        const startPos = matches[i].index + matches[i][0].length;
        const endPos = i + 1 < matches.length ? matches[i + 1].index : clean.length;
        const body = cleanTranslatedOutput(clean.slice(startPos, endPos));
        if (num >= 1 && (!expectedCount || num <= expectedCount)) {
          indexed[num - 1] = body;
        } else if (i < indexed.length && !indexed[i]) {
          indexed[i] = body;
        }
      }
      if (indexed.some(Boolean)) {
        return indexed;
      }
    }

    return clean
      .split("\n")
      .map((l) => cleanTranslatedOutput(l.replace(/^\d+[\.\)\]:-]\s*/, "")))
      .filter(Boolean);
  }

  const VieStorage = {
    FONT_FAMILY_MAP,
    LANGUAGE_NAMES,
    STYLE_INSTRUCTIONS,
    PRONOUN_INSTRUCTIONS,
    PERSONA_INSTRUCTIONS,
    DEFAULT_SETTINGS,
    formatMultiSpeakerDialogue,
    isMultiSpeakerDialogue,
    cleanTranslatedOutput,
    parseBatchTranslations,

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
        lower.includes("format json") ||
        lower.includes("upcoming next line:") ||
        lower.includes("do not translate this next line")
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
})(typeof self !== "undefined" ? self : typeof globalThis !== "undefined" ? globalThis : this);
