const STORAGE_KEY = 'aiwb_chat_history';
const MAX_ENTRIES = 30;

function read() {
    if (typeof window === 'undefined') return [];
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch {
        return [];
    }
}

function write(list) {
    if (typeof window === 'undefined') return;
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
        window.dispatchEvent(new Event('aiwb:history-changed'));
    } catch {}
}

export function getHistory() {
    return read().sort((a, b) => b.updatedAt - a.updatedAt);
}

export function addToHistory(id, title) {
    if (!id) return;
    const list = read();
    const cleanTitle = (title || 'Untitled').trim().slice(0, 80);
    const now = Date.now();
    const existingIdx = list.findIndex(e => e.id === id);
    if (existingIdx >= 0) {
        list[existingIdx].updatedAt = now;
        if (cleanTitle && cleanTitle !== 'Untitled') list[existingIdx].title = cleanTitle;
    } else {
        list.unshift({ id, title: cleanTitle, createdAt: now, updatedAt: now });
    }
    write(list.slice(0, MAX_ENTRIES));
}

export function removeFromHistory(id) {
    write(read().filter(e => e.id !== id));
}

export function clearHistory() {
    write([]);
}
