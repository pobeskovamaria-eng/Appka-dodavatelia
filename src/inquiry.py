"""Inquiry template generator — produces a ready-to-send e-mail/form body."""

from __future__ import annotations

from typing import Iterable
from urllib.parse import quote

from .i18n import t


def build_inquiry(
    lang: str,
    materials: Iterable[str],
    mommi: Iterable[int],
    only_mulberry: bool,
    dyeing_required: bool,
) -> tuple[str, str]:
    """Returns (subject, body) in the chosen language."""
    materials_list = list(materials)
    mommi_list = sorted(mommi)

    subject = t(lang, "inquiry_subject")

    lines: list[str] = []
    lines.append(t(lang, "inquiry_greeting"))
    lines.append("")
    lines.append(t(lang, "inquiry_intro"))
    lines.append("")
    lines.append(t(lang, "inquiry_materials_label"))

    if "silk" in materials_list:
        mommi_str = ", ".join(f"{m} mm" for m in mommi_list) if mommi_list else "—"
        if only_mulberry:
            lines.append("• " + t(lang, "inquiry_silk_line").format(mommi=mommi_str))
        else:
            lines.append("• " + ("Silk" if lang == "en" else "Hodváb") + f" — {mommi_str}")
    if "cotton" in materials_list:
        lines.append("• " + t(lang, "inquiry_cotton_line"))
    if "tencel" in materials_list:
        lines.append("• " + t(lang, "inquiry_tencel_line"))
    if "bamboo" in materials_list:
        lines.append("• " + t(lang, "inquiry_bamboo_line"))

    if dyeing_required:
        lines.append("")
        lines.append(t(lang, "inquiry_dyeing"))

    lines.append("")
    lines.append(t(lang, "inquiry_questions_label"))
    lines.append(t(lang, "inquiry_q_moq"))
    lines.append(t(lang, "inquiry_q_certs"))
    lines.append(t(lang, "inquiry_q_pricelist"))
    lines.append(t(lang, "inquiry_q_samples"))

    lines.append("")
    lines.append(t(lang, "inquiry_closing"))
    lines.append("")
    lines.append(t(lang, "inquiry_signature"))

    return subject, "\n".join(lines)


def mailto_link(email: str, subject: str, body: str) -> str:
    return f"mailto:{email}?subject={quote(subject)}&body={quote(body)}"
