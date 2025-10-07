import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '../../../../lib/mongodb';
import { User } from '../../../../models/User';
import { AuthService } from '../../../../lib/auth';

export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();

    const { email, password } = await request.json();

    console.log('Registration attempt:', { email, passwordLength: password?.length });

    // Basic validation - ONLY email and password required
    if (!email || !password) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Email and password are required',
          received: { email: !!email, password: !!password }
        },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Password must be at least 8 characters long',
          receivedLength: password.length 
        },
        { status: 400 }
      );
    }

    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'User already exists' 
        },
        { status: 400 }
      );
    }

    // Create user
    const user = new User({
      email: email.toLowerCase().trim(),
      passwordHash: password
    });

    await user.save();
    console.log('User created successfully:', user.email);

    // Generate tokens
    const { accessToken, refreshToken } = AuthService.generateTokens(user._id.toString(), user.email);

    const response = NextResponse.json({
      success: true,
      data: {
        user: {
          id: user._id,
          email: user.email
        },
        accessToken
      }
    }, { status: 201 });

    // Set refresh token as httpOnly cookie
    response.cookies.set('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    return response;

  } catch (error: any) {
    console.error('Registration error details:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Registration failed',
        message: error.message,
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}