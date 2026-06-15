import "server-only";
import { compare } from "bcrypt-ts";
import NextAuth, { CredentialsSignin } from "next-auth";
// biome-ignore lint/correctness/noUnusedImports: ...
import type { JWT } from "next-auth/jwt";
import Credentials from "next-auth/providers/credentials";
import { loginSchema } from "./schema/login.schema";

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const validated = loginSchema.safeParse(credentials);
        if (!validated.success) {
          throw new Error(validated.error.message);
        }
        const { username, password } = validated.data;

        const prisma = (await import("./lib/prisma")).default;
        const user = await prisma.users.findUnique({
          where: { username },
        });

        if (!user || !password) {
          throw new CredentialsSignin("Username or password is wrong.");
        }

        const isPasswordValid = await compare(password, user.password);
        if (!isPasswordValid) {
          throw new CredentialsSignin("Username or password is wrong.");
        }
        return user;
      },
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 60 * 60 * 24,
    updateAge: 60 * 60,
  },
  secret: process.env.AUTH_SECRET,
  pages: {
    signIn: "/auth/login",
    error: "/auth/error",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.username = user.username;
        token.name = user.name;
        token.image = user.image;
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }) {
      session.user.id = token.id;
      session.user.username = token.username;
      session.user.name = token.name;
      session.user.image = token.image;
      session.user.role = token.role;
      return session;
    },
  },
});

// Type declarations (tidak berubah)
declare module "next-auth" {
  interface User {
    id: string;
    username: string;
    name: string;
    image: string | null;
    email: string | null;
    role: string;
  }
  interface Session {
    user: User;
    sessionToken: string;
  }
}
declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    username: string;
    name: string;
    image: string | null;
    email: string | null;
    role: string;
  }
}
