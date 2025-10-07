import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    success: true,
    environment: {
      nodeEnv: process.env.NODE_ENV,
      hasMongoURI: !!process.env.MONGODB_URI,
      hasJWTSecret: !!process.env.JWT_SECRET,
      hasJWTRefreshSecret: !!process.env.JWT_REFRESH_SECRET,
      mongoURI: process.env.MONGODB_URI ? '***' + process.env.MONGODB_URI.slice(-20) : 'Missing',
      jwtSecret: process.env.JWT_SECRET ? '***' + process.env.JWT_SECRET.slice(-10) : 'Missing',
      jwtRefreshSecret: process.env.JWT_REFRESH_SECRET ? '***' + process.env.JWT_REFRESH_SECRET.slice(-10) : 'Missing'
    }
  });
}