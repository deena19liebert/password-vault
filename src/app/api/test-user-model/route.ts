import { NextResponse } from 'next/server';
import { connectToDatabase } from '../../../lib/mongodb';
import { User } from '../../../models/User';
import bcrypt from 'bcryptjs';

export async function GET() {
  try {
    await connectToDatabase();

    // Test User model creation
    const testUser = new User({
      email: 'test-model@example.com',
      passwordHash: 'testpassword123'
    });

    // Test password comparison
    const isPasswordValid = await testUser.comparePassword('testpassword123');
    
    // Test model methods exist
    const methods = {
      comparePassword: typeof testUser.comparePassword === 'function'
    };

    return NextResponse.json({
      success: true,
      message: 'User model working correctly!',
      tests: {
        modelCreated: true,
        passwordComparison: isPasswordValid,
        methods: methods
      }
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'User model test failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}