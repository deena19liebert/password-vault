import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '../../../lib/mongodb';
import { User } from '../../../models/User';

export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();

    const body = await request.json();
    console.log('Registration attempt with:', { 
      email: body.email, 
      hasPassword: !!body.password,
      passwordLength: body.password?.length 
    });

    const { email, password } = body;

    // Validation checks
    if (!email || !password) {
      return NextResponse.json({
        success: false,
        error: 'Email and password are required',
        details: { email: !!email, password: !!password }
      }, { status: 400 });
    }

    if (password.length < 8) {
      return NextResponse.json({
        success: false,
        error: 'Password must be at least 8 characters long',
        details: { passwordLength: password.length }
      }, { status: 400 });
    }

    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return NextResponse.json({
        success: false,
        error: 'User already exists',
        details: { existingEmail: existingUser.email }
      }, { status: 400 });
    }

    // Test user creation
    const testUser = new User({
      email,
      passwordHash: password
    });

    console.log('User model created successfully');

    return NextResponse.json({
      success: true,
      message: 'All validation passed - ready to create user',
      data: {
        email,
        passwordLength: password.length
      }
    });

  } catch (error: any) {
    console.error('Debug registration error:', error);
    return NextResponse.json({
      success: false,
      error: 'Registration failed',
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 });
  }
}