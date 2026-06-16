import jwt, { JwtPayload, SignOptions } from "jsonwebtoken";

const createToken = (
  payload: JwtPayload,
  secret: string,
  { expiresIn }: SignOptions,
) => {
  const token = jwt.sign(payload, secret, { expiresIn });
  return token;
};

const verifyToken = (token: string, secret: string) => {
  try {
    const decoded = jwt.verify(token, secret) as JwtPayload;
    return {
      success: true,
      decoded,
    };
  } catch (error: any) {
    return {
      success: false,
      message: error.message,
      error,
    }; // that will handle server crash if the token is invalid or expired
  }
};

const decodeToken = (token: string) => {
  const decoded = jwt.decode(token);
  return decoded;
};

export const jwtUtils = {
  createToken,
  verifyToken,
  decodeToken,
};
