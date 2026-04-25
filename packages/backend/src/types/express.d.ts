// Newer @types/express versions widened `req.params` values to
// `string | string[]` to model some advanced router edge cases. Express
// at runtime only produces strings for the routes we actually use, so we
// narrow it back down here. Saves an `as string` cast on every handler.
import 'express-serve-static-core';

declare module 'express-serve-static-core' {
  interface ParamsDictionary {
    [key: string]: string;
  }
}
