from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import and_
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from decimal import Decimal
import uuid

from app.database import get_db
from app.models.user import User
from app.models.asset import Asset
from app.core.dependencies import get_current_user

router = APIRouter()

# Asset types
ASSET_TYPES = ['nisa', 'stock', 'fixed_deposit', 'crypto', 'bond', 'insurance', 'other']

ASSET_TYPE_LABELS = {
    'nisa': 'NISA',
    'stock': '株式',
    'fixed_deposit': '定期預金',
    'crypto': '暗号資産',
    'bond': '債券',
    'insurance': '保険',
    'other': 'その他',
}


# ==================== Pydantic Schemas ====================

class AssetCreate(BaseModel):
    name: str
    asset_type: str
    amount: Decimal
    description: Optional[str] = None


class AssetUpdate(BaseModel):
    name: Optional[str] = None
    asset_type: Optional[str] = None
    amount: Optional[Decimal] = None
    description: Optional[str] = None


class AssetResponse(BaseModel):
    id: uuid.UUID
    name: str
    asset_type: str
    asset_type_label: str
    amount: Decimal
    description: Optional[str]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class AssetTypesResponse(BaseModel):
    types: List[dict]


# ==================== API Endpoints ====================

@router.get("/types", response_model=AssetTypesResponse)
async def get_asset_types():
    """Get available asset types"""
    types = [
        {"value": t, "label": ASSET_TYPE_LABELS[t]}
        for t in ASSET_TYPES
    ]
    return AssetTypesResponse(types=types)


@router.post("/", response_model=AssetResponse, status_code=status.HTTP_201_CREATED)
async def create_asset(
    data: AssetCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new asset"""

    # Validate asset type
    if data.asset_type not in ASSET_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid asset type. Must be one of: {', '.join(ASSET_TYPES)}"
        )

    asset = Asset(
        user_id=current_user.id,
        name=data.name,
        asset_type=data.asset_type,
        amount=data.amount,
        description=data.description
    )

    db.add(asset)
    db.commit()
    db.refresh(asset)

    return AssetResponse(
        id=asset.id,
        name=asset.name,
        asset_type=asset.asset_type,
        asset_type_label=ASSET_TYPE_LABELS.get(asset.asset_type, asset.asset_type),
        amount=asset.amount,
        description=asset.description,
        created_at=asset.created_at,
        updated_at=asset.updated_at
    )


@router.get("/", response_model=List[AssetResponse])
async def get_assets(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all assets for the current user"""

    assets = db.query(Asset).filter(
        Asset.user_id == current_user.id
    ).order_by(Asset.created_at.desc()).all()

    return [
        AssetResponse(
            id=asset.id,
            name=asset.name,
            asset_type=asset.asset_type,
            asset_type_label=ASSET_TYPE_LABELS.get(asset.asset_type, asset.asset_type),
            amount=asset.amount,
            description=asset.description,
            created_at=asset.created_at,
            updated_at=asset.updated_at
        )
        for asset in assets
    ]


@router.get("/{asset_id}", response_model=AssetResponse)
async def get_asset(
    asset_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get a specific asset"""

    asset = db.query(Asset).filter(
        and_(
            Asset.id == asset_id,
            Asset.user_id == current_user.id
        )
    ).first()

    if not asset:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Asset not found"
        )

    return AssetResponse(
        id=asset.id,
        name=asset.name,
        asset_type=asset.asset_type,
        asset_type_label=ASSET_TYPE_LABELS.get(asset.asset_type, asset.asset_type),
        amount=asset.amount,
        description=asset.description,
        created_at=asset.created_at,
        updated_at=asset.updated_at
    )


@router.put("/{asset_id}", response_model=AssetResponse)
async def update_asset(
    asset_id: uuid.UUID,
    data: AssetUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update an asset"""

    asset = db.query(Asset).filter(
        and_(
            Asset.id == asset_id,
            Asset.user_id == current_user.id
        )
    ).first()

    if not asset:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Asset not found"
        )

    # Validate asset type if provided
    if data.asset_type and data.asset_type not in ASSET_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid asset type. Must be one of: {', '.join(ASSET_TYPES)}"
        )

    # Update fields
    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(asset, key, value)

    db.commit()
    db.refresh(asset)

    return AssetResponse(
        id=asset.id,
        name=asset.name,
        asset_type=asset.asset_type,
        asset_type_label=ASSET_TYPE_LABELS.get(asset.asset_type, asset.asset_type),
        amount=asset.amount,
        description=asset.description,
        created_at=asset.created_at,
        updated_at=asset.updated_at
    )


@router.delete("/{asset_id}")
async def delete_asset(
    asset_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete an asset"""

    asset = db.query(Asset).filter(
        and_(
            Asset.id == asset_id,
            Asset.user_id == current_user.id
        )
    ).first()

    if not asset:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Asset not found"
        )

    db.delete(asset)
    db.commit()

    return {"message": "Asset deleted"}
