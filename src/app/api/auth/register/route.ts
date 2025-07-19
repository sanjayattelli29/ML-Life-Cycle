import { NextRequest, NextResponse } from 'next/server';
import { hash } from 'bcrypt';
import clientPromise from '@/lib/mongodb';
import { sendEmail, generateWelcomeEmail, generateOTP, sendOTPEmail } from '@/utils/emailService';

export async function POST(req: NextRequest) {
  try {
    const { name, email, password, step, otp } = await req.json();

    // Validate input
    if (!email) {
      return NextResponse.json(
        { message: 'Email is required' },
        { status: 400 }
      );
    }

    // Connect to MongoDB
    const client = await clientPromise;
    const db = client.db(process.env.DB_NAME);
    
    // Check if user already exists
    const existingUser = await db.collection('users').findOne({ email });
    if (existingUser) {
      return NextResponse.json(
        { message: 'User with this email already exists' },
        { status: 409 }
      );
    }

    if (step === 'sendOTP') {
      // Generate and send OTP
      const generatedOTP = generateOTP();
      
      // Store OTP in a temporary collection with expiration
      await db.collection('otps').insertOne({
        email,
        otp: generatedOTP,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes expiration
      });

      // Send OTP email
      const otpSent = await sendOTPEmail(email, generatedOTP);
      if (!otpSent) {
        return NextResponse.json(
          { message: 'Failed to send verification code' },
          { status: 500 }
        );
      }

      return NextResponse.json(
        { 
          message: 'Verification code sent successfully',
          otp: generatedOTP // In production, you'd want to remove this and only verify on the server
        },
        { status: 200 }
      );
    } else if (step === 'completeRegistration') {
      if (!name || !password || !otp) {
        return NextResponse.json(
          { message: 'Missing required fields' },
          { status: 400 }
        );
      }

      // Verify OTP
      const otpRecord = await db.collection('otps').findOne({
        email,
        otp,
        expiresAt: { $gt: new Date() }
      });

      if (!otpRecord) {
        return NextResponse.json(
          { message: 'Invalid or expired verification code' },
          { status: 400 }
        );
      }

      // Hash password
      const hashedPassword = await hash(password, 10);

      // Create user
      const result = await db.collection('users').insertOne({
        name,
        email,
        password: hashedPassword,
        emailVerified: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Clean up OTP
      await db.collection('otps').deleteOne({ email });

      // Send welcome email
      console.log('Attempting to send welcome email to new user:', { name, email });
      const welcomeEmail = generateWelcomeEmail(name);
      const emailSent = await sendEmail({
        to: email,
        subject: 'Welcome to Data-VizAI',
        text: welcomeEmail.text,
        html: welcomeEmail.html,
      });

      if (!emailSent) {
        console.error('Failed to send welcome email to:', email);
        return NextResponse.json(
          { 
            message: 'User registered successfully but welcome email could not be sent',
            userId: result.insertedId 
          },
          { status: 201 }
        );
      }

      return NextResponse.json(
        { 
          message: 'User registered successfully',
          userId: result.insertedId 
        },
        { status: 201 }
      );
    } else {
      return NextResponse.json(
        { message: 'Invalid step' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { message: 'An error occurred during registration' },
      { status: 500 }
    );
  }
}
