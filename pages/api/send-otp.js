import nodemailer from 'nodemailer';
import redis from '../../lib/redis';
import { getServerSession } from "next-auth/next";
import { authOptions } from "./auth/[...nextauth]";

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const session = await getServerSession(req, res, authOptions);
  if (!session) return res.status(401).json({ message: 'Unauthorized' });

  const userEmail = session.user.email; // The email from Google login

  try {
    // 1. Generate a 6-digit random OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // 2. Save it to Redis. 'EX', 300 means it automatically deletes itself after 5 minutes!
    const redisKey = `mfa_otp_${userEmail}`;
    await redis.set(redisKey, otp, 'EX', 300);

    // 3. Configure Nodemailer with your Gmail credentials
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    // 4. Send the email
    await transporter.sendMail({
      from: `"PulsePlan Security" <${process.env.EMAIL_USER}>`,
      to: userEmail,
      subject: "Your PulsePlan Verification Code",
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
          <h2>Security Verification</h2>
          <p>Your one-time password (OTP) is:</p>
          <h1 style="color: #2563EB; font-size: 40px; letter-spacing: 5px;">${otp}</h1>
          <p>This code will expire in 5 minutes. Do not share it with anyone.</p>
        </div>
      `,
    });

    return res.status(200).json({ message: 'OTP sent to email successfully!' });
  } catch (error) {
    console.error("Email Error:", error);
    return res.status(500).json({ message: 'Failed to send OTP' });
  }
}