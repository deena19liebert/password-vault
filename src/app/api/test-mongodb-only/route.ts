import { NextResponse } from 'next/server';
import { connectToDatabase } from '../../../lib/mongodb';

export async function GET() {
  try {
    console.log('Testing MongoDB connection...');
    console.log('MongoDB URI:', process.env.MONGODB_URI ? 'Exists' : 'Missing');
    
    await connectToDatabase();
    
    return NextResponse.json({
      success: true,
      message: 'MongoDB connected successfully!'
    });
  } catch (error: any) {
    console.error('MongoDB connection error details:', error);
    
    return NextResponse.json({
      success: false,
      error: 'MongoDB connection failed',
      message: error.message,
      details: {
        hasMongoURI: !!process.env.MONGODB_URI,
        errorName: error.name,
        errorCode: error.code
      }
    }, { status: 500 });
  }
}