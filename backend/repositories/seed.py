import logging
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from backend.config.config import settings
from backend.models.models import User
from backend.auth.auth_handler import hash_password

logger = logging.getLogger("placementgpt")

async def seed_first_admin(db: AsyncSession) -> None:
    """Seeds the first admin user into the database if not already present."""
    admin_email = settings.FIRST_ADMIN_EMAIL
    
    # Check if any user with this email already exists
    result = await db.execute(select(User).where(User.email == admin_email))
    admin_user = result.scalar_one_or_none()
    
    if not admin_user:
        logger.info(f"Seeding default admin user: {admin_email}")
        hashed_password = hash_password(settings.FIRST_ADMIN_PASSWORD)
        new_admin = User(
            email=admin_email,
            password_hash=hashed_password,
            role="admin"
        )
        db.add(new_admin)
        await db.commit()
        logger.info("Default admin user seeded successfully.")
    else:
        logger.info("Admin user already exists. Skipping seeding.")
