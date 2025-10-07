import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '../../../../lib/mongodb';
import { VaultItem } from '../../../../models/VaultItem';
import { AuthService } from '../../../../lib/auth';

export async function GET(request: NextRequest) {
  try {
    console.log('=== VAULT DEBUG START ===');
    
    // Check authentication
    const authHeader = request.headers.get('authorization');
    console.log('Auth header exists:', !!authHeader);
    
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: 'No token provided' },
        { status: 401 }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    console.log('Token length:', token.length);
    
    let tokenPayload;
    try {
      tokenPayload = AuthService.verifyAccessToken(token);
      console.log('Token verified for user:', tokenPayload.userId);
    } catch (tokenError: any) {
      console.log('Token verification failed:', tokenError.message);
      return NextResponse.json(
        { success: false, error: 'Invalid token' },
        { status: 401 }
      );
    }

    // Check database connection
    try {
      await connectToDatabase();
      console.log('Database connected successfully');
    } catch (dbError: any) {
      console.log('Database connection failed:', dbError.message);
      return NextResponse.json(
        { success: false, error: 'Database connection failed' },
        { status: 500 }
      );
    }

    // Try to fetch items
    try {
      const items = await VaultItem.find({ userId: tokenPayload.userId });
      console.log('Found items:', items.length);
      
      return NextResponse.json({
        success: true,
        debug: {
          user: tokenPayload.userId,
          itemsCount: items.length,
          database: 'connected',
          authentication: 'valid'
        },
        data: items
      });
    } catch (queryError: any) {
      console.log('Query failed:', queryError.message);
      return NextResponse.json(
        { success: false, error: 'Query failed: ' + queryError.message },
        { status: 500 }
      );
    }

  } catch (error: any) {
    console.log('Unexpected error:', error.message);
    return NextResponse.json(
      { success: false, error: 'Unexpected error: ' + error.message },
      { status: 500 }
    );
  }
}