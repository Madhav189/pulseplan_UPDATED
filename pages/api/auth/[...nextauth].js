import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";

export const authOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  ],
  secret: process.env.NEXTAUTH_SECRET,
  callbacks: {
    // This attaches the user's Google email to our session so we can use it in MySQL
    async session({ session, token }) {
      session.user.id = token.email; // Using email as the unique user ID
      return session;
    },
  },
};

export default NextAuth(authOptions);