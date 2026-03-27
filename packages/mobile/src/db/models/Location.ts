import { Model } from '@nozbe/watermelondb';
import { field } from '@nozbe/watermelondb/decorators';

export default class Location extends Model {
  static table = 'locations';

  @field('server_id') serverId!: string;
  @field('name') name!: string;
  @field('type') type!: string;
  @field('house') house!: string;
  @field('floor') floor!: string;
  @field('color') color!: string;
  @field('sort_order') sortOrder!: number;
}
