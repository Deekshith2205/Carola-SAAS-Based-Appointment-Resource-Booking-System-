import { NextFunction, Request, Response } from 'express';
import { ZodSchema } from 'zod';

type RequestPart = 'body' | 'query' | 'params';

export function validate(schema: ZodSchema, part: RequestPart = 'body') {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      const parsed = schema.parse(req[part]);

      if (part === 'body') {
        req.body = parsed;
      } else if (part === 'query') {
        req.query = parsed;
      } else {
        req.params = parsed;
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}
