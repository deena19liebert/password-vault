import { NextResponse } from 'next/server';
import { connectToDatabase } from '../../../lib/mongodb';
import { User } from '../../../models/User';
import { AuthService } from '../../../lib/auth';

export async function GET() {
  try {
    // Test database connection
    await connectToDatabase();
    
    // Test User model
    const testUser = new User({
      email: 'test@example.com',
      passwordHash: 'testpassword123'
    });
    
    // Test JWT
    const token = AuthService.generateAccessToken('test', 'test@example.com');
    const decoded = AuthService.verifyAccessToken(token);

    return NextResponse.json({
      success: true,
      message: 'All systems working correctly!',
      tests: {
        database: 'Connected',
        userModel: 'Loaded',
        jwt: 'Working',
        tokenVerified: decoded.email === 'test@example.com'
      }
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'System test failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}