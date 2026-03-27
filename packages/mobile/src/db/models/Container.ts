import { Model } from '@nozbe/watermelondb';
import { field, readonly, date } from '@nozbe/watermelondb/decorators';

export default class Container extends Model {
  static table = 'containers';

  @field('server_id') serverId!: string;
  @field('item_id') itemId!: string;
  @field('container_type') containerType!: string;
  @field('label') label!: string;
  @field('internal_length_in') internalLengthIn!: number;
  @field('internal_width_in') internalWidthIn!: number;
  @field('internal_height_in') internalHeightIn!: number;
  @field('max_weight_lbs') maxWeightLbs!: number | null;
  @readonly @date('created_at') createdAt!: Date;
  @readonly @date('updated_at') updatedAt!: Date;
}
