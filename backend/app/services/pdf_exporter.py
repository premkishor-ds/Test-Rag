import io
from reportlab.lib.pagesizes import letter
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors

def generate_pdf_report(stock_data: dict, report_data: dict) -> io.BytesIO:
    buffer = io.BytesIO()
    
    # 1. Page Template & Doc setup
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        rightMargin=40,
        leftMargin=40,
        topMargin=40,
        bottomMargin=40
    )
    
    styles = getSampleStyleSheet()
    
    # Custom Palette
    primary_color = colors.HexColor("#0f172a") # Slate 900
    accent_color = colors.HexColor("#0284c7")  # Sky 600
    text_color = colors.HexColor("#334155")    # Slate 700
    
    # Modify defaults
    styles['Normal'].textColor = text_color
    styles['Normal'].fontSize = 10
    styles['Normal'].leading = 14
    
    # Custom styles
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=24,
        leading=28,
        textColor=primary_color,
        spaceAfter=15
    )
    
    section_title_style = ParagraphStyle(
        'SectionTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=14,
        leading=18,
        textColor=accent_color,
        spaceBefore=15,
        spaceAfter=8
    )
    
    sub_title_style = ParagraphStyle(
        'SubTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=11,
        leading=15,
        textColor=primary_color,
        spaceBefore=10,
        spaceAfter=4
    )
    
    story = []
    
    # --- PAGE 1: TITLE & EXECUTIVE SUMMARY ---
    story.append(Paragraph(f"Stock Qualitative Research Report", title_style))
    story.append(Paragraph(f"<b>Target:</b> {stock_data.get('name')} ({stock_data.get('symbol')})", styles['Normal']))
    story.append(Paragraph(f"<b>Sector / Industry:</b> {stock_data.get('sector')} / {stock_data.get('industry')}", styles['Normal']))
    story.append(Paragraph(f"<b>Deterministic Rating:</b> {report_data.get('rating', 'Hold')} (Score: {report_data.get('score', 0)}/100)", styles['Normal']))
    story.append(Spacer(1, 20))
    
    story.append(Paragraph("1. Business & Operations Overview", section_title_style))
    business_text = report_data.get("report", {}).get("business_overview", "No overview compiled.")
    story.append(Paragraph(business_text, styles['Normal']))
    story.append(Spacer(1, 15))
    
    story.append(Paragraph("2. Financial Dynamics Analysis", section_title_style))
    rev_text = report_data.get("report", {}).get("revenue_analysis", "")
    prof_text = report_data.get("report", {}).get("profit_analysis", "")
    story.append(Paragraph(f"<b>Revenue dynamics:</b> {rev_text}", styles['Normal']))
    story.append(Spacer(1, 10))
    story.append(Paragraph(f"<b>Profitability structure:</b> {prof_text}", styles['Normal']))
    story.append(PageBreak())
    
    # --- PAGE 2: SWOT, SCENARIOS & THESIS ---
    story.append(Paragraph("3. Moats & Opportunities (Growth Drivers)", section_title_style))
    moats = report_data.get("report", {}).get("opportunities", "")
    story.append(Paragraph(moats, styles['Normal']))
    story.append(Spacer(1, 15))
    
    story.append(Paragraph("4. Critical Risks & Downside Scenarios", section_title_style))
    risks = report_data.get("report", {}).get("risks", "")
    story.append(Paragraph(risks, styles['Normal']))
    story.append(Spacer(1, 15))
    
    story.append(Paragraph("5. Scenario Analysis & Models", section_title_style))
    bull_case = report_data.get("report", {}).get("bull_case", "")
    bear_case = report_data.get("report", {}).get("bear_case", "")
    story.append(Paragraph("<b>Bull Case Target Model:</b>", sub_title_style))
    story.append(Paragraph(bull_case, styles['Normal']))
    story.append(Spacer(1, 10))
    story.append(Paragraph("<b>Bear Case Risks Model:</b>", sub_title_style))
    story.append(Paragraph(bear_case, styles['Normal']))
    story.append(Spacer(1, 15))
    
    story.append(Paragraph("6. Investment Thesis", section_title_style))
    thesis = report_data.get("report", {}).get("final_investment_thesis", "")
    story.append(Paragraph(f"<i>{thesis}</i>", styles['Normal']))
    
    doc.build(story)
    buffer.seek(0)
    return buffer
