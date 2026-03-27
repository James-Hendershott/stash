import { Database } from '@nozbe/watermelondb';
import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite';
import { schema } from './schema';
import Item from './models/Item';
import Container from './models/Container';
import Location from './models/Location';
import Category from './models/Category';

const adapter = new SQLiteAdapter({
  schema,
  // Use JSI for performance when available (Expo dev build)
  jsi: false, // Set to true when using a custom dev build
  onSetUpError: (error) => {
    console.error('WatermelonDB setup error:', error);
  },
});

export const database = new Database({
  adapter,
  modelClasses: [Item, Container, Location, Category],
});
