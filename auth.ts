// auth.ts (v5)
import NextAuth, { NextAuthConfig } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/db/prisma";
import { compareSync } from "bcrypt-ts-edge";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export const config = {
  pages: {
    signIn: "/sign-in", // <-- use absolute paths
    error: "/sign-in",
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60,
  },

  adapter: PrismaAdapter(prisma),
  providers: [
    CredentialsProvider({
      credentials: {
        email: { type: "email" },
        password: { type: "password" },
      },
      async authorize(credentials) {
        if (credentials == null) return null;

        const user = await prisma.user.findFirst({
          where: { email: credentials.email as string },
        });
        if (user && user.password) {
          const isMatch = compareSync(
            credentials.password as string,
            user.password
          );
          if (isMatch) {
            return {
              id: user.id,
              name: user.name,
              email: user.email,
              role: user.role,
            };
          }
        }
        return null;
      },
    }),
  ],
  callbacks: {
    async session({ session, user, trigger, token }: any) {
      session.user.id = token.sub;
      session.user.role = token.role;
      session.user.name = token.name;

      if (trigger === "update") {
        session.user.name = token.name;
      }

      return session;
    },
    async jwt({ token, user, trigger, session }: any) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        if (user.name === "NO_NAME") {
          token.name = user.email!.split("@")[0];
          //Update database to reflect the token name
          await prisma.user.update({
            where: { id: user.id },
            data: { name: token.name },
          });
        }
        //And we want to check to see if the trigger is sign in or sign up. Because that's when we want this to run.
        if (trigger === "signIn" || trigger === "signUp") {
          // So we're going to say if sign in or the trigger is equal to sign up uppercase U. So if that's true, then the first thing I want to do is get the session card ID from the cookie.
          //So let's create a variable.
          const cookiesObject = await cookies();
          const sessionCartId = cookiesObject.get("sessionCartId")?.value;

          if (sessionCartId) {
            const sessionCart = await prisma.cart.findFirst({
              where: { sessionCartId },
            });
            if (sessionCart) {
              //Delete current user cart
              await prisma.cart.deleteMany({
                where: { userId: user.id },
              });
              //Assign now cart
              await prisma.cart.update({
                where: { id: sessionCart.id },
                data: { userId: user.id },
              });
            }
          }
        }
      }
      //Handle session updates
      if (session?.user.name && trigger === "update") {
        token.name = session.user.name;
      }
      return token;
    },
    authorized({ request, auth }: any) {
      // Array of regex patterns of paths we want to protect

      const protectedPaths = [
        /\/shipping-address/,
        /\/payment-method/,
        /\/place-order/,
        /\/profile/,
        /\/user\/(.*)/,
        /\/order\/(.*)/,
        /\/admin/,
      ];

      //Get the pathname from the request url object

      const { pathname } = request.nextUrl;
      // Check if user is not authenticated and accession a protected path
      if (!auth && protectedPaths.some((p) => p.test(pathname))) return false;
      if (!request.cookies.get("sessionCartId")) {
        //We check for the cookie. It's gonna be called sessioncartid and is gonna be a uuID to identify the users cart
        // If is not there we want to create it
        // Generate new session cart id cookie
        const sessionCartId = crypto.randomUUID();
        // Test if it works
        // console.log(sessionCartId);
        // return true;
        // What we need to do now is to return a new response using next response and we need to have the headers and have the cookie that we create in the headers.
        //So we need to clone the requsest headers
        const newRequestHeaders = new Headers(request.headers);

        //create new response and add the new headers
        const response = NextResponse.next({
          request: { headers: newRequestHeaders },
        });
        // Now we want to generate the cookie and add it to the response
        //Set newly generated sessionCartId in the response cookies
        //We set the sessionCartId to the value that is in that sessionCartId variable
        response.cookies.set("sessionCartId", sessionCartId);
        return response;
      } else {
        return true;
      }
    },
  },
} satisfies NextAuthConfig;

export const { handlers, auth, signIn, signOut } = NextAuth(config);
