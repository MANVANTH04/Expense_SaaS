# alerts.py
import os
import smtplib
from email.message import EmailMessage
from backend.models import Budget, Expense, User
from backend.db import db
from sqlalchemy import func

def send_email(to_email, subject, body):
    host = os.getenv("SMTP_HOST")
    user = os.getenv("SMTP_USER")
    password = os.getenv("SMTP_PASS")
    port = int(os.getenv("SMTP_PORT", 587))
    from_email = os.getenv("FROM_EMAIL")

    if not host or not user or not password or not from_email:
        print("SMTP not configured!")
        return

    msg = EmailMessage()
    msg["Subject"] = subject
    msg["From"] = from_email
    msg["To"] = to_email
    msg.set_content(body)

    try:
        with smtplib.SMTP(host, port) as smtp:
            smtp.starttls()
            smtp.login(user, password)
            smtp.send_message(msg)
        print(f"✅ Email sent to: {to_email}")
    except Exception as e:
        print(f"Error sending email: {e}")

def check_budget(user_id, category, month):
    total = db.session.query(func.sum(Expense.amount)).filter(
        Expense.user_id==user_id,
        Expense.category==category,
        Expense.date.like(f"{month}%")
    ).scalar() or 0.0

    budget = Budget.query.filter_by(user_id=user_id, category=category, month=month).first()
    if not budget:
        return {"status":"no_budget", "spent":total}

    if total > budget.amount:
        user = User.query.get(user_id)
        send_email(user.email, f"[Expense Tracker] Budget Exceeded ({category})",
                   f"Hello {user.name},\nYou exceeded your {category} budget for {month}!\nBudget: {budget.amount}\nSpent: {total}")
        return {"status":"over_budget", "spent":total, "budget":budget.amount}

    percent = budget.low_budget_percent or int(os.getenv("DEFAULT_LOW_BUDGET_PERCENT", 10))
    threshold = budget.amount * (1 - percent/100)
    if total >= threshold:
        user = User.query.get(user_id)
        send_email(user.email, f"[Expense Tracker] Low Budget Alert ({category})",
                   f"Hello {user.name},\nYou are close to your {category} budget for {month}.\nSpent: {total}\nBudget: {budget.amount}")
        return {"status":"low_budget", "spent":total, "budget":budget.amount}

    return {"status":"ok", "spent":total, "budget":budget.amount}