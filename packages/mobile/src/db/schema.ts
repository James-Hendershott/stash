import { appSchema, tableSchema } from '@nozbe/watermelondb';

/**
 * WatermelonDB schema — mirrors the Prisma/PostgreSQL schema.
 *
 * Key differences from the server schema:
 * - WatermelonDB uses string IDs (we use the server's UUIDs)
 * - Timestamps are stored as integers (milliseconds since epoch)
 * - Relations use column names ending in _id
 * - `_status` and `_changed` are reserved columns used by the sync engine
 */
export const schema = appSchema({
  version: 1,
  tables: [
    tableSchema({
      name: 'items',
      columns: [
        { name: 'server_id', type: 'string' },
        { name: 'name', type: 'string' },
        { name: 'description', type: 'string', isOptional: true },
        { name: 'category_id', type: 'string' },
        { name: 'category_name', type: 'string', isOptional: true },
        { name: 'category_color', type: 'string', isOptional: true },
        { name: 'condition', type: 'string' },
        { name: 'quantity', type: 'number' },
        { name: 'length_in', type: 'number', isOptional: true },
        { name: 'width_in', type: 'number', isOptional: true },
        { name: 'height_in', type: 'number', isOptional: true },
        { name: 'weight_lbs', type: 'number', isOptional: true },
        { name: 'shape_type', type: 'string' },
        { name: 'fate', type: 'string' },
        { name: 'origin_location_id', type: 'string' },
        { name: 'origin_location_name', type: 'string', isOptional: true },
        { name: 'destination_location_id', type: 'string', isOptional: true },
        { name: 'destination_location_name', type: 'string', isOptional: true },
        { name: 'photo_path', type: 'string', isOptional: true },
        { name: 'qr_code_path', type: 'string', isOptional: true },
        { name: 'is_container', type: 'boolean' },
        { name: 'estimated_sale_value', type: 'number', isOptional: true },
        { name: 'llm_price_suggestion', type: 'number', isOptional: true },
        { name: 'llm_price_rationale', type: 'string', isOptional: true },
        { name: 'notes', type: 'string', isOptional: true },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ],
    }),
    tableSchema({
      name: 'containers',
      columns: [
        { name: 'server_id', type: 'string' },
        { name: 'item_id', type: 'string' },
        { name: 'container_type', type: 'string' },
        { name: 'label', type: 'string' },
        { name: 'internal_length_in', type: 'number' },
        { name: 'internal_width_in', type: 'number' },
        { name: 'internal_height_in', type: 'number' },
        { name: 'max_weight_lbs', type: 'number', isOptional: true },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ],
    }),
    tableSchema({
      name: 'locations',
      columns: [
        { name: 'server_id', type: 'string' },
        { name: 'name', type: 'string' },
        { name: 'type', type: 'string' },
        { name: 'house', type: 'string' },
        { name: 'floor', type: 'string' },
        { name: 'color', type: 'string' },
        { name: 'sort_order', type: 'number' },
      ],
    }),
    tableSchema({
      name: 'categories',
      columns: [
        { name: 'server_id', type: 'string' },
        { name: 'name', type: 'string' },
        { name: 'icon', type: 'string' },
        { name: 'color', type: 'string' },
      ],
    }),
  ],
});
