import redis from '../../lib/redis';
import { getServerSession } from "next-auth/next";
import { authOptions } from "./auth/[...nextauth]";

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const session = await getServerSession(req, res, authOptions);
  if (!session) return res.status(401).json({ message: 'Unauthorized' });

  const userEmail = session.user.email;
  const { code } = req.body; // The code the user typed in

  try {
    const redisKey = `mfa_otp_${userEmail}`;
    
    // 1. Grab the correct OTP from Redis
    const validOtp = await redis.get(redisKey);

    // 2. Check if it exists or expired
    if (!validOtp) {
      return res.status(400).json({ message: 'OTP expired or not found. Please request a new one.' });
    }

    // 3. Compare the codes
    if (validOtp === code.toString()) {
      // 🚨 CRITICAL: Delete the OTP immediately after use so it can't be reused by a hacker
      await redis.del(redisKey);
      
      return res.status(200).json({ message: 'Verification successful!' });
    } else {
      return res.status(400).json({ message: 'Invalid OTP. Try again.' });
    }

  } catch (error) {
    return res.status(500).json({ message: 'Server error during verification' });
  }
}