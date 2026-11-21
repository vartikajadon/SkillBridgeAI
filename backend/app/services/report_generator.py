"""
Report Generator Service (Phase 8)
Generates high-fidelity ReportLab PDF documents and UTF-8 RFC 4180 CSV streams.
Pure Python: Operates without external headless browser binaries or system rendering dependencies.
"""
import csv
import io
from datetime import datetime, timezone
from typing import List, Optional

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4, letter
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.pdfgen import canvas
from reportlab.platypus import (
    HRFlowable,
    KeepTogether,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)


class NumberedCanvas(canvas.Canvas):
    """Two-pass canvas that dynamically calculates and renders 'Page X of Y' on all pages."""

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_decorations(num_pages)
            super().showPage()
        super().save()

    def draw_page_decorations(self, total_pages: int):
        self.saveState()
        self.setFont("Helvetica", 8)
        self.setFillColor(colors.HexColor("#64748B"))

        # Footer divider line
        self.setStrokeColor(colors.HexColor("#CBD5E1"))
        self.setLineWidth(0.5)
        self.line(36, 40, letter[0] - 36, 40)

        # Footer Text
        footer_left = "SkillBridge AI • National Civil Service Capacity Building Platform"
        footer_right = f"Page {self._pageNumber} of {total_pages}"
        self.drawString(36, 28, footer_left)
        self.drawRightString(letter[0] - 36, 28, footer_right)

        # Security Classification Footer Tag
        self.setFont("Helvetica-Bold", 7)
        self.setFillColor(colors.HexColor("#991B1B"))
        self.drawCentredString(letter[0] / 2, 28, "OFFICIAL — FOR INTERNAL GOVERNMENT USE ONLY")

        self.restoreState()


class ReportGeneratorService:
    """Orchestrates CSV and ReportLab PDF document compilation."""

    @staticmethod
    def generate_csv(headers: List[str], data_rows: List[List[str]]) -> str:
        """Serializes tabular data into standard RFC 4180 CSV with UTF-8 BOM."""
        output = io.StringIO()
        # Prepend UTF-8 BOM so Microsoft Excel renders multilingual characters correctly
        output.write("\ufeff")
        writer = csv.writer(output, lineterminator="\n")
        writer.writerow(headers)
        for row in data_rows:
            writer.writerow([str(cell) if cell is not None else "" for cell in row])
        return output.getvalue()

    @staticmethod
    def generate_pdf(
        title: str,
        subtitle: str,
        headers: List[str],
        data_rows: List[List[str]],
        requested_by: str,
        department_filter: Optional[str] = None,
        col_widths: Optional[List[float]] = None,
    ) -> bytes:
        """Generates a structured, multi-page ReportLab PDF executive report."""
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=letter,
            leftMargin=36,
            rightMargin=36,
            topMargin=40,
            bottomMargin=54,
        )

        styles = getSampleStyleSheet()

        # Custom Government Styling
        header_title_style = ParagraphStyle(
            "GovTitle",
            parent=styles["Normal"],
            fontName="Helvetica-Bold",
            fontSize=16,
            leading=20,
            textColor=colors.HexColor("#1E3A8A"),  # Deep Navy
        )
        subtitle_style = ParagraphStyle(
            "GovSubtitle",
            parent=styles["Normal"],
            fontName="Helvetica",
            fontSize=10,
            leading=13,
            textColor=colors.HexColor("#475569"),  # Slate
        )
        meta_label_style = ParagraphStyle(
            "MetaLabel",
            parent=styles["Normal"],
            fontName="Helvetica-Bold",
            fontSize=8,
            leading=10,
            textColor=colors.HexColor("#1E293B"),
        )
        meta_val_style = ParagraphStyle(
            "MetaVal",
            parent=styles["Normal"],
            fontName="Helvetica",
            fontSize=8,
            leading=10,
            textColor=colors.HexColor("#334155"),
        )
        th_style = ParagraphStyle(
            "TableHeader",
            parent=styles["Normal"],
            fontName="Helvetica-Bold",
            fontSize=8,
            leading=10,
            textColor=colors.white,
            alignment=0,
        )
        td_style = ParagraphStyle(
            "TableCell",
            parent=styles["Normal"],
            fontName="Helvetica",
            fontSize=8,
            leading=10,
            textColor=colors.HexColor("#1E293B"),
            alignment=0,
        )

        elements = []

        # 1. Official Header & Security Classification Banner
        banner_text = "<b>CONFIDENTIAL & PRIVILEGED</b> • GOVERNMENT OF INDIA COMPETENCY AUDIT"
        elements.append(
            Paragraph(
                f"<font color='#991B1B'>{banner_text}</font>",
                ParagraphStyle("Banner", parent=styles["Normal"], fontSize=8, leading=10, fontName="Helvetica-Bold"),
            )
        )
        elements.append(Spacer(1, 4))
        elements.append(Paragraph(title, header_title_style))
        elements.append(Paragraph(subtitle, subtitle_style))
        elements.append(Spacer(1, 8))
        elements.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor("#1E3A8A"), spaceAfter=8))

        # 2. Metadata Block
        now_utc = datetime.now(timezone.utc)
        meta_table_data = [
            [
                Paragraph("<b>Generated By:</b>", meta_label_style),
                Paragraph(requested_by, meta_val_style),
                Paragraph("<b>Generation Date (UTC):</b>", meta_label_style),
                Paragraph(now_utc.strftime("%Y-%m-%d %H:%M:%S UTC"), meta_val_style),
            ],
            [
                Paragraph("<b>Department Filter:</b>", meta_label_style),
                Paragraph(department_filter or "All Departments", meta_val_style),
                Paragraph("<b>Total Records:</b>", meta_label_style),
                Paragraph(str(len(data_rows)), meta_val_style),
            ],
        ]
        meta_table = Table(meta_table_data, colWidths=[110, 160, 120, 150])
        meta_table.setStyle(
            TableStyle([
                ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#F1F5F9")),
                ("PADDING", (0, 0), (-1, -1), 4),
                ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#CBD5E1")),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ])
        )
        elements.append(meta_table)
        elements.append(Spacer(1, 14))

        # 3. Data Table
        # Format headers with TableHeader style
        table_content = [[Paragraph(h, th_style) for h in headers]]
        # Format rows with TableCell style
        for r in data_rows:
            table_content.append([Paragraph(str(c) if c is not None else "-", td_style) for c in r])

        # Calculate col widths if not provided
        usable_width = letter[0] - 72  # 540 pt
        if not col_widths:
            col_count = len(headers)
            col_widths = [usable_width / col_count] * col_count

        table = Table(table_content, colWidths=col_widths, repeatRows=1)
        table.setStyle(
            TableStyle([
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1E3A8A")),
                ("PADDING", (0, 0), (-1, -1), 4.5),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#F8FAFC")]),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#E2E8F0")),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ])
        )
        elements.append(table)

        # Build document with custom dynamic NumberedCanvas
        doc.build(elements, canvasmaker=NumberedCanvas)
        return buffer.getvalue()


_report_service_instance: Optional[ReportGeneratorService] = None


def get_report_service() -> ReportGeneratorService:
    """Singleton getter for ReportGeneratorService."""
    global _report_service_instance
    if _report_service_instance is None:
        _report_service_instance = ReportGeneratorService()
    return _report_service_instance
