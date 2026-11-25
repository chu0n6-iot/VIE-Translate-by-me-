/**
 * VIE-Translate — Translate Toad AI
 * api/updater.js — Automatic GitHub update detector (semver + Git tree blob SHA-1 diff)
 */

(function (root) {
  "use strict";

  const GITHUB_OWNER = "chu0n6-iot";
  const GITHUB_REPO = "VIE-Translate-by-me-";
  const GITHUB_BRANCH = "main";
  const REPO_URL = `https://github.com/${GITHUB_OWNER}/${GITHUB_REPO}`;
  const CHECK_INTERVAL_MS = 3 * 60 * 60 * 1000;
  const STATE_KEY = "vieUpdateState";
  const WATCHED_PREFIXES = [
    "manifest.json",
    "utils/",
    "api/",
    "background/",
    "content/",
    "popup/",
    "tools/",
    "aistudio-"
  ];
  const WATCHED_EXT_RE = /\.(?:js|json|html|css|py)$/i;

  const DEFAULT_UPDATE_STATE = {
    lastCheckedAt: 0,
    etag: "",
    remoteCommitSha: "",
    remoteShortSha: "",
    remoteVersion: "",
    commitMessage: "",
    commitDate: "",
    commitUrl: "",
    treeSha: "",
    changedFiles: [],
    knownSyncedRemoteSha: "",
    dismissedCommitSha: "",
    toastShownForSha: "",
    hasUpdate: false
  };

  let memoryUpdateState = { ...DEFAULT_UPDATE_STATE };
  let inFlightCheck = null;

  function compareSemver(a, b) {
    const parse = (v) =>
      String(v || "0")
        .trim()
        .replace(/^v/i, "")
        .split(".")
        .map((seg) => parseInt(seg, 10) || 0);
    const pa = parse(a);
    const pb = parse(b);
    const len = Math.max(pa.length, pb.length);
    for (let i = 0; i < len; i++) {
      const na = pa[i] || 0;
      const nb = pb[i] || 0;
      if (na > nb) return 1;
      if (na < nb) return -1;
    }
    return 0;
  }

  async function computeGitBlobSha1(rawBytes) {
    const bytes = rawBytes instanceof Uint8Array ? rawBytes : new Uint8Array(rawBytes || 0);
    const out = new Uint8Array(bytes.length);
    let j = 0;
    for (let i = 0; i < bytes.length; i++) {
      if (bytes[i] === 0x0d && i + 1 < bytes.length && bytes[i + 1] === 0x0a) {
        continue;
      }
      out[j++] = bytes[i];
    }
    const normalized = out.subarray(0, j);
    const header = new TextEncoder().encode(`blob ${normalized.byteLength}\0`);
    const combined = new Uint8Array(header.byteLength + normalized.byteLength);
    combined.set(header, 0);
    combined.set(normalized, header.byteLength);
    const digest = await crypto.subtle.digest("SHA-1", combined);
    const view = new Uint8Array(digest);
    let hex = "";
    for (let i = 0; i < view.length; i++) {
      hex += view[i].toString(16).padStart(2, "0");
    }
    return hex;
  }

  function isWatchedRepoPath(filePath) {
    if (!filePath || !WATCHED_EXT_RE.test(filePath)) return false;
    return WATCHED_PREFIXES.some((prefix) => filePath === prefix || filePath.startsWith(prefix));
  }

  async function diffLocalAgainstGithubTree(treeEntries) {
    if (!Array.isArray(treeEntries)) return null;
    if (
      typeof chrome === "undefined" ||
      typeof chrome.runtime?.getURL !== "function" ||
      typeof crypto === "undefined" ||
      !crypto.subtle
    ) {
      return null;
    }

    const targets = treeEntries.filter((entry) => entry && entry.type === "blob" && isWatchedRepoPath(entry.path));
    const changedFiles = [];

    await Promise.all(
      targets.map(async (entry) => {
        try {
          const localUrl = chrome.runtime.getURL(entry.path);
          const res = await fetch(localUrl, { cache: "no-store" });
          if (!res.ok) {
            changedFiles.push(entry.path);
            return;
          }
          const buf = await res.arrayBuffer();
          const localSha = await computeGitBlobSha1(new Uint8Array(buf));
          if (localSha !== entry.sha) {
            changedFiles.push(entry.path);
          }
        } catch {
          changedFiles.push(entry.path);
        }
      })
    );

    changedFiles.sort();
    return changedFiles;
  }

  function computeUpdateId(state) {
    if (!state) return "";
    return state.remoteCommitSha || (state.remoteVersion ? `v${state.remoteVersion}` : "");
  }

  function getLocalVersion() {
    if (typeof chrome !== "undefined" && typeof chrome.runtime?.getManifest === "function") {
      return chrome.runtime.getManifest()?.version || "1.0.0";
    }
    return "1.0.0";
  }

  function getUpdateState() {
    if (typeof chrome === "undefined" || !chrome.storage?.local) {
      return Promise.resolve({ ...DEFAULT_UPDATE_STATE, ...memoryUpdateState });
    }
    return new Promise((resolve) => {
      chrome.storage.local.get({ [STATE_KEY]: DEFAULT_UPDATE_STATE }, (res) => {
        const merged = { ...DEFAULT_UPDATE_STATE, ...(res?.[STATE_KEY] || {}) };
        memoryUpdateState = merged;
        resolve({ ...merged });
      });
    });
  }

  function saveUpdateState(nextState) {
    memoryUpdateState = { ...DEFAULT_UPDATE_STATE, ...nextState };
    if (typeof chrome === "undefined" || !chrome.storage?.local) {
      return Promise.resolve();
    }
    return new Promise((resolve) => {
      chrome.storage.local.set({ [STATE_KEY]: memoryUpdateState }, resolve);
    });
  }

  function syncActionBadge(state, autoCheckEnabled = true) {
    if (typeof chrome === "undefined" || !chrome.action || typeof chrome.action.setBadgeText !== "function") {
      return;
    }
    const updateId = computeUpdateId(state);
    const show = Boolean(
      autoCheckEnabled !== false &&
      state?.hasUpdate &&
      updateId &&
      state.dismissedCommitSha !== updateId
    );
    try {
      if (show) {
        if (typeof chrome.action.setBadgeBackgroundColor === "function") {
          Promise.resolve(chrome.action.setBadgeBackgroundColor({ color: "#f59e0b" })).catch(() => {});
        }
        Promise.resolve(chrome.action.setBadgeText({ text: "MỚI" })).catch(() => {});
      } else {
        Promise.resolve(chrome.action.setBadgeText({ text: "" })).catch(() => {});
      }
    } catch {}
  }

  async function fetchWithTimeout(url, options = {}, timeoutMs = 5000) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      return await fetch(url, { ...options, signal: ctrl.signal });
    } finally {
      clearTimeout(timer);
    }
  }

  function evaluateUpdateAgainstTree(remoteVersion, localVersion, changedFiles, remoteCommitSha, state) {
    const verCmp = remoteVersion ? compareSemver(remoteVersion, localVersion) : 0;
    let knownSyncedRemoteSha = state.knownSyncedRemoteSha || "";
    let hasUpdate = false;

    if (verCmp < 0) {
      hasUpdate = false;
    } else if (verCmp > 0) {
      hasUpdate = true;
    } else if (Array.isArray(changedFiles)) {
      if (changedFiles.length === 0) {
        hasUpdate = false;
        if (remoteCommitSha) knownSyncedRemoteSha = remoteCommitSha;
      } else if (knownSyncedRemoteSha && knownSyncedRemoteSha === remoteCommitSha) {
        hasUpdate = false;
      } else {
        hasUpdate = true;
      }
    }
    return { hasUpdate, knownSyncedRemoteSha };
  }

  async function fetchRemoteManifestVersion() {
    const rawUrl = `https://raw.githubusercontent.com/${GITHUB_OWNER}/${GITHUB_REPO}/${GITHUB_BRANCH}/manifest.json?t=${Date.now()}`;
    const res = await fetchWithTimeout(rawUrl, { cache: "no-store" }, 4000);
    if (!res.ok) return "";
    const json = await res.json().catch(() => null);
    return (json?.version || "").trim();
  }

  async function runCheck({ force = false, verifyLocalSync = false } = {}) {
    const settings = root.VieStorage?.getSettings
      ? await root.VieStorage.getSettings()
      : { autoCheckUpdates: true };
    const state = await getUpdateState();
    const localVersion = getLocalVersion();
    const autoEnabled = settings.autoCheckUpdates !== false;

    if (!force && !verifyLocalSync && !autoEnabled) {
      syncActionBadge(state, false);
      return { ...state, localVersion, updateId: computeUpdateId(state), repoUrl: REPO_URL };
    }

    if (!force && !verifyLocalSync && state.lastCheckedAt && Date.now() - state.lastCheckedAt < CHECK_INTERVAL_MS) {
      syncActionBadge(state, autoEnabled);
      return { ...state, localVersion, updateId: computeUpdateId(state), repoUrl: REPO_URL };
    }

    const commitUrlApi = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/commits/${GITHUB_BRANCH}`;
    const headers = { Accept: "application/vnd.github+json" };
    if (!force && state.etag) {
      headers["If-None-Match"] = state.etag;
    }

    try {
      const res = await fetchWithTimeout(commitUrlApi, { headers, cache: "no-store" }, 5000);

      if (res.status === 304) {
        let nextState = { ...state, lastCheckedAt: Date.now() };
        if (verifyLocalSync && state.treeSha) {
          try {
            const treeRes = await fetchWithTimeout(
              `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/git/trees/${state.treeSha}?recursive=1`,
              { headers: { Accept: "application/vnd.github+json" }, cache: "no-store" },
              5000
            );
            if (treeRes.ok) {
              const treeData = await treeRes.json().catch(() => null);
              const changedFiles = await diffLocalAgainstGithubTree(treeData?.tree);
              if (Array.isArray(changedFiles)) {
                const evalRes = evaluateUpdateAgainstTree(
                  state.remoteVersion,
                  localVersion,
                  changedFiles,
                  state.remoteCommitSha,
                  state
                );
                nextState.changedFiles = changedFiles;
                nextState.hasUpdate = evalRes.hasUpdate;
                nextState.knownSyncedRemoteSha = evalRes.knownSyncedRemoteSha;
              }
            }
          } catch {}
        }
        await saveUpdateState(nextState);
        syncActionBadge(nextState, autoEnabled);
        return { ...nextState, localVersion, updateId: computeUpdateId(nextState), repoUrl: REPO_URL };
      }

      if (res.ok) {
        const data = await res.json();
        const remoteCommitSha = (data?.sha || "").trim();
        const remoteShortSha = remoteCommitSha.slice(0, 7);
        const treeSha = (data?.commit?.tree?.sha || "").trim();
        const commitMessage = String(data?.commit?.message || "").split("\n")[0].trim();
        const commitDate = data?.commit?.committer?.date || data?.commit?.author?.date || "";
        const commitUrl = data?.html_url || REPO_URL;
        const etag = res.headers?.get?.("etag") || state.etag || "";

        const [remoteVersion, treeChangedFiles] = await Promise.all([
          fetchRemoteManifestVersion().catch(() => ""),
          (async () => {
            if (!treeSha) return null;
            if (treeSha === state.treeSha && !verifyLocalSync && state.lastCheckedAt) {
              return Array.isArray(state.changedFiles) ? state.changedFiles : null;
            }
            try {
              const treeRes = await fetchWithTimeout(
                `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/git/trees/${treeSha}?recursive=1`,
                { headers: { Accept: "application/vnd.github+json" }, cache: "no-store" },
                5000
              );
              if (!treeRes.ok) return null;
              const treeData = await treeRes.json().catch(() => null);
              return await diffLocalAgainstGithubTree(treeData?.tree);
            } catch {
              return null;
            }
          })()
        ]);

        const changedFiles = Array.isArray(treeChangedFiles) ? treeChangedFiles : [];
        const evalRes = evaluateUpdateAgainstTree(
          remoteVersion,
          localVersion,
          treeChangedFiles,
          remoteCommitSha,
          state
        );

        const nextState = {
          ...state,
          lastCheckedAt: Date.now(),
          etag,
          remoteCommitSha,
          remoteShortSha,
          remoteVersion: remoteVersion || state.remoteVersion || localVersion,
          commitMessage,
          commitDate,
          commitUrl,
          treeSha,
          changedFiles,
          knownSyncedRemoteSha: evalRes.knownSyncedRemoteSha,
          hasUpdate: evalRes.hasUpdate
        };

        await saveUpdateState(nextState);
        syncActionBadge(nextState, autoEnabled);
        return { ...nextState, localVersion, updateId: computeUpdateId(nextState), repoUrl: REPO_URL };
      }
    } catch {
      // Fall through to raw manifest.json check
    }

    // Fallback when api.github.com is rate-limited (403/429) or unreachable
    try {
      const remoteVersion = await fetchRemoteManifestVersion();
      if (remoteVersion) {
        const verCmp = compareSemver(remoteVersion, localVersion);
        const nextState = {
          ...state,
          lastCheckedAt: Date.now(),
          remoteVersion,
          commitUrl: state.commitUrl || REPO_URL,
          commitMessage: verCmp > 0 ? `Phiên bản v${remoteVersion} đã có trên GitHub` : state.commitMessage,
          hasUpdate: verCmp > 0
        };
        await saveUpdateState(nextState);
        syncActionBadge(nextState, autoEnabled);
        return { ...nextState, localVersion, updateId: computeUpdateId(nextState), repoUrl: REPO_URL };
      }
    } catch {}

    syncActionBadge(state, autoEnabled);
    return { ...state, localVersion, updateId: computeUpdateId(state), repoUrl: REPO_URL };
  }

  async function checkForUpdates(opts = {}) {
    const force = Boolean(opts && opts.force);
    if (inFlightCheck && !force) {
      return inFlightCheck;
    }
    if (inFlightCheck && force) {
      try {
        await inFlightCheck;
      } catch {}
    }
    const p = runCheck(opts).finally(() => {
      if (inFlightCheck === p) inFlightCheck = null;
    });
    inFlightCheck = p;
    return p;
  }

  function maybeAutoCheck() {
    return checkForUpdates({ force: false }).catch(() => null);
  }

  async function getStatus() {
    const settings = root.VieStorage?.getSettings
      ? await root.VieStorage.getSettings()
      : { autoCheckUpdates: true };
    const state = await getUpdateState();
    const localVersion = getLocalVersion();
    const autoEnabled = settings.autoCheckUpdates !== false;
    syncActionBadge(state, autoEnabled);
    if (autoEnabled && (!state.lastCheckedAt || Date.now() - state.lastCheckedAt >= CHECK_INTERVAL_MS)) {
      maybeAutoCheck();
    }
    return { ...state, localVersion, updateId: computeUpdateId(state), repoUrl: REPO_URL };
  }

  async function dismissUpdate(updateId) {
    const state = await getUpdateState();
    const id = updateId || computeUpdateId(state);
    const nextState = { ...state, dismissedCommitSha: id };
    await saveUpdateState(nextState);
    syncActionBadge(nextState, true);
    return nextState;
  }

  async function markToastShown(updateId) {
    const state = await getUpdateState();
    const id = updateId || computeUpdateId(state);
    const nextState = { ...state, toastShownForSha: id };
    await saveUpdateState(nextState);
    return nextState;
  }

  root.VieUpdater = {
    GITHUB_OWNER,
    GITHUB_REPO,
    GITHUB_BRANCH,
    REPO_URL,
    CHECK_INTERVAL_MS,
    STATE_KEY,
    compareSemver,
    computeGitBlobSha1,
    diffLocalAgainstGithubTree,
    getUpdateState,
    saveUpdateState,
    syncActionBadge,
    checkForUpdates,
    maybeAutoCheck,
    getStatus,
    dismissUpdate,
    markToastShown
  };
})(typeof self !== "undefined" ? self : typeof globalThis !== "undefined" ? globalThis : this);
