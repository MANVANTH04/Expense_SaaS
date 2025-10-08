# init_db.py
from backend.app import create_app
from backend.db import db

app = create_app()

with app.app_context():
    db.create_all()
    print("✅ Database initialized!")