import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '../../../../lib/mongodb';
import { VaultItem } from '../../../../models/VaultItem';
import { AuthService } from '../../../../lib/auth';

// GET - Fetch all vault items for the user
export async function GET(request: NextRequest) {
  try {
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

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const category = searchParams.get('category') || '';

    let query: any = { userId: tokenPayload.userId };

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
    
    if (error.message === 'Invalid token' || error.message === 'No token provided') {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to fetch vault items' },
      { status: 500 }
    );
  }
}

// POST - Create a new vault item
export async function POST(request: NextRequest) {
  try {
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
    const { title, username, encryptedPassword, encryptedNotes, url, category, tags, strength } = body;

    console.log('Creating vault item:', { title, username, category });

    if (!title || !username || !encryptedPassword) {
      return NextResponse.json(
        { success: false, error: 'Title, username, and password are required' },
        { status: 400 }
      );
    }

    const vaultItem = new VaultItem({
      userId: tokenPayload.userId,
      title,
      username,
      encryptedPassword,
      encryptedNotes,
      url,
      category: category || 'General',
      tags: tags || [],
      strength: strength || 0
    });

    await vaultItem.save();

    return NextResponse.json({
      success: true,
      data: vaultItem
    }, { status: 201 });
  } catch (error: any) {
    console.error('Create vault item error:', error);
    
    if (error.message === 'Invalid token' || error.message === 'No token provided') {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to create vault item' },
      { status: 500 }
    );
  }
}