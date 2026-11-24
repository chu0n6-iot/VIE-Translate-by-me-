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

  const NEUTRAL_STYLE_INSTRUCTIONS = {
    natural: "Style: Natural, conversational, idiomatic, and context-accurate. Connect sentences smoothly and never translate word-for-word.",
    cinema: "Style: Professional cinema / Netflix subtitle style: concise, emotionally resonant, rhythmic, faithful to character voice and pacing.",
    academic: "Style: Academic & technical: accurate domain terminology in science, engineering, medicine, and economics with logical cohesion.",
    genz: "Style: Youthful, witty, energetic casual slang appropriate to the target language while preserving exact core meaning.",
    literal: "Style: Close bilingual reference style that remains grammatically natural and clear in the target language.",
    unhinged: "Style: Unhinged dark-humor, edgy satirical parody with sharp internet meme energy while staying true to the underlying plot."
  };

  const NEUTRAL_PERSONA_INSTRUCTIONS = {
    gaming_vlog: "VIBE: Gaming / Streamer / Vlog. Playful, energetic, colloquial banter with natural gamer slang.",
    science_tech: "VIBE: Science / Tech / Educational (TED, Veritasium, Kurzgesagt). Clear, concise, accurate technical terminology and logical flow.",
    drama_movie: "VIBE: Cinema / Drama. Expressive, emotionally nuanced dialogue matching character tone and tension.",
    music_lyrics: "VIBE: Music / Lyrics. Poetic imagery, lyrical rhythm, and emotional fidelity to the song.",
    podcast_interview: "VIBE: Podcast / Interview. Warm, conversational, thoughtful back-and-forth dialogue."
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
    autoCheckUpdates: true,
    savedVocab: []
  };

  function formatMultiSpeakerDialogue(rawText, enableSplit = true) {
    if (!rawText) return "";
    const text = String(rawText)
      .replace(/<[^>]+>/g, " ")
      .replace(/\{[^}]+\}/g, " ")
      .trim();
    if (!text) return "";

    if (enableSplit === false) {
      return text.replace(/\n+/g, " ").replace(/\s+/g, " ").trim();
    }

    // 1. YouTube / Broadcast CC chevrons: ">>" or ">>>"
    if (/>>+/.test(text)) {
      const parts = text
        .split(/>>+/)
        .map((p) => p.replace(/\s+/g, " ").replace(/^[-–—]\s*/, "").trim())
        .filter(Boolean);
      if (parts.length >= 2) {
        return parts.map((p) => `- ${p}`).join("\n");
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
            .map((l) => `- ${l.replace(/^[-–—]\s*/, "").trim()}`)
            .join("\n");
        }
      }
    }

    // 3. Multi-turn dialogue on single line separated after sentence punctuation by " - " / " – " / " — "
    const dashParts = text.split(/(?<=[.?!…”"'])\s+[-–—]\s+/)
      .map((p) => p.replace(/^[-–—]\s*/, "").replace(/\s+/g, " ").trim())
      .filter(Boolean);
    if (dashParts.length >= 2) {
      return dashParts.map((p) => `- ${p}`).join("\n");
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

  function stripAiThinkingAndFences(raw) {
    if (!raw) return "";
    return String(raw)
      .replace(/<think>[\s\S]*?<\/think>/gi, "")
      .replace(/<think>[\s\S]*$/gi, "")
      .replace(/```[a-zA-Z0-9_-]*\s*\n?/g, "")
      .replace(/```/g, "")
      .trim();
  }

  function cleanTranslatedOutput(rawText) {
    if (!rawText) return "";
    let s = stripAiThinkingAndFences(rawText)
      .replace(/<\/?(?:translate_now|context_next|current_line)>/gi, "")
      .replace(/^\s*(?:\[\[|［［)\s*#?\d+\s*(?:\]\]|］］)\s*/, "")
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
    const clean = stripAiThinkingAndFences(rawOutput);
    if (!clean) return [];

    const extractByMatches = (regex) => {
      const rawMatches = [...clean.matchAll(regex)];
      const matches = expectedCount > 0
        ? rawMatches.filter((m) => {
            const n = parseInt(m[1] || m[2], 10);
            return n >= 1 && n <= expectedCount;
          })
        : rawMatches;
      if (!matches.length) return null;

      const indexed = new Array(expectedCount || matches.length).fill("");
      for (let i = 0; i < matches.length; i++) {
        const num = parseInt(matches[i][1] || matches[i][2], 10);
        const startPos = matches[i].index + matches[i][0].length;
        const endPos = i + 1 < matches.length ? matches[i + 1].index : clean.length;
        const body = cleanTranslatedOutput(clean.slice(startPos, endPos));
        if (num >= 1 && (!expectedCount || num <= expectedCount)) {
          indexed[num - 1] = body;
        } else if (i < indexed.length && !indexed[i]) {
          indexed[i] = body;
        }
      }
      return indexed.some(Boolean) ? indexed : null;
    };

    // Priority 1: [[1]] / ［［1］］ bracketed batch delimiters
    const bracketParsed = extractByMatches(/(?:^|\n)\s*(?:\[\[|［［)\s*#?(\d+)\s*(?:\]\]|］］)[\.\):-]?\s*/g);
    if (bracketParsed) return bracketParsed;

    // Priority 2: Classic numbered markers (1. / 1) / [1] / #1:); preserve 8:30 or 9-10 at line start
    const classicParsed = extractByMatches(/(?:^|\n)\s*(?:\[\s*#?(\d+)\s*\][\.\)\]:-]?\s*|#?(\d+)[\.\)\]:](?:\s+|$))/g);
    if (classicParsed) return classicParsed;

    return clean
      .split("\n")
      .map((l) => cleanTranslatedOutput(l.replace(/^\d+[\.\)\]:]\s+/, "")))
      .filter(Boolean);
  }

  function getGlossaryHash(glossary) {
    if (!Array.isArray(glossary) || !glossary.length) return "0";
    const normalized = glossary
      .filter((g) => g && g.src && g.target && g.enabled !== false && g.src.trim() && g.target.trim())
      .map((g) => `${g.src.trim().toLowerCase()}=>${g.target.trim()}`)
      .sort();
    if (!normalized.length) return "0";
    let hash = 0x811c9dc5;
    const str = normalized.join("|");
    for (let i = 0; i < str.length; i++) {
      hash ^= str.charCodeAt(i);
      hash = Math.imul(hash, 0x01000193);
    }
    return (hash >>> 0).toString(36);
  }

  function filterRelevantGlossary(glossary, corpusText = "", maxFallback = 15) {
    if (!Array.isArray(glossary) || !glossary.length) return [];
    const active = glossary
      .filter((g) => g && g.src && g.target && g.enabled !== false && g.src.trim() && g.target.trim())
      .map((g) => ({ src: g.src.trim(), target: g.target.trim() }))
      .sort((a, b) => b.src.length - a.src.length);
    if (!active.length) return [];

    const lowerCorpus = String(corpusText || "").toLowerCase();
    const matched = [];
    const unmatched = [];
    for (const item of active) {
      if (lowerCorpus && lowerCorpus.includes(item.src.toLowerCase())) {
        matched.push(item);
      } else {
        unmatched.push(item);
      }
    }
    if (active.length <= maxFallback) {
      return [...matched, ...unmatched].slice(0, maxFallback);
    }
    return matched;
  }

  function buildTranslationPrompts({
    text = "",
    texts = null,
    nextText = "",
    videoTitle = "",
    videoPersona = "",
    glossary = [],
    targetLang = "vi",
    translationStyle = "natural",
    pronounStyle = "auto",
    lockedPronounPair = "",
    softenProfanity = true,
    multiSpeakerSplit = true,
    isLocal = false
  } = {}) {
    const isBatch = Array.isArray(texts) && texts.length > 0;
    const langCode = targetLang || "vi";
    const langName = LANGUAGE_NAMES[langCode] || langCode;
    const isVi = langCode === "vi";

    const corpus = isBatch ? texts.join("\n") : [text, nextText].filter(Boolean).join("\n");
    const relevantGlossary = filterRelevantGlossary(glossary, corpus, 15);

    // Optimized lean prompt for Local AI (Ollama / LM Studio) to minimize prefill latency
    if (isLocal) {
      const localSys = [
        `You are a fast, natural subtitle localizer. Target language: ${langName} (${langCode}).`,
        videoTitle ? `VIDEO: "${videoTitle}".` : "",
        "Translate by contextual meaning accurately, naturally and concisely. Avoid literal word-for-word translation.",
        multiSpeakerSplit !== false
          ? "MULTI-SPEAKER: If cue has 2+ speakers ('- ', '>>'), place EACH on a separate line starting with '- '."
          : "",
        isVi && pronounStyle === "minh_ban" ? "Ngôi xưng: thứ nhất là 'mình', thứ hai là 'bạn/các bạn'." : "",
        isVi && pronounStyle === "toi_ban" ? "Ngôi xưng: thứ nhất là 'tôi', thứ hai là 'bạn/các bạn'." : "",
        relevantGlossary.length > 0
          ? `GLOSSARY: ${relevantGlossary.map((g) => `"${g.src}"="${g.target}"`).join(", ")}.`
          : "",
        isBatch
          ? "Return lines tagged with exact markers [[1]], [[2]], ... up to [[" + texts.length + "]]. Output ONLY translated subtitles, no notes."
          : "Translate ONLY <translate_now> (use <context_next> only as lookahead context). Output ONLY the translated subtitle text without XML tags, notes, or explanations."
      ].filter(Boolean).join(" ");

      return {
        systemPrompt: localSys,
        userPrompt: isBatch
          ? texts.map((t, i) => `[[${i + 1}]] ${t}`).join("\n")
          : nextText ? `<context_next>${nextText.trim()}</context_next>\n<translate_now>${text}</translate_now>` : text,
        isBatch
      };
    }

    const sysParts = [
      `You are an elite bilingual subtitle localizer. Target language: ${langName} (${langCode}).`,
      videoTitle ? `VIDEO CONTEXT: "${videoTitle}".` : "",
      "SUBTITLE LOCALIZATION QUALITY:",
      "- Translate by contextual meaning, idioms, phrasal verbs, slang, and domain terms natively into the target language — NEVER translate word-for-word.",
      "- Use prior conversation history and lookahead cues to keep flow cohesive, resolve ambiguous pronouns (it, that, they) and omitted subjects (Japanese/Korean/Chinese), and keep subtitle phrasing concise for comfortable reading speed.",
      "- SPLIT-CLAUSE ALIGNMENT: When one sentence spans consecutive cues, translate only the current segment seamlessly without duplicating or stealing content from adjacent cues."
    ];

    if (multiSpeakerSplit !== false) {
      sysParts.push(
        "MULTI-SPEAKER DIALOGUE: If a cue has 2+ speakers (indicated by '- ', '>>', character names, or back-and-forth exchanges), place EACH speaker on a separate line starting with '- ' and NEVER merge different speakers onto one line."
      );
    }

    if (isVi) {
      sysParts.push(
        "- Với hội thoại nối tiếp hoặc vế rút gọn, dùng liên từ tiếng Việt tự nhiên ('Nhưng rồi', 'Thế là', 'Hóa ra', 'Chẳng ngờ', 'Dẫu vậy...').",
        "- Với video ca nhạc/lyrics: dịch giàu vần điệu, hình ảnh thơ ca, giữ trọn hồn bài hát.",
        videoPersona && PERSONA_INSTRUCTIONS[videoPersona] ? PERSONA_INSTRUCTIONS[videoPersona] : "",
        STYLE_INSTRUCTIONS[translationStyle] || STYLE_INSTRUCTIONS.natural,
        PRONOUN_INSTRUCTIONS[pronounStyle] || PRONOUN_INSTRUCTIONS.auto,
        lockedPronounPair ? `LOCKED PRONOUN: ${lockedPronounPair}.` : ""
      );
    } else {
      sysParts.push(
        "- For music/lyrics, preserve poetic rhythm, imagery, and emotional tone.",
        videoPersona && NEUTRAL_PERSONA_INSTRUCTIONS[videoPersona] ? NEUTRAL_PERSONA_INSTRUCTIONS[videoPersona] : "",
        NEUTRAL_STYLE_INSTRUCTIONS[translationStyle] || NEUTRAL_STYLE_INSTRUCTIONS.natural,
        "REGISTER CONSISTENCY: Choose a natural, context-appropriate tone/formality for the target language and keep pronouns/register consistent across lines."
      );
    }

    if (relevantGlossary.length > 0) {
      sysParts.push(
        `STRICT GLOSSARY ENFORCEMENT: You MUST translate the following terms exactly as mapped without exception: ${relevantGlossary
          .map((g) => `"${g.src}" => "${g.target}"`)
          .join(", ")}.`
      );
    }

    sysParts.push(
      softenProfanity !== false
        ? "FAMILY-FRIENDLY: Soften severe profanities/vulgar insults into mild natural expressions in the target language. NEVER refuse or stop translating."
        : "UNCENSORED: Faithfully translate colloquial expressions and slang without censoring."
    );

    if (isBatch) {
      sysParts.push(
        "BATCH OUTPUT CONTRACT: Translate EVERY item in order and return ONLY lines tagged with exact markers [[1]], [[2]], ... up to [[" +
          texts.length +
          "]]. Preserve '- ' speaker lines inside multi-speaker items. Do NOT merge items, skip numbers, or output notes/thinking."
      );
    } else {
      sysParts.push(
        "OUTPUT CONTRACT: If <context_next> is provided, use it ONLY as lookahead context for grammar/pronouns — NEVER translate <context_next>. Translate ONLY <translate_now> and output ONLY the translated subtitle text without XML tags, notes, quotes, or thinking."
      );
    }

    const systemPrompt = sysParts.filter(Boolean).join(" ");

    let userPrompt = "";
    if (isBatch) {
      userPrompt =
        `Translate each [[N]] subtitle cue below in continuous context. Keep exact [[N]] markers:\n` +
        texts.map((t, i) => `[[${i + 1}]] ${t}`).join("\n");
    } else {
      const corePrompt =
        nextText && nextText.trim()
          ? `<context_next>${nextText.trim()}</context_next>\n<translate_now>${text}</translate_now>`
          : text;
      const isMulti = multiSpeakerSplit !== false && (isMultiSpeakerDialogue(text) || text.includes("\n-"));
      userPrompt = isMulti
        ? `[Multi-speaker dialogue. Keep each speaker on separate line with '- ']:\n${corePrompt}`
        : corePrompt;
    }

    return { systemPrompt, userPrompt, isBatch };
  }

  let _cachedSettings = null;
  let _settingsPromise = null;
  let _cacheListenerAttached = false;

  function ensureCacheListener() {
    if (_cacheListenerAttached) return;
    if (typeof chrome !== "undefined" && chrome.storage?.onChanged) {
      _cacheListenerAttached = true;
      chrome.storage.onChanged.addListener((changes, area) => {
        if (area === "local" && _cachedSettings) {
          for (const [k, c] of Object.entries(changes)) {
            _cachedSettings[k] = c.newValue;
          }
        }
      });
    }
  }
  ensureCacheListener();

  const VieStorage = {
    FONT_FAMILY_MAP,
    LANGUAGE_NAMES,
    STYLE_INSTRUCTIONS,
    PRONOUN_INSTRUCTIONS,
    PERSONA_INSTRUCTIONS,
    NEUTRAL_STYLE_INSTRUCTIONS,
    NEUTRAL_PERSONA_INSTRUCTIONS,
    DEFAULT_SETTINGS,
    formatMultiSpeakerDialogue,
    isMultiSpeakerDialogue,
    stripAiThinkingAndFences,
    cleanTranslatedOutput,
    parseBatchTranslations,
    getGlossaryHash,
    filterRelevantGlossary,
    buildTranslationPrompts,

    getSettings() {
      ensureCacheListener();
      if (_cachedSettings) {
        return Promise.resolve({ ..._cachedSettings });
      }
      if (typeof chrome === "undefined" || !chrome.storage?.local) {
        _cachedSettings = { ...DEFAULT_SETTINGS };
        return Promise.resolve({ ..._cachedSettings });
      }
      if (!_settingsPromise) {
        _settingsPromise = new Promise((resolve) => {
          chrome.storage.local.get(DEFAULT_SETTINGS, (res) => {
            _cachedSettings = { ...DEFAULT_SETTINGS, ...res };
            _settingsPromise = null;
            resolve({ ..._cachedSettings });
          });
        });
      }
      return _settingsPromise.then((s) => ({ ...s }));
    },

    setSettings(updates) {
      ensureCacheListener();
      if (_cachedSettings && updates && typeof updates === "object") {
        _cachedSettings = { ..._cachedSettings, ...updates };
      }
      if (typeof chrome === "undefined" || !chrome.storage?.local) {
        _cachedSettings = { ...DEFAULT_SETTINGS, ...(_cachedSettings || {}), ...(updates || {}) };
        return Promise.resolve();
      }
      return new Promise((resolve) => {
        chrome.storage.local.set(updates, resolve);
      });
    },

    onChanged(callback) {
      if (typeof chrome !== "undefined" && chrome.storage?.onChanged) {
        chrome.storage.onChanged.addListener((changes, area) => {
          if (area === "local") callback(changes);
        });
      }
    },

    getCacheKey(text, settings) {
      const s = settings || DEFAULT_SETTINGS;
      const ms = s.multiSpeakerSplit !== false ? "ms1" : "ms0";
      const glHash = getGlossaryHash(s.customGlossary);
      const mode = `${s.softenProfanity !== false ? "soft" : "raw"}:${s.pronounStyle || "auto"}:${ms}:g${glHash}`;
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
