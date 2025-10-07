import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '../../../../../lib/mongodb';
import { VaultItem } from '../../../../../models/VaultItem';
import { AuthService } from '../../../../../lib/auth';

// PUT - Update a vault item
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params; // ← AWAIT the params
    
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

    const updates = await request.json();

    console.log('Updating vault item:', { id, updates });

    const vaultItem = await VaultItem.findOne({ _id: id, userId: tokenPayload.userId });

    if (!vaultItem) {
      return NextResponse.json(
        { success: false, error: 'Vault item not found' },
        { status: 404 }
      );
    }

    // Update allowed fields
    const allowedUpdates = ['title', 'username', 'encryptedPassword', 'encryptedNotes', 'url', 'category', 'tags', 'strength'];
    allowedUpdates.forEach(field => {
      if (updates[field] !== undefined) {
        (vaultItem as any)[field] = updates[field];
      }
    });

    await vaultItem.save();

    return NextResponse.json({
      success: true,
      data: vaultItem
    });
  } catch (error: any) {
    console.error('Update vault item error:', error);
    
    if (error.message === 'Invalid token' || error.message === 'No token provided') {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to update vault item' },
      { status: 500 }
    );
  }
}

// DELETE - Delete a vault item
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params; // ← AWAIT the params
    
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

    console.log('Deleting vault item:', id);

    const result = await VaultItem.deleteOne({ _id: id, userId: tokenPayload.userId });

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { success: false, error: 'Vault item not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Vault item deleted successfully'
    });
  } catch (error: any) {
    console.error('Delete vault item error:', error);
    
    if (error.message === 'Invalid token' || error.message === 'No token provided') {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to delete vault item' },
      { status: 500 }
    );
  }
}