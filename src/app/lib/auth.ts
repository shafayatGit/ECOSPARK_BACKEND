import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "./prisma";
import { envVars } from "../config/env";
import { UserRole, UserStatus } from "../../generated/prisma/enums";
// If your Prisma file is located elsewhere, you can change the path

export const auth = betterAuth({
  baseURL: envVars.BETTER_AUTH_URL,
  secret: envVars.BETTER_AUTH_SECRET,
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
  },

  //   socialProviders: {
  //     google: {
  //       clientId: envVars.GOOGLE_CLIENT_ID,
  //       clientSecret: envVars.GOOGLE_CLIENT_SECRET,

  //       mapProfileToUser() {
  //         // This function will be called after successful authentication with Google, and the returned object will be used to create or update the user in the database.
  //         return {
  //           role: Role.PATIENT,
  //           status: UserStatus.ACTIVE,
  //           emailVerified: true,
  //           needPasswordChange: false,
  //           isDeleted: false,
  //           deletedAt: null,
  //         };
  //       },
  //     },
  //   },

  emailVerification: {
    sendOnSignUp: true,
    sendOnSignIn: true,
    autoSignInAfterVerification: true,
  },
  //all the additional fields will be here
  user: {
    additionalFields: {
      role: {
        type: "string",
        required: true,
        defaultValue: UserRole.MEMBER,
      },
      status: {
        type: "string",
        required: true,
        defaultValue: UserStatus.ACTIVE,
      },
      needPasswordChange: {
        type: "boolean",
        required: true,
        defaultValue: false,
      },
      isDeleted: {
        type: "boolean",
        required: true,
        defaultValue: false,
      },
      deletedAt: {
        type: "date",
        required: false,
        defaultValue: null,
      },
    },
  },

  //   plugins: [
  //     bearer(), // For API authentication using Bearer tokens (access tokens)
  //     emailOTP({
  //       overrideDefaultEmailVerification: true,
  //       async sendVerificationOTP({ email, otp, type }) {
  //         if (type === "email-verification") {
  //           const user = await prisma.user.findUnique({
  //             where: {
  //               email,
  //             },
  //           });

  //           if (!user) {
  //             console.log(
  //               `User with this email ${email} not found. Cannot send verification OTP.`,
  //             );
  //             return;
  //           }
  //           if (user && user.role === Role.SUPER_ADMIN) {
  //             console.log(
  //               `User with this email ${email} is a super admin so skipping sending verification OTP`,
  //             );
  //             return;
  //           }

  //           if ((user && !user.emailVerified) || user.role !== Role.SUPER_ADMIN) {
  //             sendEmail({
  //               to: email,
  //               subject: "Verify your email",
  //               templateName: "otp",
  //               templateData: {
  //                 name: user.name,
  //                 otp,
  //               },
  //             });
  //           }
  //         } else if (type === "forget-password") {
  //           const user = await prisma.user.findUnique({
  //             where: {
  //               email,
  //             },
  //           });
  //           // TODO: Send forget password OTP
  //           if (user) {
  //             sendEmail({
  //               to: email,
  //               subject: "Reset your password",
  //               templateName: "otp",
  //               templateData: {
  //                 name: user.name,
  //                 otp,
  //               },
  //             });
  //           }
  //         }
  //       },

  //       expiresIn: 2 * 60,
  //       otpLength: 6,
  //     }),
  //   ],

  //   session: {
  //     expiresIn: 60 * 60 * 60 * 24, // 1 day in seconds
  //     updateAge: 60 * 60 * 60 * 24 * 7, // 7 day in seconds
  //     cookieCache: {
  //       enabled: true,
  //       maxAge: 60 * 60 * 60 * 24, // 1 day in seconds
  //     },
  //   },
  //   redirectURLs: {
  //     signIn: `${envVars.BETTER_AUTH_URL}/api/v1/auth/google/success`,
  //   },
  //   trustedOrigins: [
  //     envVars.BETTER_AUTH_URL || "http://localhost:8000",
  //     envVars.FRONTEND_URL,
  //   ],
  // advanced: {
  //   useSecureCookies: false,
  //   cookies: {
  //     state: {
  //       attributes: {
  //         sameSite: "none",
  //         secure: true,
  //         httpOnly: true,
  //         path: "/",
  //       },
  //     },
  //     sessionToken: {
  //       attributes: {
  //         sameSite: "none",
  //         secure: true,
  //         httpOnly: true,
  //         path: "/",
  //       },
  //     },
  //   },
  // },
});
