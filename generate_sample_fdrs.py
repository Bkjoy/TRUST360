import os
from pathlib import Path
import fitz  # PyMuPDF

def create_fdr_pdf(filename: str, bank: str, fdr_num: str, acct_num: str, branch: str, ifsc: str, amount_str: str, issue_d: str, mat_d: str, int_rate: str):
    doc = fitz.open()
    page = doc.new_page(width=595, height=842) # A4 format

    # Outer border
    rect = fitz.Rect(30, 30, 565, 812)
    page.draw_rect(rect, color=(0.1, 0.2, 0.45), width=2)
    inner_rect = fitz.Rect(35, 35, 560, 807)
    page.draw_rect(inner_rect, color=(0.7, 0.7, 0.7), width=0.8)

    # Header Title
    page.insert_text((55, 75), bank.upper(), fontsize=18, color=(0.08, 0.2, 0.45))
    page.insert_text((55, 95), "SCHEDULED COMMERCIAL BANK • GOVERNMENT RECOGNIZED DEPOSITARY", fontsize=8.5, color=(0.4, 0.4, 0.4))
    page.draw_line(fitz.Point(55, 105), fitz.Point(540, 105), color=(0.08, 0.2, 0.45), width=1.5)

    # Document Heading
    page.insert_text((160, 135), "FIXED DEPOSIT RECEIPT (FDR)", fontsize=16, color=(0.1, 0.1, 0.1))
    page.insert_text((180, 150), "[ AICTE REGULATORY SECURITY DEPOSIT LIEN ]", fontsize=10, color=(0.7, 0.2, 0.1))

    # Grid / Details Table
    details = [
        ("FDR Number / Instrument ID", fdr_num),
        ("Deposit Account Number", acct_num),
        ("Bank & Issuing Branch", f"{bank}, {branch}"),
        ("IFSC Code", ifsc),
        ("Deposit Principal Amount", amount_str),
        ("Deposit Date / Issue Date", issue_d),
        ("Maturity Date (8-Year Lock-in)", mat_d),
        ("Contracted Interest Rate", int_rate),
        ("Primary Account Holder", "Delhi Institute of Technology & Management (Society/Trust)"),
        ("Joint Holder / Lien Authority", "Regional Officer, All India Council for Technical Education (AICTE)"),
        ("Lien Clause Marking", "MANDATORY LIEN MARKED IN FAVOR OF AICTE - Chapter II APH Guidelines"),
        ("Premature Withdrawal Condition", "STRICTLY PROHIBITED WITHOUT PRIOR WRITTEN NOC FROM AICTE"),
    ]

    y = 190
    for label, val in details:
        page.draw_rect(fitz.Rect(55, y - 14, 540, y + 16), color=(0.9, 0.9, 0.95), fill=(0.96, 0.97, 0.99) if y % 40 == 0 else (1, 1, 1), width=0.5)
        page.insert_text((65, y + 2), label, fontsize=10, color=(0.25, 0.3, 0.35))
        page.insert_text((260, y + 2), val, fontsize=10.5, color=(0.05, 0.1, 0.2))
        y += 32

    # Footer Signatures
    y += 40
    page.draw_line(fitz.Point(70, y + 60), fitz.Point(230, y + 60), color=(0.3, 0.3, 0.3), width=0.8)
    page.insert_text((75, y + 75), "Authorized Signatory (Bank Branch)", fontsize=9, color=(0.3, 0.3, 0.3))
    page.insert_text((75, y + 88), f"Branch Manager • {branch}", fontsize=8, color=(0.5, 0.5, 0.5))

    page.draw_line(fitz.Point(370, y + 60), fitz.Point(530, y + 60), color=(0.3, 0.3, 0.3), width=0.8)
    page.insert_text((375, y + 75), "Institution Authorized Trustee/Dean", fontsize=9, color=(0.3, 0.3, 0.3))
    page.insert_text((375, y + 88), "Authorized Signatory • Society/Trust", fontsize=8, color=(0.5, 0.5, 0.5))

    # Barcode/Verification Stamp representation
    page.draw_rect(fitz.Rect(200, y + 105, 400, y + 130), width=0.5, color=(0.5, 0.5, 0.5))
    page.insert_text((220, y + 122), f"CBS VERIFY: #{abs(hash(fdr_num)) % 1000000000:09d}", fontsize=8, color=(0.3, 0.3, 0.3))

    doc.save(filename)
    doc.close()
    print(f"Generated: {filename}")

if __name__ == "__main__":
    out_dir = Path("/Users/joybiswas/Desktop/deposit360/sample_fdrs")
    out_dir.mkdir(parents=True, exist_ok=True)

    create_fdr_pdf(
        str(out_dir / "Sample_FDR_StateBankOfIndia.pdf"),
        bank="State Bank of India",
        fdr_num="SBI-FDR-98765432",
        acct_num="12345678901",
        branch="Connaught Place, New Delhi",
        ifsc="SBIN0001234",
        amount_str="INR 50,00,000.00 (Fifty Lakh Rupees Only)",
        issue_d="15/01/2024",
        mat_d="15/01/2032",
        int_rate="7.25% p.a."
    )

    create_fdr_pdf(
        str(out_dir / "Sample_FDR_PunjabNationalBank.pdf"),
        bank="Punjab National Bank",
        fdr_num="PNB-FDR-55443322",
        acct_num="98765432109",
        branch="Parliament Street, New Delhi",
        ifsc="PUNB0102030",
        amount_str="INR 35,00,000.00 (Thirty-Five Lakh Rupees Only)",
        issue_d="01/03/2024",
        mat_d="01/03/2032",
        int_rate="7.10% p.a."
    )

    create_fdr_pdf(
        str(out_dir / "Sample_FDR_HDFCBank.pdf"),
        bank="HDFC Bank",
        fdr_num="HDFC-FDR-11223344",
        acct_num="55667788990",
        branch="Fort Branch, Mumbai",
        ifsc="HDFC0000128",
        amount_str="INR 1,00,00,000.00 (One Crore Rupees Only)",
        issue_d="10/06/2024",
        mat_d="10/06/2032",
        int_rate="7.40% p.a."
    )
