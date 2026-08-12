import { PrismaAdapter } from '@auth/prisma-adapter';
import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { prisma } from '@/data/prismaClient';
import { authenticateWithCredentials } from './credentials';

export const { handlers, auth, signIn, signOut } = NextAuth({
  // PrismaAdapter требует «сырой» PrismaClient instance — единственное
  // оправданное исключение из правила «весь доступ к БД через репозитории»
  // (CLAUDE.md §3.1/§4.1): это контракт стороннего адаптера, не наш
  // domain-код. Собственная логика (authenticateWithCredentials) по-прежнему
  // идёт через userRepository.
  adapter: PrismaAdapter(prisma),
  // Credentials provider не поддерживает "database" session strategy —
  // обязателен JWT (проверено по документации Auth.js перед реализацией,
  // см. DECISIONS.md D-0009).
  session: { strategy: 'jwt' },
  // Task 2.2 — своя страница входа вместо встроенной страницы Auth.js.
  pages: { signIn: '/login' },
  providers: [
    Credentials({
      credentials: {
        email: {},
        password: {},
      },
      authorize: async (credentials) => {
        const email = credentials?.email;
        const password = credentials?.password;
        if (typeof email !== 'string' || typeof password !== 'string') {
          return null;
        }
        return authenticateWithCredentials(email, password);
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && typeof token.id === 'string') {
        session.user.id = token.id;
      }
      return session;
    },
  },
});
