from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.core.config import settings
from app.models.domain import User, UserRole
from app.core.security import get_password_hash
from datetime import datetime

# We use the postgresql+psycopg URI
db_uri = settings.SQLALCHEMY_DATABASE_URI
if "postgresql://" in db_uri:
    db_uri = db_uri.replace("postgresql://", "postgresql+psycopg://")

engine = create_engine(db_uri)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def seed_user():
    db = SessionLocal()
    user = db.query(User).filter(User.email == "admin@example.com").first()
    if not user:
        new_user = User(
            username="admin",
            email="admin@example.com",
            password_hash=get_password_hash("password123"),
            role=UserRole.ADMIN,
            is_active=True,
            created_at=datetime.utcnow()
        )
        db.add(new_user)
        db.commit()
        print("Admin user created: admin@example.com / password123")
    else:
        print("Admin user already exists")
    db.close()

if __name__ == "__main__":
    seed_user()
