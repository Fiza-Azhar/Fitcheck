import { Garment } from '@/interfaces/garment';
import { Outfit } from '@/interfaces/outfit';
import { OutfitSource } from '@/types/outfit-source';

export interface AiOutfitPick {
  topId: string;
  bottomId: string;
  shoesId: string;
  score: number;   // 0..100
  reason: string;
}

export interface OutfitsRequestBody {
  items: Garment[];
}

export interface OutfitsResponseBody {
  outfits: AiOutfitPick[];
}

export interface GetOutfitsResult {
  outfits: Outfit[];
  source: OutfitSource;
}

// Minimal shape of Groq's chat completion response (OpenAI-compatible).
export interface GroqChatResponse {
  choices: { message: { content: string } }[];
}
