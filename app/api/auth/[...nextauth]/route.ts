import NextAuth, { NextAuthOptions } from "next-auth"
import GoogleProvider from "next-auth/providers/google";
import dbConnect from "@/lib/dbconnect";
import { User } from "@/model/User"

export const authOptions: NextAuthOptions = {
    session: {
        strategy: "jwt"
    },
    providers: [GoogleProvider({
        clientId: process.env.GOOGLE_CLIENT_ID as string,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
    })],
    pages: {
        signIn: '/login',
    },
    callbacks: {
        async signIn({ account, profile }) {    
            await dbConnect()
            const baseUsername = profile?.email!.split("@")[0].toLowerCase().replace(/[^a-z0-9]/g, "");
            const randomSuffix = Math.floor(1000 + Math.random() * 9000); 
            const username = `${baseUsername}${randomSuffix}`;
            const user = await User.findOne({ email: profile?.email })
            if (user) {
                return true
            }
            const newUser = await User.create({
                email: profile?.email as string,
                username: username,
                avatar: profile?.image
            })
            await newUser.save();
            return true;
        }
    }
}

const handler = NextAuth(authOptions)

export { handler as GET, handler as POST }