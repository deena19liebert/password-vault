import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '../../../../lib/auth';
import { connectToDatabase } from '../../../../lib/mongodb';
import { User } from '../../../../models/User';

export async function POST(request: NextRequest) {
  try {
    const { refreshToken } = await request.json();

    if (!refreshToken) {
      return NextResponse.json(
        { success: false, error: 'Refresh token required' },
        { status: 400 }
      );
    }

    // Verify the refresh token
    let tokenPayload;
    try {
      tokenPayload = AuthService.verifyRefreshToken(refreshToken);
    } catch (error) {
      return NextResponse.json(
        { success: false, error: 'Invalid refresh token' },
        { status: 401 }
      );
    }

    await connectToDatabase();

    // Check if user still exists
    const user = await User.findById(tokenPayload.userId);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    // Generate new tokens
    const { accessToken, refreshToken: newRefreshToken } = AuthService.generateTokens(
      user._id.toString(),
      user.email
    );

    const response = NextResponse.json({
      success: true,
      data: {
        accessToken,
        refreshToken: newRefreshToken
      }
    });

    // Set new refresh token as httpOnly cookie
    response.cookies.set('refreshToken', newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    return response;

  } catch (error) {
    console.error('Token refresh error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to refresh token' },
      { status: 500 }
    );
  }
}