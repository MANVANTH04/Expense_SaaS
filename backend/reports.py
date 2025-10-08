# reports.py
from backend.models import Expense, Budget
from backend.db import db
from sqlalchemy import func

def monthly_total(user_id, month):
    total = db.session.query(func.sum(Expense.amount)).filter(
        Expense.user_id==user_id,
        Expense.date.like(f"{month}%")
    ).scalar() or 0.0
    return total

def spending_vs_budget(user_id, month):
    budgets = Budget.query.filter_by(user_id=user_id, month=month).all()
    report = {}
    for b in budgets:
        spent = db.session.query(func.sum(Expense.amount)).filter(
            Expense.user_id==user_id,
            Expense.category==b.category,
            Expense.date.like(f"{month}%")
        ).scalar() or 0.0
        report[b.category] = {"spent": spent, "budget": b.amount}
    return report