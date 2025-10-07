import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '../../../../lib/mongodb';
import { VaultItem } from '../../../../models/VaultItem';
import { AuthService } from '../../../../lib/auth';

async function verifyToken(request: NextRequest): Promise<{ success: boolean; payload?: TokenPayload; error?: string }> {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return { success: false, error: 'No token provided' };
    }

    const token = authHeader.replace('Bearer ', '');
    const tokenPayload = AuthService.verifyAccessToken(token);
    
    return { success: true, payload: tokenPayload };
  } catch (error: any) {
    if (error.message === 'Token expired') {
      return { success: false, error: 'Token expired' };
    }
    return { success: false, error: 'Invalid token' };
  }
}

export async function GET(request: NextRequest) {
  try {
    const tokenResult = await verifyToken(request);
    
    if (!tokenResult.success) {
      if (tokenResult.error === 'Token expired') {
        return NextResponse.json(
          { success: false, error: 'Token expired', code: 'TOKEN_EXPIRED' },
          { status: 401 }
        );
      }
      return NextResponse.json(
        { success: false, error: tokenResult.error },
        { status: 401 }
      );
    }

    await connectToDatabase();

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const category = searchParams.get('category') || '';

    let query: any = { userId: tokenResult.payload!.userId };

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { username: { $regex: search, $options: 'i' } },
        { url: { $regex: search, $options: 'i' } }
      ];
    }

    if (category && category !== 'all') {
      query.category = category;
    }

    const items = await VaultItem.find(query).sort({ updatedAt: -1 });

    return NextResponse.json({
      success: true,
      data: items
    });
  } catch (error: any) {
    console.error('Get vault items error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch vault items' },
      { status: 500 }
    );
  }
}



export async function POST(request: NextRequest) {
  try {
    console.log('🔄 POST /api/vault/items - Starting request...');

    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: 'No token provided' },
        { status: 401 }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const tokenPayload = AuthService.verifyAccessToken(token);

    await connectToDatabase();

    const body = await request.json();
    console.log('🔍 Creating vault item with data:', {
      title: body.title,
      username: body.username,
      hasPassword: !!body.encryptedPassword,
      category: body.category
    });

    if (!body.title || !body.username || !body.encryptedPassword) {
      return NextResponse.json(
        { success: false, error: 'Title, username, and password are required' },
        { status: 400 }
      );
    }

    const vaultItem = new VaultItem({
      userId: tokenPayload.userId,
      title: body.title,
      username: body.username,
      encryptedPassword: body.encryptedPassword,
      encryptedNotes: body.encryptedNotes,
      url: body.url,
      category: body.category || 'General',
      tags: body.tags || [],
      strength: body.strength || 0
    });

    await vaultItem.save();
    console.log('✅ Vault item created successfully');

    return NextResponse.json({
      success: true,
      data: vaultItem
    }, { status: 201 });
  } catch (error: any) {
    console.log('❌ Error in POST /api/vault/items:', error.message);
    return NextResponse.json(
      { success: false, error: 'Failed to create vault item' },
      { status: 500 }
    );
  }
}