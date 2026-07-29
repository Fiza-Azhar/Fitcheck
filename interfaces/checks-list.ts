import { ShopCheckGroup } from '@/interfaces/shop-check-group';

export interface ChecksListProps {
  checks: ShopCheckGroup[];
  // Ids of groups with a delete in flight, keyed by the group's newest check id.
  busyIds: Set<string>;
  onDelete: (group: ShopCheckGroup) => void;
}
