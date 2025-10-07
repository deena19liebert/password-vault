import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '../../../../lib/mongodb';
import { User } from '../../../../models/User';
import { AuthService } from '../../../../lib/auth';

export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();

    const { email, password, twoFactorToken } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: 'Email and password are required' },
        { status: 400 }
      );
    }

    const user = await User.findOne({ email }).select('+refreshTokens');
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Verify password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return NextResponse.json(
        { success: false, error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Check if 2FA is enabled
    if (user.twoFactorEnabled) {
      if (!twoFactorToken) {
        return NextResponse.json({
          success: false,
          requiresTwoFactor: true,
          message: '2FA token required'
        }, { status: 200 });
      }

      // Verify 2FA token
      // This would be implemented with the 2FA service
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Generate tokens
    const { accessToken, refreshToken } = AuthService.generateTokens(user._id.toString(), user.email);
    await user.addRefreshToken(refreshToken);

    const response = NextResponse.json({
      success: true,
      data: {
        user: {
          id: user._id,
          email: user.email,
          twoFactorEnabled: user.twoFactorEnabled
        },
        accessToken
      }
    });

    // Set refresh token as httpOnly cookie
    response.cookies.set('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}