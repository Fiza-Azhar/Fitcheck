// 'loading' is the honest initial state: an empty wardrobe and an unreachable
// server must never look the same on screen.
export type LoadState = 'loading' | 'ready' | 'error';
