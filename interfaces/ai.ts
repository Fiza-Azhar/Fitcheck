import { Garment } from '@/interfaces/garment';
import { Occasion } from '@/types/garment';

export interface AiOutfitPick {
  topId: string;
  bottomId: string;
  shoesId?: string; // optional: outfits can be top + bottom only
  name: string;    // short outfit title, e.g. "Relaxed Weekend"
  score: number;   // 0..100
  reason: string;
}

export interface OutfitsRequestBody {
  items: Garment[];
  // What the user is dressing for, chosen from the shared Occasion vocabulary.
  // Optional: absent means "general suggestions", the original behaviour.
  occasion?: Occasion;
}

export interface OutfitsResponseBody {
  outfits: AiOutfitPick[];
}

// Minimal shape of Groq's chat completion response (OpenAI-compatible).
export interface GroqChatResponse {
  choices: { message: { content: string } }[];
}
