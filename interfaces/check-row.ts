import { ShopCheckGroup } from '@/interfaces/shop-check-group';

export interface CheckRowProps {
  group: ShopCheckGroup;
  // True while this row's delete is in flight: the swipe is disabled and the
  // action shows progress rather than letting the user fire a second delete.
  busy: boolean;
  onDelete: () => void;
}
