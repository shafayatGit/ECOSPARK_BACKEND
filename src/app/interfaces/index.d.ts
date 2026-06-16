
import { IUserJwtPayload } from "./user.interface";

declare global {
  namespace Express {
    interface Request {
      user?: IUserJwtPayload;
      validatedQuery?: Record<string, unknown>;
    }
  }
}
