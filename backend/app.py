import os
import random
import time
import calendar
from datetime import datetime
from functools import wraps
from threading import Thread

from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_mail import Mail, Message
from dotenv import load_dotenv

import bcrypt
import jwt
from sqlalchemy import func

from backend.db import db
from backend.models import User, Budget, Expense
from backend.reports import monthly_total, spending_vs_budget

# Load environment variables
load_dotenv()
SECRET_KEY = os.getenv("SECRET_KEY", "secret123")
otp_store = {}  # Temporary in-memory OTP store

# Global Mail instance
mail = Mail()


# ------------- Helper functions ----------------
def send_async_email(app, msg):
    """Send email asynchronously in a thread"""
    with app.app_context():
        mail.send(msg)


def send_email(msg, app):
    """Start a thread to send email"""
    Thread(target=send_async_email, args=(app, msg)).start()


def token_required(f):
    """JWT authentication decorator"""
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        if "Authorization" in request.headers:
            try:
                token = request.headers["Authorization"].split(" ")[1]
            except Exception:
                return jsonify({"error": "Token format invalid"}), 401
        if not token:
            return jsonify({"error": "Token is missing"}), 401
        try:
            data = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
            current_user = User.query.get(data["user_id"])
            if not current_user:
                return jsonify({"error": "User not found"}), 404
        except Exception:
            return jsonify({"error": "Token is invalid"}), 401
        return f(current_user, *args, **kwargs)
    return decorated


# ------------- Flask App Factory ----------------
def create_app():
    BASE_DIR = os.path.abspath(os.path.dirname(__file__))  # backend/
    INSTANCE_DIR = os.path.join(BASE_DIR, "instance")
    TEMPLATE_DIR = os.path.join(BASE_DIR, "templates")
    STATIC_DIR = os.path.join(BASE_DIR, "static")

    # Ensure instance folder exists
    os.makedirs(INSTANCE_DIR, exist_ok=True)

    app = Flask(
        __name__,
        template_folder=TEMPLATE_DIR,
        static_folder=STATIC_DIR
    )
    CORS(app, resources={r"/*": {"origins": "http://localhost:5173"}})

    # --- Database setup ---
    DB_PATH = os.path.join(INSTANCE_DIR, "expenses.db")
    app.config["SQLALCHEMY_DATABASE_URI"] = f"sqlite:///{DB_PATH}"
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
    db.init_app(app)

    # --- Mail setup ---
    app.config["MAIL_SERVER"] = os.getenv("MAIL_SERVER")
    app.config["MAIL_PORT"] = int(os.getenv("MAIL_PORT", 587))
    app.config["MAIL_USE_TLS"] = os.getenv("MAIL_USE_TLS", "True") == "True"
    app.config["MAIL_USERNAME"] = os.getenv("MAIL_USERNAME")
    app.config["MAIL_PASSWORD"] = os.getenv("MAIL_PASSWORD")
    app.config["MAIL_DEFAULT_SENDER"] = os.getenv(
        "MAIL_DEFAULT_SENDER", app.config["MAIL_USERNAME"]
    )
    mail.init_app(app)

    # --- Ensure DB tables ---
    with app.app_context():
        db.create_all()

    # ------------- Routes ----------------

    # Test email route
    @app.route("/test-email")
    def test_email():
        try:
            msg = Message(
                subject="Test Email",
                recipients=[os.getenv("MAIL_USERNAME")],
                body="This is a test email from Budget Tracker."
            )
            send_email(msg, app)
            return "Email sent (check inbox/spam)"
        except Exception as e:
            return f"Email failed: {e}"

    # ---------- OTP Signup Request ----------
    @app.route("/auth/signup/request", methods=["POST"])
    def signup_request():
        data = request.json or {}
        email = data.get("email")
        if not email:
            return jsonify({"error": "Email required"}), 400

        if User.query.filter_by(email=email).first():
            return jsonify({"error": "User already exists"}), 400

        otp = str(random.randint(100000, 999999))
        otp_store[email] = {"otp": otp, "time": time.time()}

        try:
            html_content = f"""
            <div style="font-family: Arial, sans-serif; padding: 20px; border-radius: 10px;">
              <h2>Budget Tracker — OTP</h2>
              <p>Your signup OTP is:</p>
              <h1 style="color:#2E86C1;">{otp}</h1>
              <p>This OTP expires in 5 minutes.</p>
            </div>
            """
            msg = Message(
                subject="Your OTP Code for Budget Tracker",
                recipients=[email],
                html=html_content,
            )
            send_email(msg, app)
            return jsonify({"message": "OTP sent to email"}), 200
        except Exception as e:
            print("Email send error:", e)
            return jsonify({"error": "Failed to send OTP"}), 500

    # ---------- OTP Signup Verify ----------
    @app.route("/auth/signup/verify", methods=["POST"])
    def signup_verify():
        data = request.json or {}
        name = data.get("name")
        email = data.get("email")
        password = data.get("password")
        user_otp = data.get("otp")

        if not all([name, email, password, user_otp]):
            return jsonify({"error": "All fields are required"}), 400

        if email not in otp_store:
            return jsonify({"error": "No OTP found. Please request again."}), 400

        saved = otp_store[email]
        if time.time() - saved["time"] > 300:  # 5 minutes
            del otp_store[email]
            return jsonify({"error": "OTP expired"}), 400

        if saved["otp"] != user_otp:
            return jsonify({"error": "Invalid OTP"}), 400

        hashed_password = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt())
        new_user = User(name=name, email=email, password=hashed_password.decode("utf-8"))
        db.session.add(new_user)
        db.session.commit()
        del otp_store[email]

        token = jwt.encode({"user_id": new_user.id}, SECRET_KEY, algorithm="HS256")
        return jsonify({"user_id": new_user.id, "email": new_user.email, "access_token": token})

    # ---------- Traditional Signup ----------
    @app.route("/auth/signup", methods=["POST"])
    def signup_plain():
        data = request.json or {}
        name = data.get("name")
        email = data.get("email")
        password = data.get("password")

        if not name or not email or not password:
            return jsonify({"error": "All fields are required"}), 400

        if User.query.filter_by(email=email).first():
            return jsonify({"error": "User already exists"}), 400

        hashed_password = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt())
        new_user = User(name=name, email=email, password=hashed_password.decode("utf-8"))
        db.session.add(new_user)
        db.session.commit()

        token = jwt.encode({"user_id": new_user.id}, SECRET_KEY, algorithm="HS256")
        return jsonify({"user_id": new_user.id, "email": new_user.email, "access_token": token})

    # ---------- Login ----------
    @app.route("/auth/login", methods=["POST"])
    def login():
        data = request.json or {}
        email = data.get("email")
        password = data.get("password")

        user = User.query.filter_by(email=email).first()
        if not user:
            return jsonify({"error": "Invalid credentials"}), 401

        try:
            if not bcrypt.checkpw(password.encode("utf-8"), user.password.encode("utf-8")):
                return jsonify({"error": "Invalid credentials"}), 401
        except Exception as e:
            print("bcrypt error:", e)
            return jsonify({"error": "Invalid credentials"}), 401

        token = jwt.encode({"user_id": user.id}, SECRET_KEY, algorithm="HS256")
        return jsonify({"user_id": user.id, "email": user.email, "access_token": token})

    # ---------- Add Budget ----------
    @app.route("/users/budgets", methods=["POST"])
    @token_required
    def add_budget(current_user):
        data = request.json or {}
        category = data.get("category")
        month = data.get("month")
        amount = data.get("amount")
        if not all([category, month, amount]):
            return jsonify({"error": "category, month and amount required"}), 400

        existing = Budget.query.filter_by(user_id=current_user.id, category=category, month=month).first()
        if existing:
            return jsonify({"error": "Budget already set for this category and month"}), 400

        b = Budget(user_id=current_user.id, category=category, month=month, amount=float(amount),
                   low_budget_percent=data.get("low_budget_percent"))
        db.session.add(b)
        db.session.commit()
        return jsonify({"budget_id": b.id})

    # ---------- Add Expense ----------
    @app.route("/users/expenses", methods=["POST"])
    @token_required
    def add_expense(current_user):
        data = request.json or {}
        category = data.get("category")
        amount = data.get("amount")
        date_str = data.get("date")
        split_emails = data.get("split_emails", [])

        if not category or amount is None or not date_str:
            return jsonify({"error": "Category, amount and date are required"}), 400

        try:
            amount = float(amount)
        except Exception:
            return jsonify({"error": "Invalid amount"}), 400

        try:
            date_obj = datetime.strptime(date_str, "%Y-%m-%d")
            month_str = date_obj.strftime("%Y-%m")
        except Exception:
            return jsonify({"error": "Date must be YYYY-MM-DD"}), 400

        budget = Budget.query.filter_by(user_id=current_user.id, category=category, month=month_str).first()
        if not budget:
            month_name = calendar.month_name[date_obj.month]
            return jsonify({"error": f"Please set the budget for {month_name} before adding expenses in {category}."}), 400

        total_spent_before = db.session.query(func.coalesce(func.sum(Expense.amount), 0.0)).filter(
            Expense.user_id == current_user.id,
            Expense.category == category,
            Expense.date.like(f"{month_str}%")
        ).scalar() or 0.0

        new_total = total_spent_before + amount
        budget_limit = budget.amount
        used_percent = (new_total / budget_limit) * 100

        # --- Case 1: exceeds budget ---
        if new_total > budget_limit:
            try:
                html_content = f"""
                <div style='font-family:Arial,sans-serif;padding:18px;border-radius:8px;'>
                <h2 style='color:#E74C3C;'>Budget Limit Exceeded</h2>
                <p>Hi {current_user.name or current_user.email},</p>
                <p>Your <strong>{category}</strong> budget for <strong>{month_str}</strong> is <strong>{budget.amount}</strong>.</p>
                <p>Attempted expense: <strong>{amount}</strong>.</p>
                <p>Total if added: <strong>{new_total}</strong> — this exceeds your budget.</p>
                <p>Please review before proceeding.</p>
                <p style='font-size:12px;color:#666;'>— Budget Tracker</p>
                </div>
                """
                msg = Message(
                    subject=f"⚠️ Budget Exceeded — {category} ({month_str})",
                    recipients=[current_user.email],
                    html=html_content
                )
                send_email(msg, app)
            except Exception as e:
                print("Email alert error:", e)

            return jsonify({
                "error": f"Adding this expense would exceed your {category} budget for {month_str}.",
                "status": "exceeded"
            }), 400

        # --- Case 2: between 90% and 100% ---
        elif 90 <= used_percent <= 100:
            e = Expense(user_id=current_user.id, category=category, amount=amount, date=date_str)
            db.session.add(e)
            db.session.commit()

            # 90% warning email
            try:
                html_content = f"""
                <div style='font-family:Arial,sans-serif;padding:18px;border-radius:8px;'>
                <h2 style='color:#F39C12;'>Budget Usage Warning</h2>
                <p>Hi {current_user.name or current_user.email},</p>
                <p>You've used <strong>{used_percent:.2f}%</strong> of your <strong>{category}</strong> budget for <strong>{month_str}</strong>.</p>
                <p>Total spent: <strong>{new_total}</strong> / Budget: <strong>{budget_limit}</strong>.</p>
                <p>Be mindful of remaining funds.</p>
                <p style='font-size:12px;color:#666;'>— Budget Tracker</p>
                </div>
                """
                msg = Message(
                    subject=f"⚠️ 90% Budget Warning — {category} ({month_str})",
                    recipients=[current_user.email],
                    html=html_content
                )
                send_email(msg, app)
            except Exception as e:
                print("Email 90% alert error:", e)

            # Split emails
            if split_emails:
                split_amount = round(amount / (len(split_emails) + 1), 2)
                for email in split_emails:
                    try:
                        html_split = f"""
                        <div style='font-family:Arial,sans-serif;padding:18px;border-radius:8px;'>
                        <h2>Split Expense Notification</h2>
                        <p>Hi,</p>
                        <p>{current_user.name or current_user.email} added an expense of <strong>{amount}</strong> in <strong>{category}</strong>.</p>
                        <p>You owe: <strong>{split_amount}</strong>.</p>
                        <p style='font-size:12px;color:#666;'>— Budget Tracker</p>
                        </div>
                        """
                        msg_split = Message(
                            subject=f"💰 Split Expense — {category}",
                            recipients=[email],
                            html=html_split
                        )
                        send_email(msg_split, app)
                    except Exception as e:
                        print("Split email error:", e)

            return jsonify({
                "message": f"Expense added successfully, but you've used {used_percent:.2f}% of your {category} budget.",
                "status": "warning_90",
                "expense_id": e.id
            }), 200

        # --- Case 3: normal <90% ---
        else:
            e = Expense(user_id=current_user.id, category=category, amount=amount, date=date_str)
            db.session.add(e)
            db.session.commit()

            if split_emails:
                split_amount = round(amount / (len(split_emails) + 1), 2)
                for email in split_emails:
                    try:
                        html_split = f"""
                        <div style='font-family:Arial,sans-serif;padding:18px;border-radius:8px;'>
                        <h2>Split Expense Notification</h2>
                        <p>Hi,</p>
                        <p>{current_user.name or current_user.email} added an expense of <strong>{amount}</strong> in <strong>{category}</strong>.</p>
                        <p>You owe: <strong>{split_amount}</strong>.</p>
                        <p style='font-size:12px;color:#666;'>— Budget Tracker</p>
                        </div>
                        """
                        msg_split = Message(
                            subject=f"💰 Split Expense — {category}",
                            recipients=[email],
                            html=html_split
                        )
                        send_email(msg_split, app)
                    except Exception as e:
                        print("Split email error:", e)

            return jsonify({
                "message": "Expense added successfully.",
                "status": "success",
                "expense_id": e.id
            }), 200

    # ---------- Verify Emails ----------
    @app.route("/users/verify_emails", methods=["POST"])
    @token_required
    def verify_emails(current_user):
        data = request.json or {}
        emails = data.get("emails", [])
        if not emails:
            return jsonify({"error": "No emails provided"}), 400

        verified = []
        invalid = []
        for email in emails:
            user = User.query.filter_by(email=email).first()
            if user:
                verified.append({"email": email, "user_id": user.id})
            else:
                invalid.append(email)

        return jsonify({"verified": verified, "invalid": invalid})

    # ---------- Reports ----------
    @app.route("/users/reports", methods=["GET"])
    @token_required
    def report(current_user):
        month = request.args.get("month")
        if not month:
            return jsonify({"error": "month required"}), 400
        return jsonify({
            "total": monthly_total(current_user.id, month),
            "breakdown": spending_vs_budget(current_user.id, month)
        })

    return app


if __name__ == "__main__":
    app = create_app()
    app.run(debug=True)