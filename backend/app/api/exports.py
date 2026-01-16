from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from typing import Optional
from datetime import date
from io import StringIO
import csv

from app.database import get_db
from app.models.user import User
from app.models.transaction import Transaction
from app.core.dependencies import get_current_user
from app.api.analytics import get_transactions_query, get_monthly_report, get_yearly_report

router = APIRouter()


def generate_csv_content(headers: list, rows: list) -> str:
    """Generate CSV content with UTF-8 BOM for Excel compatibility"""
    output = StringIO()
    # Write UTF-8 BOM for Excel
    output.write('\ufeff')

    writer = csv.writer(output)
    writer.writerow(headers)
    writer.writerows(rows)

    return output.getvalue()


@router.get("/csv")
async def export_transactions_csv(
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    scope: str = Query('personal', pattern="^(personal|couple)$"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Export transactions to CSV"""

    query = get_transactions_query(db, current_user, scope)

    if start_date:
        query = query.filter(Transaction.date >= start_date)
    if end_date:
        query = query.filter(Transaction.date <= end_date)

    query = query.order_by(Transaction.date.desc())
    transactions = query.all()

    # Define headers in Japanese
    headers = [
        '日付',
        '種別',
        'カテゴリ',
        '金額',
        '説明',
        '分割',
        '元の金額'
    ]

    # Build rows
    rows = []
    for trans in transactions:
        rows.append([
            trans.date.isoformat(),
            '収入' if trans.type == 'income' else '支出',
            trans.category,
            str(trans.amount),
            trans.description or '',
            'はい' if trans.is_split else 'いいえ',
            str(trans.original_amount) if trans.original_amount else ''
        ])

    # Generate CSV
    csv_content = generate_csv_content(headers, rows)

    # Generate filename
    date_range = ''
    if start_date and end_date:
        date_range = f"_{start_date.isoformat()}_to_{end_date.isoformat()}"
    elif start_date:
        date_range = f"_from_{start_date.isoformat()}"
    elif end_date:
        date_range = f"_to_{end_date.isoformat()}"

    filename = f"kakepple_transactions_{scope}{date_range}.csv"

    return StreamingResponse(
        iter([csv_content]),
        media_type="text/csv; charset=utf-8",
        headers={
            "Content-Disposition": f"attachment; filename={filename}"
        }
    )


@router.get("/csv/report/monthly")
async def export_monthly_report_csv(
    year: int,
    month: int,
    scope: str = Query('personal', pattern="^(personal|couple)$"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Export monthly report to CSV"""

    report = await get_monthly_report(year, month, scope, current_user, db)

    # Build CSV with multiple sections
    output = StringIO()
    output.write('\ufeff')  # UTF-8 BOM
    writer = csv.writer(output)

    # Title
    writer.writerow([f'{year}年{month}月 月次レポート ({scope})'])
    writer.writerow([])

    # Summary section
    writer.writerow(['サマリ'])
    writer.writerow(['項目', '金額'])
    writer.writerow(['総収入', report.summary.total_income])
    writer.writerow(['総支出', report.summary.total_expense])
    writer.writerow(['残高', report.summary.balance])
    writer.writerow(['取引数', report.summary.transaction_count])
    writer.writerow([])

    # Income category breakdown
    if report.category_analysis.income_breakdown:
        writer.writerow(['収入カテゴリ別内訳'])
        writer.writerow(['カテゴリ', '金額', '割合(%)', '取引数'])
        for item in report.category_analysis.income_breakdown:
            writer.writerow([
                item.category,
                str(item.total),
                f'{item.percentage:.1f}',
                item.transaction_count
            ])
        writer.writerow([])

    # Expense category breakdown
    if report.category_analysis.expense_breakdown:
        writer.writerow(['支出カテゴリ別内訳'])
        writer.writerow(['カテゴリ', '金額', '割合(%)', '取引数'])
        for item in report.category_analysis.expense_breakdown:
            writer.writerow([
                item.category,
                str(item.total),
                f'{item.percentage:.1f}',
                item.transaction_count
            ])
        writer.writerow([])

    # Budget status
    if report.budget_status:
        writer.writerow(['予算ステータス'])
        writer.writerow(['種別', 'カテゴリ', '予算額', '使用額', '使用率(%)', '超過'])
        for budget in report.budget_status:
            budget_type_jp = 'カテゴリ別' if budget.budget_type == 'category' else '月次総額'
            writer.writerow([
                budget_type_jp,
                budget.category or '-',
                str(budget.amount),
                str(budget.current_spent or 0),
                f'{budget.percentage or 0:.1f}',
                'はい' if budget.is_exceeded else 'いいえ'
            ])
        writer.writerow([])

    # Daily time series
    if report.time_series:
        writer.writerow(['日次推移'])
        writer.writerow(['日付', '収入', '支出', '残高'])
        for item in report.time_series:
            writer.writerow([
                item.date,
                str(item.income),
                str(item.expense),
                str(item.balance)
            ])

    csv_content = output.getvalue()
    filename = f"kakepple_monthly_report_{scope}_{year}_{month:02d}.csv"

    return StreamingResponse(
        iter([csv_content]),
        media_type="text/csv; charset=utf-8",
        headers={
            "Content-Disposition": f"attachment; filename={filename}"
        }
    )


@router.get("/csv/report/yearly")
async def export_yearly_report_csv(
    year: int,
    scope: str = Query('personal', pattern="^(personal|couple)$"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Export yearly report to CSV"""

    report = await get_yearly_report(year, scope, current_user, db)

    # Build CSV with multiple sections
    output = StringIO()
    output.write('\ufeff')  # UTF-8 BOM
    writer = csv.writer(output)

    # Title
    writer.writerow([f'{year}年 年次レポート ({scope})'])
    writer.writerow([])

    # Summary section
    writer.writerow(['サマリ'])
    writer.writerow(['項目', '金額'])
    writer.writerow(['総収入', report.summary.total_income])
    writer.writerow(['総支出', report.summary.total_expense])
    writer.writerow(['残高', report.summary.balance])
    writer.writerow(['取引数', report.summary.transaction_count])
    writer.writerow([])

    # Income category breakdown
    if report.category_analysis.income_breakdown:
        writer.writerow(['収入カテゴリ別内訳'])
        writer.writerow(['カテゴリ', '金額', '割合(%)', '取引数'])
        for item in report.category_analysis.income_breakdown:
            writer.writerow([
                item.category,
                str(item.total),
                f'{item.percentage:.1f}',
                item.transaction_count
            ])
        writer.writerow([])

    # Expense category breakdown
    if report.category_analysis.expense_breakdown:
        writer.writerow(['支出カテゴリ別内訳'])
        writer.writerow(['カテゴリ', '金額', '割合(%)', '取引数'])
        for item in report.category_analysis.expense_breakdown:
            writer.writerow([
                item.category,
                str(item.total),
                f'{item.percentage:.1f}',
                item.transaction_count
            ])
        writer.writerow([])

    # Monthly time series
    if report.time_series:
        writer.writerow(['月次推移'])
        writer.writerow(['月', '収入', '支出', '残高'])
        for item in report.time_series:
            writer.writerow([
                item.label,
                str(item.income),
                str(item.expense),
                str(item.balance)
            ])

    csv_content = output.getvalue()
    filename = f"kakepple_yearly_report_{scope}_{year}.csv"

    return StreamingResponse(
        iter([csv_content]),
        media_type="text/csv; charset=utf-8",
        headers={
            "Content-Disposition": f"attachment; filename={filename}"
        }
    )
