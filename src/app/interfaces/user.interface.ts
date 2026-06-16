import { UserRole } from "../../generated/prisma/enums";

export interface IUserJwtPayload {

  userId: string;
  role: UserRole;
  email: string;
}
