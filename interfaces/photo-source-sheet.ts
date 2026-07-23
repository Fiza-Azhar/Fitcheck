import { PhotoSource } from '@/types/photo-source';

export interface PhotoSourceSheetProps {
  visible: boolean;
  onSelect: (source: PhotoSource) => void;
  onCancel: () => void;
}
